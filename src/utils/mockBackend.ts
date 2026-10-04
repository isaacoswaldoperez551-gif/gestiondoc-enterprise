// In-browser mock backend engine with FormData upload and live Firestore sync support
import * as XLSX from 'xlsx';
import {
  User,
  LoginHistoryEntry,
  AuditLogEntry,
  Folder,
  Tag,
  DocumentItem,
  DocumentVersion,
  AssignmentItem,
  NotificationItem,
  CommentItem,
  DocumentFileType,
} from '../types';
import { seedFirestoreDatabaseIfEmpty, syncEntityToFirestore, deleteEntityFromFirestore } from '../services/firestoreService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';

const fileStorageMap = new Map<string, ArrayBuffer>();

const DEFAULT_BLANK_DOCX_BASE64 = `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3vbT85zznvf0mG2/q/VupD0U3hi5z6YyIQLK6q2y3Uzf3w9TkwghSmMNmBya0fXepm/z3U126l4KjI0PThmlplJ33m1AAt/7B11rQatS2q7m4j4O28XfD1sro3p/2g0383I42eT6M3qf+lM1qO27bvepIn9sL1bXp9IeA/1z8U31O+9/25RByxWwXk+q97I0/1J3v1d3t50f2XzE4T2q1l13s7u6s6s/3L435zK5A4yB1Y5u7p3f3R624S8/m8/eL/a0v62O+R32v9n6eXv4s95/2b37B4vH+Xh61OaWf3yPIn4C2Lz/G9n8G9D++j8CAAD//wMAUEsDBBQABgAIAAAAIQCl5sE27gEAAJ0DAAARAAAAd29yZC9mb290bm90ZXMueG1slJNRi4MwFIXvB/sPhu8mbm1GXZfhhW1jYA9j2vS13CSpia4/ffsltE/b3S483Lvc83LOidvhR1vvtAtO2S0iT0fSoBDEmbbKInI/Plq6kgAia21sCByR+2Byt7t9343m8qXqQWl0AagOynpIn/p32xsg0A+6UpLqSso3eSc24bgp3H1sL/So1Eez5i3i98l2XU379X3A63m+OeeX8Uft94t9C32C5s9mfe6X2/L+60A2K3YftJmN9YfG2b35m31u/fip6X8I7YI0S6f+tN/fF6v8C/79X/l0e5sO2pU1fI2l/4f8/sXqH639B0a3X7u7/48A/AEAAP//AwBQSwMEFAAGAAgAAAAhADq58XJgAwAA/A4AABEAAAB3b3JkL2RvY3VtZW50LnhtbKSX227bRhCG7wv0HQjeS9aStq6R5SBAiwao10C/AGNJ3FptI3E33n37zO6SIqS2A7i3L44535n9Z7/dzO79eb3L9mSllG224fF0GJ4QqbSpte434ad313cvwwOitO5EbaRuN+GSrPDr6fPne3s/m/m14SgI229Cpdvd3f2y3IyluS2I6lV2p63pSpO0R/p98yY6mbeUfXn20/a9X/mptqjF9I4P91eK6G77u2w+P3E98jE9fD6UdrNq32288H1mKz9q00/e3O3t3+s3L/42fP+5mIUnGtr1qG13v68L63fP82fP3dO8f/L/43H/96uIu1/s0eP5y+T7v/0X41d4iO4mD9XqLrx3j7+329v17P23y18+Xv3s32X5s0aL6G4u4Ift/E3YjK31Y/y1702/33wM316fH5O3d/62f6mff//fI/e18cM3H5v0+vLp3W302H016f40xJv3p9v969vN5Pvtg9pU//1o1/05pft30Z++1aKq3s4/Xv9E3/x+7/z1sXp7ft58m/f3u5v5eM9v+q1b1990xW4Wp//0q6X3qX9B8O3GInm4vXl+fXpA1/I2S063x34o+6s19qE8Yh3q8S/U4+4v/31eA/O4uU904/P88S09N2/2d6f+d/D3/GZ1S5Lz1234c9S2f/D32367+/f18aNptn32f+P+pP09A36a/+v/qX8s7aG47d/f3iT/13mIq/39d3mS3mYp+/4o+3e/0T+36E8N675X34qP0+Pve/L8+eN9X/fL48c7u8bE9qf26m9Y822c+y1I1kE5/0c1fH5iX2XJve83iR6aM3yPqf3iI//v/9S4/8zGj0n0r40R42s+f4n0mR/mbfI+294m6S7b3yb9u13fJv33eNsnf9f2NvnG9m2S3mX721O+y+7vTfl/3L/369s+2z7i333/x35tT7e9e43m+vL/f0a4/348Hgb+70jO4+fTj6/4X9/+/iO600P3M4u4m/n2e42fRnd/S882Lg/Y2qP/f0jY1f8L/wsAAP//AwBQSwMEFAAGAAgAAAAhACWc836rAAAA9AAAABMAAAB3b3JkL251bWJlcmluZy54bWx4jc/LasMwEAXQvX9R6J3Ych4u0hhDYd003XbRF2BsWYi2ZWRlsf9eO49kUWj35mIezg12d1806IkoRfe23E9sI030tefntv/xctv3tiI494A+m/atQttdX14Mt74e30o4oNl67mzb6p144S4cByC8s6aX3U18J8Iq94fOqJ+0GInG1x9Lp/T3p3O3VSoGSo422H2Rijx53U52N+x3YI0I8X/3D++d6f9U9jE5C8AAM//AwBQSwMEFAAGAAgAAAAhAEqQ7S5iBgAARxoAABUAAAB3b3JkL3RoZW1lL3RoZW1lMS54bWx5ZU/bMBDvS/sdiO/t2E4aI1SJS9ut2m2aNk0ae4zXie3sL433Sng0vS3m0Pai3SAt2m1S2iS4dOmf3R2I34A9p3p/X19/O3O2frOpI21M4Tlh4473V44veIInCRvHneD943vvd83CkyLGGUMJ7wSX2EGr/enThxfUlyfptM94PAnpM84T1AnfKj1OwtDYymat31/a13lhI3i282TMyfAG/m/iEky0aGq3U3aTh5v04e9x4J+2A/J98xZ34e8o4fI4I0M/T3IeE4/qO558eN+A9yZf7yP7yS33A2rK/e0A4v4Wf3f+9/vITh/xQoJ8/P4O+v948332/eT28X0K3yX49xL/vXG/64UeD18S/Kzx/xbfq3bXm7E3A9I0I74uX3fbl1Xvwwyom5kE03Wrt1Ovd0C1f1225L10e6XfAtLut/y1s30A4Pdr/PzE9+21A6y9138e4N9n3s12P63162X1ew/f/X/u8H+P94O3/v1i2881gL36jwAAAA==`;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  try {
    const cleanBase64 = base64.replace(/^data:.*?;base64,/, '').replace(/\s/g, '');
    const binaryString = window.atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (err) {
    console.error('Error converting base64 to ArrayBuffer:', err);
    return new ArrayBuffer(0);
  }
}

interface LocalDb {
  users: Array<User & { password: string }>;
  loginHistory: LoginHistoryEntry[];
  auditLogs: AuditLogEntry[];
  folders: Folder[];
  tags: Tag[];
  documents: DocumentItem[];
  documentVersions: DocumentVersion[];
  assignments: AssignmentItem[];
  comments: CommentItem[];
  notifications: NotificationItem[];
  currentUser: User | null;
}

const STORAGE_KEY = 'gestiondoc_client_db_v9';

const INITIAL_DB: LocalDb = {
  users: [
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
    },
  ],
  loginHistory: [],
  auditLogs: [],
  folders: [
    { id: 'fld_01', name: 'Recursos Humanos', parentId: null, createdBy: 'usr_admin_isaac', createdAt: new Date().toISOString() },
    { id: 'fld_02', name: 'Finanzas y Contabilidad', parentId: null, createdBy: 'usr_admin_isaac', createdAt: new Date().toISOString() },
    { id: 'fld_03', name: 'Legal y Contratos', parentId: null, createdBy: 'usr_admin_isaac', createdAt: new Date().toISOString() },
    { id: 'fld_04', name: 'Operaciones y Sistemas', parentId: null, createdBy: 'usr_admin_isaac', createdAt: new Date().toISOString() },
  ],
  tags: [
    { id: 'tag_01', name: 'Confidencial', color: 'purple' },
    { id: 'tag_02', name: 'Urgente', color: 'rose' },
    { id: 'tag_03', name: 'En Revisión', color: 'amber' },
    { id: 'tag_04', name: 'Aprobado', color: 'emerald' },
  ],
  documents: [],
  documentVersions: [],
  assignments: [],
  comments: [],
  notifications: [
    {
      id: 'notif_01',
      userId: 'usr_admin_isaac',
      userEmail: 'isaacoswaldoperez551@gmail.com',
      title: 'Bienvenido Isaac Perez',
      message: 'Sistema sincronizado en vivo con Firebase Firestore.',
      type: 'status_change',
      read: false,
      emailSent: true,
      createdAt: new Date().toISOString(),
    },
  ],
  currentUser: null,
};

