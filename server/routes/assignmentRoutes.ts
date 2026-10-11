import { Router, Response } from 'express';
import {
  AssignmentRepository,
  DocumentRepository,
  UserRepository,
  AuditRepository,
} from '../db';
import {
  requireAdmin,
  AuthRequest,
  getClientIp,
  getUserAgent,
} from '../auth';

const router = Router();

router.use(requireAdmin);

// GET /api/assignments
router.get('/', (req: AuthRequest, res: Response) => {
  const { documentId, userId, status } = req.query;
  let assignments = AssignmentRepository.findAll();

  if (documentId && typeof documentId === 'string') {
    assignments = assignments.filter((a) => a.documentId === documentId);
  }

  if (userId && typeof userId === 'string') {
    assignments = assignments.filter((a) => a.userId === userId);
  }

  if (status && typeof status === 'string') {
    assignments = assignments.filter((a) => a.status === status);
  }

  return res.json({ assignments, total: assignments.length });
});

// POST /api/assignments
router.post('/', (req: AuthRequest, res: Response) => {
  const { documentId, userId, userIds, assignedUsers, permissionLevel, dueDate } = req.body;
  const admin = req.user!;

  const targetIds: string[] = Array.isArray(userIds) && userIds.length > 0
    ? userIds
    : userId
    ? [userId]
    : Array.isArray(assignedUsers) && assignedUsers.length > 0
    ? assignedUsers.map((u: any) => u.userId || u.id)
    : [];

  if (!documentId || targetIds.length === 0 || !permissionLevel || !dueDate) {
    return res.status(400).json({
      error: 'Debe especificar el documento, el usuario destinatario, el nivel de permiso y la fecha límite.',
    });
  }

  const doc = DocumentRepository.findById(documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Documento no encontrado.' });
  }

  const createdList: any[] = [];

  for (const uid of targetIds) {
    const targetUser = UserRepository.findById(uid);
    const assignedUserEntry = Array.isArray(assignedUsers)
      ? assignedUsers.find((au: any) => (au.userId || au.id) === uid)
      : null;

    const uName = targetUser?.name || assignedUserEntry?.userName || assignedUserEntry?.name || 'Usuario';
    const uEmail = targetUser?.email || assignedUserEntry?.userEmail || assignedUserEntry?.email || '';

    const assignment = AssignmentRepository.create({
      documentId,
      userId: uid,
      userName: uName,
      userEmail: uEmail,
      groupId: null,
      permissionLevel,
      status: 'pending',
      dueDate: new Date(dueDate).toISOString(),
      assignedBy: admin.id,
    });

    createdList.push(assignment);
  }

  const firstAssignment = createdList[0];

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'assignment_created',
    resourceType: 'assignment',
    resourceId: firstAssignment?.id || 'batch',
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: {
      documentTitle: doc.title,
      targetCount: createdList.length,
      permissionLevel,
      dueDate,
    },
  });

  return res.status(201).json({
    message: `Documento asignado exitosamente (${createdList.length} asignaciones creadas).`,
    assignment: firstAssignment,
    assignments: createdList,
  });
});

// PUT /api/assignments/:id/review - Review submission
router.put('/:id/review', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, reviewComment } = req.body;
  const admin = req.user!;

  if (!status || !['approved', 'changes_requested'].includes(status)) {
    return res.status(400).json({ error: 'El estado de revisión debe ser "approved" o "changes_requested".' });
  }

  const asg = AssignmentRepository.findById(id);
  if (!asg) {
    return res.status(404).json({ error: 'Asignación no encontrada.' });
  }

  const updated = AssignmentRepository.update(id, {
    status,
    reviewComment: reviewComment ? reviewComment.trim() : null,
    reviewedBy: admin.id,
    reviewedAt: new Date().toISOString(),
  });

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'assignment_reviewed',
    resourceType: 'assignment',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: {
      status,
      reviewComment,
      targetUser: asg.userEmail,
    },
  });

  return res.json({
    message: status === 'approved' ? 'Entrega aprobada satisfactoriamente.' : 'Se solicitaron correcciones al usuario.',
    assignment: updated,
  });
});

// DELETE /api/assignments/:id - Revoke assignment
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const admin = req.user!;

  const asg = AssignmentRepository.findById(id);
  if (!asg) {
    return res.status(404).json({ error: 'Asignación no encontrada.' });
  }

  AssignmentRepository.delete(id);

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'assignment_revoked',
    resourceType: 'assignment',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: {
      documentId: asg.documentId,
      targetUser: asg.userEmail,
    },
  });

  return res.json({ message: 'Asignación revocada exitosamente.' });
});

export default router;
