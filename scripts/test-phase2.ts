/**
 * Automated test suite for Phase 2: Documents, Folders, Tags, Assignments, Permissions & 403 Enforcement
 * Run with: npx tsx scripts/test-phase2.ts
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('\n======================================================');
  console.log('  EJECUTANDO PRUEBAS AUTOMÁTICAS - FASE 2');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(description: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${description} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Login as Admin
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@empresa.com', password: 'Admin123!*' }),
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;
    assert('1. Admin autenticado correctamente para gestión documental', !!adminToken);

    // 2. Login as Mateo Silva (User with 0 assigned documents initially)
    const mateoLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mateo.silva@empresa.com', password: 'UserPass123!' }),
    });
    const mateoData = await mateoLoginRes.json();
    const mateoToken = mateoData.token;
    assert('2. Usuario Mateo Silva autenticado', !!mateoToken);

    // 3. Login as Carlos Mendoza
    const carlosLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlos.mendoza@empresa.com', password: 'TempPassword123!' }),
    });
    const carlosData = await carlosLoginRes.json();
    const carlosToken = carlosData.token;
    assert('3. Usuario Carlos Mendoza autenticado', !!carlosToken);

    // 4. Verify Folders & Tags list
    const foldersRes = await fetch(`${BASE_URL}/api/folders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const foldersData = await foldersRes.json();
    assert('4. Admin y usuarios pueden consultar estructura de carpetas', foldersRes.status === 200 && foldersData.folders.length >= 3);

    // 5. Verify Sample Documents in Admin Repository (.pdf, .xlsx, .docx)
    const docsRes = await fetch(`${BASE_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const docsData = await docsRes.json();
    const hasPdf = docsData.documents.some((d: any) => d.fileType === 'pdf');
    const hasXlsx = docsData.documents.some((d: any) => d.fileType === 'xlsx');
    const hasDocx = docsData.documents.some((d: any) => d.fileType === 'docx');
    assert('5. Repositorio incluye documentos iniciales .pdf, .xlsx y .docx', hasPdf && hasXlsx && hasDocx);

    // 6. User Carlos checks assigned documents (/api/my-documents)
    const carlosDocsRes = await fetch(`${BASE_URL}/api/my-documents`, {
      headers: { Authorization: `Bearer ${carlosToken}` },
    });
    const carlosDocs = await carlosDocsRes.json();
    assert('6. Carlos ve exclusivamente sus documentos asignados', carlosDocsRes.status === 200 && carlosDocs.documents.length >= 2);

    // 7. Verify user only sees documents specifically assigned to them
    const mateoDocsRes = await fetch(`${BASE_URL}/api/my-documents`, {
      headers: { Authorization: `Bearer ${mateoToken}` },
    });
    const mateoDocs = await mateoDocsRes.json();
    assert('7. Mateo no tiene acceso a documentos no asignados (doc_03)', !mateoDocs.documents.some((d: any) => d.document.id === 'doc_03'));

    // 8. CRITICAL: Server-side 403 Security Check
    // Mateo tries to access Lucía's document (doc_03) via API without assignment
    const mateoBreachRes = await fetch(`${BASE_URL}/api/documents/doc_03`, {
      headers: { Authorization: `Bearer ${mateoToken}` },
    });
    assert('8. SERVIDOR RECHAZA CON 403 intento de abrir documento no asignado', mateoBreachRes.status === 403);

    // 9. Admin assigns document doc_01 to Mateo with permission and deadline
    const assignRes = await fetch(`${BASE_URL}/api/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        documentId: 'doc_01',
        userId: mateoData.user.id,
        permissionLevel: 'download',
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    assert('9. Administrador asigna documento a Mateo con permiso y fecha límite', assignRes.status === 200 || assignRes.status === 201);

    // 10. Mateo now can access doc_01
    const mateoAccessRes = await fetch(`${BASE_URL}/api/documents/doc_01`, {
      headers: { Authorization: `Bearer ${mateoToken}` },
    });
    assert('10. Tras la asignación, el servidor autoriza el acceso a Mateo (200 OK)', mateoAccessRes.status === 200);

    // 11. Carlos updates status to 'submitted'
    const statusUpdateRes = await fetch(`${BASE_URL}/api/my-documents/doc_02/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${carlosToken}`,
      },
      body: JSON.stringify({ status: 'submitted' }),
    });
    assert('11. Usuario marca documento como entregado para revisión', statusUpdateRes.status === 200);

    // 12. Audit log records the 403 violation and the assignment
    const auditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    const loggedBreach = auditData.logs.some((l: any) => l.action === 'unauthorized_document_access_attempt');
    assert('12. Intento de acceso no autorizado queda registrado en auditoría inmutable', loggedBreach);

  } catch (err: any) {
    console.error('Error en pruebas de Fase 2:', err.message);
    failed++;
  }

  console.log('\n------------------------------------------------------');
  console.log(`  RESUMEN FASE 2: ${passed} pasadas, ${failed} fallidas.`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
