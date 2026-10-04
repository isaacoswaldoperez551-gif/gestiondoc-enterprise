import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  User,
  AuditLogEntry,
  LoginHistoryEntry,
  DocumentItem,
  Folder,
  Tag,
  AssignmentItem,
} from '../types';
import { UserFormModal, PasswordCreatedModal } from '../components/UserFormModal';
import { ResetPasswordModal } from '../components/ResetPasswordModal';
import { UserHistoryModal } from '../components/UserHistoryModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { UploadDocumentModal } from '../components/UploadDocumentModal';
import { CreateFolderModal } from '../components/CreateFolderModal';
import { AssignDocumentModal } from '../components/AssignDocumentModal';
import { ReviewAssignmentModal } from '../components/ReviewAssignmentModal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { NotificationCenter } from '../components/NotificationCenter';
import { CalendarView } from '../components/CalendarView';
import { seedFirestoreDatabaseIfEmpty } from '../services/firestoreService';
import {
  Users,
  Shield,
  History,
  FileText,
  UserPlus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  Unlock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Moon,
  Sun,
  LogOut,
  RefreshCw,
  FolderOpen,
  FolderPlus,
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  Calendar,
  CheckSquare,
  Clock,
  Send,
  Eye,
  Download,
  Upload,
  Database,
  ExternalLink,
  Flame,
} from 'lucide-react';

