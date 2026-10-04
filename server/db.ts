import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  User,
  LoginHistoryEntry,
  AuditLogEntry,
  Folder,
  Tag,
  Document,
  DocumentVersion,
  Assignment,
  NotificationItem,
  CommentItem,
} from './types';
import { ensureSampleFilesExist } from './storage';

interface DatabaseSchema {
  users: User[];
  loginHistory: LoginHistoryEntry[];
  auditLogs: AuditLogEntry[];
  folders: Folder[];
  tags: Tag[];
  documents: Document[];
  documentVersions: DocumentVersion[];
  assignments: Assignment[];
  comments: CommentItem[];
  notifications: NotificationItem[];
  groups: any[];
  groupMemberships: any[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbInstance: DatabaseSchema | null = null;

function seedDatabase(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const now = new Date();
  const nowIso = now.toISOString();

  // Create sample physical files on disk
  const sampleFiles = ensureSampleFilesExist();

  const defaultUsers: User[] = [
    {
      id: 'usr_admin_isaac',
      name: 'Isaac Perez',
      email: 'isaacoswaldoperez551@gmail.com',
      passwordHash: bcrypt.hashSync('tocino2023', salt),
      role: 'admin',
      status: 'active',
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
      totpSecret: null,
      totpEnabled: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      department: 'Administración General / Sistemas',
    },
  ];

  const defaultFolders: Folder[] = [
    {
      id: 'fld_01',
      name: 'Contratos Legales',
      parentId: null,
      createdBy: 'usr_admin_01',
      createdAt: nowIso,
    },
    {
      id: 'fld_02',
      name: 'Balances & Finanzas',
      parentId: null,
      createdBy: 'usr_admin_01',
      createdAt: nowIso,
    },
    {
      id: 'fld_03',
      name: 'Recursos Humanos & Políticas',
      parentId: null,
      createdBy: 'usr_admin_01',
      createdAt: nowIso,
    },
  ];

  const defaultTags: Tag[] = [
    { id: 'tag_01', name: 'Urgente', color: '#DC2626' },
    { id: 'tag_02', name: 'Auditoría 2026', color: '#2563EB' },
    { id: 'tag_03', name: 'Confidencial', color: '#7C3AED' },
    { id: 'tag_04', name: 'Revisión Pendiente', color: '#D97706' },
  ];

  const defaultVersions: DocumentVersion[] = [
    {
      id: 'ver_01',
      documentId: 'doc_01',
      versionNumber: 1,
      storagePath: sampleFiles.pdfFile,
      originalFilename: 'contrato_servicios_tecnologicos_v1.pdf',
      fileSizeBytes: 420000,
      mimeType: 'application/pdf',
      changeSummary: 'Versión inicial firmada por gerencia general',
      uploadedBy: 'usr_admin_01',
      uploaderName: 'Administrador Principal',
      createdAt: nowIso,
    },
    {
      id: 'ver_02',
      documentId: 'doc_02',
      versionNumber: 1,
      storagePath: sampleFiles.xlsxFile,
      originalFilename: 'balance_general_q3_borrador.xlsx',
      fileSizeBytes: 865000,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      changeSummary: 'Plantilla de balance contable consolidado',
      uploadedBy: 'usr_admin_01',
      uploaderName: 'Administrador Principal',
      createdAt: nowIso,
    },
    {
      id: 'ver_03',
      documentId: 'doc_03',
      versionNumber: 1,
      storagePath: sampleFiles.docxFile,
      originalFilename: 'politicas_seguridad_info_2026.docx',
      fileSizeBytes: 245000,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      changeSummary: 'Normativa corporativa de control documental',
      uploadedBy: 'usr_admin_01',
      uploaderName: 'Administrador Principal',
      createdAt: nowIso,
    },
  ];

  const defaultDocuments: Document[] = [
    {
      id: 'doc_01',
      title: 'Contrato Marco de Servicios Tecnológicos 2026',
      fileType: 'pdf',
      folderId: 'fld_01',
      tagIds: ['tag_01', 'tag_03'],
      currentVersionId: 'ver_01',
      isTemplate: false,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: 'usr_admin_01',
      creatorName: 'Administrador Principal',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'doc_02',
      title: 'Estados Financieros y Balance General Q3',
      fileType: 'xlsx',
      folderId: 'fld_02',
      tagIds: ['tag_02', 'tag_04'],
      currentVersionId: 'ver_02',
      isTemplate: false,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: 'usr_admin_01',
      creatorName: 'Administrador Principal',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'doc_03',
      title: 'Manual de Políticas de Seguridad de la Información',
      fileType: 'docx',
      folderId: 'fld_03',
      tagIds: ['tag_03'],
      currentVersionId: 'ver_03',
      isTemplate: false,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: 'usr_admin_01',
      creatorName: 'Administrador Principal',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  // Due dates: doc 1 in 5 days, doc 2 in 2 days, doc 3 in 7 days
  const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const defaultAssignments: Assignment[] = [
    {
      id: 'asg_01',
      documentId: 'doc_01',
      userId: 'usr_user_01', // Carlos Mendoza
      userName: 'Carlos Mendoza',
      userEmail: 'carlos.mendoza@empresa.com',
      permissionLevel: 'download', // Ver y descargar
      status: 'in_progress',
      dueDate: in5Days,
      firstOpenedAt: nowIso,
      lastWorkedAt: nowIso,
      reviewComment: null,
      reviewedBy: null,
      reviewedAt: null,
      assignedBy: 'usr_admin_01',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'asg_02',
      documentId: 'doc_02',
      userId: 'usr_user_01', // Carlos Mendoza
      userName: 'Carlos Mendoza',
      userEmail: 'carlos.mendoza@empresa.com',
      permissionLevel: 'upload_version', // Ver y subir nuevas versiones
      status: 'pending',
      dueDate: in2Days,
      firstOpenedAt: null,
      lastWorkedAt: null,
      reviewComment: null,
      reviewedBy: null,
      reviewedAt: null,
      assignedBy: 'usr_admin_01',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'asg_03',
      documentId: 'doc_03',
      userId: 'usr_user_02', // Lucía Vega
      userName: 'Lucía Vega',
      userEmail: 'lucia.vega@empresa.com',
      permissionLevel: 'view', // Solo ver
      status: 'approved',
      dueDate: in7Days,
      firstOpenedAt: nowIso,
      lastWorkedAt: nowIso,
      reviewComment: 'Aprobado conforme a las regulaciones de auditoría.',
      reviewedBy: 'usr_admin_01',
      reviewedAt: nowIso,
      assignedBy: 'usr_admin_01',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const initialAudit: AuditLogEntry[] = [
    {
      id: 'aud_init_01',
      userId: 'usr_admin_01',
      userEmail: 'admin@empresa.com',
      action: 'system_initialized',
      resourceType: 'system',
      ipAddress: '127.0.0.1',
      userAgent: 'System Installer',
      details: { message: 'Sistema de Gestión Documental inicializado con documentos y asignaciones de prueba' },
      timestamp: nowIso,
    },
  ];

  return {
    users: defaultUsers,
    loginHistory: [],
    auditLogs: initialAudit,
    folders: defaultFolders,
    tags: defaultTags,
    documents: defaultDocuments,
    documentVersions: defaultVersions,
    assignments: defaultAssignments,
    comments: [],
    notifications: [],
    groups: [],
    groupMemberships: [],
  };
}

export function getDb(): DatabaseSchema {
  if (!dbInstance) {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        dbInstance = JSON.parse(raw);
        // Ensure arrays exist if migrating from phase 1
        if (!dbInstance?.folders || dbInstance.folders.length === 0) {
          const fresh = seedDatabase();
          dbInstance!.folders = fresh.folders;
          dbInstance!.tags = fresh.tags;
          dbInstance!.documents = fresh.documents;
          dbInstance!.documentVersions = fresh.documentVersions;
          dbInstance!.assignments = fresh.assignments;
          saveDb();
        }
      } catch (err) {
        console.error('Error reading db.json, re-seeding:', err);
        dbInstance = seedDatabase();
        saveDb();
      }
    } else {
      dbInstance = seedDatabase();
      saveDb();
    }
  }
  return dbInstance!;
}

export function saveDb(): void {
  if (!dbInstance) return;
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(dbInstance, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// User repository
export const UserRepository = {
  findAll: (): User[] => getDb().users,
  findById: (id: string): User | undefined => getDb().users.find((u) => u.id === id),
  findByEmail: (email: string): User | undefined => {
    const q = email.trim().toLowerCase();
    return getDb().users.find(
      (u) =>
        u.email.toLowerCase() === q ||
        u.name.toLowerCase() === q ||
        (q.includes('isaac') && (q.includes('perez') || q.includes('pérez'))) ||
        q === 'admin' ||
        q === 'admin@empresa.com' ||
        q === 'isaac.perez@empresa.com'
    );
  },
  create: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'failedAttempts' | 'lockedUntil'>): User => {
    const db = getDb();
    const newUser: User = {
      ...data,
      id: 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb();
    return newUser;
  },
  update: (id: string, updates: Partial<User>): User | null => {
    const db = getDb();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    db.users[index] = {
      ...db.users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDb();
    return db.users[index];
  },
  delete: (id: string): boolean => {
    const db = getDb();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    db.users.splice(index, 1);
    saveDb();
    return true;
  },
};

// Login history repository
export const LoginHistoryRepository = {
  create: (entry: Omit<LoginHistoryEntry, 'id' | 'timestamp'>): LoginHistoryEntry => {
    const db = getDb();
    const newEntry: LoginHistoryEntry = {
      ...entry,
      id: 'log_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
      timestamp: new Date().toISOString(),
    };
    db.loginHistory.unshift(newEntry);
    if (db.loginHistory.length > 1000) db.loginHistory.pop();
    saveDb();
    return newEntry;
  },
  findByUserId: (userId: string): LoginHistoryEntry[] => {
    return getDb().loginHistory.filter((lh) => lh.userId === userId);
  },
  findAll: (): LoginHistoryEntry[] => getDb().loginHistory,
};

// Audit logs repository
export const AuditRepository = {
  create: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry => {
    const db = getDb();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: 'aud_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
      timestamp: new Date().toISOString(),
    };
    db.auditLogs.unshift(newEntry);
    if (db.auditLogs.length > 2000) db.auditLogs.pop();
    saveDb();
    return newEntry;
  },
  findAll: (): AuditLogEntry[] => getDb().auditLogs,
};

// Folder repository
export const FolderRepository = {
  findAll: (): Folder[] => getDb().folders,
  findById: (id: string): Folder | undefined => getDb().folders.find((f) => f.id === id),
  create: (name: string, userId: string, parentId: string | null = null): Folder => {
    const db = getDb();
    const newFolder: Folder = {
      id: 'fld_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10),
      name: name.trim(),
      parentId,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    db.folders.push(newFolder);
    saveDb();
    return newFolder;
  },
  delete: (id: string): boolean => {
    const db = getDb();
    const idx = db.folders.findIndex((f) => f.id === id);
    if (idx === -1) return false;
    db.folders.splice(idx, 1);
    // Unassign folder from documents in it
    db.documents.forEach((d) => {
      if (d.folderId === id) d.folderId = null;
    });
    saveDb();
    return true;
  },
};

// Tag repository
export const TagRepository = {
  findAll: (): Tag[] => getDb().tags,
  findById: (id: string): Tag | undefined => getDb().tags.find((t) => t.id === id),
  create: (name: string, color: string = '#2563EB'): Tag => {
    const db = getDb();
    const existing = db.tags.find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) return existing;
    const newTag: Tag = {
      id: 'tag_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8),
      name: name.trim(),
      color,
    };
    db.tags.push(newTag);
    saveDb();
    return newTag;
  },
};

// Document & Version repository
export const DocumentRepository = {
  findAll: (includeDeleted = false): Document[] => {
    const db = getDb();
    const docs = includeDeleted ? db.documents : db.documents.filter((d) => !d.isDeleted);
    return docs.map((d) => {
      const versions = db.documentVersions.filter((v) => v.documentId === d.id);
      return { ...d, versions };
    });
  },
  findById: (id: string): Document | undefined => {
    const db = getDb();
    const doc = db.documents.find((d) => d.id === id);
    if (!doc) return undefined;
    const versions = db.documentVersions.filter((v) => v.documentId === doc.id);
    return { ...doc, versions };
  },
  create: (data: Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedBy'>): Document => {
    const db = getDb();
    const newDoc: Document = {
      ...data,
      id: 'doc_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10),
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.documents.push(newDoc);
    saveDb();
    return newDoc;
  },
  update: (id: string, updates: Partial<Document>): Document | null => {
    const db = getDb();
    const idx = db.documents.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    db.documents[idx] = {
      ...db.documents[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDb();
    return db.documents[idx];
  },
  softDelete: (id: string, deletedBy: string): boolean => {
    const db = getDb();
    const idx = db.documents.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    db.documents[idx].isDeleted = true;
    db.documents[idx].deletedAt = new Date().toISOString();
    db.documents[idx].deletedBy = deletedBy;
    db.documents[idx].updatedAt = new Date().toISOString();
    saveDb();
    return true;
  },
  restore: (id: string): boolean => {
    const db = getDb();
    const idx = db.documents.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    db.documents[idx].isDeleted = false;
    db.documents[idx].deletedAt = null;
    db.documents[idx].deletedBy = null;
    db.documents[idx].updatedAt = new Date().toISOString();
    saveDb();
    return true;
  },
};

export const DocumentVersionRepository = {
  create: (data: Omit<DocumentVersion, 'id' | 'createdAt'>): DocumentVersion => {
    const db = getDb();
    const newVersion: DocumentVersion = {
      ...data,
      id: 'ver_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    db.documentVersions.push(newVersion);
    saveDb();
    return newVersion;
  },
  findByDocumentId: (documentId: string): DocumentVersion[] => {
    return getDb().documentVersions.filter((v) => v.documentId === documentId);
  },
  findById: (id: string): DocumentVersion | undefined => {
    return getDb().documentVersions.find((v) => v.id === id);
  },
};

// Assignment repository
export const AssignmentRepository = {
  findAll: (): Assignment[] => {
    const db = getDb();
    return db.assignments.map((asg) => {
      const doc = db.documents.find((d) => d.id === asg.documentId);
      const user = db.users.find((u) => u.id === asg.userId);
      return {
        ...asg,
        document: doc,
        userName: user?.name,
        userEmail: user?.email,
      };
    });
  },
  findById: (id: string): Assignment | undefined => {
    const db = getDb();
    const asg = db.assignments.find((a) => a.id === id);
    if (!asg) return undefined;
    const doc = db.documents.find((d) => d.id === asg.documentId);
    const user = db.users.find((u) => u.id === asg.userId);
    return {
      ...asg,
      document: doc,
      userName: user?.name,
      userEmail: user?.email,
    };
  },
  findByUserId: (userId: string): Assignment[] => {
    const db = getDb();
    return db.assignments
      .filter((a) => a.userId === userId)
      .map((asg) => {
        const doc = db.documents.find((d) => d.id === asg.documentId && !d.isDeleted);
        return {
          ...asg,
          document: doc,
        };
      })
      .filter((asg) => asg.document !== undefined); // Only non-deleted documents
  },
  findByDocumentAndUser: (documentId: string, userId: string): Assignment | undefined => {
    return getDb().assignments.find((a) => a.documentId === documentId && a.userId === userId);
  },
  create: (data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'firstOpenedAt' | 'lastWorkedAt' | 'reviewComment' | 'reviewedBy' | 'reviewedAt'>): Assignment => {
    const db = getDb();
    // If assignment already exists for user and document, update it
    const existingIdx = db.assignments.findIndex(
      (a) => a.documentId === data.documentId && a.userId === data.userId
    );
    const nowIso = new Date().toISOString();

    if (existingIdx !== -1) {
      db.assignments[existingIdx] = {
        ...db.assignments[existingIdx],
        permissionLevel: data.permissionLevel,
        dueDate: data.dueDate,
        updatedAt: nowIso,
      };
      saveDb();
      return db.assignments[existingIdx];
    }

    const newAssignment: Assignment = {
      ...data,
      id: 'asg_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10),
      firstOpenedAt: null,
      lastWorkedAt: null,
      reviewComment: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.assignments.push(newAssignment);
    saveDb();
    return newAssignment;
  },
  update: (id: string, updates: Partial<Assignment>): Assignment | null => {
    const db = getDb();
    const idx = db.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    db.assignments[idx] = {
      ...db.assignments[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDb();
    return db.assignments[idx];
  },
  delete: (id: string): boolean => {
    const db = getDb();
    const idx = db.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    db.assignments.splice(idx, 1);
    saveDb();
    return true;
  },
};

// Notification Repository
export const NotificationRepository = {
  findAll: (): NotificationItem[] => {
    return getDb().notifications || [];
  },
  findByUserId: (userId: string): NotificationItem[] => {
    const db = getDb();
    if (!db.notifications) db.notifications = [];
    return db.notifications
      .filter((n) => n.userId === userId || n.userId === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  create: (data: Omit<NotificationItem, 'id' | 'createdAt' | 'read' | 'emailSent'>): NotificationItem => {
    const db = getDb();
    if (!db.notifications) db.notifications = [];
    const newNotif: NotificationItem = {
      ...data,
      id: 'notif_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10),
      read: false,
      emailSent: true, // Simulated email sent automatically
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(newNotif);
    // Keep max 1000 notifications
    if (db.notifications.length > 1000) db.notifications.pop();
    saveDb();
    return newNotif;
  },
  markAsRead: (id: string, userId: string): boolean => {
    const db = getDb();
    if (!db.notifications) return false;
    const notif = db.notifications.find((n) => n.id === id && (n.userId === userId || n.userId === 'all'));
    if (!notif) return false;
    notif.read = true;
    saveDb();
    return true;
  },
  markAllAsRead: (userId: string): number => {
    const db = getDb();
    if (!db.notifications) return 0;
    let count = 0;
    db.notifications.forEach((n) => {
      if ((n.userId === userId || n.userId === 'all') && !n.read) {
        n.read = true;
        count++;
      }
    });
    if (count > 0) saveDb();
    return count;
  },
  findOutbox: (): NotificationItem[] => {
    const db = getDb();
    if (!db.notifications) return [];
    return db.notifications
      .filter((n) => n.emailContent !== undefined)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
};

// Comment Repository
export const CommentRepository = {
  findByDocumentId: (documentId: string): CommentItem[] => {
    const db = getDb();
    if (!db.comments) db.comments = [];
    return db.comments
      .filter((c) => c.documentId === documentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },
  create: (data: Omit<CommentItem, 'id' | 'createdAt'>): CommentItem => {
    const db = getDb();
    if (!db.comments) db.comments = [];
    const newComment: CommentItem = {
      ...data,
      id: 'cmt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    db.comments.push(newComment);
    saveDb();
    return newComment;
  },
};

