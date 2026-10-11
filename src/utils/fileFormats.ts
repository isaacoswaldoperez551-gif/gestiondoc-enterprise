import { DocumentFileType } from '../types';

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
 * Corrección: .doc y .xls NO deben tratarse como docx/xlsx para no romper el visor.
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
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos/diacríticos
    .replace(/\s+/g, '_') // Espacios a guion bajo
    .replace(/[^a-zA-Z0-9_\-\.]/g, '') // Solo caracteres seguros
    .replace(/_+/g, '_'); // Evita guiones bajos repetidos

  const normalized = `${normalizedBase || 'documento'}${cleanExt}`;

  return {
    normalized,
    original: originalName,
    extension: cleanExt,
  };
}

/**
 * Comprueba los magic bytes del archivo para asegurar que el contenido coincide con el tipo
 * (PDF "%PDF" [0x25, 0x50, 0x44, 0x46]; DOCX/XLSX contenedores ZIP "PK" [0x50, 0x4B]).
 */
export function validateMagicBytes(
  buffer: ArrayBuffer | Uint8Array,
  expectedType: DocumentFileType
): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 4) return false;

  if (expectedType === 'pdf') {
    // PDF Magic Bytes: %PDF (0x25, 0x50, 0x44, 0x46)
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }

  if (expectedType === 'docx' || expectedType === 'xlsx') {
    // ZIP Magic Bytes: PK\x03\x04, PK\x05\x06, PK\x07\x08
    return bytes[0] === 0x50 && bytes[1] === 0x4b;
  }

  return true;
}

/**
 * Validador integral de archivo para subida y versionado.
 */
export async function validateUploadedFile(
  file: File,
  currentDocType?: DocumentFileType
): Promise<{ isValid: boolean; error?: string; fileType: DocumentFileType }> {
  const dotIndex = file.name.lastIndexOf('.');
  const ext = (dotIndex >= 0 ? file.name.substring(dotIndex) : '').toLowerCase();

  // 1. Validar extensión permitida
  if (!ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    return {
      isValid: false,
      error: 'Formato no permitido. Solo se aceptan archivos .pdf, .docx y .xlsx.',
      fileType: 'other',
    };
  }

  // 2. Validar tamaño máximo
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'El archivo supera el tamaño máximo permitido de 25 MB.',
      fileType: 'other',
    };
  }

  const detectedType = getFileTypeFromExt(ext);

  // 3. Validar coincidencia de formato si se está subiendo una versión
  if (currentDocType && currentDocType !== 'other' && detectedType !== currentDocType) {
    return {
      isValid: false,
      error: `El formato del archivo (.${detectedType}) no coincide con el formato del documento actual (.${currentDocType}). Debe subir un archivo con la misma extensión.`,
      fileType: detectedType,
    };
  }

  // 4. Validar Magic Bytes leyendo los primeros 16 bytes
  try {
    const slice = file.slice(0, 16);
    const arrayBuffer = await slice.arrayBuffer();
    const isMagicValid = validateMagicBytes(arrayBuffer, detectedType);
    if (!isMagicValid) {
      return {
        isValid: false,
        error: `El contenido del archivo no corresponde a un archivo ${detectedType.toUpperCase()} legítimo. Verifique que no sea un ejecutable u otro tipo renombrado.`,
        fileType: detectedType,
      };
    }
  } catch (err) {
    // Si la lectura falla, rechazar por seguridad
    return {
      isValid: false,
      error: 'No se pudo verificar la integridad del archivo.',
      fileType: detectedType,
    };
  }

  return { isValid: true, fileType: detectedType };
}
