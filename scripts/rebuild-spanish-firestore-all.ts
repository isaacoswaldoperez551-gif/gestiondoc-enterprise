import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const englishCollections = [
  'assignments',
  'audit_logs',
  'documents',
  'folders',
  'notifications',
  'tags',
  'users',
];

const spanishCollections = [
  'asignaciones',
  'carpetas',
  'documentos',
  'etiquetas',
  'notificaciones',
  'registros_auditoria',
  'usuarios',
];

// 1. USUARIOS (100% en español)
const usuarios = [
  {
    id: 'usr_admin_01',
    nombre: 'Isaac Pérez (Administrador)',
    correo: 'admin@empresa.com',
    rol: 'administrador',
    estado: 'activo',
    departamento: 'Sistemas y Auditoría',
    debeCambiarContrasena: false,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: 'usr_user_01',
    nombre: 'Carlos Mendoza',
    correo: 'carlos.mendoza@empresa.com',
    rol: 'colaborador',
    estado: 'activo',
    departamento: 'Finanzas',
    debeCambiarContrasena: false,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: 'usr_user_02',
    nombre: 'Lucía Vega',
    correo: 'lucia.vega@empresa.com',
    rol: 'colaborador',
    estado: 'activo',
    departamento: 'Recursos Humanos',
    debeCambiarContrasena: false,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: 'usr_user_03',
    nombre: 'Ing. Fernando Ruiz',
    correo: 'fernando.ruiz@empresa.com',
    rol: 'colaborador',
    estado: 'activo',
    departamento: 'Operaciones',
    debeCambiarContrasena: false,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    fechaCreacion: new Date().toISOString(),
  },
];

// 2. CARPETAS (100% en español)
const carpetas = [
  {
    id: 'carp_legal',
    nombre: 'Contratos y Asuntos Legales',
    descripcion: 'Acuerdos confidenciales, contratos laborales y convenios marco.',
    carpetaPadreId: null,
    creadoPor: 'usr_admin_01',
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: 'carp_finanzas',
    nombre: 'Estados Financieros y Facturación',
    descripcion: 'Balances anuales, presupuestos y reportes de auditoría.',
    carpetaPadreId: null,
    creadoPor: 'usr_admin_01',
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: 'carp_rh',
    nombre: 'Recursos Humanos y Políticas',
    descripcion: 'Manual de convivencia, reglamentos internos y evaluaciones.',
    carpetaPadreId: null,
    creadoPor: 'usr_admin_01',
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: 'carp_proyectos',
    nombre: 'Proyectos y Especificaciones Técnicas',
    descripcion: 'Arquitectura cloud, diagramas y cronogramas de entrega.',
    carpetaPadreId: null,
    creadoPor: 'usr_admin_01',
    fechaCreacion: new Date().toISOString(),
  },
];

// 3. ETIQUETAS (100% en español)
const etiquetas = [
  { id: 'etiq_urgente', nombre: 'Urgente', color: 'rojo' },
  { id: 'etiq_confidencial', nombre: 'Confidencial', color: 'morado' },
  { id: 'etiq_auditoria', nombre: 'Auditoría 2026', color: 'esmeralda' },
  { id: 'etiq_aprobado', nombre: 'Aprobado', color: 'verde' },
  { id: 'etiq_revision', nombre: 'En Revisión', color: 'ambar' },
];

// 4. DOCUMENTOS (100% en español)
const documentos = [
  {
    id: 'doc_politica_seguridad',
    titulo: 'Política Integral de Seguridad de la Información 2026',
    tipoArchivo: 'pdf',
    nombreArchivo: 'Politica_Seguridad_2026_v2.1.pdf',
    tamanoBytes: 2450000,
    carpetaId: 'carp_legal',
    nombreCarpeta: 'Contratos y Asuntos Legales',
    etiquetas: ['Confidencial', 'Auditoría 2026'],
    versionActual: 'v2.1',
    estado: 'publicado',
    esPlantilla: false,
    eliminado: false,
    creadoPorId: 'usr_admin_01',
    creadoPorNombre: 'Isaac Pérez',
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  },
  {
    id: 'doc_balance_q3',
    titulo: 'Reporte Financiero Consolidado Q3 2026',
    tipoArchivo: 'xlsx',
    nombreArchivo: 'Consolidado_Financiero_Q3_2026.xlsx',
    tamanoBytes: 1820000,
    carpetaId: 'carp_finanzas',
    nombreCarpeta: 'Estados Financieros y Facturación',
    etiquetas: ['Auditoría 2026', 'Aprobado'],
    versionActual: 'v1.0',
    estado: 'aprobado',
    esPlantilla: false,
    eliminado: false,
    creadoPorId: 'usr_user_01',
    creadoPorNombre: 'Carlos Mendoza',
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  },
  {
    id: 'doc_manual_empleado',
    titulo: 'Manual de Bienvenida y Reglamento Interno',
    tipoArchivo: 'docx',
    nombreArchivo: 'Reglamento_Interno_RRHH_v3.docx',
    tamanoBytes: 950000,
    carpetaId: 'carp_rh',
    nombreCarpeta: 'Recursos Humanos y Políticas',
    etiquetas: ['Aprobado'],
    versionActual: 'v3.0',
    estado: 'publicado',
    esPlantilla: false,
    eliminado: false,
    creadoPorId: 'usr_user_02',
    creadoPorNombre: 'Lucía Vega',
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  },
];

