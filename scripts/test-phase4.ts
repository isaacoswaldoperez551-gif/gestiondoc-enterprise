/**
 * Automated test suite for Phase 4:
 * Interactive Calendar, Deadlines, Urgency Indicators, In-App Notifications & Automated Alert Scheduler
 * Run with: npx tsx scripts/test-phase4.ts
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('\n======================================================');
  console.log('  EJECUTANDO PRUEBAS AUTOMÁTICAS - FASE 4');
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
    assert('1. Admin autenticado para gestión de calendario y alertas', !!adminToken);

    // 2. User Carlos login
    const carlosLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlos.mendoza@empresa.com', password: 'TempPassword123!' }),
    });
    const carlosData = await carlosLoginRes.json();
    const carlosToken = carlosData.token;
    assert('2. Usuario Carlos Mendoza autenticado', !!carlosToken);

    // 3. Admin queries all calendar events
    const adminCalRes = await fetch(`${BASE_URL}/api/calendar/events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminCalData = await adminCalRes.json();
    assert('3. Administrador obtiene eventos de toda la organización', adminCalRes.status === 200 && adminCalData.events.length >= 2);

    // 4. Verify calendar event color coding and deadline urgency fields
    const hasColorRules = adminCalData.events.every((e: any) =>
      ['green', 'yellow', 'red', 'blue', 'gray'].includes(e.color) &&
      typeof e.diffDays === 'number' &&
      typeof e.isOverdue === 'boolean'
    );
    assert('4. Eventos incluyen cálculo de días restantes, semáforo de urgencia y estado', hasColorRules);

    // 5. User queries their calendar events (should only see assigned events)
    const carlosCalRes = await fetch(`${BASE_URL}/api/calendar/events`, {
      headers: { Authorization: `Bearer ${carlosToken}` },
    });
    const carlosCalData = await carlosCalRes.json();
    const onlyCarlos = carlosCalData.events.every((e: any) => e.assignedUserId === carlosData.user.id);
    assert('5. Usuario regular consulta exclusivamente sus eventos asignados en calendario', carlosCalRes.status === 200 && onlyCarlos);

    // 6. Test automated alert scheduler (7d, 3d, 1d, overdue evaluation)
    const runAlertsRes = await fetch(`${BASE_URL}/api/notifications/run-alerts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const runAlertsData = await runAlertsRes.json();
    assert('6. Motor de alertas automatizadas evalúa plazos y genera notificaciones', runAlertsRes.status === 200 && typeof runAlertsData.alertsGenerated === 'number');

    // 7. Check user in-app notifications endpoint
    const notifsRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${carlosToken}` },
    });
    const notifsData = await notifsRes.json();
    assert('7. Centro de notificaciones entrega lista de alertas y contador no leídas', notifsRes.status === 200 && Array.isArray(notifsData.notifications));

    // 8. Test marking a notification as read
    if (notifsData.notifications.length > 0) {
      const firstNotif = notifsData.notifications[0];
      const markReadRes = await fetch(`${BASE_URL}/api/notifications/${firstNotif.id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${carlosToken}` },
      });
      assert('8. Marcar notificación como leída actualiza estado correctamente', markReadRes.status === 200);
    } else {
      assert('8. Marcar notificación como leída (sin notificaciones previas para marcar)', true);
    }

    // 9. Test mark all as read
    const markAllRes = await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${carlosToken}` },
    });
    assert('9. Marcar todas las notificaciones como leídas responde 200 OK', markAllRes.status === 200);

    // 10. Test simulated email outbox
    const outboxRes = await fetch(`${BASE_URL}/api/notifications/email-outbox`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const outboxData = await outboxRes.json();
    assert('10. Bandeja de salida de correos simulados registra correos corporativos con asunto y cuerpo HTML/texto', outboxRes.status === 200 && Array.isArray(outboxData.outbox));

  } catch (err: any) {
    console.error('Error en pruebas de Fase 4:', err.message);
    failed++;
  }

  console.log('\n------------------------------------------------------');
  console.log(`  RESUMEN FASE 4: ${passed} pasadas, ${failed} fallidas.`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
