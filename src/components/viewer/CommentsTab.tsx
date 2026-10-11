import React from 'react';
import { CommentItem } from '../../types';
import { MessageSquare, Send } from 'lucide-react';

interface CommentsTabProps {
  comments: CommentItem[];
  loadingComments: boolean;
  sendingComment: boolean;
  newCommentText: string;
  setNewCommentText: (s: string) => void;
  onSendComment: (e: React.FormEvent) => void;
  commentsEndRef: React.RefObject<HTMLDivElement | null>;
  formatDate: (iso: string) => string;
}

export const CommentsTab: React.FC<CommentsTabProps> = ({
  comments,
  loadingComments,
  sendingComment,
  newCommentText,
  setNewCommentText,
  onSendComment,
  commentsEndRef,
  formatDate,
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-4 flex flex-col h-full min-h-[480px]">
      <div>
        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
          Hilo de Diálogo y Observaciones
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Canal directo de comunicación sobre este documento entre el administrador y los usuarios asignados.
        </p>
      </div>

      {/* Comments List */}
      <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 overflow-y-auto space-y-3 shadow-xs min-h-[320px] max-h-[420px]">
        {loadingComments ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            Cargando conversación...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
            <p className="font-semibold text-neutral-700 dark:text-neutral-300">
              No hay mensajes en este documento aún.
            </p>
            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
              Inicia el diálogo escribiendo una pregunta, observación o solicitud de revisión a continuación.
            </p>
          </div>
        ) : (
          <>
            {comments.map((c) => (
              <div
                key={c.id}
                className={`p-3.5 rounded-2xl border space-y-2 text-xs transition ${
                  c.userRole === 'admin'
                    ? 'bg-neutral-50 dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700/80 shadow-2xs'
                    : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${
                        c.userRole === 'admin' ? 'bg-indigo-600' : 'bg-blue-600'
                      }`}
                    >
                      {(c.userName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {c.userName}
                    </span>
                    <span
                      className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        c.userRole === 'admin'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {c.userRole === 'admin' ? 'Administrador' : 'Colaborador'}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {formatDate(c.createdAt)}
                  </span>
                </div>
                <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap pl-8">
                  {c.content}
                </p>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </>
        )}
      </div>

      {/* Quick suggestion chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-neutral-400 font-medium mr-1">Mensaje rápido:</span>
        <button
          type="button"
          onClick={() => setNewCommentText('💡 Solicito revisión del documento y observaciones.')}
          className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
        >
          Solicitar revisión
        </button>
        <button
          type="button"
          onClick={() => setNewCommentText('✅ Cambios aplicados y corregidos en la última versión.')}
          className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
        >
          Cambios aplicados
        </button>
        <button
          type="button"
          onClick={() => setNewCommentText('❓ ¿Requiere alguna firma o sello oficial?')}
          className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
        >
          Consulta de firma
        </button>
      </div>

      {/* Comment Input Box */}
      <form onSubmit={onSendComment} className="flex gap-2">
        <input
          type="text"
          required
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Escriba un comentario o respuesta sobre el documento..."
          className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white shadow-2xs"
        />
        <button
          type="submit"
          disabled={sendingComment || !newCommentText.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{sendingComment ? 'Enviando...' : 'Enviar'}</span>
        </button>
      </form>
    </div>
  );
};
