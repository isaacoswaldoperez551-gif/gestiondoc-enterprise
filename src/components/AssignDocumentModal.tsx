import React, { useState, useEffect } from 'react';
import { DocumentItem, User, AssignmentPermission } from '../types';
import { X, UserPlus, Shield, AlertCircle, Users, Check } from 'lucide-react';

interface AssignDocumentModalProps {
  document: DocumentItem;
  users: User[];
  authToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignDocumentModal: React.FC<AssignDocumentModalProps> = ({
  document,
  users: initialUsers,
  authToken,
  onClose,
  onSuccess,
}) => {
  const [allUsers, setAllUsers] = useState<User[]>(initialUsers || []);
  const [primaryUserId, setPrimaryUserId] = useState('');
  const [assignSecondUser, setAssignSecondUser] = useState(false);
  const [secondaryUserId, setSecondaryUserId] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<AssignmentPermission>('view');
  
  // Default due date to 7 days from now
  const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const [dueDate, setDueDate] = useState(defaultDue);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Always fetch fresh users list to guarantee no user is missed or filtered out
  useEffect(() => {
    fetch('/api/users', { headers: { Authorization: `Bearer ${authToken}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.users && Array.isArray(data.users) && data.users.length > 0) {
          setAllUsers(data.users);
        }
      })
      .catch((err) => console.warn('AssignDocumentModal users load:', err));
  }, [authToken]);

  // Eligible users: all active users (excludes locked)
  const eligibleUsers = allUsers.filter((u) => {
    const status = (u.status || (u as any).estado || 'active').toLowerCase();
    return status !== 'locked' && status !== 'bloqueado';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryUserId) {
      setError('Debe seleccionar al menos un usuario para la asignación.');
      return;
    }
    if (assignSecondUser && !secondaryUserId) {
      setError('Ha activado la opción de 2 personas. Por favor seleccione el segundo colaborador.');
      return;
    }
    if (assignSecondUser && primaryUserId === secondaryUserId) {
      setError('El segundo colaborador debe ser una persona distinta a la primera.');
      return;
    }
    if (!dueDate) {
      setError('Debe indicar una fecha límite.');
      return;
    }

    setError(null);
    setLoading(true);

    const userIdsToAssign = [primaryUserId];
    if (assignSecondUser && secondaryUserId) {
      userIdsToAssign.push(secondaryUserId);
    }

    const assignedUsersPayload = userIdsToAssign.map((uid) => {
      const found = allUsers.find((u) => u.id === uid);
      return {
        userId: uid,
        userName: found?.name || 'Usuario',
        userEmail: found?.email || '',
      };
    });

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          documentId: document.id,
          userIds: userIdsToAssign,
          assignedUsers: assignedUsersPayload,
          permissionLevel,
          dueDate: new Date(dueDate).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al asignar documento.');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError('Error de comunicación con el servidor.');
      setLoading(false);
    }
  };

  const primaryUserObj = allUsers.find((u) => u.id === primaryUserId);
  const secondaryUserObj = allUsers.find((u) => u.id === secondaryUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Asignar Trabajo y Permisos
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-sm">
                {document.title}
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

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Menu de Seleccion 1: Usuario Principal */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
              Usuario Asignado (Persona 1) *
            </label>
            <select
              required
              value={primaryUserId}
              onChange={(e) => setPrimaryUserId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            >
              <option value="">Seleccione un usuario...</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) {u.department ? `· ${u.department}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Opcion para asignar 2 personas */}
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={assignSecondUser}
                onChange={(e) => {
                  setAssignSecondUser(e.target.checked);
                  if (!e.target.checked) setSecondaryUserId('');
                }}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 dark:border-neutral-700"
              />
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Asignar a 2 personas (Trabajo Colaborativo en Equipo)
              </span>
            </label>

            {assignSecondUser && (
              <div className="pt-2 pl-6 space-y-1.5 border-t border-neutral-200/70 dark:border-neutral-800">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Segundo Colaborador Asignado (Persona 2) *
                </label>
                <select
                  required={assignSecondUser}
                  value={secondaryUserId}
                  onChange={(e) => setSecondaryUserId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccione el segundo usuario...</option>
                  {eligibleUsers
                    .filter((u) => u.id !== primaryUserId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) {u.department ? `· ${u.department}` : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Ambas personas recibirán la tarea en sus dispositivos y todas las notificaciones y mensajes caerán a los dos.
                </p>
              </div>
            )}
          </div>

          {/* Resumen de Asignados */}
          {primaryUserObj && (
            <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs">
              <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 block mb-1">
                {assignSecondUser && secondaryUserObj ? '👥 2 Personas asignadas a este trabajo:' : '👤 1 Persona asignada a este trabajo:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 font-medium text-[11px]">
                  ✓ {primaryUserObj.name} ({primaryUserObj.email})
                </span>
                {assignSecondUser && secondaryUserObj && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 font-medium text-[11px]">
                    ✓ {secondaryUserObj.name} ({secondaryUserObj.email})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Permiso en Servidor */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Nivel de Permiso Asignado (Verificado estrictamente en Servidor) *
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  permissionLevel === 'view'
                    ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="permLevel"
                  checked={permissionLevel === 'view'}
                  onChange={() => setPermissionLevel('view')}
                  className="mt-0.5 accent-neutral-900 dark:accent-neutral-100"
                />
                <div>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    a) Solo Ver
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    El usuario puede visualizar el contenido en el visor integrado pero no puede descargar ni subir nuevas versiones.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  permissionLevel === 'download'
                    ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="permLevel"
                  checked={permissionLevel === 'download'}
                  onChange={() => setPermissionLevel('download')}
                  className="mt-0.5 accent-neutral-900 dark:accent-neutral-100"
                />
                <div>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    b) Ver y Descargar
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    El usuario puede visualizar y descargar el archivo con marca de agua y trazabilidad institucional.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  permissionLevel === 'upload_version'
                    ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="permLevel"
                  checked={permissionLevel === 'upload_version'}
                  onChange={() => setPermissionLevel('upload_version')}
                  className="mt-0.5 accent-neutral-900 dark:accent-neutral-100"
                />
                <div>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    c) Ver y Subir Nuevas Versiones
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Permite al usuario subir revisiones o versiones actualizadas y marcar el documento como entregado para revisión.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Fecha Limite */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Fecha Límite de Entrega / Cumplimiento *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !primaryUserId || (assignSecondUser && !secondaryUserId)}
              className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? 'Asignando...'
                : assignSecondUser && secondaryUserId
                ? 'Confirmar Asignación a 2 Personas'
                : 'Confirmar Asignación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
