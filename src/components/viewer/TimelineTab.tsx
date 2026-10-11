import React from 'react';
import { AuditLogEntry } from '../../types';

interface TimelineTabProps {
  timeline: AuditLogEntry[];
  loadingTimeline: boolean;
  formatDate: (iso: string) => string;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({
  timeline,
  loadingTimeline,
  formatDate,
}) => {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
          Línea de Tiempo de Interacciones
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Registro cronológico de todo lo que cada usuario hizo en este documento.
        </p>
      </div>

      {loadingTimeline ? (
        <div className="py-12 text-center text-xs text-neutral-400 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          Cargando trazabilidad...
        </div>
      ) : timeline.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-500 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          No se registran eventos de auditoría previos para este archivo.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
          {timeline.map((event) => (
            <div key={event.id} className="relative group">
              <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-neutral-900 dark:bg-white border-2 border-white dark:border-neutral-900" />
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-neutral-900 dark:text-neutral-100">
                    {event.action}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {formatDate(event.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Usuario:{' '}
                  <strong className="text-neutral-800 dark:text-neutral-200">
                    {event.userEmail || 'Sistema'}
                  </strong>{' '}
                  · IP: {event.ipAddress}
                </p>
                {event.details && (
                  <p className="text-[11px] text-neutral-500 font-mono truncate">
                    {JSON.stringify(event.details)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
