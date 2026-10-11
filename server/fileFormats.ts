import fs from 'fs';
import path from 'path';
import { DocumentFileType } from './types';

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx'] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Determina el tipo lógico a partir de la extensión o nombre de archivo.
 * Corrección: .doc y .xls NO deben tratarse como docx/xlsx.
 */
export function getFileTypeFromExt(extOrName: string): DocumentFileType {
  const dotIndex = extOrName.lastIndexOf('.');
  const ext = (dotIndex >= 0 ? extOrName.substring(dotIndex) : extOrName).toLowerCase();

  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  if (ext === '.xlsx') return 'xlsx';
  return 'other';
}

/**
 * Normaliza nombres de archivo removiendo acentos, espacios y caracteres especiales,
 * pero conservando la extensión y el nombre original para su posterior descarga.
 */
export function normalizeFilename(originalName: string): {
  normalized: string;
  original: string;
  extension: string;
} {
  const dotIndex = originalName.lastIndexOf('.');
  const nameWithoutExt = dotIndex >= 0 ? originalName.substring(0, dotIndex) : originalName;
  const rawExt = dotIndex >= 0 ? originalName.substring(dotIndex).toLowerCase() : '';

  const cleanExt = rawExt.replace(/[^a-z0-9.]/g, '');

  const normalizedBase = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-\.]/g, '')
    .replace(/_+/g, '_');

  const normalized = `${normalizedBase || 'documento'}${cleanExt}`;

  return {
    normalized,
    original: originalName,
    extension: cleanExt,
  };
}

/**
 * Comprueba los magic bytes de un buffer o archivo en disco.
 */
export function validateMagicBytes(
  buffer: Buffer | Uint8Array,
  expectedType: DocumentFileType
): boolean {
  if (buffer.length < 4) return false;

  if (expectedType === 'pdf') {
    // %PDF (0x25, 0x50, 0x44, 0x46)
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  if (expectedType === 'docx' || expectedType === 'xlsx') {
    // PK (0x50, 0x4b)
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  }

  return true;
}

/**
 * Validador de archivo en servidor desde disco (multer temp file).
 */
export function validateDiskFile(
  filePath: string,
  originalFilename: string,
  currentDocType?: DocumentFileType
): { isValid: boolean; error?: string; fileType: DocumentFileType } {
  const dotIndex = originalFilename.lastIndexOf('.');
  const ext = (dotIndex >= 0 ? originalFilename.substring(dotIndex) : '').toLowerCase();

  // 1. Extensión
  if (!ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    return {
      isValid: false,
      error: 'Formato no permitido. Solo se aceptan archivos .pdf, .docx y .xlsx.',
      fileType: 'other',
    };
  }

  const detectedType = getFileTypeFromExt(ext);

  // 2. Coincidencia de versión
  if (currentDocType && currentDocType !== 'other' && detectedType !== currentDocType) {
    return {
      isValid: false,
      error: `El formato del archivo (.${detectedType}) no coincide con el formato del documento actual (.${currentDocType}). Debe subir un archivo con la misma extensión.`,
      fileType: detectedType,
    };
  }

  // 3. Magic bytes
  try {
    const fd = fs.openSync(filePath, 'r');
    const headerBuffer = Buffer.alloc(16);
    fs.readSync(fd, headerBuffer, 0, 16, 0);
    fs.closeSync(fd);

    const isMagicValid = validateMagicBytes(headerBuffer, detectedType);
    if (!isMagicValid) {
      return {
        isValid: false,
        error: `El contenido del archivo no corresponde a un archivo ${detectedType.toUpperCase()} legítimo. Verifique que no sea un ejecutable u otro tipo renombrado.`,
        fileType: detectedType,
      };
    }
  } catch (err) {
    return {
      isValid: false,
      error: 'No se pudo verificar la integridad del archivo.',
      fileType: detectedType,
    };
  }

  return { isValid: true, fileType: detectedType };
}
