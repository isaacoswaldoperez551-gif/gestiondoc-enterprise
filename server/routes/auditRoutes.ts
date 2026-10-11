import { Router, Response } from 'express';
import { AuditRepository } from '../db';
import { requireAdmin, AuthRequest } from '../auth';

const router = Router();

router.use(requireAdmin);

// GET /api/audit-logs
router.get('/', (req: AuthRequest, res: Response) => {
  const { action, resourceType, search } = req.query;
  let logs = AuditRepository.findAll();

  if (action && typeof action === 'string') {
    logs = logs.filter((l) => l.action.toLowerCase().includes(action.toLowerCase()));
  }

  if (resourceType && typeof resourceType === 'string') {
    logs = logs.filter((l) => l.resourceType === resourceType);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    logs = logs.filter(
      (l) =>
        (l.userEmail && l.userEmail.toLowerCase().includes(q)) ||
        l.action.toLowerCase().includes(q) ||
        l.ipAddress.includes(q)
    );
  }

  return res.json({
    logs: logs.slice(0, 200), // Return recent 200 logs
    total: logs.length,
  });
});

export default router;