interface AdminDashboardProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  darkMode,
  toggleDarkMode,
}) => {
  const { user: currentAdmin, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'documents' | 'assignments' | 'calendar' | 'audit' | 'sessions'>('documents');

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state for users
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userForReset, setUserForReset] = useState<User | null>(null);
  const [userForHistory, setUserForHistory] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newlyGeneratedPassword, setNewlyGeneratedPassword] = useState<string | null>(null);

  // Documents State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [searchDoc, setSearchDoc] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');

  // Modals for documents and assignments
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [docToAssign, setDocToAssign] = useState<DocumentItem | null>(null);
  const [docToView, setDocToView] = useState<DocumentItem | null>(null);
  const [assignmentToReview, setAssignmentToReview] = useState<AssignmentItem | null>(null);

  // Assignments State
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [searchAudit, setSearchAudit] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Sessions State
  const [sessions, setSessions] = useState<LoginHistoryEntry[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Fetch Users
  const fetchUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (searchUser) params.append('search', searchUser);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Folders and Tags
  const fetchFoldersAndTags = async () => {
    if (!token) return;
    try {
      const [fRes, tRes] = await Promise.all([
        fetch('/api/folders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/tags', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (fRes.ok) {
        const fData = await fRes.json();
        setFolders(fData.folders || []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTags(tData.tags || []);
      }
    } catch (err) {
      console.error('Error fetching taxonomy:', err);
    }
  };

  // Fetch Documents
  const fetchDocuments = async () => {
    if (!token) return;
    setLoadingDocs(true);
    try {
      const params = new URLSearchParams();
      if (searchDoc) params.append('search', searchDoc);
      if (selectedFolderFilter) params.append('folderId', selectedFolderFilter);
      if (selectedTagFilter) params.append('tagId', selectedTagFilter);

      const res = await fetch(`/api/documents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Fetch Assignments
  const fetchAssignments = async () => {
    if (!token) return;
    setLoadingAssignments(true);
    try {
      const params = new URLSearchParams();
      if (assignmentStatusFilter) params.append('status', assignmentStatusFilter);

      const res = await fetch(`/api/assignments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    if (!token) return;
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      if (searchAudit) params.append('search', searchAudit);
      if (actionFilter) params.append('action', actionFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Fetch Sessions
  const fetchSessions = async () => {
    if (!token) return;
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const usersList: User[] = data.users || [];
        const allHistories: LoginHistoryEntry[] = [];
        for (const u of usersList.slice(0, 10)) {
          const hRes = await fetch(`/api/users/${u.id}/login-history`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (hRes.ok) {
            const hData = await hRes.json();
            allHistories.push(...(hData.history || []));
          }
        }
        allHistories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setSessions(allHistories);
      }
    } catch (err) {
      console.error('Error fetching session history:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchFoldersAndTags();
    fetchUsers();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const unsubAsg = onSnapshot(collection(firestoreDb, 'asignaciones'), () => {
      fetchAssignments();
    });
    const unsubUsers = onSnapshot(collection(firestoreDb, 'usuarios'), () => {
      fetchUsers();
    });
    return () => {
      unsubAsg();
      unsubUsers();
    };
  }, [token]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'documents') fetchDocuments();
    if (activeTab === 'assignments') fetchAssignments();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'sessions') fetchSessions();
  }, [activeTab, searchDoc, selectedFolderFilter, selectedTagFilter, searchUser, roleFilter, statusFilter, actionFilter, assignmentStatusFilter]);

  const handleDeleteDocument = async (id: string, title: string) => {
    if (!confirm(`¿Mover el documento "${title}" a la papelera de reciclaje?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchDocuments();
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const handleRevokeAssignment = async (asgId: string) => {
    if (!confirm('¿Desea revocar esta asignación de documento?')) return;
    try {
      const res = await fetch(`/api/assignments/${asgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchAssignments();
      }
    } catch (err) {
      console.error('Error revoking assignment:', err);
    }
  };

  const handleUnlockUser = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${userId}/unlock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Error unlocking user:', err);
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
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const renderFileIcon = (type: string) => {
    if (type === 'pdf') {
      return (
        <span className="p-1.5 rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold text-[10px]">
          PDF
        </span>
      );
    }
    if (type === 'xlsx') {
      return (
        <span className="p-1.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
          XLSX
        </span>
      );
    }
    if (type === 'docx') {
      return (
        <span className="p-1.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
          DOCX
        </span>
      );
    }
    return <FileText className="w-4 h-4 text-neutral-400" />;
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Zone 1: Wordmark & Firebase Direct Access */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    GestiónDoc
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                    Admin
                  </span>
                </div>
              </div>

              {/* Direct Firebase Console Link */}
              <a
                href="https://console.firebase.google.com/project/gestion-doc-c9047/firestore"
                target="_blank"
                rel="noreferrer"
                title="Abrir base de datos en Firebase Console"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="hidden sm:inline">Firebase BD</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documentos</span>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'assignments'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Asignaciones & Plazos</span>
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
              <span>Calendario</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Usuarios</span>
            </button>
          </nav>

          {/* Zone 3: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationCenter
              authToken={token || ''}
              onOpenDocument={async (docId) => {
                const found = documents.find((d) => d.id === docId);
                if (found) {
                  setDocToView(found);
                } else {
                  try {
                    const res = await fetch(`/api/documents/${docId}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setDocToView(data.document);
                    }
                  } catch (e) {
                    console.error(e);
                  }
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
                {currentAdmin?.name}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                Rol: Administrador
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
        <div className="flex lg:hidden overflow-x-auto gap-2 pb-2">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              activeTab === 'documents' ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-900'
            }`}
          >
            Documentos
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              activeTab === 'assignments' ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-900'
            }`}
          >
            Asignaciones
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
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              activeTab === 'users' ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-900'
            }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              activeTab === 'audit' ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-900'
            }`}
          >
            Auditoría
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              activeTab === 'sessions' ? 'bg-neutral-900 text-white' : 'bg-white dark:bg-neutral-900'
            }`}
          >
            Accesos
          </button>
        </div>

        {/* TAB: DOCUMENTOS Y ARCHIVOS (FASE 2) */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* Header & Main CTAs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Repositorio Documental Corporativo
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Carga, clasificación por carpetas, etiquetas y control de versiones (.pdf, .docx, .xlsx).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFolderModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Nueva Carpeta</span>
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg transition shadow-xs cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Subir Documento</span>
                </button>
              </div>
            </div>

            {/* Folder and Tag filter pills / tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mr-1">
                Carpetas:
              </span>
              <button
                onClick={() => setSelectedFolderFilter('')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  selectedFolderFilter === ''
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                Todas las carpetas
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolderFilter(f.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    selectedFolderFilter === f.id
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  📁 {f.name}
                </button>
              ))}
            </div>

            {/* Search and filters bar */}
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchDoc}
                  onChange={(e) => setSearchDoc(e.target.value)}
                  placeholder="Buscar documento por título..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
              </div>

              <select
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
              >
                <option value="">Todas las etiquetas</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.name}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchDocuments}
                title="Refrescar lista"
                className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Documents Table */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Documento</th>
                      <th className="px-4 py-3">Carpeta</th>
                      <th className="px-4 py-3">Etiquetas</th>
                      <th className="px-4 py-3">Versión</th>
                      <th className="px-4 py-3">Fecha de Carga</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {loadingDocs ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-neutral-400">
                          Cargando documentos corporativos...
                        </td>
                      </tr>
                    ) : documents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-neutral-400">
                          No se encontraron documentos coincidentes con los filtros.
                        </td>
                      </tr>
                    ) : (
                      documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                          <td className="px-4 py-3.5">{renderFileIcon(doc.fileType)}</td>
                          <td className="px-4 py-3.5">
                            <div>
                              <button
                                onClick={() => setDocToView(doc)}
                                className="font-semibold text-neutral-900 dark:text-neutral-100 hover:underline text-left cursor-pointer"
                              >
                                {doc.title}
                              </button>
                              {doc.isTemplate && (
                                <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                  Plantilla Base
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-400">
                            {doc.folderName ? `📁 ${doc.folderName}` : '— (Raíz)'}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {doc.tags && doc.tags.length > 0 ? (
                                doc.tags.map((t) => (
                                  <span
                                    key={t.id}
                                    className="text-[11px] text-neutral-600 dark:text-neutral-400"
                                  >
                                    #{t.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-neutral-400 text-[11px]">Sin etiquetas</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                              v{doc.versions?.length || 1}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-neutral-500 font-mono text-[11px]">
                            {formatDate(doc.createdAt)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setDocToView(doc)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Abrir</span>
                              </button>
                              <button
                                onClick={() => setDocToAssign(doc)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Asignar</span>
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(doc.id, doc.title)}
                                title="Enviar a papelera"
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
        )}

        {/* TAB: ASIGNACIONES Y PLAZOS (FASE 2) */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Control de Asignaciones, Plazos y Entregas
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Matriz de permisos por documento, vencimientos y revisión de entregas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={assignmentStatusFilter}
                  onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  <option value="">Todos los estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="in_progress">En progreso</option>
                  <option value="submitted">Entregados</option>
                  <option value="approved">Aprobados</option>
                  <option value="changes_requested">Requiere correcciones</option>
                </select>

                <button
                  onClick={fetchAssignments}
                  title="Refrescar asignaciones"
                  className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Assignments Table */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                    <tr>
                      <th className="px-4 py-3">Documento</th>
                      <th className="px-4 py-3">Usuario Asignado</th>
                      <th className="px-4 py-3">Permiso en Servidor</th>
                      <th className="px-4 py-3">Fecha Límite</th>
                      <th className="px-4 py-3">Estado de Entrega</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {loadingAssignments ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-400">
                          Cargando asignaciones...
                        </td>
                      </tr>
                    ) : assignments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-400">
                          No hay asignaciones registradas. Asigne un documento a un usuario desde la pestaña Documentos.
                        </td>
                      </tr>
                    ) : (
                      assignments.map((asg) => {
                        const daysLeft = getDaysRemaining(asg.dueDate);
                        const isOverdue = daysLeft < 0;
                        const isNear = daysLeft >= 0 && daysLeft <= 3;

                        return (
                          <tr key={asg.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                            <td className="px-4 py-3.5">
                              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {asg.document?.title}
                              </p>
                              <p className="text-[11px] text-neutral-500 font-mono">
                                Tipo: {asg.document?.fileType?.toUpperCase()}
                              </p>
                            </td>
                            <td className="px-4 py-3.5">
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                                  {asg.userName}
                                </p>
                                <p className="text-neutral-500 font-mono text-[11px]">
                                  {asg.userEmail}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {asg.permissionLevel === 'view' && (
                                <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-400 font-medium">
                                  <Eye className="w-3.5 h-3.5" /> Solo Ver
                                </span>
                              )}
                              {asg.permissionLevel === 'download' && (
                                <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                  <Download className="w-3.5 h-3.5" /> Ver y Descargar
                                </span>
                              )}
                              {asg.permissionLevel === 'upload_version' && (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <Upload className="w-3.5 h-3.5" /> Ver y Subir Versión
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-mono text-[11px]">
                                <p className="text-neutral-900 dark:text-neutral-100">
                                  {new Date(asg.dueDate).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                                {isOverdue ? (
                                  <p className="text-red-600 dark:text-red-400 font-semibold">
                                    ¡Vencido hace {Math.abs(daysLeft)} días!
                                  </p>
                                ) : isNear ? (
                                  <p className="text-amber-600 dark:text-amber-400 font-semibold">
                                    Vence pronto ({daysLeft} días)
                                  </p>
                                ) : (
                                  <p className="text-neutral-500">En {daysLeft} días</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {asg.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 text-neutral-500 font-medium">
                                  <Clock className="w-3.5 h-3.5" /> Pendiente
                                </span>
                              )}
                              {asg.status === 'in_progress' && (
                                <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                  <Clock className="w-3.5 h-3.5" /> En Progreso
                                </span>
                              )}
                              {asg.status === 'submitted' && (
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                  <Send className="w-3.5 h-3.5" /> Entregado para Revisión
                                </span>
                              )}
                              {asg.status === 'approved' && (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado
                                </span>
                              )}
                              {asg.status === 'changes_requested' && (
                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                                  <AlertCircle className="w-3.5 h-3.5" /> Requiere Correcciones
                                </span>
                              )}
                              {asg.reviewComment && (
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic truncate max-w-xs mt-0.5">
                                  "{asg.reviewComment}"
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setAssignmentToReview(asg)}
                                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                                >
                                  Revisar
                                </button>
                                <button
                                  onClick={() => handleRevokeAssignment(asg.id)}
                                  title="Revocar asignación"
                                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CALENDARIO DE ENTREGAS Y PLAZOS */}
        {activeTab === 'calendar' && (
          <CalendarView
            userRole="admin"
            authToken={token!}
            folders={folders}
            users={users}
            onOpenDocument={(doc) => setDocToView(doc)}
          />
        )}

        {/* TAB: GESTIÓN DE USUARIOS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Control de Cuentas y Accesos
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Gestión de usuarios corporativos, roles y políticas de seguridad.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg transition shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Crear Nuevo Usuario</span>
              </button>
            </div>

            {/* Filters */}
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

              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  <option value="">Todos los roles</option>
                  <option value="admin">Administrador</option>
                  <option value="user">Usuario</option>
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
                  onClick={fetchUsers}
                  title="Refrescar usuarios"
                  className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                    <tr>
                      <th className="px-4 py-3">Usuario y Correo</th>
                      <th className="px-4 py-3">Departamento</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Cambio Obligatorio</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-400">
                          Cargando lista de usuarios...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-400">
                          No se encontraron usuarios coincidentes.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                          <td className="px-4 py-3.5">
                            <div>
                              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {u.name}
                              </p>
                              <p className="text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                                {u.email}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-neutral-600 dark:text-neutral-300">
                            {u.department || '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">
                              {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {u.status === 'active' && (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                              </span>
                            )}
                            {u.status === 'inactive' && (
                              <span className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400 font-medium">
                                <AlertCircle className="w-3.5 h-3.5" /> Inactivo
                              </span>
                            )}
                            {u.status === 'locked' && (
                              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                                <ShieldAlert className="w-3.5 h-3.5" /> Bloqueado
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {u.mustChangePassword ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Pendiente
                              </span>
                            ) : (
                              <span className="text-neutral-400">Completado</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {u.status === 'locked' && (
                                <button
                                  onClick={() => handleUnlockUser(u.id)}
                                  title="Desbloquear cuenta"
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition cursor-pointer"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setUserForReset(u)}
                                title="Restablecer contraseña"
                                className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setUserForHistory(u)}
                                title="Ver historial de inicios de sesión"
                                className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition cursor-pointer"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setUserToEdit(u)}
                                title="Editar usuario"
                                className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {u.id !== currentAdmin?.id && (
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  title="Eliminar usuario"
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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
        )}

        {/* TAB: AUDITORÍA DEL SISTEMA */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Bitácora de Auditoría Inmutable
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Registro de acciones sensibles, cargas de documentos y accesos autorizados/denegados.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchAudit}
                  onChange={(e) => setSearchAudit(e.target.value)}
                  placeholder="Filtrar por acción, correo o IP..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
              </div>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none"
              >
                <option value="">Todas las acciones</option>
                <option value="login">Inicios de sesión</option>
                <option value="document_">Documentos</option>
                <option value="assignment_">Asignaciones</option>
                <option value="unauthorized">Intentos denegados (403)</option>
              </select>

              <button
                onClick={fetchAuditLogs}
                title="Refrescar auditoría"
                className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                    <tr>
                      <th className="px-4 py-3">Fecha y Hora</th>
                      <th className="px-4 py-3">Actor / Correo</th>
                      <th className="px-4 py-3">Acción Registrada</th>
                      <th className="px-4 py-3">Dirección IP</th>
                      <th className="px-4 py-3">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {loadingAudit ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-neutral-400">
                          Cargando bitácora de auditoría...
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-neutral-400">
                          No hay eventos registrados en este período.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                          <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100 font-mono">
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 font-mono">
                            {log.userEmail || 'Sistema'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
                                log.action.includes('unauthorized')
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-500 font-mono text-[11px]">
                            {log.ipAddress}
                          </td>
                          <td className="px-4 py-3 text-neutral-500 text-[11px] max-w-xs truncate">
                            {log.details ? JSON.stringify(log.details) : '—'}
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

        {/* TAB: HISTORIAL GENERAL DE ACCESOS */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Historial General de Inicios de Sesión
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Monitoreo de conexiones corporativas e IPs en tiempo real.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">
                    <tr>
                      <th className="px-4 py-3">Fecha y Hora</th>
                      <th className="px-4 py-3">Usuario / Cuenta</th>
                      <th className="px-4 py-3">Dirección IP</th>
                      <th className="px-4 py-3">Dispositivo / SO</th>
                      <th className="px-4 py-3">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {loadingSessions ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-neutral-400">
                          Cargando accesos recientes...
                        </td>
                      </tr>
                    ) : sessions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-neutral-400">
                          No hay registros de sesiones aún.
                        </td>
                      </tr>
                    ) : (
                      sessions.map((s) => (
                        <tr key={s.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                          <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100 font-mono">
                            {formatDate(s.timestamp)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200 font-mono">
                            {s.userEmail}
                          </td>
                          <td className="px-4 py-3 text-neutral-500 font-mono">
                            {s.ipAddress}
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                            {s.deviceInfo}
                          </td>
                          <td className="px-4 py-3">
                            {s.status === 'success' && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Exitoso
                              </span>
                            )}
                            {s.status === 'failed' && (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Fallido
                              </span>
                            )}
                            {s.status === 'blocked' && (
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                Bloqueado
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
      </main>

      {/* MODALS */}
      {showUploadModal && (
        <UploadDocumentModal
          folders={folders}
          tags={tags}
          authToken={token!}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchDocuments();
          }}
        />
      )}

      {showFolderModal && (
        <CreateFolderModal
          authToken={token!}
          onClose={() => setShowFolderModal(false)}
          onSuccess={() => {
            setShowFolderModal(false);
            fetchFoldersAndTags();
          }}
        />
      )}

      {docToAssign && (
        <AssignDocumentModal
          document={docToAssign}
          users={users}
          authToken={token!}
          onClose={() => setDocToAssign(null)}
          onSuccess={() => {
            setDocToAssign(null);
            fetchAssignments();
            setActiveTab('assignments');
          }}
        />
      )}

      {assignmentToReview && (
        <ReviewAssignmentModal
          assignment={assignmentToReview}
          authToken={token!}
          onClose={() => setAssignmentToReview(null)}
          onSuccess={() => {
            setAssignmentToReview(null);
            fetchAssignments();
          }}
        />
      )}

      {showCreateModal && (
        <UserFormModal
          authToken={token!}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(generatedPassword) => {
            setShowCreateModal(false);
            fetchUsers();
            if (generatedPassword) {
              setNewlyGeneratedPassword(generatedPassword);
            }
          }}
        />
      )}

      {userToEdit && (
        <UserFormModal
          userToEdit={userToEdit}
          authToken={token!}
          onClose={() => setUserToEdit(null)}
          onSuccess={() => {
            setUserToEdit(null);
            fetchUsers();
          }}
        />
      )}

      {userForReset && (
        <ResetPasswordModal
          user={userForReset}
          authToken={token!}
          onClose={() => setUserForReset(null)}
          onSuccess={() => {
            fetchUsers();
          }}
        />
      )}

      {userForHistory && (
        <UserHistoryModal
          user={userForHistory}
          authToken={token!}
          onClose={() => setUserForHistory(null)}
        />
      )}

      {userToDelete && (
        <DeleteConfirmModal
          user={userToDelete}
          authToken={token!}
          onClose={() => setUserToDelete(null)}
          onSuccess={() => {
            setUserToDelete(null);
            fetchUsers();
          }}
        />
      )}

      {newlyGeneratedPassword && (
        <PasswordCreatedModal
          password={newlyGeneratedPassword}
          onClose={() => setNewlyGeneratedPassword(null)}
        />
      )}

      {docToView && (
        <DocumentViewerModal
          document={docToView}
          userRole="admin"
          authToken={token!}
          onClose={() => setDocToView(null)}
          onVersionUploaded={() => {
            fetchDocuments();
            fetchAssignments();
          }}
        />
      )}
    </div>
  );
};
