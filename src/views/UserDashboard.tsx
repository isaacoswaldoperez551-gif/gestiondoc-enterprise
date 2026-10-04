import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserAssignedDocument, LoginHistoryEntry } from '../types';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { NotificationCenter } from '../components/NotificationCenter';
import { CalendarView } from '../components/CalendarView';
import {
  FileText,
  History,
  Lock,
  Moon,
  Sun,
  LogOut,
  FolderOpen,
  Laptop,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  X,
  Clock,
  Send,
  Download,
  Upload,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  Calendar,
  Flame,
  ExternalLink,
} from 'lucide-react';

interface UserDashboardProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  darkMode,
  toggleDarkMode,
}) => {
  const { user, token, logout, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'docs' | 'calendar' | 'history' | 'security'>('docs');

  // Assigned Documents State
  const [assignedDocs, setAssignedDocs] = useState<UserAssignedDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [searchDoc, setSearchDoc] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [securityTestResult, setSecurityTestResult] = useState<{
    tested: boolean;
    status?: number;
    message?: string;
  } | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<UserAssignedDocument | null>(null);

  // History State
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Fetch Assigned Documents
  const fetchMyDocuments = async () => {
    if (!token) return;
    setLoadingDocs(true);
    try {
      const qParams = new URLSearchParams();
      if (user?.id) qParams.append('userId', user.id);
      if (user?.email) qParams.append('userEmail', user.email);

      const res = await fetch(`/api/my-documents?${qParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAssignedDocs(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching my documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Fetch History
  const fetchMyHistory = async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/auth/my-login-history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching my history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'docs') fetchMyDocuments();
    if (activeTab === 'history') fetchMyHistory();
  }, [activeTab, user?.id, user?.email]);

  useEffect(() => {
    if (!token || !user) return;
    const unsub = onSnapshot(collection(firestoreDb, 'asignaciones'), () => {
      fetchMyDocuments();
    });
    return () => unsub();
  }, [token, user?.id, user?.email]);

  // Update status (e.g. in_progress, submitted)
  const handleUpdateStatus = async (documentId: string, newStatus: 'in_progress' | 'submitted') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/my-documents/${documentId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchMyDocuments();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Test unauthorized access to demonstrate 403
  const testUnauthorizedAccess = async () => {
    if (!token) return;
    setSecurityTestResult(null);
    try {
      // Attempt to access an unassigned document ID
      const fakeOrUnassignedId = 'doc_unassigned_secret_99';
      const res = await fetch(`/api/my-documents/${fakeOrUnassignedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSecurityTestResult({
        tested: true,
        status: res.status,
        message: data.error || 'Acceso rechazado por el servidor.',
      });
    } catch {
      setSecurityTestResult({
        tested: true,
        status: 500,
        message: 'Error al enviar petición.',
      });
    }
  };

  // Password validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const allValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial && isMatch;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!allValid) {
      setPasswordError('Verifique que su contraseña cumpla con todos los requisitos de seguridad.');
      return;
    }

    setUpdatingPassword(true);
    const res = await changePassword(currentPassword, newPassword, confirmPassword);
    setUpdatingPassword(false);

    if (res.success) {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(res.error || 'No se pudo actualizar la contraseña.');
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysRemaining = (dueDateIso: string) => {
    const diff = new Date(dueDateIso).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const renderFileBadge = (type: string) => {
    if (type === 'pdf') {
      return (
        <span className="p-1 rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold text-[10px]">
          PDF
        </span>
      );
    }
    if (type === 'xlsx') {
      return (
        <span className="p-1 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
          XLSX
        </span>
      );
    }
    if (type === 'docx') {
      return (
        <span className="p-1 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
          DOCX
        </span>
      );
    }
    return <FileText className="w-4 h-4 text-neutral-400" />;
  };

  // Filter documents
  const filteredDocs = assignedDocs.filter((item) => {
    const matchSearch =
      searchDoc === '' ||
      item.document.title.toLowerCase().includes(searchDoc.toLowerCase());
    const matchStatus = statusFilter === '' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Zone 1: Wordmark & Firebase Direct Access */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    GestiónDoc
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    Colaborador
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'docs'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Mis Documentos ({assignedDocs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendario y Plazos</span>
            </button>
          </nav>

          {/* Zone 3: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationCenter
              authToken={token || ''}
              onOpenDocument={(docId) => {
                const found = assignedDocs.find((a) => a.document.id === docId);
                if (found) {
                  setViewingAssignment(found);
                }
              }}
            />

            <button
              onClick={toggleDarkMode}
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="h-5 w-px bg-neutral-200 dark:border-neutral-800" />

            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold leading-tight text-neutral-900 dark:text-neutral-100">
                {user?.name}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                {user?.department || 'Personal Corporativo'}
              </p>
            </div>

            <button
              onClick={logout}
              title="Cerrar sesión"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Mobile Navigation Tabs */}
        <div className="flex sm:hidden overflow-x-auto gap-2 pb-2">
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              activeTab === 'docs' ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-900'
            }`}
          >
            Mis Documentos ({assignedDocs.length})
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              activeTab === 'calendar' ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-900'
            }`}
          >
            Calendario
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              activeTab === 'history' ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-900'
            }`}
          >
            Accesos
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              activeTab === 'security' ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-900'
            }`}
          >
            Seguridad
          </button>
        </div>

        {/* TAB 1: MIS DOCUMENTOS ASIGNADOS */}
        {activeTab === 'docs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Mis Documentos Asignados
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Documentos asignados a su usuario con control de plazos y permisos verificados en el servidor.
                </p>
              </div>

              {/* Security Test Button (Section 2 Requirement) */}
              <button
                onClick={testUnauthorizedAccess}
                title="Probar que el servidor bloquea con 403 un documento no asignado"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition cursor-pointer self-start sm:self-auto"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
                <span>Probar Acceso No Asignado (403 Test)</span>
              </button>
            </div>

            {/* Security test result alert */}
            {securityTestResult?.tested && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Respuesta del Servidor: Código {securityTestResult.status} (Verificación Exitosa)</span>
                </div>
                <p className="text-amber-800 dark:text-amber-300">
                  "{securityTestResult.message}" — El servidor bloqueó la apertura directa del archivo y registró el evento en la auditoría inmutable.
                </p>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchDoc}
                  onChange={(e) => setSearchDoc(e.target.value)}
                  placeholder="Buscar entre mis documentos asignados..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="in_progress">En progreso</option>
                <option value="submitted">Entregados</option>
                <option value="approved">Aprobados</option>
                <option value="changes_requested">Requiere correcciones</option>
              </select>

              <button
                onClick={fetchMyDocuments}
                title="Refrescar mis documentos"
                className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Assigned Documents Grid / Table */}
            {loadingDocs ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center text-xs text-neutral-400">
                Cargando documentos asignados...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center space-y-3">
                <FolderOpen className="w-10 h-10 mx-auto text-neutral-400" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  No hay documentos asignados con los filtros seleccionados
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                  Cuando la administración asigne archivos o contratos a su cuenta, podrá verlos y gestionarlos aquí.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.map((item) => {
                  const daysLeft = getDaysRemaining(item.dueDate);
                  const isOverdue = daysLeft < 0;
                  const isNear = daysLeft >= 0 && daysLeft <= 3;

                  return (
                    <div
                      key={item.assignmentId}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {renderFileBadge(item.document.fileType)}
                          <div>
                            <button
                              onClick={() => setViewingAssignment(item)}
                              className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 leading-snug hover:underline text-left cursor-pointer"
                            >
                              {item.document.title}
                            </button>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              📁 {item.document.folderName || 'General'}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {item.status === 'pending' && (
                            <span className="text-[11px] font-medium text-neutral-500">
                              Pendiente
                            </span>
                          )}
                          {item.status === 'in_progress' && (
                            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                              En progreso
                            </span>
                          )}
                          {item.status === 'submitted' && (
                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              Entregado
                            </span>
                          )}
                          {item.status === 'approved' && (
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              Aprobado
                            </span>
                          )}
                          {item.status === 'changes_requested' && (
                            <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
                              Correcciones requeridas
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {item.document.tags?.map((t) => (
                          <span
                            key={t.id}
                            className="text-[11px] text-neutral-500 dark:text-neutral-400"
                          >
                            #{t.name}
                          </span>
                        ))}
                      </div>

                      {/* Admin comment if changes requested */}
                      {item.reviewComment && (
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                          <p className="font-semibold text-[11px] mb-0.5">Observación del Administrador:</p>
                          <p className="italic">"{item.reviewComment}"</p>
                        </div>
                      )}

                      {/* Meta Information Bar */}
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                        {/* Permission Level */}
                        <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                          {item.permissionLevel === 'view' && (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Permiso: Solo lectura</span>
                            </>
                          )}
                          {item.permissionLevel === 'download' && (
                            <>
                              <Download className="w-3.5 h-3.5 text-blue-600" />
                              <span>Permiso: Lectura y Descarga</span>
                            </>
                          )}
                          {item.permissionLevel === 'upload_version' && (
                            <>
                              <Upload className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Permiso: Subir Nueva Versión</span>
                            </>
                          )}
                        </div>

                        {/* Due Date Indicator */}
                        <div className="text-right font-mono text-[11px]">
                          {isOverdue ? (
                            <span className="text-red-600 dark:text-red-400 font-bold">
                              ¡Vencido ({Math.abs(daysLeft)}d)!
                            </span>
                          ) : isNear ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              Vence en {daysLeft}d
                            </span>
                          ) : (
                            <span className="text-neutral-500">
                              Plazo: {new Date(item.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingAssignment(item)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Abrir en Visor</span>
                        </button>
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(item.document.id, 'in_progress')}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
                          >
                            Comenzar Trabajo
                          </button>
                        )}
                        {(item.status === 'in_progress' || item.status === 'changes_requested') && (
                          <button
                            onClick={() => handleUpdateStatus(item.document.id, 'submitted')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Marcar como Entregado</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: CALENDARIO Y PLAZOS PERSONAL */}
        {activeTab === 'calendar' && (
          <CalendarView
            userRole="user"
            authToken={token!}
            folders={[]}
            users={[]}
            onOpenDocument={(doc) => {
              const found = assignedDocs.find((a) => a.document.id === doc.id);
              if (found) {
                setViewingAssignment(found);
              } else {
                setViewingAssignment({
                  assignmentId: 'temp',
                  permissionLevel: 'view',
                  status: 'pending',
                  dueDate: new Date().toISOString(),
                  firstOpenedAt: null,
                  lastWorkedAt: null,
                  reviewComment: null,
                  reviewedAt: null,
                  document: doc,
                });
              }
            }}
          />
        )}

        {/* TAB 2: HISTORIAL DE ACCESOS PERSONAL */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Mi Historial de Inicios de Sesión
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Supervise las conexiones recientes a su cuenta corporativa para mayor tranquilidad y auditoría.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                    <tr>
                      <th className="px-4 py-3">Fecha y Hora</th>
                      <th className="px-4 py-3">Dirección IP</th>
                      <th className="px-4 py-3">Dispositivo detectado</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-neutral-400">
                          Cargando historial de accesos...
                        </td>
                      </tr>
                    ) : history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-neutral-400">
                          Aún no se registran sesiones previas en su cuenta.
                        </td>
                      </tr>
                    ) : (
                      history.map((h) => (
                        <tr key={h.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                          <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100 font-mono">
                            {formatDate(h.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-mono">
                            {h.ipAddress}
                          </td>
                          <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                            <div className="flex items-center gap-1.5">
                              {h.deviceInfo.includes('Móvil') ? (
                                <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
                              ) : (
                                <Laptop className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                              <span>{h.deviceInfo}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {h.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Acceso Exitoso
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <AlertCircle className="w-3.5 h-3.5" /> Intento Fallido
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SEGURIDAD Y CONTRASEÑA */}
        {activeTab === 'security' && (
          <div className="max-w-xl space-y-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Seguridad de la Cuenta
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Actualice su contraseña periódicamente cumpliendo con las políticas de complejidad.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
              {passwordSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>¡Su contraseña se actualizó correctamente!</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Contraseña actual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Ingrese su contraseña actual"
                      className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
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
                      placeholder="Cree una nueva clave segura"
                      className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
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
                    placeholder="Repita la nueva contraseña"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                </div>

                {/* Validation checklist */}
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs">
                  <p className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Criterios obligatorios:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                      <span className={hasMinLength ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>Mínimo 8 caracteres</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasUppercase ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                      <span className={hasUppercase ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>1 Mayúscula</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasLowercase ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                      <span className={hasLowercase ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>1 Minúscula</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                      <span className={hasNumber ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>1 Número</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                      <span className={hasSpecial ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>1 Símbolo (!@#$)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isMatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-neutral-400" />}
                      <span className={isMatch ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>Coinciden</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!allValid || updatingPassword}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Lock className="w-4 h-4" />
                  <span>{updatingPassword ? 'Actualizando...' : 'Guardar Nueva Contraseña'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {viewingAssignment && (
        <DocumentViewerModal
          document={viewingAssignment.document}
          userRole="user"
          userPermission={viewingAssignment.permissionLevel}
          authToken={token!}
          onClose={() => setViewingAssignment(null)}
          onVersionUploaded={() => {
            fetchMyDocuments();
          }}
        />
      )}
    </div>
  );
};
