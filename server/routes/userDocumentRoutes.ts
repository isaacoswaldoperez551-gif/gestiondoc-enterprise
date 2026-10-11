import { Router, Response } from 'express';
import {
  AssignmentRepository,
  DocumentRepository,
  FolderRepository,
  TagRepository,
  AuditRepository,
} from '../db';
import {
  requireAuth,
  AuthRequest,
  getClientIp,
  getUserAgent,
} from '../auth';

const router = Router();

router.use(requireAuth);

// GET /api/my-documents - List documents assigned to current user
router.get('/', (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const assignments = AssignmentRepository.findByUserId(user.id);
  const folders = FolderRepository.findAll();
  const tags = TagRepository.findAll();

  const assignedDocs = assignments.map((asg) => {
    const doc = asg.document!;
    const folder = folders.find((f) => f.id === doc.folderId);
    const docTags = tags.filter((t) => doc.tagIds.includes(t.id));

    return {
      assignmentId: asg.id,
      permissionLevel: asg.permissionLevel,
      status: asg.status,
      dueDate: asg.dueDate,
      firstOpenedAt: asg.firstOpenedAt,
      lastWorkedAt: asg.lastWorkedAt,
      reviewComment: asg.reviewComment,
      reviewedAt: asg.reviewedAt,
      document: {
        ...doc,
        folderName: folder?.name || 'General',
        tags: docTags,
      },
    };
  });

  return res.json({ documents: assignedDocs, total: assignedDocs.length });
});

// GET /api/my-documents/:documentId - Server-side check
router.get('/:documentId', (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  const user = req.user!;

  const assignment = AssignmentRepository.findByDocumentAndUser(documentId, user.id);
  if (!assignment) {
    AuditRepository.create({
      userId: user.id,
      userEmail: user.email,
      action: 'unauthorized_document_access_attempt',
      resourceType: 'document',
      resourceId: documentId,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      details: {
        reason: 'User tried to open an unassigned document ID directly via API/URL',
      },
    });

    return res.status(403).json({
      error: 'Acceso Denegado (403). No tiene permisos ni asignación para este documento.',
    });
  }

  // Register opening
  const nowIso = new Date().toISOString();
  if (!assignment.firstOpenedAt) {
    AssignmentRepository.update(assignment.id, {
      firstOpenedAt: nowIso,
      lastWorkedAt: nowIso,
    });
  } else {
    AssignmentRepository.update(assignment.id, {
      lastWorkedAt: nowIso,
    });
  }

  const doc = DocumentRepository.findById(documentId);
  const folders = FolderRepository.findAll();
  const tags = TagRepository.findAll();
  const folder = folders.find((f) => f.id === doc?.folderId);
  const docTags = tags.filter((t) => doc?.tagIds.includes(t.id));

  return res.json({
    assignment,
    document: {
      ...doc,
      folderName: folder?.name || 'General',
      tags: docTags,
    },
  });
});

// POST /api/my-documents/:documentId/status - Update work status
router.post('/:documentId/status', (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  const { status } = req.body;
  const user = req.user!;

  if (!status || !['in_progress', 'submitted'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido. Opciones: in_progress, submitted.' });
  }

  const assignment = AssignmentRepository.findByDocumentAndUser(documentId, user.id);
  if (!assignment) {
    return res.status(403).json({ error: 'No tiene asignado este documento.' });
  }

  const updated = AssignmentRepository.update(assignment.id, {
    status,
    lastWorkedAt: new Date().toISOString(),
  });

  AuditRepository.create({
    userId: user.id,
    userEmail: user.email,
    action: status === 'submitted' ? 'document_submitted' : 'document_status_changed',
    resourceType: 'assignment',
    resourceId: assignment.id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: {
      newStatus: status,
      documentId,
    },
  });

  return res.json({
    message: status === 'submitted' ? 'Documento entregado para revisión.' : 'Estado actualizado a En Progreso.',
    assignment: updated,
  });
});

export default router;
