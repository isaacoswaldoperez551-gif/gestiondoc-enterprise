import React, { useState } from 'react';
import { DocumentItem, User, AssignmentPermission } from '../types';
import { X, UserPlus, Calendar, Shield, AlertCircle } from 'lucide-react';

interface AssignDocumentModalProps {
  document: DocumentItem;
  users: User[];
  authToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignDocumentModal: React.FC<AssignDocumentModalProps> = ({
  document,
  users,
  authToken,
  onClose,
  onSuccess,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [permissionLevel, setPermissionLevel] = useState<AssignmentPermission>('view');
  const [searchTerm, setSearchTerm] = useState('');
  // Default due date to 7 days from now
  const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const [dueDate, setDueDate] = useState(defaultDue);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter to regular active users
  const standardUsers = users.filter((u) => u.role === 'user' && u.status === 'active');
  const filteredUsers = standardUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleUser = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === standardUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(standardUsers.map((u) => u.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      setError('Debe seleccionar al menos un usuario para la asignación.');
      return;
    }
    if (!dueDate) {
      setError('Debe indicar una fecha límite.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          documentId: document.id,
          userIds: selectedUserIds,
          assignedUsers: selectedUserIds.map((uid) => {
            const found = standardUsers.find((u) => u.id === uid);
            return {
              userId: uid,
              userName: found?.name || 'Usuario',
              userEmail: found?.email || '',
            };
          }),
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
          {/* Multi-User Selection List */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Usuarios Asignados a este Trabajo ({selectedUserIds.length} seleccionados) *
              </label>
              {standardUsers.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {selectedUserIds.length === standardUsers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              )}
            </div>

            {standardUsers.length > 4 && (
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar usuario por nombre o correo..."
                className="w-full mb-2 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
              />
            )}

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800/60 max-h-48 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400">
                  No hay usuarios activos disponibles.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={`flex items-center justify-between p-2.5 transition cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/30'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 dark:border-neutral-700"
                        />
                        <div className="w-7 h-7 rounded-full bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 font-bold text-xs flex items-center justify-center uppercase">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                            {u.name}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            {u.email}
                          </p>
                        </div>
                      </div>
                      {u.department && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {u.department}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Puedes seleccionar 1 o 2 (o más) personas para que trabajen juntas en este documento.
            </p>
          </div>

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

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Fecha Límite de Entrega / Cumplimiento *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>
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
              disabled={loading || selectedUserIds.length === 0}
              className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? 'Asignando...'
                : selectedUserIds.length > 1
                ? `Asignar a ${selectedUserIds.length} Personas`
                : 'Confirmar Asignación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
