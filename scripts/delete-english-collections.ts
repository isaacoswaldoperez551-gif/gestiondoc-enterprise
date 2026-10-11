import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
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

async function main() {
  console.log('Iniciando eliminación de colecciones en inglés de Firestore...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const colName of englishCollections) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      console.log(`Colección "${colName}": ${snapshot.size} documentos encontrados.`);

      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, colName, d.id));
        console.log(` - Eliminado de ${colName}: ${d.id}`);
      }
      console.log(`✓ Colección "${colName}" vaciada y eliminada.`);
    } catch (err) {
      console.error(`Error eliminando colección ${colName}:`, err);
    }
  }

  console.log('¡Todas las colecciones en inglés han sido eliminadas exitosamente!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
