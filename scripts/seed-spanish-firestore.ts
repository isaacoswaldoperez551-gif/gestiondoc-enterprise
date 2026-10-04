import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  INITIAL_USERS,
  INITIAL_FOLDERS,
  INITIAL_TAGS,
  INITIAL_DOCUMENTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_NOTIFICATIONS,
} from '../src/services/firestoreService';

async function main() {
  console.log('Iniciando escritura directa de colecciones en español a Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const u of INITIAL_USERS) {
    await setDoc(doc(db, 'usuarios', u.id), u);
    console.log(`Usuario creado: ${u.name}`);
  }

  for (const f of INITIAL_FOLDERS) {
    await setDoc(doc(db, 'carpetas', f.id), f);
    console.log(`Carpeta creada: ${f.name}`);
  }

  for (const t of INITIAL_TAGS) {
    await setDoc(doc(db, 'etiquetas', t.id), t);
    console.log(`Etiqueta creada: ${t.name}`);
  }

  for (const d of INITIAL_DOCUMENTS) {
    await setDoc(doc(db, 'documentos', d.id), d);
    console.log(`Documento creado: ${d.title}`);
  }

  for (const a of INITIAL_ASSIGNMENTS) {
    await setDoc(doc(db, 'asignaciones', a.id), a);
    console.log(`Asignación creada: ${a.id}`);
  }

  for (const n of INITIAL_NOTIFICATIONS) {
    await setDoc(doc(db, 'notificaciones', n.id), n);
    console.log(`Notificación creada: ${n.title}`);
  }

  const auditEntry = {
    id: `audit_${Date.now()}`,
    userId: 'usr_admin_01',
    userName: 'Isaac Pérez',
    action: 'inicializacion_espanol',
    resourceType: 'sistema',
    details: { mensaje: 'Colecciones creadas en español en Firebase Firestore.' },
    ipAddress: '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  await setDoc(doc(db, 'registros_auditoria', auditEntry.id), auditEntry);

  console.log('¡Todas las colecciones en español han sido subidas exitosamente a Firestore!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
