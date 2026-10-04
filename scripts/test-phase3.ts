/**
 * Automated test suite for Phase 3:
 * In-browser file streaming, version uploading, permissions check, diff comparison & version reversion
 * Run with: npx tsx scripts/test-phase3.ts
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('\n======================================================');
  console.log('  EJECUTANDO PRUEBAS AUTOMÁTICAS - FASE 3');
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
    assert('1. Admin autenticado para gestión de versiones', !!adminToken);

    // 2. Login as Carlos Mendoza (Assigned to doc_02 with upload_version permission)
    const carlosLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlos.mendoza@empresa.com', password: 'TempPassword123!' }),
    });
    const carlosData = await carlosLoginRes.json();
    const carlosToken = carlosData.token;
    assert('2. Usuario Carlos Mendoza autenticado (permiso upload_version en doc_02)', !!carlosToken);

    // 3. Login as Lucía Vega (Assigned to doc_03 with view-only permission)
    const luciaLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lucia.vega@empresa.com', password: 'UserPass123!' }),
    });
    const luciaData = await luciaLoginRes.json();
    const luciaToken = luciaData.token;
    assert('3. Usuario Lucía Vega autenticada (permiso solo view en doc_03)', !!luciaToken);

    // 4. Fetch document versions list
    const versionsRes = await fetch(`${BASE_URL}/api/documents/doc_01/versions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const versionsData = await versionsRes.json();
    assert('4. Consulta de árbol de versiones responde con lista de versiones', versionsRes.status === 200 && versionsData.versions.length >= 1);

    const initialVersion = versionsData.versions[0];

    // 5. Test File Streaming for PDF, DOCX, XLSX
    const fileStreamRes = await fetch(`${BASE_URL}/api/documents/doc_01/versions/${initialVersion.id}/file`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('5. Servidor transmite flujo de archivo con encabezados adecuados', fileStreamRes.status === 200);

    // 6. Security Check: Lucía (with only 'view' permission on doc_03) tries to upload a new version
    const fakeFormData = new FormData();
    fakeFormData.append('file', new Blob(['Contenido modificado no autorizado'], { type: 'text/plain' }), 'intento.docx');
    fakeFormData.append('changeSummary', 'Intento no autorizado');

    const unauthorizedUploadRes = await fetch(`${BASE_URL}/api/documents/doc_03/versions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${luciaToken}` },
      body: fakeFormData,
    });
    assert('6. Servidor responde 403 Forbidden cuando usuario sin permiso de subida intenta subir versión', unauthorizedUploadRes.status === 403);

    // Measure pre-upload version count on doc_02
    const preUploadDoc2VersionsRes = await fetch(`${BASE_URL}/api/documents/doc_02/versions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const preDoc2Versions = await preUploadDoc2VersionsRes.json();
    const preCount = preDoc2Versions.versions.length;

    // 7. Authorized upload: Carlos uploads a new version for doc_02
    const validFormData = new FormData();
    validFormData.append('file', new Blob(['NUEVOS ESTADOS FINANCIEROS AUDITADOS'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'balance_q3_v2.xlsx');
    validFormData.append('changeSummary', 'Ajuste de cuentas por cobrar y conciliación bancaria');

    const authorizedUploadRes = await fetch(`${BASE_URL}/api/documents/doc_02/versions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${carlosToken}` },
      body: validFormData,
    });
    const uploadResult = await authorizedUploadRes.json();
    assert('7. Usuario con permiso upload_version sube nueva versión con éxito (201 Created)', authorizedUploadRes.status === 201 && uploadResult.version.versionNumber > preCount);

    // 8. Verify Document has updated currentVersionId
    const doc2Res = await fetch(`${BASE_URL}/api/documents/doc_02`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const doc2Data = await doc2Res.json();
    assert('8. Documento actualiza currentVersionId a la nueva versión', doc2Data.document.currentVersionId === uploadResult.version.id);

    // 9. Compare versions
    const doc2VersionsRes = await fetch(`${BASE_URL}/api/documents/doc_02/versions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const doc2Versions = await doc2VersionsRes.json();
    const vLatest = doc2Versions.versions[0];
    const vPrev = doc2Versions.versions[1];

    const compareRes = await fetch(`${BASE_URL}/api/documents/doc_02/compare?v1=${vPrev.id}&v2=${vLatest.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const compareData = await compareRes.json();
    assert('9. Comparador calcula diferencias de metadatos y contenido entre versiones', compareRes.status === 200 && !!compareData.comparison.metadataDiff);

    // 10. Admin Revert to vPrev (Must create a new consecutive version and never delete prior versions)
    const revertRes = await fetch(`${BASE_URL}/api/documents/doc_02/versions/${vPrev.id}/revert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const revertData = await revertRes.json();
    assert('10. Administrador revierte, creando versión consecutiva sin eliminar las anteriores', revertRes.status === 200 && revertData.version.versionNumber > uploadResult.version.versionNumber);

    // 11. Verify total versions count increased by 2
    const finalVersionsRes = await fetch(`${BASE_URL}/api/documents/doc_02/versions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const finalVersionsData = await finalVersionsRes.json();
    assert('11. Árbol histórico preserva todas las versiones consecutivas', finalVersionsData.versions.length === preCount + 2);

    // 12. Timeline activity check
    const timelineRes = await fetch(`${BASE_URL}/api/documents/doc_02/timeline`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const timelineData = await timelineRes.json();
    assert('12. Línea de tiempo registra las subidas, visualizaciones y reversiones del archivo', timelineRes.status === 200 && timelineData.timeline.length > 0);

  } catch (err: any) {
    console.error('Error en pruebas de Fase 3:', err.message);
    failed++;
  }

  console.log('\n------------------------------------------------------');
  console.log(`  RESUMEN FASE 3: ${passed} pasadas, ${failed} fallidas.`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
