import React, { useEffect, useState } from 'react';
import { LoginHistoryEntry, User } from '../types';
import { X, History, Laptop, Smartphone, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface UserHistoryModalProps {
  user: User;
  authToken: string;
  onClose: () => void;
}

export const UserHistoryModal: React.FC<UserHistoryModalProps> = ({
  user,
  authToken,
  onClose,
}) => {
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}/login-history`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (err) {
        console.error('Error fetching user history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user.id, authToken]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Historial de Inicios de Sesión
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {user.name} ({user.email}) · {user.department || 'Sin área asignada'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              Cargando historial de accesos...
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No hay registros de inicio de sesión aún para este usuario.
            </div>
          ) : (
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                  <tr>
                    <th className="px-4 py-3">Fecha y Hora</th>
                    <th className="px-4 py-3">Dirección IP</th>
                    <th className="px-4 py-3">Dispositivo / Agente</th>
                    <th className="px-4 py-3">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                      <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100 font-mono">
                        {formatDate(item.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-mono">
                        {item.ipAddress}
                      </td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          {item.deviceInfo.includes('Móvil') ? (
                            <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                          <span>{item.deviceInfo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 'success' && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Exitoso
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" /> Fallido
                          </span>
                        )}
                        {item.status === 'blocked' && (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                            <ShieldAlert className="w-3.5 h-3.5" /> Bloqueado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end bg-neutral-50 dark:bg-neutral-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
