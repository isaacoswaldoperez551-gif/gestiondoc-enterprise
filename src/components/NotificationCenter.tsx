import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { NotificationItem } from '../types';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Mail,
  AlertTriangle,
  FileText,
  MessageSquare,
  UploadCloud,
  CheckCircle2,
  X,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isOnline: boolean;
  lastActive: string;
}

interface NotificationCenterProps {
  authToken: string;
  onOpenDocument?: (docId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  authToken,
  onOpenDocument,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'notifs' | 'online'>('notifs');
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [showOutbox, setShowOutbox] = useState(false);
  const [outboxEmails, setOutboxEmails] = useState<NotificationItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<NotificationItem | null>(null);
  const [toastNotif, setToastNotif] = useState<{ id: string; title: string; message: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // Audio context may be blocked by browser policy
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      const res = await fetch('/api/active-users', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveUsers(data.activeUsers || []);
      }
    } catch (err) {
      console.error('Error fetching active users:', err);
    }
  };

  const fetchOutbox = async () => {
    try {
      const res = await fetch('/api/notifications/email-outbox', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOutboxEmails(data.outbox || []);
      }
    } catch (err) {
      console.error('Error fetching email outbox:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchActiveUsers();

    const unsubNotifs = onSnapshot(
      collection(firestoreDb, 'notificaciones'),
      (snapshot) => {
        const myId = user?.id || '';
        const myEmail = (user?.email || '').toLowerCase();
        const amAdmin = user?.role === 'admin';

        const notifList: NotificationItem[] = [];
        let unread = 0;

        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as any;
          const targetUid = d.userId || d.usuarioId || '';
          const targetEmail = (d.userEmail || d.correoUsuario || '').toLowerCase();
          const targetRole = d.targetRole || d.rolObjetivo;

          // Check if notification is targeted to current logged in user
          const isForMe =
            (myId && targetUid === myId) ||
            (myEmail && targetEmail === myEmail) ||
            (amAdmin && (targetRole === 'admin' || targetUid === 'admin'));

          if (isForMe) {
            const item: NotificationItem = {
              id: d.id || docSnap.id,
              userId: targetUid,
              userEmail: targetEmail,
              title: d.title || d.titulo || 'Notificación',
              message: d.message || d.mensaje || '',
              type: d.type || d.tipo || 'status_change',
              documentId: d.documentId || d.documentoId,
              documentTitle: d.documentTitle || d.tituloDocumento,
              assignmentId: d.assignmentId || d.asignacionId,
              senderUserId: d.senderUserId || d.remitenteId,
              senderUserName: d.senderUserName || d.remitenteNombre,
              targetRole,
              read: !!(d.read || d.leido),
              emailSent: true,
              createdAt: d.createdAt || d.fechaCreacion || new Date().toISOString(),
            };
            notifList.push(item);
            if (!item.read) unread++;
          }
        });

        // Sort descending by creation date
        notifList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Handle newly arrived notifications for real-time chime & WhatsApp toast
        if (!initializedRef.current) {
          // Initial snapshot: mark all existing notifications as seen so we don't chime old alerts
          snapshot.docs.forEach((doc) => seenNotifIdsRef.current.add(doc.id));
          initializedRef.current = true;
        } else {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' && !seenNotifIdsRef.current.has(change.doc.id)) {
              seenNotifIdsRef.current.add(change.doc.id);
              const d = change.doc.data() as any;
              const targetUid = d.userId || d.usuarioId || '';
              const targetEmail = (d.userEmail || d.correoUsuario || '').toLowerCase().trim();
              const targetRole = d.targetRole || d.rolObjetivo;
              const senderUid = d.senderUserId || d.remitenteId || '';

              const isForMe =
                (myId && targetUid === myId) ||
                (myEmail && targetEmail && targetEmail === myEmail) ||
                (amAdmin && (targetRole === 'admin' || targetUid === 'admin'));

              const isSentByMe = senderUid && myId && senderUid === myId;

              if (isForMe && !isSentByMe) {
                playChime();
                setToastNotif({
                  id: change.doc.id,
                  title: d.title || d.titulo || 'Nueva Notificación',
                  message: d.message || d.mensaje || '',
                });
                setTimeout(() => setToastNotif(null), 6000);
              }
            }
          });
        }

