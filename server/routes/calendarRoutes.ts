import { Router, Response } from 'express';
import {
  AssignmentRepository,
  DocumentRepository,
  FolderRepository,
  TagRepository,
  UserRepository,
} from '../db';
import { requireAuth, AuthRequest } from '../auth';

const router = Router();

router.use(requireAuth);

// GET /api/calendar/events
router.get('/events', (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { year, month, folderId, userId, status } = req.query;

  // If user is not admin, only fetch their own assignments
  const allAssignments = user.role === 'admin'
    ? AssignmentRepository.findAll()
    : AssignmentRepository.findByUserId(user.id);

  const folders = FolderRepository.findAll();
  const tags = TagRepository.findAll();
  const now = Date.now();

  let filtered = allAssignments;

  if (userId && typeof userId === 'string' && user.role === 'admin') {
    filtered = filtered.filter((a) => a.userId === userId);
  }

  if (status && typeof status === 'string') {
    filtered = filtered.filter((a) => a.status === status);
  }

  const events = filtered.map((asg) => {
    const doc = asg.document || DocumentRepository.findById(asg.documentId);
    const folder = doc ? folders.find((f) => f.id === doc.folderId) : undefined;
    const docTags = doc ? tags.filter((t) => doc.tagIds?.includes(t.id)) : [];

    const dueDateObj = new Date(asg.dueDate);
    const dateStr = dueDateObj.toISOString().split('T')[0];
    const diffHours = (dueDateObj.getTime() - now) / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffHours / 24);

    // Compute urgency color
    // green (a tiempo / aprobado), amarillo (próximo <= 3 días), rojo (vencido o requiere correcciones), azul (en progreso/entregado), gray (pendiente)
    let color: 'green' | 'yellow' | 'red' | 'blue' | 'gray' = 'gray';

    if (asg.status === 'approved') {
      color = 'green';
    } else if (asg.status === 'changes_requested' || diffHours < 0) {
      color = 'red';
    } else if (diffDays <= 3 && diffDays >= 0) {
      color = 'yellow';
    } else if (asg.status === 'in_progress' || asg.status === 'submitted') {
      color = 'blue';
    } else {
      color = 'gray';
    }

    return {
      id: asg.id,
      assignmentId: asg.id,
      documentId: asg.documentId,
      title: doc?.title || 'Documento',
      fileType: doc?.fileType || 'other',
      folderId: doc?.folderId || null,
      folderName: folder?.name || 'General',
      tags: docTags,
      assignedUserId: asg.userId,
      assignedUserName: asg.userName || 'Usuario',
      assignedUserEmail: asg.userEmail,
      permissionLevel: asg.permissionLevel,
      dueDate: asg.dueDate,
      date: dateStr,
      status: asg.status,
      diffDays,
      isOverdue: diffHours < 0 && asg.status !== 'approved',
      color,
      reviewComment: asg.reviewComment,
    };
  });

  // Filter by folder if specified
  const finalEvents = folderId && typeof folderId === 'string'
    ? events.filter((e) => e.folderId === folderId)
    : events;

  return res.json({
    events: finalEvents,
    total: finalEvents.length,
  });
});

export default router;
