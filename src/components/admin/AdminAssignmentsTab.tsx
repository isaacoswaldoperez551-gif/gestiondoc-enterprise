import React, { useState } from 'react';
import { AssignmentItem } from '../../types';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ExternalLink,
  Search,
} from 'lucide-react';

interface AdminAssignmentsTabProps {
  assignments: AssignmentItem[];
  loading: boolean;
  error?: string | null;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  onRefresh: () => void;
  onReview: (asg: AssignmentItem) => void;
  onRevoke: (asgId: string) => void;
}

export const AdminAssignmentsTab: React.FC<AdminAssignmentsTabProps> = ({
  assignments,
  loading,
  error,
  statusFilter,
  setStatusFilter,
  onRefresh,
  onReview,
  onRevoke,
}) => {
  const [asgToRevoke, setAsgToRevoke] = useState<AssignmentItem | null>(null);

  const getDaysRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Control de Asignaciones, Plazos y Entregas
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Matriz de permisos por documento, vencimientos y revisión de entregas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="in_progress">En progreso</option>
            <option value="submitted">Entregados</option>
            <option value="approved">Aprobados</option>
            <option value="changes_requested">Requiere correcciones</option>
          </select>

          <button
            onClick={onRefresh}
            title="Refrescar asignaciones"
            className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
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

      {/* Assignments Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
              <tr>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Usuario Asignado</th>
                <th className="px-4 py-3">Permiso en Servidor</th>
                <th className="px-4 py-3">Fecha Límite</th>
                <th className="px-4 py-3">Estado de Entrega</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-neutral-400" />
                      <span>Cargando asignaciones...</span>
                    </div>
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <div className="max-w-sm mx-auto space-y-1">
                      <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                        No hay asignaciones registradas.
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Asigne un documento a un usuario desde la pestaña Documentos o el Calendario.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                assignments.map((asg) => {
                  const daysLeft = getDaysRemaining(asg.dueDate);
                  const isOverdue = daysLeft < 0;
                  const isNear = daysLeft >= 0 && daysLeft <= 3;

                  return (
                    <tr key={asg.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {asg.document?.title || (asg as any).documentTitle || 'Documento Asignado'}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-mono">
                          Tipo: {asg.document?.fileType?.toUpperCase() || (asg as any).fileType?.toUpperCase() || 'PDF'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {asg.userName}
                          </p>
                          <p className="text-neutral-500 font-mono text-[11px]">
                            {asg.userEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                          ↑ Ver y Subir Versión
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-medium text-neutral-800 dark:text-neutral-200 font-mono">
                            {formatDate(asg.dueDate)}
                          </p>
                          {isOverdue ? (
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Vencido ({Math.abs(daysLeft)}d)
                            </span>
                          ) : isNear ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              Vence en {daysLeft} días
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-400">
                              En {daysLeft} días
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {asg.status === 'pending' && (
                          <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Pendiente
                          </span>
                        )}
                        {asg.status === 'in_progress' && (
                          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> En progreso
                          </span>
                        )}
                        {asg.status === 'submitted' && (
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Entregado para revisión
                          </span>
                        )}
                        {asg.status === 'approved' && (
                          <div>
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado
                            </span>
                            {asg.reviewComment && (
                              <p className="text-[10px] text-neutral-400 italic">
                                "{asg.reviewComment}"
                              </p>
                            )}
                          </div>
                        )}
                        {asg.status === 'changes_requested' && (
                          <div>
                            <span className="text-[11px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                              <RotateCcw className="w-3.5 h-3.5" /> Correcciones solicitadas
                            </span>
                            {asg.reviewComment && (
                              <p className="text-[10px] text-neutral-400 italic">
                                "{asg.reviewComment}"
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onReview(asg)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition cursor-pointer"
                          >
                            Revisar
                          </button>
                          <button
                            onClick={() => setAsgToRevoke(asg)}
                            title="Revocar asignación"
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal before revoking */}
      {asgToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Confirmar revocación
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              ¿Desea revocar la asignación de este documento para el usuario{' '}
              <strong>{asgToRevoke.userName}</strong> ({asgToRevoke.userEmail})?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAsgToRevoke(null)}
                className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onRevoke(asgToRevoke.id);
                  setAsgToRevoke(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 transition cursor-pointer"
              >
                Revocar asignación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
