import React, { useState } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { X, Key, UserCheck, AlertTriangle, Copy, Check } from 'lucide-react';

interface UserFormModalProps {
  userToEdit?: User | null;
  onClose: () => void;
  onSuccess: (generatedPassword?: string) => void;
  authToken: string;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  userToEdit,
  onClose,
  onSuccess,
  authToken,
}) => {
  const isEditing = Boolean(userToEdit);

  const [name, setName] = useState(userToEdit?.name || '');
  const [email, setEmail] = useState(userToEdit?.email || '');
  const [department, setDepartment] = useState(userToEdit?.department || '');
  const [role, setRole] = useState<UserRole>(userToEdit?.role || 'user');
  const [status, setStatus] = useState<UserStatus>(userToEdit?.status || 'active');
  const [mustChangePassword, setMustChangePassword] = useState(
    userToEdit ? userToEdit.mustChangePassword : true
  );

  const [passwordMode, setPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [manualPassword, setManualPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = isEditing ? `/api/users/${userToEdit!.id}` : '/api/users';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = isEditing
        ? {
            name,
            department,
            role,
            status,
            mustChangePassword,
          }
        : {
            name,
            email,
            department,
            role,
            generateRandomPassword: passwordMode === 'auto',
            password: passwordMode === 'manual' ? manualPassword : undefined,
            mustChangePassword,
          };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ocurrió un error al procesar el usuario.');
        setLoading(false);
        return;
      }

      onSuccess(data.generatedPassword);
    } catch (err) {
      setError('Error de comunicación con el servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {isEditing ? 'Editar Cuenta de Usuario' : 'Crear Nueva Cuenta Corporativa'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Roberto Sánchez"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                disabled={isEditing}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Departamento / Área
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ej. Legal, Auditoría, Finanzas"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Rol en la Plataforma *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              >
                <option value="user">Usuario (Solo documentos asignados)</option>
                <option value="admin">Administrador (Acceso y control total)</option>
              </select>
            </div>
          </div>

          {isEditing && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Estado de la Cuenta
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo (Acceso revocado)</option>
                <option value="locked">Bloqueado (Por intentos fallidos)</option>
              </select>
            </div>
          )}

          {!isEditing && (
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-3">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Asignación de Contraseña Inicial
              </label>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="passwordMode"
                    checked={passwordMode === 'auto'}
                    onChange={() => setPasswordMode('auto')}
                    className="accent-neutral-900 dark:accent-neutral-100"
                  />
                  <span>Generar temporal segura automáticamente</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="passwordMode"
                    checked={passwordMode === 'manual'}
                    onChange={() => setPasswordMode('manual')}
                    className="accent-neutral-900 dark:accent-neutral-100"
                  />
                  <span>Definir manualmente</span>
                </label>
              </div>

              {passwordMode === 'manual' && (
                <div>
                  <input
                    type="password"
                    required
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    placeholder="Mín. 8 caracteres, mayúscula, número y símbolo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="mustChangeCheck"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="w-4 h-4 rounded text-neutral-900 dark:text-neutral-100 focus:ring-0 cursor-pointer"
            />
            <label
              htmlFor="mustChangeCheck"
              className="text-xs font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              Exigir cambio de contraseña en el próximo inicio de sesión
            </label>
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
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal to present generated temporary password clearly to admin
export const PasswordCreatedModal: React.FC<{
  password: string;
  onClose: () => void;
}> = ({ password, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Key className="w-5 h-5" />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Contraseña Temporal Generada
          </h3>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Proporcione esta contraseña temporal al usuario. Se le exigirá cambiarla inmediatamente al iniciar sesión.
        </p>

        <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <span className="font-mono text-sm font-bold tracking-wider text-neutral-900 dark:text-neutral-100 select-all">
            {password}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiada' : 'Copiar'}</span>
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 transition cursor-pointer"
          >
            Entendido y cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
