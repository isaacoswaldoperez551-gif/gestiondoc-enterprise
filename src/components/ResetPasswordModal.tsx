import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, X, Copy, Check } from 'lucide-react';

interface ResetPasswordModalProps {
  user: User;
  authToken: string;
  onClose: () => void;
  onSuccess: (tempPassword?: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  authToken,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [manualPassword, setManualPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          generateRandom: mode === 'auto',
          newPassword: mode === 'manual' ? manualPassword : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al restablecer la contraseña.');
        setLoading(false);
        return;
      }

      setTemporaryPassword(data.temporaryPassword);
      setLoading(false);
      onSuccess(data.temporaryPassword);
    } catch (err) {
      setError('Error de comunicación con el servidor.');
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Restablecer Contraseña
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Usuario: <strong className="text-neutral-900 dark:text-neutral-100">{user.name}</strong> ({user.email}).
          Se forzará el cambio obligatorio en su próximo acceso.
        </p>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        {temporaryPassword ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                ¡Contraseña restablecida exitosamente!
              </p>
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-neutral-800 rounded-lg border border-emerald-200 dark:border-emerald-700">
                <span className="font-mono text-sm font-bold text-neutral-900 dark:text-neutral-100 select-all">
                  {temporaryPassword}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiada' : 'Copiar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Comparta esta clave temporal con el usuario. El sistema le pedirá definir una nueva al ingresar.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 pt-2">
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="resetMode"
                  checked={mode === 'auto'}
                  onChange={() => setMode('auto')}
                  className="accent-neutral-900 dark:accent-neutral-100"
                />
                <span>Generar contraseña temporal segura automática</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="resetMode"
                  checked={mode === 'manual'}
                  onChange={() => setMode('manual')}
                  className="accent-neutral-900 dark:accent-neutral-100"
                />
                <span>Asignar contraseña manual</span>
              </label>
            </div>

            {mode === 'manual' && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Nueva contraseña manual
                </label>
                <input
                  type="password"
                  required
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres, números y símbolos"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
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
                className="px-4 py-2 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Restableciendo...' : 'Confirmar Restablecimiento'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
