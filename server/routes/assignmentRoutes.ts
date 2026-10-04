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
  const { documentId, userId, permissionLevel, dueDate } = req.body;
  const admin = req.user!;

  if (!documentId || !userId || !permissionLevel || !dueDate) {
    return res.status(400).json({
      error: 'Debe especificar el documento, el usuario destinatario, el nivel de permiso y la fecha límite.',
    });
  }

  const doc = DocumentRepository.findById(documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Documento no encontrado.' });
  }

  const targetUser = UserRepository.findById(userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Usuario destinatario no encontrado.' });
  }

  if (!['view', 'download', 'upload_version'].includes(permissionLevel)) {
    return res.status(400).json({ error: 'Nivel de permiso inválido. Use view, download o upload_version.' });
  }

  const assignment = AssignmentRepository.create({
    documentId,
    userId,
    userName: targetUser.name,
    userEmail: targetUser.email,
    groupId: null,
    permissionLevel,
    status: 'pending',
    dueDate: new Date(dueDate).toISOString(),
    assignedBy: admin.id,
  });

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'assignment_created',
    resourceType: 'assignment',
    resourceId: assignment.id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: {
      documentTitle: doc.title,
      targetUser: targetUser.email,
      permissionLevel,
      dueDate,
    },
  });

  return res.status(201).json({
    message: `Documento asignado exitosamente a ${targetUser.name}.`,
    assignment,
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
