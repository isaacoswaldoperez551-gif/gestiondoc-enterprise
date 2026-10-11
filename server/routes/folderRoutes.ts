import { Router, Response } from 'express';
import { FolderRepository, AuditRepository } from '../db';
import { requireAuth, requireAdmin, AuthRequest, getClientIp, getUserAgent } from '../auth';

const router = Router();

// GET /api/folders - Any authenticated user can list folders
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const folders = FolderRepository.findAll();
  return res.json({ folders });
});

// POST /api/folders - Admin only
router.post('/', requireAdmin, (req: AuthRequest, res: Response) => {
  const { name, parentId } = req.body;
  const admin = req.user!;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'El nombre de la carpeta es obligatorio.' });
  }

  const folder = FolderRepository.create(name, admin.id, parentId || null);

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'folder_created',
    resourceType: 'folder',
    resourceId: folder.id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { name: folder.name, parentId },
  });

  return res.status(201).json({ folder });
});

// DELETE /api/folders/:id - Admin only
router.delete('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const admin = req.user!;
  const folder = FolderRepository.findById(id);

  if (!folder) {
    return res.status(404).json({ error: 'Carpeta no encontrada.' });
  }

  FolderRepository.delete(id);

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'folder_deleted',
    resourceType: 'folder',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { name: folder.name },
  });

  return res.json({ message: 'Carpeta eliminada correctamente.' });
});

export default router;
