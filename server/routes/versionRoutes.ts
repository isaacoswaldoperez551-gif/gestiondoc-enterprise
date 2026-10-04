import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import * as diff from 'diff';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import {
  DocumentRepository,
  DocumentVersionRepository,
  AssignmentRepository,
  AuditRepository,
  UserRepository,
} from '../db';
import {
  requireAuth,
  requireAdmin,
  AuthRequest,
  getClientIp,
  getUserAgent,
} from '../auth';
import { STORAGE_DIR } from '../storage';
import { ComparisonResult, DiffChunk, SheetDiff, CellChange } from '../types';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `ver_${crypto.randomUUID().replace(/-/g, '')}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Helper to check user document permission
function checkDocumentAccess(req: AuthRequest, docId: string): {
  allowed: boolean;
  canUpload: boolean;
  canDownload: boolean;
  document: any;
  assignment?: any;
} {
  const user = req.user!;
  const doc = DocumentRepository.findById(docId);
  if (!doc) return { allowed: false, canUpload: false, canDownload: false, document: null };

  if (user.role === 'admin') {
    return { allowed: true, canUpload: true, canDownload: true, document: doc };
  }

  const assignment = AssignmentRepository.findByDocumentAndUser(docId, user.id);
  if (!assignment) {
    return { allowed: false, canUpload: false, canDownload: false, document: doc };
  }

  return {
    allowed: true,
    canUpload: assignment.permissionLevel === 'upload_version',
    canDownload: assignment.permissionLevel === 'download' || assignment.permissionLevel === 'upload_version',
    document: doc,
    assignment,
  };
}

// GET /api/documents/:id/versions - List all versions
router.get('/:id/versions', requireAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const access = checkDocumentAccess(req, id);

  if (!access.allowed) {
    AuditRepository.create({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'unauthorized_versions_access_attempt',
      resourceType: 'document',
      resourceId: id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    return res.status(403).json({ error: 'Acceso denegado a este documento.' });
  }

  const versions = DocumentVersionRepository.findByDocumentId(id);
  // Sort descending by version number
  versions.sort((a, b) => b.versionNumber - a.versionNumber);

  return res.json({
    documentId: id,
    currentVersionId: access.document.currentVersionId,
    versions,
  });
});

// GET /api/documents/:id/versions/:versionId/file - Stream file content
router.get('/:id/versions/:versionId/file', requireAuth, (req: AuthRequest, res: Response) => {
  const { id, versionId } = req.params;
  const access = checkDocumentAccess(req, id);

  if (!access.allowed) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }

  const version = DocumentVersionRepository.findById(versionId);
  if (!version || version.documentId !== id) {
    return res.status(404).json({ error: 'Versión no encontrada.' });
  }

  if (!fs.existsSync(version.storagePath)) {
    return res.status(404).json({ error: 'Archivo físico no disponible en el almacenamiento.' });
  }

  // Record view in audit
  AuditRepository.create({
    userId: req.user!.id,
    userEmail: req.user!.email,
    action: 'document_viewed',
    resourceType: 'document',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { versionNumber: version.versionNumber, filename: version.originalFilename },
  });

  res.setHeader('Content-Type', version.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(version.originalFilename)}"`);
  fs.createReadStream(version.storagePath).pipe(res);
});

