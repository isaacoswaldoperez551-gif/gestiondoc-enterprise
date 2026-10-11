import { Router, Response } from 'express';
import { TagRepository } from '../db';
import { requireAuth, requireAdmin, AuthRequest } from '../auth';

const router = Router();

// GET /api/tags
router.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const tags = TagRepository.findAll();
  return res.json({ tags });
});

// POST /api/tags - Admin only
router.post('/', requireAdmin, (req: AuthRequest, res: Response) => {
  const { name, color } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'El nombre de la etiqueta es obligatorio.' });
  }

  const tag = TagRepository.create(name, color || '#2563EB');
  return res.status(201).json({ tag });
});

export default router;