        setNotifications(notifList);
        setUnreadCount(unread);
      },
      (e) => console.warn('Firestore notificaciones listener:', e)
    );

    const unsubSessions = onSnapshot(
      collection(firestoreDb, 'sesiones_activas'),
      (snapshot) => {
        const list: ActiveUser[] = [];
        const seen = new Set<string>();
        const now = Date.now();

        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as any;
          const lastAct = d.ultimaActividad ? new Date(d.ultimaActividad).getTime() : (d.fechaInicio ? new Date(d.fechaInicio).getTime() : 0);
          const diffSec = (now - lastAct) / 1000;

          if (d.estaEnLinea && diffSec < 35) {
            const email = (d.correoUsuario || d.email || '').toLowerCase();
            if (email && !seen.has(email)) {
              seen.add(email);
              list.push({
                id: d.usuarioId || docSnap.id,
                name: d.nombreUsuario || d.name || 'Usuario',
                email: d.correoUsuario || d.email || '',
                role: d.rolUsuario === 'admin' ? 'admin' : (d.role || 'user'),
                department: d.departamento || d.department || 'General',
                isOnline: true,
                lastActive: d.ultimaActividad || d.fechaInicio || new Date().toISOString(),
              });
            }
          }
        });

        if (list.length > 0) {
          setActiveUsers(list);
        } else {
          fetchActiveUsers();
        }
      },
      (e) => console.warn('Firestore sesiones_activas listener:', e)
    );

    const unsubComments = onSnapshot(
      collection(firestoreDb, 'comentarios'),
      () => {
        fetchNotifications();
      },
      (e) => console.warn('Firestore comentarios listener:', e)
    );

    const unsubUsers = onSnapshot(
      collection(firestoreDb, 'usuarios'),
      () => {
        fetchActiveUsers();
      },
      (e) => console.warn('Firestore usuarios listener:', e)
    );

    return () => {
      unsubNotifs();
      unsubSessions();
      unsubComments();
      unsubUsers();
    };
  }, [authToken, user?.id, user?.email, user?.role]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'due_soon_7d':
      case 'due_soon_3d':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'due_soon_1d':
      case 'due_today':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'overdue':
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'version_uploaded':
        return <UploadCloud className="w-4 h-4 text-purple-500" />;
      case 'review_completed':
      case 'status_change':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'login':
        return <UserCheck className="w-4 h-4 text-indigo-500" />;
      default:
        return <Bell className="w-4 h-4 text-neutral-400" />;
    }
  };

  const formatRelativeTime = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) {
            fetchNotifications();
            fetchActiveUsers();
          }
        }}
        title="Notificaciones y Usuarios Conectados"
        className="relative p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header with Tabs */}
          <div className="px-3 pt-3 pb-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                <h3 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                  Centro de Alertas
                </h3>
              </div>
              {unreadCount > 0 && tab === 'notifs' && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Marcar leídas</span>
                </button>
              )}
            </div>

            {/* Tab Selector */}
            <div className="flex bg-neutral-200/60 dark:bg-neutral-800 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setTab('notifs')}
                className={`flex-1 py-1 px-2 rounded-lg font-medium transition cursor-pointer ${
                  tab === 'notifs'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                🔔 Notificaciones ({unreadCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('online');
                  fetchActiveUsers();
                }}
                className={`flex-1 py-1 px-2 rounded-lg font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  tab === 'online'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>En Línea ({activeUsers.length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: NOTIFICATIONS LIST */}
          {tab === 'notifs' && (
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/80 max-h-[380px]">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  No tienes notificaciones pendientes.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) handleMarkAsRead(n.id, {} as any);
                      if (n.documentId && onOpenDocument) {
                        onOpenDocument(n.documentId);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 ${
                      !n.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0 mt-0.5">
                      {renderIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                          {n.title}
                        </p>
                        <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-snug">
                        {n.message}
                      </p>
                      {n.documentTitle && (
                        <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                          📄 Apartado: {n.documentTitle}
                        </p>
                      )}
                      {n.emailSent && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                          <Mail className="w-2.5 h-2.5" /> Notificado por correo
                        </span>
                      )}
                    </div>
                    {!n.read && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        title="Marcar como leída"
                        className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: ONLINE CONNECTED USERS */}
          {tab === 'online' && (
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/80 max-h-[380px] p-2 space-y-2">
              <div className="px-2 py-1 text-[11px] font-medium text-neutral-500">
                Usuarios con sesión activa en la plataforma:
              </div>
              {activeUsers.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-400">
                  No hay usuarios activos registrados.
                </div>
              ) : (
                activeUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-7 h-7 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-xs flex items-center justify-center uppercase">
                          {u.name.charAt(0)}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100 leading-none">
                          {u.name}
                        </p>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          {u.email}
                        </p>
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                          u.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {u.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                      <p className="text-[9px] text-neutral-400 font-mono">
                        {formatRelativeTime(u.lastActive)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Footer with Outbox Link */}
          <div className="px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                fetchOutbox();
                setShowOutbox(true);
                setIsOpen(false);
              }}
              className="font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-neutral-400" />
              <span>Ver Bandeja de Correos Reales (Firestore)</span>
            </button>
          </div>
        </div>
      )}

      {/* Real Email Outbox Modal */}
      {showOutbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                <div>
                  <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                    Bandeja de Correos Reales Sincronizados (Firestore - Colección "correos")
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Registro de todas las alertas y notificaciones enviadas y guardadas en Firestore en tiempo real.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOutbox(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content: Master / Detail */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Email List */}
              <div className="w-full sm:w-1/2 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                {outboxEmails.length === 0 ? (
                  <div className="p-12 text-center text-xs text-neutral-400">
                    No hay correos salientes registrados.
                  </div>
                ) : (
                  outboxEmails.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedEmail(item)}
                      className={`p-4 transition cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 ${
                        selectedEmail?.id === item.id ? 'bg-neutral-100 dark:bg-neutral-800' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono text-[11px]">
                          Para: {item.emailContent?.to}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {new Date(item.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {item.emailContent?.subject}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {item.emailContent?.bodyText}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Right Email Preview */}
              <div className="hidden sm:flex flex-1 p-6 overflow-y-auto flex-col bg-neutral-50/50 dark:bg-neutral-950">
                {selectedEmail?.emailContent ? (
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4 shadow-xs">
                    <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3 space-y-1 text-xs">
                      <p>
                        <strong className="text-neutral-500">De:</strong> notificaciones@gestiondoc.empresa.com
                      </p>
                      <p>
                        <strong className="text-neutral-500">Para:</strong>{' '}
                        <span className="font-mono text-neutral-900 dark:text-neutral-100">
                          {selectedEmail.emailContent.to}
                        </span>
                      </p>
                      <p>
                        <strong className="text-neutral-500">Fecha:</strong>{' '}
                        <span className="font-mono">{new Date(selectedEmail.createdAt).toLocaleString('es-ES')}</span>
                      </p>
                      <p>
                        <strong className="text-neutral-500">Asunto:</strong>{' '}
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {selectedEmail.emailContent.subject}
                        </span>
                      </p>
                    </div>
                    <div className="whitespace-pre-wrap text-xs text-neutral-800 dark:text-neutral-200 font-sans leading-relaxed">
                      {selectedEmail.emailContent.bodyText}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
                    Seleccione un correo electrónico de la lista para previsualizar su contenido.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end">
              <button
                onClick={() => setShowOutbox(false)}
                className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cerrar Bandeja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-Style Instant Pop-up Toast Alert */}
      {toastNotif && (
        <div
          onClick={() => {
            setIsOpen(true);
            setToastNotif(null);
          }}
          className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm w-full bg-white dark:bg-neutral-900 border-2 border-emerald-500 rounded-2xl shadow-2xl p-3.5 flex items-start gap-3 cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
            <MessageSquare className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                💬 Mensaje / Alerta Instantánea
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setToastNotif(null);
                }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h4 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate mt-0.5">
              {toastNotif.title}
            </h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 mt-0.5">
              {toastNotif.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