// POST /api/documents/:id/versions - Upload a new version
router.post('/:id/versions', requireAuth, upload.single('file'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { changeSummary } = req.body;
  const file = req.file;
  const user = req.user!;

  if (!file) {
    return res.status(400).json({ error: 'Debe adjuntar un archivo para la nueva versión.' });
  }

  const access = checkDocumentAccess(req, id);
  if (!access.allowed || !access.canUpload) {
    // Delete uploaded temp file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    AuditRepository.create({
      userId: user.id,
      userEmail: user.email,
      action: 'unauthorized_version_upload_attempt',
      resourceType: 'document',
      resourceId: id,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      details: {
        reason: 'User lacks upload_version permission for this document',
      },
    });

    return res.status(403).json({
      error: 'Acceso Denegado (403). Su asignación actual no posee el permiso para subir nuevas versiones.',
    });
  }

  const existingVersions = DocumentVersionRepository.findByDocumentId(id);
  const nextVersionNumber = existingVersions.length > 0
    ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
    : 1;

  const newVersion = DocumentVersionRepository.create({
    documentId: id,
    versionNumber: nextVersionNumber,
    storagePath: file.path,
    originalFilename: file.originalname,
    fileSizeBytes: file.size,
    mimeType: file.mimetype,
    changeSummary: changeSummary ? changeSummary.trim() : `Actualización v${nextVersionNumber}`,
    uploadedBy: user.id,
    uploaderName: user.name,
  });

  // Set as current version on document
  DocumentRepository.update(id, {
    currentVersionId: newVersion.id,
  });

  // If user is assigned, mark lastWorkedAt and transition to submitted if requested
  if (access.assignment) {
    AssignmentRepository.update(access.assignment.id, {
      lastWorkedAt: new Date().toISOString(),
      status: 'submitted',
    });
  }

  AuditRepository.create({
    userId: user.id,
    userEmail: user.email,
    action: 'version_uploaded',
    resourceType: 'document',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: {
      versionNumber: nextVersionNumber,
      filename: file.originalname,
      changeSummary: newVersion.changeSummary,
    },
  });

  return res.status(201).json({
    message: `Versión v${nextVersionNumber} cargada exitosamente.`,
    version: newVersion,
  });
});

// POST /api/documents/:id/versions/:versionId/revert - Revert to previous version (Admin only)
router.post('/:id/versions/:versionId/revert', requireAdmin, (req: AuthRequest, res: Response) => {
  const { id, versionId } = req.params;
  const admin = req.user!;

  const doc = DocumentRepository.findById(id);
  if (!doc) {
    return res.status(404).json({ error: 'Documento no encontrado.' });
  }

  const targetVersion = DocumentVersionRepository.findById(versionId);
  if (!targetVersion || targetVersion.documentId !== id) {
    return res.status(404).json({ error: 'Versión destino no encontrada.' });
  }

  // Copy target file to create a NEW version (never delete or overwrite old versions)
  const ext = path.extname(targetVersion.storagePath);
  const newStoragePath = path.join(STORAGE_DIR, `rev_${crypto.randomUUID().replace(/-/g, '')}${ext}`);

  if (fs.existsSync(targetVersion.storagePath)) {
    fs.copyFileSync(targetVersion.storagePath, newStoragePath);
  }

  const existingVersions = DocumentVersionRepository.findByDocumentId(id);
  const nextVersionNumber = Math.max(...existingVersions.map((v) => v.versionNumber)) + 1;

  const revertedVersion = DocumentVersionRepository.create({
    documentId: id,
    versionNumber: nextVersionNumber,
    storagePath: newStoragePath,
    originalFilename: targetVersion.originalFilename,
    fileSizeBytes: targetVersion.fileSizeBytes,
    mimeType: targetVersion.mimeType,
    changeSummary: `Reversión a la versión v${targetVersion.versionNumber} efectuada por la administración`,
    uploadedBy: admin.id,
    uploaderName: admin.name,
  });

  DocumentRepository.update(id, {
    currentVersionId: revertedVersion.id,
  });

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'version_reverted',
    resourceType: 'document',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: {
      revertedFromVersion: targetVersion.versionNumber,
      newCreatedVersion: nextVersionNumber,
    },
  });

  return res.json({
    message: `Documento revertido exitosamente. Se creó la nueva versión v${nextVersionNumber}.`,
    version: revertedVersion,
  });
});

