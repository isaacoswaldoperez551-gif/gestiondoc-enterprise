import React, { useState } from 'react';
import { Folder, Tag } from '../types';
import { X, UploadCloud, FileText, AlertCircle } from 'lucide-react';

interface UploadDocumentModalProps {
  folders: Folder[];
  tags: Tag[];
  authToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  folders,
  tags,
  authToken,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTemplate, setIsTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!['.pdf', '.docx', '.xlsx', '.doc', '.xls'].includes(ext)) {
        setError('Formato no permitido. Solo se aceptan archivos .pdf, .docx o .xlsx');
        setSelectedFile(null);
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError('El archivo supera el tamaño máximo permitido de 25 MB.');
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
      if (!title) {
        // Auto-fill title from filename without extension
        const cleanName = file.name.substring(0, file.name.lastIndexOf('.'));
        setTitle(cleanName.replace(/_/g, ' '));
      }
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Debe seleccionar un archivo válido para subir.');
      return;
    }
    if (!title.trim()) {
      setError('El título del documento es obligatorio.');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      if (selectedFolderId) formData.append('folderId', selectedFolderId);
      formData.append('tagIds', JSON.stringify(selectedTagIds));
      formData.append('isTemplate', String(isTemplate));

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al subir el documento.');
        setUploading(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Error de comunicación con el servidor al cargar archivo.');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Subir Nuevo Documento Corporativo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* File drop zone */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Archivo (.pdf, .docx, .xlsx · Máx. 25 MB) *
            </label>
            <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-center hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition relative">
              <input
                type="file"
                accept=".pdf,.docx,.xlsx,.doc,.xls"
                required
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                <FileText className="w-8 h-8 text-neutral-400" />
                {selectedFile ? (
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Arrastre su archivo o haga clic para examinar
                    </p>
                    <p className="text-[11px] text-neutral-400">PDF, Word o Excel</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Título del Documento *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Contrato de Confidencialidad y Servicios 2026"
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Carpeta de Clasificación
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            >
              <option value="">(Sin carpeta asignada · Raíz)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Etiquetas Asociadas
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const isSelected = selectedTagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition cursor-pointer ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    #{t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isTemplateCheck"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="w-4 h-4 rounded text-neutral-900 dark:text-neutral-100 focus:ring-0 cursor-pointer"
            />
            <label
              htmlFor="isTemplateCheck"
              className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              Marcar como Documento Plantilla (base para copias independientes)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition disabled:opacity-50 cursor-pointer"
            >
              {uploading ? 'Cargando y validando...' : 'Subir Documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
