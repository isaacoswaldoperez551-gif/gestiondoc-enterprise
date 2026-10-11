import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  User,
  DocumentItem,
  AssignmentItem,
  Folder,
  Tag,
  NotificationItem,
  DocumentVersion,
  CommentItem,
  AuditLogEntry,
  LoginHistoryEntry,
} from '../types';

export const INITIAL_USERS: Array<User & { password?: string }> = [
  {
    id: 'usr_admin_isaac',
    name: 'Isaac Perez',
    email: 'isaacoswaldoperez551@gmail.com',
    password: 'tocino2023',
    role: 'admin',
    status: 'active',
    mustChangePassword: false,
    department: 'Administración General / Sistemas',
    createdAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null,
  },
];

export const INITIAL_FOLDERS: Folder[] = [
  { id: 'fld_01', name: 'Recursos Humanos', parentId: null, createdBy: 'usr_admin_isaac', createdAt: new Date().toISOString() },
  { id: 'fld_02', name: 'Finanzas y Contabilidad', parentId: null, createdBy: 'usr_admin_isaac', createdAt: new Date().toISOString() },
  { id: 'fld_03', name: 'Legal y Contratos', parentId: null, createdBy: 'usr_admin_isaac', createdAt: new Date().toISOString() },
  { id: 'fld_04', name: 'Operaciones y Sistemas', parentId: null, createdBy: 'usr_admin_isaac', createdAt: new Date().toISOString() },
];

