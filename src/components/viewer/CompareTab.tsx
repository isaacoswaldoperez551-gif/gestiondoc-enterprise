import React from 'react';
import { DocumentVersion, ComparisonResult } from '../../types';
import { ArrowRight, FileSpreadsheet, FileText } from 'lucide-react';

interface CompareTabProps {
  versions: DocumentVersion[];
  v1Id: string;
  setV1Id: (val: string) => void;
  v2Id: string;
  setV2Id: (val: string) => void;
  loadingCompare: boolean;
  comparison: ComparisonResult | null;
  formatDate: (iso: string) => string;
}

export const CompareTab: React.FC<CompareTabProps> = ({
  versions,
  v1Id,
  setV1Id,
  v2Id,
  setV2Id,
  loadingCompare,
  comparison,
  formatDate,
}) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
          Comparador Visual de Versiones
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Diferencias textuales para .docx, discrepancias de celdas para .xlsx y metadatos para .pdf.
        </p>
      </div>

      {/* Version Selectors Bar */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">
            Versión Base (v1):
          </label>
          <select
            value={v1Id}
            onChange={(e) => setV1Id(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber} ({formatDate(v.createdAt)})
              </option>
            ))}
          </select>
        </div>

        <ArrowRight className="w-5 h-5 text-neutral-400 hidden sm:block shrink-0 mt-4" />

        <div className="flex-1 w-full">
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">
            Versión Comparada (v2):
          </label>
          <select
            value={v2Id}
            onChange={(e) => setV2Id(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber} ({formatDate(v.createdAt)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingCompare ? (
        <div className="py-12 text-center text-xs text-neutral-400">
          Calculando diferencias entre versiones...
        </div>
      ) : comparison ? (
        <div className="space-y-4">
          {/* Metadata Diff Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
              <h4 className="font-semibold text-xs text-neutral-800 dark:text-neutral-200">
                Comparación de Metadatos
              </h4>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 text-[11px]">
                <tr>
                  <th className="px-4 py-2">Propiedad</th>
                  <th className="px-4 py-2 font-mono">v{comparison.v1?.versionNumber || 1}</th>
                  <th className="px-4 py-2 font-mono">v{comparison.v2?.versionNumber || 1}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {(comparison.metadataDiff || []).map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400">
                      {row.field}
                    </td>
                    <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200 font-mono text-[11px]">
                      {row.v1Value}
                    </td>
                    <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200 font-mono text-[11px]">
                      {row.v2Value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Excel Cells Diff */}
          {comparison.fileType === 'xlsx' && comparison.sheetDiff && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3 shadow-xs">
              <h4 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Diferencias de Celdas (.xlsx)</span>
              </h4>
              {comparison.sheetDiff.every((s) => s.cellChanges.length === 0) ? (
                <p className="text-xs text-neutral-500 italic">
                  No se detectaron discrepancias de celdas entre ambas versiones.
                </p>
              ) : (
                comparison.sheetDiff.map((sh) => (
                  <div key={sh.sheetName} className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Hoja: {sh.sheetName}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sh.cellChanges.map((c, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-xs font-mono"
                        >
                          <span className="font-bold text-neutral-900 dark:text-neutral-100">
                            Celda {c.cell}:
                          </span>{' '}
                          <span className="text-red-600 line-through mr-1">{c.oldVal}</span>
                          <span className="text-neutral-400">→</span>
                          <span className="text-emerald-600 font-semibold ml-1">{c.newVal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Word Text Diff */}
          {comparison.fileType === 'docx' && comparison.textDiff && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3 shadow-xs">
              <h4 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Diferencias Textuales (.docx)</span>
              </h4>
              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs leading-relaxed font-mono">
                {comparison.textDiff.map((part, i) => (
                  <span
                    key={i}
                    className={
                      part.added
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold px-0.5 rounded'
                        : part.removed
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 line-through px-0.5 rounded'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-neutral-400 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          Seleccione dos versiones para comparar sus cambios.
        </div>
      )}
    </div>
  );
};
