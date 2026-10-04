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

async function main() {
  console.log('--- RESTAURANDO TODAS LAS COLECCIONES EN VIVO EN FIREBASE ---');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // 1. USUARIOS
  const usersSnap = await getDocs(collection(db, 'usuarios'));
  for (const d of usersSnap.docs) { await deleteDoc(doc(db, 'usuarios', d.id)); }
  await setDoc(doc(db, 'usuarios', 'usr_admin_isaac'), {
    id: 'usr_admin_isaac',
    nombre: 'Isaac Perez',
    correo: 'isaacoswaldoperez551@gmail.com',
    password: 'tocino2023',
    rol: 'administrador',
    estado: 'activo',
    departamento: 'Administración General / Sistemas',
    debeCambiarContrasena: false,
    fechaCreacion: new Date().toISOString(),
  });

  console.log('--- ¡ADMINISTRADOR ISAAC PEREZ RESTAURADO CON CONTRASEÑA EN FIREBASE! ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
