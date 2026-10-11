import React, { useState } from 'react';
import { AssignmentItem } from '../types';
import { X, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';

interface ReviewAssignmentModalProps {
  assignment: AssignmentItem;
  authToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewAssignmentModal: React.FC<ReviewAssignmentModalProps> = ({
  assignment,
  authToken,
  onClose,
  onSuccess,
}) => {
  const [status, setStatus] = useState<'approved' | 'changes_requested'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/assignments/${assignment.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status,
          reviewComment: reviewComment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al registrar la revisión.');
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
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Revisar Entrega de Documento
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs space-y-1">
          <p className="font-medium text-neutral-900 dark:text-neutral-100">
            {assignment.document?.title}
          </p>
          <p className="text-neutral-500 dark:text-neutral-400">
            Entregado por: {assignment.userName} ({assignment.userEmail})
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Decisión de Revisión *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('approved')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  status === 'approved'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprobar Entrega</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('changes_requested')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  status === 'changes_requested'
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>Solicitar Correcciones</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Comentarios o Instrucciones de Revisión
            </label>
            <textarea
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Indique las observaciones o felicitaciones de entrega..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Registrar Revisión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
