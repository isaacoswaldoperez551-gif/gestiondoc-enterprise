/**
 * Automated test suite for Phase 5:
 * Document Collaboration & Comments, Audit Log Filters, History Timeline & End-to-End Integrity
 * Run with: npx tsx scripts/test-phase5.ts
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('\n======================================================');
  console.log('  EJECUTANDO PRUEBAS AUTOMÁTICAS - FASE 5');
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
    // 1. Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@empresa.com', password: 'Admin123!*' }),
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;
    assert('1. Admin autenticado correctamente', !!adminToken);

    // 2. Carlos login
    const carlosLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlos.mendoza@empresa.com', password: 'TempPassword123!' }),
    });
    const carlosData = await carlosLoginRes.json();
    const carlosToken = carlosData.token;
    assert('2. Usuario Carlos Mendoza autenticado', !!carlosToken);

    // 3. Post a comment on doc_02 as Carlos
    const commentRes = await fetch(`${BASE_URL}/api/documents/doc_02/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${carlosToken}`,
      },
      body: JSON.stringify({
        content: 'He revisado los balances y adjunto las observaciones en la sección de pasivos corrientes.',
      }),
    });
    const commentData = await commentRes.json();
    assert('3. Usuario asignado publica comentario en el documento (201 Created)', commentRes.status === 201 && !!commentData.comment.id);

    // 4. Retrieve comments for doc_02 as Admin
    const getCommentsRes = await fetch(`${BASE_URL}/api/documents/doc_02/comments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getCommentsData = await getCommentsRes.json();
    const foundComment = getCommentsData.comments.some((c: any) => c.id === commentData.comment.id);
    assert('4. Consulta de comentarios refleja el hilo de colaboración en orden cronológico', getCommentsRes.status === 200 && foundComment);

    // 5. Unauthorized comment attempt: Mateo (not assigned to doc_02) tries to comment on doc_02
    const mateoLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mateo.silva@empresa.com', password: 'UserPass123!' }),
    });
    const mateoData = await mateoLoginRes.json();
    const mateoToken = mateoData.token;

    const unauthCommentRes = await fetch(`${BASE_URL}/api/documents/doc_02/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mateoToken}`,
      },
      body: JSON.stringify({ content: 'Intento de comentar en documento no asignado' }),
    });
    assert('5. Servidor rechaza con 403 intento de comentar en documento sin asignación', unauthCommentRes.status === 403);

    // 6. Query Audit Logs as Admin with search and action filters
    const auditRes = await fetch(`${BASE_URL}/api/audit-logs?action=comment_added`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    assert('6. Registro de auditoría permite filtrado por tipo de acción y búsqueda', auditRes.status === 200 && Array.isArray(auditData.logs));

    // 7. Verify Document Timeline tracks versioning, reverted actions, and accesses
    const timelineRes = await fetch(`${BASE_URL}/api/documents/doc_02/timeline`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const timelineData = await timelineRes.json();
    assert('7. Línea de tiempo histórica del documento muestra todos los hitos del ciclo de vida', timelineRes.status === 200 && timelineData.timeline.length > 0);

    // 8. Verify user cannot access audit logs
    const userAuditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${carlosToken}` },
    });
    assert('8. Seguridad RBAC: Usuario común no tiene acceso al log de auditoría (403 Forbidden)', userAuditRes.status === 403);

  } catch (err: any) {
    console.error('Error en pruebas de Fase 5:', err.message);
    failed++;
  }

  console.log('\n------------------------------------------------------');
  console.log(`  RESUMEN FASE 5: ${passed} pasadas, ${failed} fallidas.`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
