import { Router, Response } from 'express';
import { NotificationRepository, AuditRepository } from '../db';
import { requireAuth, AuthRequest, getClientIp, getUserAgent } from '../auth';
import { NotificationService } from '../notificationService';

const router = Router();

router.use(requireAuth);

// GET /api/notifications - User's notifications
router.get('/', (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const notifs = NotificationRepository.findByUserId(user.id);
  const unreadCount = notifs.filter((n) => !n.read).length;

  return res.json({
    notifications: notifs,
    unreadCount,
  });
});

// PUT /api/notifications/:id/read - Mark one as read
router.put('/:id/read', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  NotificationRepository.markAsRead(id, user.id);
  return res.json({ success: true });
});

// PUT /api/notifications/mark-all-read - Mark all as read
router.put('/mark-all-read', (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const count = NotificationRepository.markAllAsRead(user.id);
  return res.json({ success: true, markedCount: count });
});

// GET /api/notifications/email-outbox - View simulated email outbox
router.get('/email-outbox', (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const allEmails = NotificationRepository.findOutbox();

  // If user is not admin, only show emails addressed to them
  const visible = user.role === 'admin'
    ? allEmails
    : allEmails.filter((e) => e.emailContent?.to.toLowerCase() === user.email.toLowerCase());

  return res.json({
    outbox: visible,
    total: visible.length,
  });
});

// POST /api/notifications/run-alerts - Run alert evaluations for 7d, 3d, 1d, overdue
router.post('/run-alerts', (req: AuthRequest, res: Response) => {
  const result = NotificationService.runAlertScheduler();
  return res.json({
    message: 'Evaluación de alertas y plazos ejecutada correctamente.',
    alertsGenerated: result.alertsGenerated,
  });
});

export default router;
