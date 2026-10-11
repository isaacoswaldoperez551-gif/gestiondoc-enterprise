import React from 'react';
import { LoginHistoryEntry } from '../../types';
import {
  RefreshCw,
  History,
  AlertTriangle,
  Monitor,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface AdminSessionsTabProps {
  sessions: LoginHistoryEntry[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
}

export const AdminSessionsTab: React.FC<AdminSessionsTabProps> = ({
  sessions,
  loading,
  error,
  onRefresh,
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Sesiones Activas e Historial de Accesos
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Monitoreo en tiempo real de inicios de sesión, dispositivos, IPs y estado de acceso.
          </p>
        </div>

        <button
          onClick={onRefresh}
          title="Refrescar sesiones"
          className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-between text-xs text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={onRefresh} className="font-semibold underline hover:no-underline cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
              <tr>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Dirección IP</th>
                <th className="px-4 py-3">Dispositivo / Agente</th>
                <th className="px-4 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-neutral-400" />
                      <span>Cargando sesiones de acceso...</span>
                    </div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    <div className="max-w-sm mx-auto space-y-1">
                      <Monitor className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
                      <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                        No hay registros de sesiones disponibles.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                    <td className="px-4 py-3 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                      {formatDate(s.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                      {s.userEmail || s.userId}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
                      {s.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                      {s.deviceInfo || s.userAgent || 'Navegador Web'}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Exitoso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          <XCircle className="w-3 h-3" /> Fallido
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
