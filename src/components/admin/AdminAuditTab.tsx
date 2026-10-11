import React from 'react';
import { AuditLogEntry } from '../../types';
import {
  Search,
  RefreshCw,
  Shield,
  AlertTriangle,
  History,
} from 'lucide-react';

interface AdminAuditTabProps {
  auditLogs: AuditLogEntry[];
  loading: boolean;
  error?: string | null;
  searchAudit: string;
  setSearchAudit: (val: string) => void;
  actionFilter: string;
  setActionFilter: (val: string) => void;
  onRefresh: () => void;
}

export const AdminAuditTab: React.FC<AdminAuditTabProps> = ({
  auditLogs,
  loading,
  error,
  searchAudit,
  setSearchAudit,
  actionFilter,
  setActionFilter,
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
            Registro Inmutable de Auditoría
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Trazabilidad completa de eventos del sistema, acciones administrativas y accesos.
          </p>
        </div>
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

      {/* Filters Bar */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchAudit}
            onChange={(e) => setSearchAudit(e.target.value)}
            placeholder="Buscar por usuario, correo o detalles..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
        >
          <option value="">Todas las acciones</option>
          <option value="LOGIN_SUCCESS">Inicio de sesión exitoso</option>
          <option value="LOGIN_FAILED">Inicio de sesión fallido</option>
          <option value="CREATE_USER">Usuario creado</option>
          <option value="UPDATE_USER">Usuario modificado</option>
          <option value="DELETE_USER">Usuario eliminado</option>
          <option value="PASSWORD_RESET">Contraseña restablecida</option>
          <option value="UNLOCK_USER">Usuario desbloqueado</option>
          <option value="DOCUMENT_UPLOADED">Documento subido</option>
          <option value="DOCUMENT_DELETED_TO_TRASH">Documento a papelera</option>
          <option value="DOCUMENT_RESTORED">Documento restaurado</option>
          <option value="ASSIGNMENT_CREATED">Asignación creada</option>
          <option value="ASSIGNMENT_REVOKED">Asignación revocada</option>
        </select>

        <button
          onClick={onRefresh}
          title="Refrescar auditoría"
          className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
              <tr>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Dirección IP</th>
                <th className="px-4 py-3">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400 font-sans">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-neutral-400" />
                      <span>Cargando registros de auditoría...</span>
                    </div>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400 font-sans">
                    <div className="max-w-sm mx-auto space-y-1">
                      <Shield className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
                      <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                        No hay eventos de auditoría coincidentes.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                    <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-sans text-neutral-900 dark:text-neutral-100">
                      {log.userEmail || 'Sistema'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="px-4 py-3 font-sans text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                      {typeof log.details === 'object'
                        ? JSON.stringify(log.details)
                        : String(log.details || '—')}
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