// 5. ASIGNACIONES (100% en español)
const asignaciones = [
  {
    id: 'asig_01',
    documentoId: 'doc_politica_seguridad',
    tituloDocumento: 'Política Integral de Seguridad de la Información 2026',
    usuarioAsignadoId: 'usr_user_01',
    nombreUsuarioAsignado: 'Carlos Mendoza',
    correoUsuarioAsignado: 'carlos.mendoza@empresa.com',
    nivelPermiso: 'subir_nueva_version',
    estado: 'en_progreso',
    fechaVencimiento: '2026-10-15',
    instrucciones: 'Revisar el anexo de seguridad y validar con el equipo.',
    fechaPrimerAcceso: new Date().toISOString(),
    fechaUltimoTrabajo: null,
    comentarioRevision: null,
    revisadoPor: null,
    fechaRevision: null,
    asignadoPor: 'usr_admin_01',
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  },
  {
    id: 'asig_02',
    documentoId: 'doc_balance_q3',
    tituloDocumento: 'Reporte Financiero Consolidado Q3 2026',
    usuarioAsignadoId: 'usr_user_02',
    nombreUsuarioAsignado: 'Lucía Vega',
    correoUsuarioAsignado: 'lucia.vega@empresa.com',
    nivelPermiso: 'descargar',
    estado: 'pendiente',
    fechaVencimiento: '2026-10-20',
    instrucciones: 'Descargar reporte y validar compensaciones.',
    fechaPrimerAcceso: null,
    fechaUltimoTrabajo: null,
    comentarioRevision: null,
    revisadoPor: null,
    fechaRevision: null,
    asignadoPor: 'usr_admin_01',
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  },
];

// 6. NOTIFICACIONES (100% en español)
const notificaciones = [
  {
    id: 'notif_01',
    usuarioId: 'usr_admin_01',
    correoUsuario: 'admin@empresa.com',
    titulo: 'Proyecto Firebase Conectado',
    mensaje: 'Base de datos Firestore sincronizada con colecciones 100% en español.',
    tipo: 'sistema',
    leido: false,
    correoEnviado: false,
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: 'notif_02',
    usuarioId: 'usr_user_01',
    correoUsuario: 'carlos.mendoza@empresa.com',
    titulo: 'Nueva Asignación de Documento',
    mensaje: 'Tienes una asignación activa en el documento: Política Integral de Seguridad 2026.',
    tipo: 'asignacion',
    leido: false,
    correoEnviado: false,
    fechaCreacion: new Date().toISOString(),
  },
];

// 7. REGISTROS DE AUDITORÍA (100% en español)
const auditoria = [
  {
    id: 'audit_01',
    usuarioId: 'usr_admin_01',
    nombreUsuario: 'Isaac Pérez',
    accion: 'sistema_iniciado',
    tipoRecurso: 'sistema',
    detalles: { mensaje: 'Base de datos configurada con campos y colecciones 100% en español.' },
    direccionIp: '127.0.0.1',
    fechaHora: new Date().toISOString(),
  },
];

async function main() {
  console.log('--- PASO 1: ELIMINANDO CUALQUIER COLECCIÓN EN INGLÉS ---');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const colName of englishCollections) {
    try {
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
      }
      console.log(`Colección eliminada: ${colName}`);
    } catch (e) {
      console.error(e);
    }
  }

  console.log('--- PASO 2: GUARDANDO DATOS CON CAMPOS 100% EN ESPAÑOL ---');

  for (const u of usuarios) {
    await setDoc(doc(db, 'usuarios', u.id), u);
  }
  console.log('✓ Colección `usuarios` guardada.');

  for (const c of carpetas) {
    await setDoc(doc(db, 'carpetas', c.id), c);
  }
  console.log('✓ Colección `carpetas` guardada.');

  for (const e of etiquetas) {
    await setDoc(doc(db, 'etiquetas', e.id), e);
  }
  console.log('✓ Colección `etiquetas` guardada.');

  for (const d of documentos) {
    await setDoc(doc(db, 'documentos', d.id), d);
  }
  console.log('✓ Colección `documentos` guardada.');

  for (const a of asignaciones) {
    await setDoc(doc(db, 'asignaciones', a.id), a);
  }
  console.log('✓ Colección `asignaciones` guardada.');

  for (const n of notificaciones) {
    await setDoc(doc(db, 'notificaciones', n.id), n);
  }
  console.log('✓ Colección `notificaciones` guardada.');

  for (const au of auditoria) {
    await setDoc(doc(db, 'registros_auditoria', au.id), au);
  }
  console.log('✓ Colección `registros_auditoria` guardada.');

  console.log('¡TODO TRADUCIDO Y SINCRONIZADO EN ESPAÑOL EXITOSAMENTE!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