// GET /api/documents/:id/compare - Compare two versions
router.get('/:id/compare', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { v1: v1Id, v2: v2Id } = req.query;

  const access = checkDocumentAccess(req, id);
  if (!access.allowed) {
    return res.status(403).json({ error: 'Acceso denegado a este documento.' });
  }

  if (!v1Id || !v2Id || typeof v1Id !== 'string' || typeof v2Id !== 'string') {
    return res.status(400).json({ error: 'Debe especificar v1 y v2 para comparar.' });
  }

  const version1 = DocumentVersionRepository.findById(v1Id);
  const version2 = DocumentVersionRepository.findById(v2Id);

  if (!version1 || !version2) {
    return res.status(404).json({ error: 'Una de las versiones no fue encontrada.' });
  }

  const doc = access.document;
  const metadataDiff = [
    { field: 'Número de Versión', v1Value: `v${version1.versionNumber}`, v2Value: `v${version2.versionNumber}` },
    { field: 'Nombre de Archivo', v1Value: version1.originalFilename, v2Value: version2.originalFilename },
    { field: 'Tamaño en Disco', v1Value: `${(version1.fileSizeBytes / 1024).toFixed(1)} KB`, v2Value: `${(version2.fileSizeBytes / 1024).toFixed(1)} KB` },
    { field: 'Autor de Carga', v1Value: version1.uploaderName || 'Sistema', v2Value: version2.uploaderName || 'Sistema' },
    { field: 'Fecha de Publicación', v1Value: new Date(version1.createdAt).toLocaleString('es-ES'), v2Value: new Date(version2.createdAt).toLocaleString('es-ES') },
    { field: 'Resumen de Cambios', v1Value: version1.changeSummary, v2Value: version2.changeSummary },
  ];

  const result: ComparisonResult = {
    fileType: doc.fileType,
    v1: version1,
    v2: version2,
    metadataDiff,
  };

  // Compare contents depending on type
  if (doc.fileType === 'xlsx') {
    try {
      if (fs.existsSync(version1.storagePath) && fs.existsSync(version2.storagePath)) {
        const wb1 = XLSX.readFile(version1.storagePath);
        const wb2 = XLSX.readFile(version2.storagePath);

        const sheetDiffs: SheetDiff[] = [];
        const allSheetNames = Array.from(new Set([...wb1.SheetNames, ...wb2.SheetNames]));

        for (const sheetName of allSheetNames) {
          const s1 = wb1.Sheets[sheetName];
          const s2 = wb2.Sheets[sheetName];
          const cellChanges: CellChange[] = [];

          if (s1 && s2) {
            const keys = Array.from(new Set([...Object.keys(s1), ...Object.keys(s2)]))
              .filter((k) => !k.startsWith('!'));

            for (const cell of keys) {
              const val1 = s1[cell] ? String(s1[cell].v) : '';
              const val2 = s2[cell] ? String(s2[cell].v) : '';
              if (val1 !== val2) {
                cellChanges.push({ cell, oldVal: val1 || '(vacío)', newVal: val2 || '(vacío)' });
              }
            }
          }

          sheetDiffs.push({ sheetName, cellChanges });
        }
        result.sheetDiff = sheetDiffs;
      }
    } catch (err) {
      console.error('Error comparing xlsx:', err);
    }
  } else if (doc.fileType === 'docx') {
    try {
      let text1 = '';
      let text2 = '';

      if (fs.existsSync(version1.storagePath)) {
        try {
          const m1 = await mammoth.extractRawText({ path: version1.storagePath });
          text1 = m1.value || '';
        } catch {
          text1 = fs.readFileSync(version1.storagePath, 'utf-8');
        }
      }

      if (fs.existsSync(version2.storagePath)) {
        try {
          const m2 = await mammoth.extractRawText({ path: version2.storagePath });
          text2 = m2.value || '';
        } catch {
          text2 = fs.readFileSync(version2.storagePath, 'utf-8');
        }
      }

      const diffChunks = diff.diffWords(text1, text2);
      result.textDiff = diffChunks.map((c) => ({
        value: c.value,
        added: c.added,
        removed: c.removed,
      }));
    } catch (err) {
      console.error('Error comparing docx:', err);
    }
  }

  return res.json({ comparison: result });
});

// GET /api/documents/:id/timeline - Activity timeline for document
router.get('/:id/timeline', requireAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const access = checkDocumentAccess(req, id);
  if (!access.allowed) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }

  const logs = AuditRepository.findAll().filter(
    (l) => l.resourceId === id || (l.details && l.details.documentId === id)
  );

  return res.json({ timeline: logs });
});

export default router;
