import React from 'react';
import { User } from '../../types';
import {
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  KeyRound,
  History,
  Unlock,
  Trash2,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface AdminUsersTabProps {
  users: User[];
  loading: boolean;
  error?: string | null;
  searchUser: string;
  setSearchUser: (val: string) => void;
  roleFilter: string;
  setRoleFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  onRefresh: () => void;
  onCreateClick: () => void;
  onEditUser: (user: User) => void;
  onResetPassword: (user: User) => void;
  onViewHistory: (user: User) => void;
  onUnlockUser: (userId: string) => void;
  onDeleteUser: (user: User) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  loading,
  error,
  searchUser,
  setSearchUser,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  onRefresh,
  onCreateClick,
  onEditUser,
  onResetPassword,
  onViewHistory,
  onUnlockUser,
  onDeleteUser,
}) => {
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
      {/* Header & Main CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Gestión de Usuarios y Accesos
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Administre cuentas, roles empresariales, contraseñas y desbloqueo de seguridad.
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg transition shadow-xs cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Usuario</span>
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

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            placeholder="Buscar por nombre, correo o departamento..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
        >
          <option value="">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="user">Usuario Estándar</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="locked">Bloqueado</option>
        </select>

        <button
          onClick={onRefresh}
          title="Refrescar lista"
          className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo Electrónico</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha de Creación</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-neutral-400" />
                      <span>Cargando cuentas de usuario...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <div className="max-w-sm mx-auto space-y-1">
                      <Users className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
                      <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                        No se encontraron usuarios coincidentes.
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Utilice el botón "Crear Usuario" para registrar nuevos colaboradores.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                    <td className="px-4 py-3.5 font-medium text-neutral-900 dark:text-neutral-100">
                      {u.name}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-500 font-mono text-[11px]">
                      {u.email}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}
                      >
                        {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-400">
                      {u.department || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {u.status === 'active' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Activo
                        </span>
                      )}
                      {u.status === 'inactive' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          Inactivo
                        </span>
                      )}
                      {u.status === 'locked' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-500 font-mono text-[11px]">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEditUser(u)}
                          title="Editar usuario"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onResetPassword(u)}
                          title="Restablecer contraseña"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onViewHistory(u)}
                          title="Ver historial de accesos"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        {u.status === 'locked' && (
                          <button
                            onClick={() => onUnlockUser(u.id)}
                            title="Desbloquear usuario"
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteUser(u)}
                          title="Eliminar usuario"
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
