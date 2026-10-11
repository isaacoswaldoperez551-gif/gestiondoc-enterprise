import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin?: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
}) => {
  const [step, setStep] = useState<'request' | 'verify' | 'new_password' | 'success'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setInfoMessage(data.message);
        // If in development and devToken returned, prefill or inform for ease of testing
        if (data.devToken) {
          setCode(data.devToken);
        }
        setStep('verify');
      } else {
        setError(data.error || 'Ocurrió un error al solicitar el código de recuperación.');
      }
    } catch (err) {
      setLoading(false);
      setError('Error de conexión con el servidor. Intente nuevamente.');
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError('Por favor ingrese el código de verificación.');
      return;
    }
    setStep('new_password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError('Debe completar ambos campos de contraseña.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('La contraseña debe contener al menos una letra mayúscula.');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('La contraseña debe contener al menos un número.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: code.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setStep('success');
      } else {
        setError(data.error || 'No se pudo restablecer la contraseña. El código puede haber expirado.');
      }
    } catch (err) {
      setLoading(false);
      setError('Error de conexión al restablecer la contraseña.');
    }
  };

  const handleFinish = () => {
    onClose();
    if (onSuccessLogin && email) {
      onSuccessLogin(email);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Recuperación de Contraseña
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                GestiónDoc Enterprise Security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span className={step === 'request' ? 'text-indigo-600 dark:text-indigo-400' : ''}>
              1. Correo
            </span>
            <span>→</span>
            <span className={step === 'verify' ? 'text-indigo-600 dark:text-indigo-400' : ''}>
              2. Código
            </span>
            <span>→</span>
            <span className={step === 'new_password' ? 'text-indigo-600 dark:text-indigo-400' : ''}>
              3. Nueva Clave
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{
                width:
                  step === 'request'
                    ? '33%'
                    : step === 'verify'
                    ? '66%'
                    : step === 'new_password'
                    ? '90%'
                    : '100%',
              }}
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* PASO 1: PEDIR CORREO */}
          {step === 'request' && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Ingrese su correo electrónico institucional. Le enviaremos un código de seguridad para restablecer su acceso.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Correo electrónico *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  <span>{loading ? 'Enviando...' : 'Enviar Código'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* PASO 2: INGRESAR CÓDIGO */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {infoMessage && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300">
                  {infoMessage}
                </div>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Revise la bandeja de salida de correos (Campana superior o buzón institucional). Ingrese el código de 6 dígitos recibido:
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Código de verificación (Válido 15 minutos) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                    placeholder="Ej. 583921"
                    className="w-full pl-9 pr-3.5 py-2 font-mono text-sm tracking-widest rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center uppercase"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a pedir correo</span>
                </button>
                <button
                  type="submit"
                  disabled={!code.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* PASO 3: NUEVA CONTRASEÑA */}
          {step === 'new_password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Establezca su nueva contraseña. Debe cumplir los requisitos de seguridad corporativa.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres, mayúscula y número"
                    className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita la nueva contraseña"
                    className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password complexity checklist */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-[11px] space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Reglas de seguridad obligatorias:
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={newPassword.length >= 8 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {newPassword.length >= 8 ? '✓' : '•'}
                  </span>
                  <span className={newPassword.length >= 8 ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-500'}>
                    Mínimo 8 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {/[A-Z]/.test(newPassword) ? '✓' : '•'}
                  </span>
                  <span className={/[A-Z]/.test(newPassword) ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-500'}>
                    Al menos una letra mayúscula (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={/[0-9]/.test(newPassword) ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {/[0-9]/.test(newPassword) ? '✓' : '•'}
                  </span>
                  <span className={/[0-9]/.test(newPassword) ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-500'}>
                    Al menos un número (0-9)
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('verify')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al código</span>
                </button>
                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Restablecer Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* PASO 4: ÉXITO */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ¡Contraseña Restablecida!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Su cuenta ha sido desbloqueada y su contraseña ha sido actualizada correctamente.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer shadow-xs"
              >
                Ir a Iniciar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
