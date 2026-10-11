import React from 'react';
import { DocumentItem, DocumentVersion } from '../../types';
import {
  FileSpreadsheet,
  Download,
  Smartphone,
  ExternalLink,
  Globe,
  FileText,
} from 'lucide-react';

interface ViewTabProps {
  doc: DocumentItem;
  loadingVersions: boolean;
  renderingContent: boolean;
  pdfUrl: string | null;
  xlsxSheets: { name: string; rows: any[][] }[];
  activeSheetIndex: number;
  setActiveSheetIndex: (idx: number) => void;
  docxHtml: string;
  selectedVersion: DocumentVersion | null;
  canDownload: boolean;
  onDownload: () => void;
  onOpenGoogleDrive?: () => void;
}

export const ViewTab: React.FC<ViewTabProps> = ({
  doc,
  loadingVersions,
  renderingContent,
  pdfUrl,
  xlsxSheets,
  activeSheetIndex,
  setActiveSheetIndex,
  docxHtml,
  selectedVersion,
  canDownload,
  onDownload,
  onOpenGoogleDrive,
}) => {
  return (
    <div className="h-full flex flex-col min-h-[480px]">
      {loadingVersions || renderingContent ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            Cargando y procesando documento en el visor...
          </p>
        </div>
      ) : doc.fileType === 'pdf' ? (
        <div className="flex-1 h-full min-h-[500px] bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Visor PDF Integrado"
              className="w-full h-full min-h-[500px] border-none"
            />
          ) : (
            <div className="p-8 text-center text-xs text-neutral-500">
              No se pudo generar la vista previa del archivo PDF.
            </div>
          )}
        </div>
      ) : doc.fileType === 'xlsx' ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          {/* Sheet Tabs */}
          {xlsxSheets.length > 0 && (
            <div className="flex items-center gap-1 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 overflow-x-auto">
              <span className="text-[11px] font-semibold text-neutral-500 mr-2 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Hojas:
              </span>
              {xlsxSheets.map((sh, idx) => (
                <button
                  key={sh.name}
                  onClick={() => setActiveSheetIndex(idx)}
                  className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer ${
                    activeSheetIndex === idx
                      ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-neutral-200 dark:border-neutral-700'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  {sh.name}
                </button>
              ))}
            </div>
          )}

          {/* Spreadsheet Grid */}
          <div className="flex-1 overflow-auto p-2">
            {xlsxSheets[activeSheetIndex] && xlsxSheets[activeSheetIndex].rows.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  {xlsxSheets[activeSheetIndex].rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx === 0
                          ? 'bg-neutral-100 dark:bg-neutral-800/80 font-bold border-b border-neutral-300 dark:border-neutral-700'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30 border-b border-neutral-100 dark:border-neutral-800/60'
                      }
                    >
                      <td className="px-2 py-1.5 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-400 font-mono text-[10px] w-8 text-center select-none border-r border-neutral-200 dark:border-neutral-700">
                        {rIdx + 1}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-3 py-1.5 text-neutral-800 dark:text-neutral-200 border-r border-neutral-100 dark:border-neutral-800 ${
                            typeof cell === 'number' ? 'text-right font-mono tabular-nums' : ''
                          }`}
                        >
                          {cell !== null && cell !== undefined
                            ? typeof cell === 'number'
                              ? cell.toLocaleString()
                              : String(cell)
                            : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-400">
                Hoja vacía o sin datos tabulares.
              </div>
            )}
          </div>
        </div>
      ) : doc.fileType === 'docx' ? (
        /* DOCX Viewer */
        <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-10 overflow-auto shadow-xs max-w-4xl mx-auto w-full space-y-6">
          <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-200">
              <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Visor Web Nativo Activo:</strong> Lee el documento completo directamente aquí en tu pantalla sin necesidad de instalar Microsoft Word.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              {onOpenGoogleDrive && (
                <button
                  onClick={onOpenGoogleDrive}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition cursor-pointer text-[11px] shadow-xs"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Ir a Google Drive</span>
                </button>
              )}
              {canDownload && (
                <button
                  onClick={onDownload}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer text-[11px] shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .docx</span>
                </button>
              )}
            </div>
          </div>

          {docxHtml && docxHtml.trim().length > 0 ? (
            <div className="space-y-6">
              <div className="pb-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-full">
                    Vista de Lectura Web (Nativa)
                  </span>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-2">
                    {doc.title}
                  </h3>
                </div>
              </div>
              <div
                className="prose dark:prose-invert max-w-none text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                <FileText className="w-8 h-8" />
              </div>

              <div className="max-w-md space-y-2">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono">
                  DOCUMENTO WORD (.DOCX)
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {doc.title}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Carpeta: {doc.folderName || 'General'} · Versión v{selectedVersion?.versionNumber || 1}
                </p>
              </div>

              <div className="w-full max-w-md p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 text-left text-xs space-y-2.5">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Nombre original:</span>
                  <span className="font-mono font-medium text-neutral-900 dark:text-neutral-200">
                    {selectedVersion?.originalFilename || doc.title}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Tamaño de archivo:</span>
                  <span className="font-mono text-neutral-900 dark:text-neutral-200">
                    {((selectedVersion?.fileSizeBytes || 15000) / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Publicado por:</span>
                  <span className="text-neutral-900 dark:text-neutral-200">
                    {selectedVersion?.uploaderName || doc.creatorName || 'Sistema'}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Notas de versión:</span>
                  <span className="text-neutral-900 dark:text-neutral-200">
                    {selectedVersion?.changeSummary || 'Versión registrada'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {onOpenGoogleDrive && (
                  <button
                    onClick={onOpenGoogleDrive}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Abrir Google Drive</span>
                  </button>
                )}
                {canDownload && (
                  <button
                    onClick={onDownload}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Documento Word</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Unsupported / Other files */
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
            <ExternalLink className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Vista previa no disponible
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              El formato de este archivo no cuenta con visualización directa en el navegador. Puede descargar el archivo original para abrirlo en su dispositivo.
            </p>
          </div>
          {canDownload && (
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar archivo</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
