import React from 'react';
import { DocumentItem, DocumentVersion } from '../../types';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface VersionsTabProps {
  doc: DocumentItem;
  versions: DocumentVersion[];
  userRole: 'admin' | 'user';
  revertMessage: string | null;
  reverting: boolean;
  onSelectVersion: (v: DocumentVersion) => void;
  onRevert: (versionId: string, versionNumber: number) => void;
  formatDate: (iso: string) => string;
}

export const VersionsTab: React.FC<VersionsTabProps> = ({
  doc,
  versions,
  userRole,
  revertMessage,
  reverting,
  onSelectVersion,
  onRevert,
  formatDate,
}) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
            Historial Completo de Versiones
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Árbol inmutable de revisiones. Cada cambio genera una nueva versión sin eliminar las anteriores.
          </p>
        </div>
      </div>

      {revertMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{revertMessage}</span>
        </div>
      )}

      {versions.length === 0 ? (
        <div className="p-8 text-center text-xs text-neutral-500 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          No hay versiones registradas para este documento.
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((ver) => (
            <div
              key={ver.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                    v{ver.versionNumber}
                  </span>
                  <h4 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                    {ver.originalFilename}
                  </h4>
                  {doc.currentVersionId === ver.id && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      [Versión Oficial Activa]
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  {ver.changeSummary || 'Sin resumen registrado'}
                </p>
                <p className="text-[11px] text-neutral-400">
                  Subido por{' '}
                  <strong className="text-neutral-600 dark:text-neutral-300">
                    {ver.uploaderName || 'Sistema'}
                  </strong>{' '}
                  el {formatDate(ver.createdAt)} · {(ver.fileSizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectVersion(ver)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  Ver esta versión
                </button>

                {userRole === 'admin' && doc.currentVersionId !== ver.id && (
                  <button
                    onClick={() => onRevert(ver.id, ver.versionNumber)}
                    disabled={reverting}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Revertir a v{ver.versionNumber}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
