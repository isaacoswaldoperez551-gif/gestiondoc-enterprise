import React, { useState } from 'react';
import { DocumentItem, Folder, Tag, DocumentFileType } from '../../types';
import {
  Search,
  UploadCloud,
  FolderPlus,
  RefreshCw,
  Eye,
  UserPlus,
  Trash2,
  RotateCcw,
  FileText,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';

interface AdminDocumentsTabProps {
  documents: DocumentItem[];
  folders: Folder[];
  tags: Tag[];
  loading: boolean;
  error?: string | null;
  searchDoc: string;
  setSearchDoc: (val: string) => void;
  selectedFolderFilter: string;
  setSelectedFolderFilter: (val: string) => void;
  selectedTagFilter: string;
  setSelectedTagFilter: (val: string) => void;
  viewTrash: boolean;
  setViewTrash: (val: boolean) => void;
  onRefresh: () => void;
  onNewFolderClick: () => void;
  onUploadClick: () => void;
  onViewDoc: (doc: DocumentItem) => void;
  onAssignDoc: (doc: DocumentItem) => void;
  onDeleteDoc: (id: string, title: string) => void;
  onRestoreDoc: (id: string) => void;
}

export const AdminDocumentsTab: React.FC<AdminDocumentsTabProps> = ({
  documents,
  folders,
  tags,
  loading,
  error,
  searchDoc,
  setSearchDoc,
  selectedFolderFilter,
  setSelectedFolderFilter,
  selectedTagFilter,
  setSelectedTagFilter,
  viewTrash,
  setViewTrash,
  onRefresh,
  onNewFolderClick,
  onUploadClick,
  onViewDoc,
  onAssignDoc,
  onDeleteDoc,
  onRestoreDoc,
}) => {
  const [docToDelete, setDocToDelete] = useState<{ id: string; title: string } | null>(null);

  const renderFileIcon = (fileType: DocumentFileType) => {
    switch (fileType) {
      case 'pdf':
        return <FileCode className="w-4 h-4 text-red-500" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'xlsx':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
      default:
        return <FileText className="w-4 h-4 text-neutral-400" />;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header & Main CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {viewTrash ? 'Papelera de Reciclaje' : 'Repositorio Documental Corporativo'}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {viewTrash
              ? 'Documentos eliminados temporalmente. Puede restaurarlos o mantenerlos archivados.'
              : 'Carga, clasificación por carpetas, etiquetas y control de versiones (.pdf, .docx, .xlsx).'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTrash(!viewTrash)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition cursor-pointer ${
              viewTrash
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{viewTrash ? 'Ver Documentos Activos' : 'Ver Papelera'}</span>
          </button>
          {!viewTrash && (
            <>
              <button
                onClick={onNewFolderClick}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Nueva Carpeta</span>
              </button>
              <button
                onClick={onUploadClick}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg transition shadow-xs cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Subir Documento</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-between text-xs text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={onRefresh}
            className="font-semibold underline hover:no-underline cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Folder filter pills */}
      {!viewTrash && (
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mr-1">
            Carpetas:
          </span>
          <button
            onClick={() => setSelectedFolderFilter('')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              selectedFolderFilter === ''
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
            }`}
          >
            Todas las carpetas
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFolderFilter(f.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                selectedFolderFilter === f.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
              }`}
            >
              📁 {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Search and filters bar */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchDoc}
            onChange={(e) => setSearchDoc(e.target.value)}
            placeholder="Buscar documento por título..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
          />
        </div>

        {!viewTrash && (
          <select
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
          >
            <option value="">Todas las etiquetas</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.name}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={onRefresh}
          title="Refrescar lista"
          className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Carpeta</th>
                <th className="px-4 py-3">Etiquetas</th>
                <th className="px-4 py-3">Versión</th>
                <th className="px-4 py-3">Fecha de Carga</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-neutral-400" />
                      <span>Cargando documentos corporativos...</span>
                    </div>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <FolderOpen className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
                      <p className="font-semibold text-neutral-700 dark:text-neutral-300 text-xs">
                        {viewTrash
                          ? 'La papelera de reciclaje está vacía.'
                          : 'No se encontraron documentos coincidentes con los filtros.'}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {viewTrash
                          ? 'Los documentos eliminados aparecerán aquí para ser recuperados si es necesario.'
                          : 'Puede cargar nuevos archivos usando el botón "Subir Documento".'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                    <td className="px-4 py-3.5">{renderFileIcon(doc.fileType)}</td>
                    <td className="px-4 py-3.5">
                      <div>
                        <button
                          onClick={() => onViewDoc(doc)}
                          className="font-semibold text-neutral-900 dark:text-neutral-100 hover:underline text-left cursor-pointer"
                        >
                          {doc.title}
                        </button>
                        {doc.isTemplate && (
                          <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                            Plantilla Base
                          </span>
                        )}
                        {doc.isDeleted && (
                          <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300">
                            En Papelera
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-400">
                      {doc.folderName ? `📁 ${doc.folderName}` : '— (Raíz)'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {doc.tags && doc.tags.length > 0 ? (
                          doc.tags.map((t) => (
                            <span
                              key={t.id}
                              className="text-[11px] text-neutral-600 dark:text-neutral-400"
                            >
                              #{t.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Sin etiquetas</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        v{doc.versions?.length || 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-500 font-mono text-[11px]">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewDoc(doc)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Abrir</span>
                        </button>
                        {!doc.isDeleted ? (
                          <>
                            <button
                              onClick={() => onAssignDoc(doc)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Asignar</span>
                            </button>
                            <button
                              onClick={() => setDocToDelete({ id: doc.id, title: doc.title })}
                              title="Enviar a papelera"
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onRestoreDoc(doc.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal before moving to trash */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Confirmar eliminación
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              ¿Desea mover el documento <strong>"{docToDelete.title}"</strong> a la papelera de reciclaje?
              Podrá restaurarlo posteriormente si lo necesita.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDoc(docToDelete.id, docToDelete.title);
                  setDocToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 transition cursor-pointer"
              >
                Mover a papelera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
