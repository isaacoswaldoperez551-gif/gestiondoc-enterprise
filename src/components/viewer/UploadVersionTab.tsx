import React from 'react';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { DocumentFileType } from '../../types';
import { validateUploadedFile } from '../../utils/fileFormats';

interface UploadVersionTabProps {
  currentDocType?: DocumentFileType;
  uploadFile: File | null;
  setUploadFile: (f: File | null) => void;
  changeSummary: string;
  setChangeSummary: (s: string) => void;
  uploading: boolean;
  uploadError: string | null;
  setUploadError?: (err: string | null) => void;
  uploadSuccess: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export const UploadVersionTab: React.FC<UploadVersionTabProps> = ({
  currentDocType,
  uploadFile,
  setUploadFile,
  changeSummary,
  setChangeSummary,
  uploading,
  uploadError,
  setUploadError,
  uploadSuccess,
  onSubmit,
}) => {
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = await validateUploadedFile(file, currentDocType);
      if (!validation.isValid) {
        if (setUploadError) {
          setUploadError(validation.error || 'Formato de archivo inválido.');
        }
        setUploadFile(null);
        return;
      }
      if (setUploadError) {
        setUploadError(null);
      }
      setUploadFile(file);
    }
  };
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
          Publicar Nueva Versión
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Cargue el archivo revisado con sus observaciones. El sistema generará la versión consecutiva correspondiente.
        </p>
      </div>

      {uploadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4 shadow-xs">
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Archivo Revisado (.pdf, .docx, .xlsx) *
          </label>
          <input
            type="file"
            required
            accept=".pdf,.docx,.xlsx"
            onChange={handleFileSelect}
            className="w-full text-xs text-neutral-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-neutral-100 dark:file:bg-neutral-800 file:text-neutral-900 dark:file:text-neutral-100 hover:file:bg-neutral-200 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Resumen de Cambios Realizados *
          </label>
          <textarea
            rows={3}
            required
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            placeholder="Describa los cambios aplicados en esta versión..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={uploading || !uploadFile}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? 'Cargando versión...' : 'Publicar Nueva Versión'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
