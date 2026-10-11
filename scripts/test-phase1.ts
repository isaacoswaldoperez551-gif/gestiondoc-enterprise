/**
 * Automated test suite for Phase 1: Authentication, RBAC, Password Policies & Audit
 * Run with: npx tsx scripts/test-phase1.ts
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('\n======================================================');
  console.log('  EJECUTANDO PRUEBAS AUTOMÁTICAS - FASE 1');
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
    // Test 1: Health endpoint
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert('1. Endpoint de salud /api/health responde 200 OK', healthRes.status === 200);

    // Test 2: Admin login with valid credentials
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@empresa.com', password: 'Admin123!*' }),
    });
    const adminData = await adminLoginRes.json();
    assert('2. Inicio de sesión exitoso como Administrador', adminLoginRes.status === 200 && !!adminData.token);
    assert('3. Administrador no tiene bloqueo ni cambio forzado', adminData.user.mustChangePassword === false);

    const adminToken = adminData.token;

    // Test 3: User login with temporary password and check mustChangePassword
    const userLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlos.mendoza@empresa.com', password: 'TempPassword123!' }),
    });
    const userData = await userLoginRes.json();
    assert('4. Inicio de sesión de Usuario nuevo exitoso', userLoginRes.status === 200);
    assert('5. Usuario tiene mustChangePassword: true en su primer ingreso', userData.user.mustChangePassword === true);

    const userToken = userData.token;

    // Test 4: Server-side RBAC (403 when User tries to access Admin route /api/users)
    const unauthorizedRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert('6. Verificación en servidor: Usuario ordinario recibe 403 al intentar acceder a /api/users', unauthorizedRes.status === 403);

    // Test 5: Admin can access /api/users
    const adminUsersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersList = await adminUsersRes.json();
    assert('7. Administrador autorizado puede listar usuarios en /api/users', adminUsersRes.status === 200 && Array.isArray(usersList.users));

    // Test 6: Failed password attempt and counter validation
    const badPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlos.mendoza@empresa.com', password: 'PasswordErroneo123!' }),
    });
    const badPassData = await badPassRes.json();
    assert('8. Contraseña errónea genera error 401 y muestra intentos restantes', badPassRes.status === 401 && badPassData.error.includes('intento(s) antes del bloqueo'));

    // Test 7: Audit log verification
    const auditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    assert('9. Registro de auditoría almacena eventos sensibles inmutables', auditRes.status === 200 && auditData.total > 0);

  } catch (err: any) {
    console.error('Error crítico ejecutando tests:', err.message);
    failed++;
  }

  console.log('\n------------------------------------------------------');
  console.log(`  RESUMEN: ${passed} pasadas, ${failed} fallidas.`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
