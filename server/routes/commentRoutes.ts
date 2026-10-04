import { Router, Response } from 'express';
import {
  CommentRepository,
  DocumentRepository,
  AssignmentRepository,
  AuditRepository,
} from '../db';
import { requireAuth, AuthRequest, getClientIp, getUserAgent } from '../auth';
import { NotificationService } from '../notificationService';

const router = Router();

router.use(requireAuth);

// Helper to check user document permission
function checkDocumentAccess(req: AuthRequest, docId: string): boolean {
  const user = req.user!;
  const doc = DocumentRepository.findById(docId);
  if (!doc) return false;
  if (user.role === 'admin') return true;

  const assignment = AssignmentRepository.findByDocumentAndUser(docId, user.id);
  return !!assignment;
}

// GET /api/documents/:id/comments - Get all comments for document
router.get('/:id/comments', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!checkDocumentAccess(req, id)) {
    return res.status(403).json({ error: 'Acceso denegado a este documento.' });
  }

  const comments = CommentRepository.findByDocumentId(id);
  return res.json({ comments });
});

// POST /api/documents/:id/comments - Add new comment
router.post('/:id/comments', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const user = req.user!;

  if (!checkDocumentAccess(req, id)) {
    return res.status(403).json({ error: 'Acceso denegado a este documento.' });
  }

  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'El contenido del comentario no puede estar vacío.' });
  }

  const comment = CommentRepository.create({
    documentId: id,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,
    content: content.trim(),
  });

  // Dispatch notification to other participants
  NotificationService.onCommentCreated(id, user.name, user.role, content.trim());

  // Record in audit log
  AuditRepository.create({
    userId: user.id,
    userEmail: user.email,
    action: 'comment_added',
    resourceType: 'document',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { commentId: comment.id, length: content.length },
  });

  return res.status(201).json({
    message: 'Comentario agregado correctamente.',
    comment,
  });
});

export default router;