export const INITIAL_TAGS: Tag[] = [
  { id: 'tag_01', name: 'Confidencial', color: 'purple' },
  { id: 'tag_02', name: 'Urgente', color: 'rose' },
  { id: 'tag_03', name: 'En Revisión', color: 'amber' },
  { id: 'tag_04', name: 'Aprobado', color: 'emerald' },
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc_01',
    title: 'Politica_Seguridad_Informacion_2026.docx',
    fileType: 'docx',
    folderId: 'fld_01',
    folderName: 'Recursos Humanos',
    tagIds: ['tag_01', 'tag_04'],
    currentVersionId: 'ver_01',
    isTemplate: false,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdBy: 'usr_admin_isaac',
    creatorName: 'Isaac Perez',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc_02',
    title: 'Balance_General_Consolidado_Q1.xlsx',
    fileType: 'xlsx',
    folderId: 'fld_02',
    folderName: 'Finanzas y Contabilidad',
    tagIds: ['tag_02', 'tag_03'],
    currentVersionId: 'ver_02',
    isTemplate: false,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdBy: 'usr_admin_isaac',
    creatorName: 'Isaac Perez',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_VERSIONS: DocumentVersion[] = [
  {
    id: 'ver_01',
    documentId: 'doc_01',
    versionNumber: 1,
    storagePath: 'storage/documents/doc_sample_politica.docx',
    originalFilename: 'Politica_Seguridad_Informacion_2026.docx',
    fileSizeBytes: 14200,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    changeSummary: 'Versión inicial aprobada',
    uploadedBy: 'usr_admin_isaac',
    uploaderName: 'Isaac Perez',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ver_02',
    documentId: 'doc_02',
    versionNumber: 1,
    storagePath: 'storage/documents/doc_sample_balance.xlsx',
    originalFilename: 'Balance_General_Consolidado_Q1.xlsx',
    fileSizeBytes: 18500,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    changeSummary: 'Cierre preliminar Q1',
    uploadedBy: 'usr_admin_isaac',
    uploaderName: 'Isaac Perez',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_ASSIGNMENTS: AssignmentItem[] = [];
export const INITIAL_COMMENTS: CommentItem[] = [
  {
    id: 'com_01',
    documentId: 'doc_02',
    userId: 'usr_admin_isaac',
    userName: 'Isaac Perez',
    userEmail: 'isaacoswaldoperez551@gmail.com',
    userRole: 'admin',
    content: 'Revisado y aprobado el reporte financiero Q1.',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_01',
    userId: 'usr_admin_isaac',
    userEmail: 'isaacoswaldoperez551@gmail.com',
    title: 'Bienvenido Isaac Perez',
    message: 'Sistema sincronizado en vivo con Firebase Firestore.',
    type: 'status_change',
    read: false,
    emailSent: false,
    createdAt: new Date().toISOString(),
  },
];

export async function seedFirestoreDatabaseIfEmpty(force: boolean = false): Promise<boolean> {
  try {
    const usuariosCol = collection(db, 'usuarios');
    const userSnapshot = await getDocs(usuariosCol);

    if (userSnapshot.empty || force) {
      console.log('[Firestore Live] Sincronizando colecciones completas en vivo...');

      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'usuarios', u.id), {
          id: u.id,
          userId: u.id,
          name: u.name,
          nombre: u.name,
          email: u.email,
          correo: u.email,
          password: u.password || 'tocino2023',
          role: 'admin',
          rol: 'administrador',
          status: 'active',
          estado: 'activo',
          department: u.department,
          departamento: u.department,
          mustChangePassword: false,
          debeCambiarContrasena: false,
          createdAt: u.createdAt,
          fechaCreacion: u.createdAt,
        });
      }

      for (const f of INITIAL_FOLDERS) {
        await setDoc(doc(db, 'carpetas', f.id), {
          id: f.id,
          nombre: f.name,
          carpetaPadreId: f.parentId,
          creadoPor: f.createdBy,
          fechaCreacion: f.createdAt,
        });
      }

      for (const t of INITIAL_TAGS) {
        await setDoc(doc(db, 'etiquetas', t.id), {
          id: t.id,
          nombre: t.name,
          color: t.color,
        });
      }

      for (const d of INITIAL_DOCUMENTS) {
        await setDoc(doc(db, 'documentos', d.id), {
          id: d.id,
          titulo: d.title,
          tipoArchivo: d.fileType,
          carpetaId: d.folderId,
          nombreCarpeta: d.folderName,
          etiquetasIds: d.tagIds,
          versionActualId: d.currentVersionId,
          esPlantilla: d.isTemplate,
          eliminado: d.isDeleted,
          creadoPor: d.createdBy,
          nombreCreador: d.creatorName,
          fechaCreacion: d.createdAt,
          fechaActualizacion: d.updatedAt,
        });
      }

      for (const v of INITIAL_VERSIONS) {
        await setDoc(doc(db, 'versiones', v.id), {
          id: v.id,
          documentoId: v.documentId,
          numeroVersion: v.versionNumber,
          rutaAlmacenamiento: v.storagePath,
          nombreArchivoOriginal: v.originalFilename,
          tamanoBytes: v.fileSizeBytes,
          tipoMime: v.mimeType,
          resumenCambios: v.changeSummary,
          subidoPor: v.uploadedBy,
          nombreSubcriptor: v.uploaderName,
          fechaCreacion: v.createdAt,
        });
      }

      for (const c of INITIAL_COMMENTS) {
        await setDoc(doc(db, 'comentarios', c.id), {
          id: c.id,
          documentoId: c.documentId,
          usuarioId: c.userId,
          nombreUsuario: c.userName,
          correoUsuario: c.userEmail,
          rolUsuario: c.userRole,
          contenido: c.content,
          fechaCreacion: c.createdAt,
        });
      }

      for (const n of INITIAL_NOTIFICATIONS) {
        await setDoc(doc(db, 'notificaciones', n.id), {
          id: n.id,
          usuarioId: n.userId,
          correoUsuario: n.userEmail,
          titulo: n.title,
          mensaje: n.message,
          tipo: 'sistema',
          leido: false,
          fechaCreacion: n.createdAt,
        });
      }

      const auditEntry = {
        id: `audit_live_${Date.now()}`,
        usuarioId: 'usr_admin_isaac',
        nombreUsuario: 'Isaac Perez',
        accion: 'sistema_sincronizado_en_vivo',
        tipoRecurso: 'sistema',
        detalles: { mensaje: 'Sincronización automática en vivo con Firebase Firestore.' },
        direccionIp: '127.0.0.1',
        fechaHora: new Date().toISOString(),
      };
      await setDoc(doc(db, 'registros_auditoria', auditEntry.id), auditEntry);

      console.log('[Firestore Live] Sincronización en vivo completada exitosamente.');
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[Firestore Live] Error en sincronización:', error);
    return false;
  }
}

export async function syncEntityToFirestore(collectionName: string, id: string, data: any) {
  try {
    await setDoc(doc(db, collectionName, id), data, { merge: true });
  } catch (e) {
    console.warn(`[Firestore Live] Failed to sync ${collectionName}/${id}:`, e);
  }
}

export async function deleteEntityFromFirestore(collectionName: string, id: string) {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (e) {
    console.warn(`[Firestore Live] Failed to delete ${collectionName}/${id}:`, e);
  }
}