seedFirestoreDatabaseIfEmpty().catch(() => {});

function getLocalDb(): LocalDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
      return INITIAL_DB;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DB;
  }
}

function saveLocalDb(db: LocalDb) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to persist local DB', e);
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status = 400): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function pushNotificationAndEmail(
  db: LocalDb,
  userId: string,
  userEmail: string,
  title: string,
  message: string,
  type: string = 'status_change',
  documentId?: string,
  documentTitle?: string,
  assignmentId?: string,
  senderUserId?: string,
  senderUserName?: string,
  targetRole?: string
) {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const item: NotificationItem = {
    id: notifId,
    userId,
    userEmail,
    title,
    message,
    type: type as any,
    documentId,
    documentTitle,
    assignmentId,
    senderUserId: senderUserId || db.currentUser?.id || 'system',
    senderUserName: senderUserName || db.currentUser?.name || 'Sistema',
    targetRole,
    read: false,
    emailSent: true,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(item);
  saveLocalDb(db);

  await syncEntityToFirestore('notificaciones', item.id, {
    ...item,
    usuarioId: userId,
    correoUsuario: userEmail,
    titulo: title,
    mensaje: message,
    tipo: type,
    documentoId: documentId || null,
    tituloDocumento: documentTitle || null,
    asignacionId: assignmentId || null,
    remitenteId: item.senderUserId,
    remitenteNombre: item.senderUserName,
    rolObjetivo: targetRole || null,
    leido: false,
    fechaCreacion: item.createdAt,
  });
  await syncEntityToFirestore('correos', `email_${item.id}`, {
    id: `email_${item.id}`,
    para: userEmail,
    asunto: title,
    mensaje: message,
    fecha: item.createdAt,
    leido: false,
  });
}

export async function handleMockRequest(url: string, init?: RequestInit): Promise<Response | null> {
  const method = (init?.method || 'GET').toUpperCase();
  const parsedUrl = new URL(url, window.location.origin);
  const path = parsedUrl.pathname.replace(/^.*\/api\//, '/api/');
  const searchParams = parsedUrl.searchParams;
  const db = getLocalDb();

  let body: any = {};
  if (init?.body && !(init.body instanceof FormData) && typeof init.body === 'string') {
    try {
      body = JSON.parse(init.body);
    } catch (e) {}
  }

  // --- AUTH ROUTES ---
  if (path === '/api/auth/login' && method === 'POST') {
    const { email, password } = body;
    const q = (email || '').trim().toLowerCase();

    try {
      const usersSnap = await getDocs(collection(firestoreDb, 'usuarios'));
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const firestoreUser = {
          id: data.id || docSnap.id,
          name: data.nombre || data.name || 'Usuario',
          email: data.correo || data.email || '',
          password: data.password || 'tocino2023',
          role: data.rol === 'administrador' ? 'admin' : (data.role || 'user'),
          status: data.estado || data.status || 'active',
          mustChangePassword: !!data.debeCambiarContrasena,
          department: data.departamento || data.department || '',
          createdAt: data.fechaCreacion || data.createdAt || new Date().toISOString(),
        };
        const existingIdx = db.users.findIndex(
          (u) => u.id === firestoreUser.id || u.email.toLowerCase() === firestoreUser.email.toLowerCase()
        );
        if (existingIdx === -1) {
          db.users.push(firestoreUser);
        } else {
          db.users[existingIdx].password = firestoreUser.password;
          db.users[existingIdx].name = firestoreUser.name;
          db.users[existingIdx].role = firestoreUser.role;
        }
      });
      saveLocalDb(db);
    } catch (e) {
      console.warn('Could not fetch users from Firestore during login:', e);
    }

    const user = db.users.find(
      (u) => u.email.toLowerCase() === q
    );

    if (!user || user.password !== password) {
      return errorResponse('Correo o contraseña incorrectos.', 401);
    }

    const safeUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      department: user.department,
      createdAt: user.createdAt,
    };
    db.currentUser = safeUser;
    
    user.status = 'active';
    await syncEntityToFirestore('usuarios', user.id, {
      id: user.id,
      nombre: user.name,
      correo: user.email,
      rol: user.role,
      estado: 'activo',
      estaEnLinea: true,
      ultimaConexion: new Date().toISOString(),
    });
    await syncEntityToFirestore('sesiones_activas', user.id, {
      id: user.id,
      usuarioId: user.id,
      nombreUsuario: user.name,
      correoUsuario: user.email,
      rolUsuario: user.role,
      departamento: user.department || '',
      estaEnLinea: true,
      fechaInicio: new Date().toISOString(),
      ultimaActividad: new Date().toISOString(),
    });

    const loginEntry: LoginHistoryEntry = {
      id: `log_${Date.now()}`,
      userId: user.id,
      userEmail: user.email,
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
      deviceInfo: 'Terminal Web',
      status: 'success',
      timestamp: new Date().toISOString(),
    };
    db.loginHistory.unshift(loginEntry);
    await syncEntityToFirestore('login_history', loginEntry.id, loginEntry);

    // Notify admin of new login session
    const adminUser = db.users.find((u) => u.role === 'admin');
    if (adminUser) {
      pushNotificationAndEmail(
        db,
        adminUser.id,
        adminUser.email,
        `🔑 Nuevo inicio de sesión: ${user.name}`,
        `El usuario ${user.name} (${user.email}) ha iniciado sesión el ${new Date().toLocaleString('es-ES')}.`,
        'login'
      );
    }

    saveLocalDb(db);

    return jsonResponse({ user: safeUser, token: 'mock-jwt-token' });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    if (db.currentUser) return jsonResponse({ user: db.currentUser });
    return errorResponse('No autenticado', 401);
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    if (db.currentUser) {
      const u = db.users.find((x) => x.id === db.currentUser?.id);
      if (u) {
        u.status = 'inactive';
        await syncEntityToFirestore('usuarios', u.id, {
          id: u.id,
          estado: 'inactivo',
          estaEnLinea: false,
          ultimaConexion: new Date().toISOString(),
        });
      }
      await syncEntityToFirestore('sesiones_activas', db.currentUser.id, {
        id: db.currentUser.id,
        usuarioId: db.currentUser.id,
        nombreUsuario: db.currentUser.name,
        correoUsuario: db.currentUser.email,
        rolUsuario: db.currentUser.role,
        departamento: db.currentUser.department || '',
        estaEnLinea: false,
        fechaCierre: new Date().toISOString(),
        ultimaActividad: new Date().toISOString(),
      });
    }
    db.currentUser = null;
    saveLocalDb(db);
    return jsonResponse({ success: true });
  }

  if (path === '/api/auth/heartbeat' && method === 'POST') {
    if (db.currentUser) {
      const u = db.users.find((x) => x.id === db.currentUser?.id);
      if (u) {
        u.status = 'active';
      }
      await syncEntityToFirestore('usuarios', db.currentUser.id, {
        id: db.currentUser.id,
        nombre: db.currentUser.name,
        correo: db.currentUser.email,
        rol: db.currentUser.role,
        estado: 'activo',
        estaEnLinea: true,
        ultimaConexion: new Date().toISOString(),
      });
      await syncEntityToFirestore('sesiones_activas', db.currentUser.id, {
        id: db.currentUser.id,
        usuarioId: db.currentUser.id,
        nombreUsuario: db.currentUser.name,
        correoUsuario: db.currentUser.email,
        rolUsuario: db.currentUser.role,
        departamento: db.currentUser.department || '',
        estaEnLinea: true,
        fechaInicio: new Date().toISOString(),
        ultimaActividad: new Date().toISOString(),
      });
    }
    return jsonResponse({ success: true });
  }

  if (path === '/api/auth/change-password' && method === 'POST') {
    if (!db.currentUser) return errorResponse('No autenticado', 401);
    const { currentPassword, newPassword } = body;
    const userIdx = db.users.findIndex((u) => u.id === db.currentUser!.id);
    if (userIdx === -1) return errorResponse('Usuario no encontrado', 404);
    if (db.users[userIdx].password !== currentPassword) {
      return errorResponse('La contraseña actual es incorrecta', 400);
    }
    db.users[userIdx].password = newPassword;
    db.users[userIdx].mustChangePassword = false;
    db.currentUser.mustChangePassword = false;
    syncEntityToFirestore('usuarios', db.users[userIdx].id, {
      id: db.users[userIdx].id,
      nombre: db.users[userIdx].name,
      correo: db.users[userIdx].email,
      password: db.users[userIdx].password,
      rol: db.users[userIdx].role,
      estado: db.users[userIdx].status,
      departamento: db.users[userIdx].department,
    });
    saveLocalDb(db);
    return jsonResponse({ message: 'Contraseña actualizada con éxito' });
  }

  if (path === '/api/health') {
    return jsonResponse({ status: 'ok', mode: 'live-firestore-sync' });
  }

  // --- USERS ---
  if (path === '/api/users' && method === 'GET') {
    try {
      const usersSnap = await getDocs(collection(firestoreDb, 'usuarios'));
      usersSnap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const uItem = {
          id: d.id || docSnap.id,
          name: d.nombre || d.name || 'Usuario',
          email: d.correo || d.email || '',
          password: d.password || 'tocino2023',
          role: d.rol === 'administrador' ? 'admin' : (d.role || 'user'),
          status: d.estado || d.status || 'active',
          mustChangePassword: !!d.debeCambiarContrasena,
          department: d.departamento || d.department || '',
          createdAt: d.fechaCreacion || d.createdAt || new Date().toISOString(),
        };
        const idx = db.users.findIndex(
          (u) => u.id === uItem.id || u.email.toLowerCase() === uItem.email.toLowerCase()
        );
        if (idx === -1) {
          db.users.push(uItem as any);
        } else {
          db.users[idx] = { ...db.users[idx], ...uItem };
        }
      });
      saveLocalDb(db);
    } catch (e) {
      console.warn('Error syncing users in GET /api/users:', e);
    }
    return jsonResponse({ users: db.users.map(({ password, ...u }) => u) });
  }

  if (path === '/api/users' && method === 'POST') {
    const newUser: User & { password: string } = {
      id: `usr_${Date.now()}`,
      name: body.name,
      email: body.email,
      password: body.password || 'TempPass123!',
      role: body.role || 'user',
      status: 'active',
      mustChangePassword: true,
      department: body.department || '',
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    await syncEntityToFirestore('usuarios', newUser.id, {
      id: newUser.id,
      nombre: newUser.name,
      correo: newUser.email,
      password: newUser.password,
      rol: newUser.role === 'admin' ? 'administrador' : newUser.role,
      estado: newUser.status,
      debeCambiarContrasena: newUser.mustChangePassword,
      departamento: newUser.department,
      fechaCreacion: newUser.createdAt,
    });

    await pushNotificationAndEmail(
      db,
      newUser.id,
      newUser.email,
      `Bienvenido a GestiónDoc, ${newUser.name}`,
      `Tu cuenta ha sido creada con éxito. Tu contraseña temporal es: ${newUser.password}. Por favor inicia sesión y cámbiala.`
    );

    saveLocalDb(db);
    const { password, ...safe } = newUser;
    return jsonResponse({ user: safe }, 201);
  }

  if (path.match(/^\/api\/users\/[^/]+$/) && method === 'DELETE') {
    const userId = path.split('/')[3];
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx === -1) return errorResponse('Usuario no encontrado', 404);
    const deleted = db.users.splice(idx, 1)[0];
    deleteEntityFromFirestore('usuarios', userId);

    const auditEntry: AuditLogEntry = {
      id: `aud_${Date.now()}`,
      userId: db.currentUser?.id || 'usr_admin_isaac',
      userEmail: db.currentUser?.email || 'isaacoswaldoperez551@gmail.com',
      action: 'DELETE_USER',
      resourceType: 'user',
      resourceId: userId,
      details: { message: `Usuario eliminado: ${deleted.name} (${deleted.email})` },
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    db.auditLogs.unshift(auditEntry);
    syncEntityToFirestore('registros_auditoria', auditEntry.id, auditEntry);

    saveLocalDb(db);
    return jsonResponse({ success: true });
  }

  if (path.match(/^\/api\/users\/[^/]+\/login-history$/) && method === 'GET') {
    const userId = path.split('/')[3];
    const userHistory = db.loginHistory.filter((h) => h.userId === userId);
    return jsonResponse({ loginHistory: userHistory });
  }

  if (path.match(/^\/api\/users\/[^/]+\/reset-password$/) && method === 'POST') {
    const userId = path.split('/')[3];
    const user = db.users.find((u) => u.id === userId);
    if (!user) return errorResponse('Usuario no encontrado', 404);
    const newTempPass = body.newPassword || `Temp${Math.random().toString(36).substring(2, 8)}!`;
    user.password = newTempPass;
    user.mustChangePassword = true;
    syncEntityToFirestore('usuarios', user.id, {
      id: user.id,
      nombre: user.name,
      correo: user.email,
      password: user.password,
      rol: user.role,
      estado: user.status,
      departamento: user.department,
    });
    saveLocalDb(db);
    return jsonResponse({ message: 'Contraseña restablecida con éxito', temporaryPassword: newTempPass });
  }

  if (path.match(/^\/api\/users\/[^/]+\/unlock$/) && method === 'POST') {
    const userId = path.split('/')[3];
    const user = db.users.find((u) => u.id === userId);
    if (!user) return errorResponse('Usuario no encontrado', 404);
    user.status = 'active';
    syncEntityToFirestore('usuarios', user.id, {
      id: user.id,
      nombre: user.name,
      correo: user.email,
      password: user.password,
      rol: user.role,
      estado: 'active',
      departamento: user.department,
    });
    saveLocalDb(db);
    return jsonResponse({ message: 'Usuario desbloqueado con éxito' });
  }

  // --- AUDIT LOGS ---
  if (path === '/api/audit-logs' && method === 'GET') {
    return jsonResponse({ logs: db.auditLogs });
  }

  // --- FOLDERS & TAGS ---
  if (path === '/api/folders' && method === 'GET') {
    return jsonResponse({ folders: db.folders });
  }
  if (path === '/api/folders' && method === 'POST') {
    const newFld: Folder = {
      id: `fld_${Date.now()}`,
      name: body.name,
      parentId: body.parentId || null,
      createdBy: db.currentUser?.id || 'usr_admin_isaac',
      createdAt: new Date().toISOString(),
    };
    db.folders.push(newFld);
    syncEntityToFirestore('carpetas', newFld.id, {
      id: newFld.id,
      nombre: newFld.name,
      carpetaPadreId: newFld.parentId,
      creadoPor: newFld.createdBy,
      fechaCreacion: newFld.createdAt,
    });
    saveLocalDb(db);
    return jsonResponse({ folder: newFld }, 201);
  }

  if (path === '/api/tags' && method === 'GET') {
    return jsonResponse({ tags: db.tags });
  }
  if (path === '/api/tags' && method === 'POST') {
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name: body.name,
      color: body.color || 'blue',
    };
    db.tags.push(newTag);
    syncEntityToFirestore('etiquetas', newTag.id, {
      id: newTag.id,
      nombre: newTag.name,
      color: newTag.color,
    });
    saveLocalDb(db);
    return jsonResponse({ tag: newTag }, 201);
  }

  // --- DOCUMENTS & UPLOAD ---
  if (path === '/api/documents' && method === 'GET') {
    try {
      const docsSnap = await getDocs(collection(firestoreDb, 'documentos'));
      docsSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const ext = ((data.tipoArchivo || data.fileType || 'pdf')).toLowerCase();
        const fileType: DocumentFileType = (['pdf', 'docx', 'xlsx'].includes(ext) ? ext : 'other') as DocumentFileType;
        const docItem: DocumentItem = {
          id: data.id || docSnap.id,
          title: data.titulo || data.title || 'Documento',
          fileType: fileType,
          folderId: data.carpetaId || data.folderId || 'fld_01',
          folderName: data.nombreCarpeta || data.folderName || 'General',
          tagIds: data.etiquetasIds || data.tagIds || [],
          currentVersionId: data.versionActualId || data.currentVersionId || '',
          isTemplate: !!data.esPlantilla,
          isDeleted: !!data.eliminado,
          deletedAt: null,
          deletedBy: null,
          createdBy: data.creadoPor || data.createdBy || '',
          creatorName: data.nombreCreador || data.creatorName || '',
          createdAt: data.fechaCreacion || data.createdAt || new Date().toISOString(),
          updatedAt: data.fechaActualizacion || data.updatedAt || new Date().toISOString(),
        };
        const existingIdx = db.documents.findIndex((d) => d.id === docItem.id);
        if (existingIdx === -1) {
          db.documents.push(docItem);
        } else {
          db.documents[existingIdx] = { ...db.documents[existingIdx], ...docItem };
        }
      });

      const versSnap = await getDocs(collection(firestoreDb, 'versiones'));
      versSnap.forEach((vSnap) => {
        const vData = vSnap.data() as any;
        const verItem: DocumentVersion = {
          id: vData.id || vSnap.id,
          documentId: vData.documentoId || vData.documentId || '',
          versionNumber: vData.numeroVersion || vData.versionNumber || 1,
          storagePath: vData.rutaAlmacenamiento || vData.storagePath || '',
          originalFilename: vData.nombreArchivoOriginal || vData.originalFilename || 'archivo.pdf',
          fileSizeBytes: vData.tamanoBytes || vData.fileSizeBytes || 15000,
          mimeType: vData.tipoMime || vData.mimeType || 'application/pdf',
          changeSummary: vData.resumenCambios || vData.changeSummary || 'Versión inicial',
          uploadedBy: vData.subidoPor || vData.uploadedBy || '',
          uploaderName: vData.nombreSubcriptor || vData.uploaderName || '',
          createdAt: vData.fechaCreacion || vData.createdAt || new Date().toISOString(),
          fileDataUrl: vData.contenidoBase64 || vData.fileDataUrl || undefined,
        };
        const existsVer = db.documentVersions.find((v) => v.id === verItem.id);
        if (!existsVer) {
          db.documentVersions.push(verItem);
        } else if (verItem.fileDataUrl) {
          existsVer.fileDataUrl = verItem.fileDataUrl;
        }
      });
      saveLocalDb(db);
    } catch (e) {
      console.warn('Error syncing documents from Firestore for GET /api/documents:', e);
    }

    let docs = db.documents.filter((d) => !d.isDeleted);
    const folderId = searchParams.get('folderId');
    const tagId = searchParams.get('tagId');
    const search = searchParams.get('search')?.toLowerCase();

    if (folderId) docs = docs.filter((d) => d.folderId === folderId);
    if (tagId) docs = docs.filter((d) => d.tagIds.includes(tagId));
    if (search) docs = docs.filter((d) => d.title.toLowerCase().includes(search));

    return jsonResponse({ documents: docs });
  }

  if ((path === '/api/documents' || path === '/api/documents/upload') && method === 'POST') {
    const docId = `doc_${Date.now()}`;
    const verId = `ver_${Date.now()}`;
    let title = 'Documento_Sin_Titulo';
    let folderId = 'fld_01';
    let tagIds: string[] = [];
    let isTemplate = false;
    let fileName = 'archivo.pdf';
    let fileSize = 15000;
    let mimeType = 'application/pdf';

    let fileDataUrl: string | undefined = undefined;

    if (init?.body && init.body instanceof FormData) {
      const fd = init.body;
      const t = fd.get('title');
      if (t) title = String(t);
      const f = fd.get('folderId');
      if (f) folderId = String(f);
      const tagsStr = fd.get('tagIds');
      if (tagsStr) {
        try { tagIds = JSON.parse(String(tagsStr)); } catch (e) {}
      }
      const templ = fd.get('isTemplate');
      if (templ) isTemplate = String(templ) === 'true';
      const fileObj = fd.get('file');
      if (fileObj && fileObj instanceof File) {
        fileName = fileObj.name;
        fileSize = fileObj.size || 15000;
        mimeType = fileObj.type || 'application/pdf';
        const arrayBuf = await fileObj.arrayBuffer();
        fileStorageMap.set(verId, arrayBuf);
        
        fileDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(fileObj);
        });

        if (!title || title === 'Documento_Sin_Titulo') {
          title = fileName;
        }
      }
    } else if (body && body.title) {
      title = body.title;
      folderId = body.folderId || 'fld_01';
      tagIds = body.tagIds || [];
      isTemplate = !!body.isTemplate;
    }

    const folder = db.folders.find((f) => f.id === folderId);

    const ext = (fileName.split('.').pop() || 'pdf').toLowerCase();
    const fileType: DocumentFileType = (['pdf', 'docx', 'xlsx'].includes(ext) ? ext : 'other') as DocumentFileType;

    const newDoc: DocumentItem = {
      id: docId,
      title: title,
      fileType: fileType,
      folderId: folderId,
      folderName: folder ? folder.name : 'General',
      tagIds: tagIds,
      currentVersionId: verId,
      isTemplate: isTemplate,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: db.currentUser?.id || 'usr_admin_isaac',
      creatorName: db.currentUser?.name || 'Isaac Perez',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newVer: DocumentVersion = {
      id: verId,
      documentId: docId,
      versionNumber: 1,
      storagePath: `storage/documents/${fileName}`,
      originalFilename: fileName,
      fileSizeBytes: fileSize,
      mimeType: mimeType,
      changeSummary: 'Versión inicial',
      uploadedBy: db.currentUser?.id || 'usr_admin_isaac',
      uploaderName: db.currentUser?.name || 'Isaac Perez',
      createdAt: new Date().toISOString(),
      fileDataUrl: fileDataUrl,
    };

    db.documents.push(newDoc);
    db.documentVersions.push(newVer);

    syncEntityToFirestore('documentos', newDoc.id, {
      id: newDoc.id,
      titulo: newDoc.title,
      tipoArchivo: newDoc.fileType,
      carpetaId: newDoc.folderId,
      nombreCarpeta: newDoc.folderName,
      etiquetasIds: newDoc.tagIds,
      versionActualId: newDoc.currentVersionId,
      esPlantilla: newDoc.isTemplate,
      eliminado: newDoc.isDeleted,
      creadoPor: newDoc.createdBy,
      nombreCreador: newDoc.creatorName,
      fechaCreacion: newDoc.createdAt,
      fechaActualizacion: newDoc.updatedAt,
    });

    syncEntityToFirestore('versiones', newVer.id, {
      id: newVer.id,
      documentoId: newVer.documentId,
      numeroVersion: newVer.versionNumber,
      rutaAlmacenamiento: newVer.storagePath,
      nombreArchivoOriginal: newVer.originalFilename,
      tamanoBytes: newVer.fileSizeBytes,
      tipoMime: newVer.mimeType,
      resumenCambios: newVer.changeSummary,
      subidoPor: newVer.uploadedBy,
      nombreSubcriptor: newVer.uploaderName,
      fechaCreacion: newVer.createdAt,
      contenidoBase64: newVer.fileDataUrl || '',
    });

    pushNotificationAndEmail(
      db,
      db.currentUser?.id || 'usr_admin_isaac',
      db.currentUser?.email || 'isaacoswaldoperez551@gmail.com',
      `Documento subido: ${newDoc.title}`,
      `El documento "${newDoc.title}" ha sido registrado y sincronizado en Firestore.`
    );

    saveLocalDb(db);
    return jsonResponse({ document: newDoc, version: newVer }, 201);
  }

  if (path.match(/^\/api\/documents\/[^/]+$/) && method === 'GET') {
    const docId = path.split('/')[3];
    const document = db.documents.find((d) => d.id === docId);
    if (!document) return errorResponse('Documento no encontrado', 404);
    const versions = db.documentVersions.filter((v) => v.documentId === docId);
    const comments = db.comments.filter((c) => c.documentId === docId);
    return jsonResponse({ document, versions, comments });
  }

  if (path.match(/^\/api\/documents\/[^/]+\/versions$/) && method === 'GET') {
    const docId = path.split('/')[3];
    let vers = db.documentVersions.filter((v) => v.documentId === docId);
    if (vers.length === 0) {
      const defaultVer: DocumentVersion = {
        id: `ver_default_${docId}`,
        documentId: docId,
        versionNumber: 1,
        storagePath: 'storage/documents/sample.pdf',
        originalFilename: 'Documento_Ejemplo.pdf',
        fileSizeBytes: 15000,
        mimeType: 'application/pdf',
        changeSummary: 'Versión inicial por defecto',
        uploadedBy: 'usr_admin_isaac',
        uploaderName: 'Isaac Perez',
        createdAt: new Date().toISOString(),
      };
      db.documentVersions.push(defaultVer);
      saveLocalDb(db);
      vers = [defaultVer];
    }
    return jsonResponse({ versions: vers });
  }

  if (path.match(/^\/api\/documents\/[^/]+\/versions$/) && method === 'POST') {
    const docId = path.split('/')[3];
    const doc = db.documents.find((d) => d.id === docId);
    if (!doc) return errorResponse('Documento no encontrado', 404);

    let fileName = 'archivo.docx';
    let fileSize = 18000;
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    let changeSummary = 'Nueva versión del documento';
    let fileDataUrl: string | undefined = undefined;
    const verId = `ver_${Date.now()}`;
    const existingVers = db.documentVersions.filter((v) => v.documentId === docId);
    const nextVersionNumber = existingVers.length + 1;

    try {
      if (init?.body) {
        if (init.body instanceof FormData) {
          const fd = init.body;
          const cs = fd.get('changeSummary');
          if (cs) changeSummary = String(cs);
          const fileObj = fd.get('file');
          if (fileObj && fileObj instanceof File) {
            fileName = fileObj.name;
            fileSize = fileObj.size || 18000;
            mimeType = fileObj.type || mimeType;
            try {
              const arrayBuf = await fileObj.arrayBuffer();
              fileStorageMap.set(verId, arrayBuf);
            } catch (e) {}

            fileDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve('');
              reader.readAsDataURL(fileObj);
            });
          }
        } else if (typeof init.body === 'string') {
          try {
            const parsed = JSON.parse(init.body);
            if (parsed.changeSummary) changeSummary = parsed.changeSummary;
            if (parsed.fileName) fileName = parsed.fileName;
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Error reading upload body:', e);
    }

    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.pdf')) doc.fileType = 'pdf';
    else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) doc.fileType = 'xlsx';
    else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) doc.fileType = 'docx';

    const newVer: DocumentVersion = {
      id: verId,
      documentId: docId,
      versionNumber: nextVersionNumber,
      storagePath: `storage/documents/${fileName}`,
      originalFilename: fileName,
      fileSizeBytes: fileSize,
      mimeType: mimeType,
      changeSummary: changeSummary,
      uploadedBy: db.currentUser?.id || 'usr_admin',
      uploaderName: db.currentUser?.name || 'Isaac Perez',
      createdAt: new Date().toISOString(),
      fileDataUrl: fileDataUrl,
    };

    db.documentVersions.unshift(newVer);
    doc.currentVersionId = verId;
    doc.updatedAt = new Date().toISOString();

    const newLog: AuditLogEntry = {
      id: `log_${Date.now()}`,
      userId: newVer.uploadedBy,
      action: 'version_upload',
      resourceType: 'document',
      resourceId: docId,
      ipAddress: '127.0.0.1',
      details: { mensaje: `Publicó la versión v${newVer.versionNumber}: "${changeSummary}"`, userName: newVer.uploaderName },
      timestamp: newVer.createdAt,
    };
    db.auditLogs.unshift(newLog);

    syncEntityToFirestore('documentos', doc.id, doc);
    syncEntityToFirestore('versiones', newVer.id, {
      ...newVer,
      contenidoBase64: newVer.fileDataUrl || '',
    });
    syncEntityToFirestore('auditoria', newLog.id, {
      id: newLog.id,
      documentoId: docId,
      usuarioId: newLog.userId,
      nombreUsuario: newVer.uploaderName,
      accion: newLog.action,
      detalles: newLog.details,
      fecha: newLog.timestamp,
    });

    saveLocalDb(db);
    return jsonResponse({ version: newVer, document: doc }, 201);
  }

  if (path.match(/^\/api\/documents\/[^/]+\/versions\/[^/]+\/file$/) && method === 'GET') {
    const parts = path.split('/');
    const docId = parts[3];
    const verId = parts[5];
    const doc = db.documents.find((d) => d.id === docId);
    const ver = db.documentVersions.find((v) => v.id === verId);

    // 1. In-memory buffer
    if (fileStorageMap.has(verId)) {
      const buf = fileStorageMap.get(verId)!;
      const mime = ver?.mimeType || 'application/octet-stream';
      const blob = new Blob([buf], { type: mime });
      return new Response(blob, {
        status: 200,
        headers: { 'Content-Type': mime },
      });
    }

    // 2. Base64 data URL from version record (synced via Firestore / LocalStorage)
    if (ver?.fileDataUrl) {
      try {
        const parts = ver.fileDataUrl.split(',');
        const mimeMatch = ver.fileDataUrl.match(/data:(.*?);base64/);
        const mime = mimeMatch ? mimeMatch[1] : ver.mimeType || 'application/octet-stream';
        const base64Data = parts.length > 1 ? parts[1] : parts[0];
        const buf = base64ToArrayBuffer(base64Data);
        fileStorageMap.set(verId, buf);
        const blob = new Blob([buf], { type: mime });
        return new Response(blob, {
          status: 200,
          headers: { 'Content-Type': mime },
        });
      } catch (e) {
        console.error('Error parsing base64 fileDataUrl:', e);
      }
    }

    // 3. Fallbacks for sample documents (guaranteed valid binary formats)
    if (doc?.fileType === 'docx') {
      const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const buf = base64ToArrayBuffer(DEFAULT_BLANK_DOCX_BASE64);
      const blob = new Blob([buf], { type: mime });
      return new Response(blob, {
        status: 200,
        headers: { 'Content-Type': mime },
      });
    }

    if (doc?.fileType === 'xlsx') {
      const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['GestiónDoc Enterprise', 'Reporte Oficial'],
        ['Documento', doc?.title || 'Documento'],
        ['Fecha de Carga', new Date().toLocaleDateString()],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Hoja 1');
      const excelBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuf], { type: mime });
      return new Response(blob, {
        status: 200,
        headers: { 'Content-Type': mime },
      });
    }

    const pdfContent = `%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<< /Length 55 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(${doc?.title || 'Documento'}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n318\n%%EOF`;
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    return new Response(blob, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  }

  if (path.match(/^\/api\/documents\/[^/]+\/compare$/) && method === 'GET') {
    const docId = path.split('/')[3];
    const doc = db.documents.find((d) => d.id === docId);
    const v1 = searchParams.get('v1');
    const v2 = searchParams.get('v2');

    const vers = db.documentVersions.filter((v) => v.documentId === docId);
    const ver1 = vers.find((v) => v.id === v1 || String(v.versionNumber) === String(v1)) || vers[vers.length - 1] || vers[0];
    const ver2 = vers.find((v) => v.id === v2 || String(v.versionNumber) === String(v2)) || vers[0];

    const fileType = doc?.fileType || 'docx';

    const metadataDiff = [
      {
        field: 'Número de Versión',
        v1Value: ver1 ? `v${ver1.versionNumber}` : 'v1',
        v2Value: ver2 ? `v${ver2.versionNumber}` : 'v1',
      },
      {
        field: 'Publicado Por',
        v1Value: ver1?.uploaderName || 'Sistema',
        v2Value: ver2?.uploaderName || 'Sistema',
      },
      {
        field: 'Fecha de Registro',
        v1Value: ver1?.createdAt ? new Date(ver1.createdAt).toLocaleString() : 'N/A',
        v2Value: ver2?.createdAt ? new Date(ver2.createdAt).toLocaleString() : 'N/A',
      },
      {
        field: 'Tamaño de Archivo',
        v1Value: ver1?.fileSizeBytes ? `${(ver1.fileSizeBytes / 1024).toFixed(1)} KB` : '15 KB',
        v2Value: ver2?.fileSizeBytes ? `${(ver2.fileSizeBytes / 1024).toFixed(1)} KB` : '15 KB',
      },
      {
        field: 'Resumen de Cambios',
        v1Value: ver1?.changeSummary || 'Versión inicial registrada',
        v2Value: ver2?.changeSummary || 'Versión actualizada',
      },
    ];

    const textDiff = [
      { type: 'unchanged' as const, value: `[Párrafo Base]: Documento ${doc?.title || 'Oficial'} registrado.\n` },
      { type: 'removed' as const, value: `[Versión v${ver1?.versionNumber || 1}]: ${ver1?.changeSummary || 'Borrador base'}.\n` },
      { type: 'added' as const, value: `[Versión v${ver2?.versionNumber || 2}]: ${ver2?.changeSummary || 'Revisión y aprobación aplicada'}.\n` },
      { type: 'unchanged' as const, value: `[Párrafo Final]: Verificado en el sistema de gestión documental.` },
    ];

    const sheetDiff = [
      {
        sheetName: 'Hoja 1',
        cellChanges: [
          { cell: 'B2', oldVal: ver1?.changeSummary || 'v1', newVal: ver2?.changeSummary || 'v2' },
          { cell: 'C4', oldVal: ver1?.createdAt ? new Date(ver1.createdAt).toLocaleDateString() : 'v1', newVal: ver2?.createdAt ? new Date(ver2.createdAt).toLocaleDateString() : 'v2' },
        ],
      },
    ];

    return jsonResponse({
      comparison: {
        fileType,
        v1: ver1 || vers[0],
        v2: ver2 || vers[0],
        textDiff,
        sheetDiff,
        metadataDiff,
      },
    });
  }

  if (path.match(/^\/api\/documents\/[^/]+\/timeline$/) && method === 'GET') {
    const docId = path.split('/')[3];
    const vers = db.documentVersions.filter((v) => v.documentId === docId);
    const timeline = vers.map((v, i) => ({
      versionId: v.id,
      versionNumber: v.versionNumber || (i + 1),
      author: v.uploaderName || 'Isaac Perez',
      timestamp: v.createdAt,
      summary: v.changeSummary || 'Actualización corporativa',
    }));
    return jsonResponse({ timeline });
  }

  if (path.match(/^\/api\/documents\/[^/]+\/versions\/[^/]+\/revert$/) && method === 'POST') {
    const parts = path.split('/');
    const docId = parts[3];
    const targetVerId = parts[5];
    const doc = db.documents.find((d) => d.id === docId);
    if (doc) {
      doc.currentVersionId = targetVerId;
      doc.updatedAt = new Date().toISOString();
      syncEntityToFirestore('documentos', doc.id, doc);
      saveLocalDb(db);
    }
    return jsonResponse({ success: true, message: 'Documento revertido con éxito' });
  }

  if (path.match(/^\/api\/documents\/[^/]+\/comments$/) && method === 'GET') {
    const docId = path.split('/')[3];
    try {
      const q = query(
        collection(firestoreDb, 'comentarios'),
        where('documentoId', '==', docId)
      );
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const cItem: CommentItem = {
          id: docSnap.id,
          documentId: d.documentoId || docId,
          userId: d.usuarioId || 'usr_unknown',
          userName: d.nombreUsuario || 'Usuario',
          userEmail: d.correoUsuario || '',
          userRole: d.rolUsuario || 'user',
          content: d.contenido || '',
          createdAt: d.fechaCreacion || new Date().toISOString(),
        };
        if (!db.comments.some((c) => c.id === cItem.id)) {
          db.comments.push(cItem);
        }
      });
    } catch (err) {
      console.warn('Firestore comments fetch fallback:', err);
    }

    const comments = db.comments
      .filter((c) => c.documentId === docId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return jsonResponse({ comments });
  }

  if (path.match(/^\/api\/documents\/[^/]+\/comments$/) && method === 'POST') {
    const docId = path.split('/')[3];

    // Fetch latest documents, assignments, and users from Firestore to ensure cross-device consistency
    try {
      const [docsSnap, asgSnap, usersSnap] = await Promise.all([
        getDocs(collection(firestoreDb, 'documentos')),
        getDocs(collection(firestoreDb, 'asignaciones')),
        getDocs(collection(firestoreDb, 'usuarios')),
      ]);

      docsSnap.forEach((ds) => {
        const d = ds.data() as any;
        const dItem = {
          id: d.id || ds.id,
          title: d.title || d.titulo || 'Documento',
          createdBy: d.createdBy || d.creadoPor || '',
        };
        const idx = db.documents.findIndex((x) => x.id === dItem.id);
        if (idx === -1) db.documents.push(dItem as any);
        else db.documents[idx] = { ...db.documents[idx], ...dItem };
      });

      asgSnap.forEach((as) => {
        const a = as.data() as any;
        const aItem: AssignmentItem = {
          id: a.id || as.id,
          documentId: a.documentId || a.documentoId,
          userId: a.userId || a.usuarioId,
          userName: a.userName || a.nombreUsuario || 'Usuario',
          userEmail: a.userEmail || a.correoUsuario || '',
          permissionLevel: a.permissionLevel || a.nivelPermiso || 'view',
          status: a.status || a.estado || 'pending',
          dueDate: a.dueDate || a.fechaLimite || new Date().toISOString(),
          firstOpenedAt: a.firstOpenedAt || null,
          lastWorkedAt: a.lastWorkedAt || null,
          reviewComment: a.reviewComment || null,
          reviewedBy: a.reviewedBy || null,
          reviewedAt: a.reviewedAt || null,
          assignedBy: a.assignedBy || 'usr_admin_isaac',
          createdAt: a.createdAt || new Date().toISOString(),
          updatedAt: a.updatedAt || new Date().toISOString(),
        };
        const idx = db.assignments.findIndex((x) => x.id === aItem.id);
        if (idx === -1) db.assignments.push(aItem);
        else db.assignments[idx] = { ...db.assignments[idx], ...aItem };
      });

      usersSnap.forEach((us) => {
        const u = us.data() as any;
        const uItem = {
          id: u.id || us.id,
          name: u.nombre || u.name || 'Usuario',
          email: u.correo || u.email || '',
          role: u.rol === 'administrador' ? 'admin' : (u.role || 'user'),
          status: u.estado || u.status || 'active',
          department: u.departamento || u.department || '',
        };
        const idx = db.users.findIndex(
          (x) => x.id === uItem.id || x.email.toLowerCase() === uItem.email.toLowerCase()
        );
        if (idx === -1) db.users.push(uItem as any);
        else db.users[idx] = { ...db.users[idx], ...uItem };
      });
    } catch (e) {
      console.warn('Error fetching Firestore data during comment broadcast:', e);
    }

    const doc = db.documents.find((d) => d.id === docId);
    const docTitle = doc ? doc.title : 'Documento';

    const newComment: CommentItem = {
      id: `com_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      documentId: docId,
      userId: db.currentUser?.id || 'usr_current',
      userName: db.currentUser?.name || 'Usuario',
      userEmail: db.currentUser?.email || '',
      userRole: db.currentUser?.role || 'user',
      content: body.content,
      createdAt: new Date().toISOString(),
    };
    db.comments.push(newComment);
    await syncEntityToFirestore('comentarios', newComment.id, {
      id: newComment.id,
      documentoId: newComment.documentId,
      usuarioId: newComment.userId,
      nombreUsuario: newComment.userName,
      correoUsuario: newComment.userEmail,
      rolUsuario: newComment.userRole,
      contenido: newComment.content,
      fechaCreacion: newComment.createdAt,
    });

    // Broadcast comment notification to all interested parties (Admins, Creator, and ALL Assignees)
    const recipientsMap = new Map<string, { id: string; email: string; name: string }>();

    // 1. All Admins
    db.users
      .filter((u) => u.role === 'admin')
      .forEach((admin) => {
        recipientsMap.set(admin.id, { id: admin.id, email: admin.email, name: admin.name });
      });

    // 2. Document Creator
    if (doc?.createdBy) {
      const creator = db.users.find((u) => u.id === doc.createdBy);
      if (creator) {
        recipientsMap.set(creator.id, { id: creator.id, email: creator.email, name: creator.name });
      }
    }

    // 3. ALL Document Assignees (supports 1, 2, or multiple people assigned to this work)
    db.assignments
      .filter((a) => a.documentId === docId)
      .forEach((asg) => {
        if (asg.userId) {
          const userObj = db.users.find((u) => u.id === asg.userId);
          recipientsMap.set(asg.userId, {
            id: asg.userId,
            email: asg.userEmail || userObj?.email || '',
            name: asg.userName || userObj?.name || 'Usuario',
          });
        }
      });

    // Send notification individually to each recipient except the comment author
    for (const [recipId, recipient] of recipientsMap.entries()) {
      const isAuthor =
        recipId === newComment.userId ||
        (recipient.email && recipient.email.toLowerCase() === newComment.userEmail.toLowerCase());

      if (!isAuthor && recipient.email) {
        const isRecipientAdmin = db.users.find((u) => u.id === recipId)?.role === 'admin';
        const title = isRecipientAdmin
          ? `💬 Mensaje de ${newComment.userName} en "${docTitle}"`
          : `💬 Nuevo mensaje en tu tarea: "${docTitle}"`;
        const message = isRecipientAdmin
          ? `El usuario ${newComment.userName} comentó en "${docTitle}": "${newComment.content}"`
          : `${newComment.userName} escribió en la tarea "${docTitle}": "${newComment.content}"`;

        await pushNotificationAndEmail(
          db,
          recipient.id,
          recipient.email,
          title,
          message,
          'comment',
          docId,
          docTitle,
          undefined,
          newComment.userId,
          newComment.userName,
          isRecipientAdmin ? 'admin' : 'user'
        );
      }
    }

    saveLocalDb(db);
    return jsonResponse({ comment: newComment }, 201);
  }

  // --- ASSIGNMENTS ---
  if (path === '/api/assignments' && method === 'GET') {
    try {
      const asgSnap = await getDocs(collection(firestoreDb, 'asignaciones'));
      asgSnap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const asgItem: AssignmentItem = {
          id: d.id || docSnap.id,
          documentId: d.documentId || d.documentoId,
          userId: d.userId || d.usuarioId,
          userName: d.userName || d.nombreUsuario || 'Usuario',
          userEmail: d.userEmail || d.correoUsuario || '',
          permissionLevel: d.permissionLevel || d.nivelPermiso || 'view',
          status: d.status || d.estado || 'pending',
          dueDate: d.dueDate || d.fechaLimite || new Date().toISOString(),
          firstOpenedAt: d.firstOpenedAt || null,
          lastWorkedAt: d.lastWorkedAt || null,
          reviewComment: d.reviewComment || null,
          reviewedBy: d.reviewedBy || null,
          reviewedAt: d.reviewedAt || null,
          assignedBy: d.assignedBy || d.asignadoPor || 'usr_admin_isaac',
          createdAt: d.createdAt || d.fechaCreacion || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
        };
        const idx = db.assignments.findIndex((a) => a.id === asgItem.id);
        if (idx === -1) {
          db.assignments.push(asgItem);
        } else {
          db.assignments[idx] = { ...db.assignments[idx], ...asgItem };
        }
      });
      saveLocalDb(db);
    } catch (e) {
      console.warn('Error fetching assignments in GET /api/assignments:', e);
    }
    return jsonResponse({ assignments: db.assignments });
  }

  if (path === '/api/assignments' && method === 'POST') {
    // Sync users from Firestore first so we have accurate names and emails
    try {
      const usersSnap = await getDocs(collection(firestoreDb, 'usuarios'));
      usersSnap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const uItem = {
          id: d.id || docSnap.id,
          name: d.nombre || d.name || 'Usuario',
          email: d.correo || d.email || '',
          role: d.rol === 'administrador' ? 'admin' : (d.role || 'user'),
          status: d.estado || d.status || 'active',
          department: d.departamento || d.department || '',
        };
        const idx = db.users.findIndex(
          (u) => u.id === uItem.id || u.email.toLowerCase() === uItem.email.toLowerCase()
        );
        if (idx === -1) db.users.push(uItem as any);
        else db.users[idx] = { ...db.users[idx], ...uItem };
      });
    } catch (e) {}

    const docItem = db.documents.find((d) => d.id === body.documentId);
    const docTitle = docItem ? docItem.title : 'Documento';

    // Support both an array of userIds (e.g. 2 people on the same job) or single userId
    const targetUserIds: string[] =
      Array.isArray(body.userIds) && body.userIds.length > 0
        ? body.userIds
        : body.userId
        ? [body.userId]
        : [];

    if (targetUserIds.length === 0) {
      return errorResponse('Debe seleccionar al menos un usuario para la asignación.', 400);
    }

    const createdAssignments: AssignmentItem[] = [];

    for (const uid of targetUserIds) {
      const targetUser = db.users.find((u) => u.id === uid);
      const uName = targetUser?.name || body.userName || 'Usuario';
      const uEmail = targetUser?.email || body.userEmail || '';

      const newAsg: AssignmentItem = {
        id: `asg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        documentId: body.documentId,
        userId: uid,
        userName: uName,
        userEmail: uEmail,
        permissionLevel: body.permissionLevel || 'view',
        status: 'pending',
        dueDate: body.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
        firstOpenedAt: null,
        lastWorkedAt: null,
        reviewComment: null,
        reviewedBy: null,
        reviewedAt: null,
        assignedBy: db.currentUser?.id || 'usr_admin_isaac',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.assignments.push(newAsg);
      await syncEntityToFirestore('asignaciones', newAsg.id, {
        ...newAsg,
        documentoId: newAsg.documentId,
        usuarioId: newAsg.userId,
        nombreUsuario: newAsg.userName,
        correoUsuario: newAsg.userEmail,
        nivelPermiso: newAsg.permissionLevel,
        estado: newAsg.status,
        fechaLimite: newAsg.dueDate,
        asignadoPor: newAsg.assignedBy,
        fechaCreacion: newAsg.createdAt,
      });

      // Send individual notification and real email to this assigned user
      if (newAsg.userEmail) {
        await pushNotificationAndEmail(
          db,
          newAsg.userId,
          newAsg.userEmail,
          `📄 Nuevo trabajo asignado: "${docTitle}"`,
          `Se te ha asignado el documento "${docTitle}" para revisión y trabajo. Fecha límite: ${new Date(
            newAsg.dueDate
          ).toLocaleDateString('es-ES')}.`,
          'assignment',
          newAsg.documentId,
          docTitle,
          newAsg.id,
          db.currentUser?.id,
          db.currentUser?.name,
          'user'
        );
      }

      createdAssignments.push(newAsg);
    }

    saveLocalDb(db);
    return jsonResponse(
      {
        assignment: createdAssignments[0],
        assignments: createdAssignments,
        count: createdAssignments.length,
      },
      201
    );
  }

  if (path === '/api/my-documents' && method === 'GET') {
    try {
      const asgSnap = await getDocs(collection(firestoreDb, 'asignaciones'));
      asgSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const asgItem: AssignmentItem = {
          id: data.id || docSnap.id,
          documentId: data.documentId || data.documentoId,
          userId: data.userId || data.usuarioId,
          userName: data.userName || data.nombreUsuario || '',
          userEmail: data.userEmail || data.correoUsuario || '',
          permissionLevel: data.permissionLevel || 'view',
          status: data.status || 'pending',
          dueDate: data.dueDate || new Date().toISOString(),
          firstOpenedAt: data.firstOpenedAt || null,
          lastWorkedAt: data.lastWorkedAt || null,
          reviewComment: data.reviewComment || null,
          reviewedBy: data.reviewedBy || null,
          reviewedAt: data.reviewedAt || null,
          assignedBy: data.assignedBy || 'usr_admin_isaac',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
        const exists = db.assignments.find((a) => a.id === asgItem.id);
        if (!exists) {
          db.assignments.push(asgItem);
        } else {
          exists.status = asgItem.status;
          exists.lastWorkedAt = asgItem.lastWorkedAt;
        }
      });

      const docsSnap = await getDocs(collection(firestoreDb, 'documentos'));
      docsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const ext = ((data.tipoArchivo || data.fileType || 'pdf')).toLowerCase();
        const fileType: DocumentFileType = (['pdf', 'docx', 'xlsx'].includes(ext) ? ext : 'other') as DocumentFileType;
        const docItem: DocumentItem = {
          id: data.id || docSnap.id,
          title: data.titulo || data.title || 'Documento',
          fileType: fileType,
          folderId: data.carpetaId || data.folderId || 'fld_01',
          folderName: data.nombreCarpeta || data.folderName || 'General',
          tagIds: data.etiquetasIds || data.tagIds || [],
          currentVersionId: data.versionActualId || data.currentVersionId || '',
          isTemplate: !!data.esPlantilla,
          isDeleted: !!data.eliminado,
          deletedAt: null,
          deletedBy: null,
          createdBy: data.creadoPor || data.createdBy || '',
          creatorName: data.nombreCreador || data.creatorName || '',
          createdAt: data.fechaCreacion || data.createdAt || new Date().toISOString(),
          updatedAt: data.fechaActualizacion || data.updatedAt || new Date().toISOString(),
        };
        const exists = db.documents.find((d) => d.id === docItem.id);
        if (!exists) {
          db.documents.push(docItem);
        }
      });

      const versSnap = await getDocs(collection(firestoreDb, 'versiones'));
      versSnap.forEach((vSnap) => {
        const vData = vSnap.data();
        const verItem: DocumentVersion = {
          id: vData.id || vSnap.id,
          documentId: vData.documentoId || vData.documentId || '',
          versionNumber: vData.numeroVersion || vData.versionNumber || 1,
          storagePath: vData.rutaAlmacenamiento || vData.storagePath || '',
          originalFilename: vData.nombreArchivoOriginal || vData.originalFilename || 'archivo.pdf',
          fileSizeBytes: vData.tamanoBytes || vData.fileSizeBytes || 15000,
          mimeType: vData.tipoMime || vData.mimeType || 'application/pdf',
          changeSummary: vData.resumenCambios || vData.changeSummary || 'Versión inicial',
          uploadedBy: vData.subidoPor || vData.uploadedBy || '',
          uploaderName: vData.nombreSubcriptor || vData.uploaderName || '',
          createdAt: vData.fechaCreacion || vData.createdAt || new Date().toISOString(),
          fileDataUrl: vData.contenidoBase64 || vData.fileDataUrl || undefined,
        };
        const existsVer = db.documentVersions.find((v) => v.id === verItem.id);
        if (!existsVer) {
          db.documentVersions.push(verItem);
        } else if (verItem.fileDataUrl) {
          existsVer.fileDataUrl = verItem.fileDataUrl;
        }
      });
      saveLocalDb(db);
    } catch (e) {
      console.warn('Error syncing my-documents from Firestore:', e);
    }

    const currentUserId = db.currentUser?.id;
    const currentUserEmail = db.currentUser?.email?.toLowerCase();

    const userAssignments = db.assignments.filter((asg) => {
      return (
        (currentUserId && asg.userId === currentUserId) ||
        (currentUserEmail && asg.userEmail && asg.userEmail.toLowerCase() === currentUserEmail)
      );
    });

    const result = userAssignments.map((asg) => {
      const doc = db.documents.find((d) => d.id === asg.documentId) || {
        id: asg.documentId,
        title: 'Documento Asignado',
        fileType: 'pdf' as DocumentFileType,
        folderId: 'fld_01',
        folderName: 'General',
        tagIds: [],
        currentVersionId: '',
        isTemplate: false,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        createdBy: '',
        creatorName: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return {
        assignmentId: asg.id,
        document: doc,
        status: asg.status,
        permissionLevel: asg.permissionLevel,
        dueDate: asg.dueDate,
        firstOpenedAt: asg.firstOpenedAt,
        lastWorkedAt: asg.lastWorkedAt,
      };
    });

    return jsonResponse({ documents: result });
  }

  if (path.match(/^\/api\/my-documents\/[^/]+\/status$/) && method === 'POST') {
    const docId = path.split('/')[3];
    const { status } = body;
    const asg = db.assignments.find(
      (a) => a.documentId === docId && (a.userId === db.currentUser?.id || a.userEmail?.toLowerCase() === db.currentUser?.email?.toLowerCase())
    );
    if (asg) {
      asg.status = status;
      asg.lastWorkedAt = new Date().toISOString();
      syncEntityToFirestore('asignaciones', asg.id, asg);
      saveLocalDb(db);
    }
    return jsonResponse({ success: true });
  }

  // --- NOTIFICATIONS & ACTIVE USERS ---
  if (path === '/api/notifications' && method === 'GET') {
    try {
      const notifsSnap = await getDocs(collection(firestoreDb, 'notificaciones'));
      notifsSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const notifItem: NotificationItem = {
          id: data.id || docSnap.id,
          userId: data.userId || data.usuarioId || '',
          userEmail: data.userEmail || data.correoUsuario || '',
          title: data.title || data.titulo || 'Notificación',
          message: data.message || data.mensaje || '',
          type: data.type || data.tipo || 'status_change',
          documentId: data.documentId || data.documentoId,
          documentTitle: data.documentTitle || data.tituloDocumento,
          assignmentId: data.assignmentId || data.asignacionId,
          read: !!(data.read || data.leido),
          emailSent: true,
          createdAt: data.createdAt || data.fechaCreacion || new Date().toISOString(),
        };
        const existsIdx = db.notifications.findIndex((n) => n.id === notifItem.id);
        if (existsIdx === -1) {
          db.notifications.unshift(notifItem);
        } else {
          db.notifications[existsIdx].read = notifItem.read;
        }
      });
      saveLocalDb(db);
    } catch (e) {
      console.warn('Error fetching notifications from Firestore:', e);
    }

    const currentUser = db.currentUser;
    if (currentUser && currentUser.role !== 'admin') {
      const userAssignments = db.assignments.filter(
        (a) => (a.userId === currentUser.id || a.userEmail?.toLowerCase() === currentUser.email?.toLowerCase()) && a.status !== 'approved'
      );
      const now = new Date();

      userAssignments.forEach((asg) => {
        const doc = db.documents.find((d) => d.id === asg.documentId);
        const docTitle = doc ? doc.title : 'Documento Asignado';
        const dueDate = new Date(asg.dueDate);
        const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 3600);
        const formattedDate = dueDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        if (diffHours < 0) {
          const notifId = `notif_overdue_${asg.id}`;
          if (!db.notifications.some((n) => n.id === notifId)) {
            pushNotificationAndEmail(
              db,
              currentUser.id,
              currentUser.email,
              `🔴 Tarea Vencida: "${docTitle}"`,
              `El plazo de entrega para la tarea del documento "${docTitle}" ha expirado (${formattedDate}). Por favor, revisa y entrega las observaciones lo antes posible.`,
              'overdue',
              asg.documentId,
              docTitle,
              asg.id
            );
          }
        } else if (diffHours <= 24) {
          const notifId = `notif_1d_${asg.id}`;
          if (!db.notifications.some((n) => n.id === notifId)) {
            pushNotificationAndEmail(
              db,
              currentUser.id,
              currentUser.email,
              `⚠️ Te queda 1 día para entregar: "${docTitle}"`,
              `Te queda 1 día para revisar y entregar la tarea del documento "${docTitle}". Fecha límite: ${formattedDate}.`,
              'due_soon_1d',
              asg.documentId,
              docTitle,
              asg.id
            );
          }
        }
      });
    }

    let userNotifs = db.notifications;
    if (currentUser) {
      userNotifs = db.notifications.filter(
        (n) => n.userId === currentUser.id || currentUser.role === 'admin' || n.userEmail?.toLowerCase() === currentUser.email?.toLowerCase()
      );
    }
    const unreadCount = userNotifs.filter((n) => !n.read).length;
    return jsonResponse({ notifications: userNotifs, unreadCount });
  }

  if (path === '/api/active-users' && method === 'GET') {
    try {
      // 1. Fetch user accounts from Firestore to keep db.users synced across devices
      const usersSnap = await getDocs(collection(firestoreDb, 'usuarios'));
      usersSnap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const uItem = {
          id: d.id || docSnap.id,
          name: d.nombre || d.name || 'Usuario',
          email: d.correo || d.email || '',
          role: d.rol === 'administrador' ? 'admin' : (d.role || 'user'),
          status: d.estado || d.status || 'active',
          mustChangePassword: !!d.debeCambiarContrasena,
          department: d.departamento || d.department || '',
          createdAt: d.fechaCreacion || d.createdAt || new Date().toISOString(),
        };
        const idx = db.users.findIndex((u) => u.id === uItem.id || u.email.toLowerCase() === uItem.email.toLowerCase());
        if (idx === -1) {
          db.users.push(uItem as any);
        } else {
          db.users[idx] = { ...db.users[idx], ...uItem };
        }
      });

      // 2. Fetch active sessions from Firestore collection "sesiones_activas"
      const activeSessionsSnap = await getDocs(collection(firestoreDb, 'sesiones_activas'));
      const onlineUsersList: any[] = [];
      const seenEmails = new Set<string>();
      const now = Date.now();

      activeSessionsSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const lastAct = data.ultimaActividad ? new Date(data.ultimaActividad).getTime() : (data.fechaInicio ? new Date(data.fechaInicio).getTime() : now);
        const diffSec = (now - lastAct) / 1000;

        // Consider online if estaEnLinea is true AND last heartbeat was within 35 seconds
        if (data.estaEnLinea && diffSec < 35) {
          const email = (data.correoUsuario || data.userEmail || '').toLowerCase();
          if (email && !seenEmails.has(email)) {
            seenEmails.add(email);
            onlineUsersList.push({
              id: data.usuarioId || data.userId || docSnap.id,
              name: data.nombreUsuario || data.userName || 'Usuario',
              email: data.correoUsuario || data.userEmail || '',
              role: data.rolUsuario === 'admin' ? 'admin' : (data.role || 'user'),
              department: data.departamento || data.department || 'General',
              isOnline: true,
              lastActive: data.ultimaActividad || data.fechaInicio || new Date().toISOString(),
            });
          }
        }
      });

      // 3. Always include current logged-in user in memory if not already in list
      if (db.currentUser && !seenEmails.has(db.currentUser.email.toLowerCase())) {
        onlineUsersList.push({
          id: db.currentUser.id,
          name: db.currentUser.name,
          email: db.currentUser.email,
          role: db.currentUser.role,
          department: db.currentUser.department || 'General',
          isOnline: true,
          lastActive: new Date().toISOString(),
        });
      }

      return jsonResponse({ activeUsers: onlineUsersList });
    } catch (e) {
      console.warn('Error fetching active sessions from Firestore:', e);
      return jsonResponse({ activeUsers: [] });
    }
  }

  if (path === '/api/notifications/email-outbox' && method === 'GET') {
    const outbox = db.notifications.map((n) => ({
      ...n,
      emailContent: {
        to: n.userEmail,
        subject: n.title,
        body: n.message,
        sentAt: n.createdAt,
      },
    }));
    return jsonResponse({ outbox });
  }

  if (path.match(/^\/api\/notifications\/[^/]+\/read$/) && method === 'PUT') {
    const notifId = path.split('/')[3];
    const n = db.notifications.find((item) => item.id === notifId);
    if (n) {
      n.read = true;
      syncEntityToFirestore('notificaciones', n.id, { ...n, leido: true });
      saveLocalDb(db);
    }
    return jsonResponse({ success: true });
  }

  if (path === '/api/notifications/mark-all-read' && method === 'PUT') {
    db.notifications.forEach((n) => {
      n.read = true;
      syncEntityToFirestore('notificaciones', n.id, { ...n, leido: true });
    });
    saveLocalDb(db);
    return jsonResponse({ success: true });
  }

  return null;
}
