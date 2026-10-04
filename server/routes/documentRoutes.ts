import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import {
  DocumentRepository,
  DocumentVersionRepository,
  AssignmentRepository,
  FolderRepository,
  TagRepository,
  AuditRepository,
} from '../db';
import {
  requireAuth,
  requireAdmin,
  AuthRequest,
  getClientIp,
  getUserAgent,
} from '../auth';
import { STORAGE_DIR } from '../storage';
import { DocumentFileType } from '../types';

const router = Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `doc_${crypto.randomUUID().replace(/-/g, '')}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.docx', '.xlsx', '.doc', '.xls'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no permitido. Solo se aceptan archivos .pdf, .docx y .xlsx'));
    }
  },
});

function getFileTypeFromExt(ext: string): DocumentFileType {
  const clean = ext.toLowerCase().replace('.', '');
  if (clean === 'pdf') return 'pdf';
  if (['docx', 'doc'].includes(clean)) return 'docx';
  if (['xlsx', 'xls'].includes(clean)) return 'xlsx';
  return 'other';
}

// GET /api/documents - Admin full document list
router.get('/', requireAdmin, (req: AuthRequest, res: Response) => {
  const { search, folderId, tagId, includeDeleted } = req.query;
  let docs = DocumentRepository.findAll(includeDeleted === 'true');

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    docs = docs.filter((d) => d.title.toLowerCase().includes(q));
  }

  if (folderId && typeof folderId === 'string') {
    docs = docs.filter((d) => d.folderId === folderId);
  }

  if (tagId && typeof tagId === 'string') {
    docs = docs.filter((d) => d.tagIds.includes(tagId));
  }

  // Populate folder and tag names
  const folders = FolderRepository.findAll();
  const tags = TagRepository.findAll();

  const enriched = docs.map((d) => {
    const folder = folders.find((f) => f.id === d.folderId);
    const docTags = tags.filter((t) => d.tagIds.includes(t.id));
    return {
      ...d,
      folderName: folder?.name || null,
      tags: docTags,
    };
  });

  return res.json({ documents: enriched, total: enriched.length });
});

// POST /api/documents/upload - Admin uploads new document
router.post('/upload', requireAdmin, upload.single('file'), (req: AuthRequest, res: Response) => {
  const file = req.file;
  const admin = req.user!;
  const { title, folderId, tagIds, isTemplate } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'Debe seleccionar un archivo válido (.pdf, .docx, .xlsx).' });
  }

  if (!title || typeof title !== 'string' || title.trim() === '') {
    // Clean up uploaded file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'El título del documento es obligatorio.' });
  }

  const ext = path.extname(file.originalname);
  const fileType = getFileTypeFromExt(ext);

  let parsedTagIds: string[] = [];
  if (tagIds) {
    try {
      parsedTagIds = Array.isArray(tagIds) ? tagIds : JSON.parse(tagIds);
    } catch {
      parsedTagIds = typeof tagIds === 'string' ? tagIds.split(',').map((s) => s.trim()) : [];
    }
  }

  // Create document
  const doc = DocumentRepository.create({
    title: title.trim(),
    fileType,
    folderId: folderId || null,
    tagIds: parsedTagIds,
    currentVersionId: null,
    isTemplate: isTemplate === 'true' || isTemplate === true,
    createdBy: admin.id,
    creatorName: admin.name,
  });

  // Create version 1
  const version = DocumentVersionRepository.create({
    documentId: doc.id,
    versionNumber: 1,
    storagePath: file.path,
    originalFilename: file.originalname,
    fileSizeBytes: file.size,
    mimeType: file.mimetype,
    changeSummary: 'Versión inicial cargada por la administración',
    uploadedBy: admin.id,
    uploaderName: admin.name,
  });

  // Link currentVersionId
  DocumentRepository.update(doc.id, { currentVersionId: version.id });
  doc.currentVersionId = version.id;

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'document_uploaded',
    resourceType: 'document',
    resourceId: doc.id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: {
      title: doc.title,
      fileType,
      fileName: file.originalname,
      fileSize: file.size,
      folderId: doc.folderId,
    },
  });

  return res.status(201).json({
    message: 'Documento cargado exitosamente.',
    document: {
      ...doc,
      versions: [version],
    },
  });
});

// GET /api/documents/:id - Single document with server-side permission check
router.get('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const doc = DocumentRepository.findById(id);
  if (!doc) {
    return res.status(404).json({ error: 'Documento no encontrado.' });
  }

  // Permission Verification in Server:
  // If not admin, verify assignment
  if (user.role !== 'admin') {
    const assignment = AssignmentRepository.findByDocumentAndUser(doc.id, user.id);
    if (!assignment) {
      // Record security violation in audit log
      AuditRepository.create({
        userId: user.id,
        userEmail: user.email,
        action: 'unauthorized_document_access_attempt',
        resourceType: 'document',
        resourceId: doc.id,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        details: {
          documentTitle: doc.title,
          reason: 'User attempted to access a document not assigned to them',
        },
      });

      return res.status(403).json({
        error: 'Acceso denegado. Este documento no ha sido asignado a su cuenta.',
      });
    }

    // If assigned, register opening timestamp
    if (!assignment.firstOpenedAt) {
      AssignmentRepository.update(assignment.id, {
        firstOpenedAt: new Date().toISOString(),
        lastWorkedAt: new Date().toISOString(),
      });
    } else {
      AssignmentRepository.update(assignment.id, {
        lastWorkedAt: new Date().toISOString(),
      });
    }
  }

  const folders = FolderRepository.findAll();
  const tags = TagRepository.findAll();
  const folder = folders.find((f) => f.id === doc.folderId);
  const docTags = tags.filter((t) => doc.tagIds.includes(t.id));

  return res.json({
    document: {
      ...doc,
      folderName: folder?.name || null,
      tags: docTags,
    },
  });
});

// PUT /api/documents/:id - Update metadata (Admin only)
router.put('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, folderId, tagIds } = req.body;
  const admin = req.user!;

  const doc = DocumentRepository.findById(id);
  if (!doc) {
    return res.status(404).json({ error: 'Documento no encontrado.' });
  }

  const updates: any = {};
  if (title !== undefined) updates.title = title.trim();
  if (folderId !== undefined) updates.folderId = folderId || null;
  if (tagIds !== undefined) updates.tagIds = tagIds;

  const updated = DocumentRepository.update(id, updates);

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'document_updated',
    resourceType: 'document',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { title: doc.title, updates },
  });

  return res.json({ message: 'Documento actualizado.', document: updated });
});

// DELETE /api/documents/:id - Soft delete (Admin only)
router.delete('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const admin = req.user!;

  const doc = DocumentRepository.findById(id);
  if (!doc) {
    return res.status(404).json({ error: 'Documento no encontrado.' });
  }

  DocumentRepository.softDelete(id, admin.id);

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'document_deleted',
    resourceType: 'document',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { title: doc.title },
  });

  return res.json({ message: `El documento "${doc.title}" ha sido enviado a la papelera.` });
});

export default router;
