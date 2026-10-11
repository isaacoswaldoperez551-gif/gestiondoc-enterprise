import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Check, X, Lock, Eye, EyeOff } from 'lucide-react';

export const MustChangePasswordModal: React.FC = () => {
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user || !user.mustChangePassword) {
    return null;
  }

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const allValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allValid) {
      setError('Por favor complete todos los requisitos de complejidad.');
      return;
    }

    setLoading(true);
    const result = await changePassword(currentPassword, newPassword, confirmPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'No se pudo actualizar la contraseña.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Cambio de Contraseña Obligatorio
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Por políticas de seguridad corporativa, debe definir una nueva contraseña personalizada antes de continuar.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Contraseña actual o temporal
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingrese su contraseña temporal asignada"
                className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Cree una contraseña segura"
                className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Confirmar nueva contraseña
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Vuelva a escribir la nueva contraseña"
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            />
          </div>

          {/* Complexity rules card */}
          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs">
            <p className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Requisitos mínimos de seguridad:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-1.5">
                {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                <span className={hasMinLength ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>Mínimo 8 caracteres</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasUppercase ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                <span className={hasUppercase ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>1 Mayúscula (A-Z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasLowercase ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                <span className={hasLowercase ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>1 Minúscula (a-z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                <span className={hasNumber ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>1 Número (0-9)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                <span className={hasSpecial ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>1 Símbolo especial (!@#$)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isMatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                <span className={isMatch ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>Contraseñas coinciden</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!allValid || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'Guardando contraseña...' : 'Actualizar contraseña y acceder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
