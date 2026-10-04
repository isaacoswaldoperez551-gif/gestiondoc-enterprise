export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'inactive' | 'locked';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  failedAttempts: number;
  lockedUntil: string | null;
  totpSecret: string | null;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  department?: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo: string;
  status: 'success' | 'failed' | 'blocked';
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail?: string;
  action: string;
  resourceType: 'user' | 'auth' | 'document' | 'assignment' | 'folder' | 'system';
  resourceId?: string;
  ipAddress: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export type DocumentFileType = 'pdf' | 'docx' | 'xlsx' | 'other';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  storagePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  changeSummary: string;
  uploadedBy: string;
  uploaderName?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  fileType: DocumentFileType;
  folderId: string | null;
  tagIds: string[];
  currentVersionId: string | null;
  isTemplate: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
  versions?: DocumentVersion[];
}

export type AssignmentPermission = 'view' | 'download' | 'upload_version';
export type AssignmentStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'changes_requested';

export interface Assignment {
  id: string;
  documentId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  groupId?: string | null;
  permissionLevel: AssignmentPermission;
  status: AssignmentStatus;
  dueDate: string;
  firstOpenedAt: string | null;
  lastWorkedAt: string | null;
  reviewComment: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
  document?: Document;
}

export interface DiffChunk {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface CellChange {
  cell: string;
  oldVal: string;
  newVal: string;
}

export interface SheetDiff {
  sheetName: string;
  cellChanges: CellChange[];
}

export interface ComparisonResult {
  fileType: DocumentFileType;
  v1: DocumentVersion;
  v2: DocumentVersion;
  textDiff?: DiffChunk[];
  sheetDiff?: SheetDiff[];
  metadataDiff: { field: string; v1Value: string; v2Value: string }[];
}

export type NotificationType =
  | 'assignment'
  | 'due_soon_7d'
  | 'due_soon_3d'
  | 'due_soon_1d'
  | 'due_today'
  | 'overdue'
  | 'status_change'
  | 'version_uploaded'
  | 'review_completed'
  | 'comment';

export interface NotificationItem {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  message: string;
  type: NotificationType;
  documentId?: string;
  documentTitle?: string;
  assignmentId?: string;
  read: boolean;
  emailSent: boolean;
  emailContent?: {
    to: string;
    subject: string;
    bodyText: string;
    bodyHtml?: string;
  };
  createdAt: string;
}

export interface CommentItem {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  content: string;
  createdAt: string;
}



