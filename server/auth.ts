import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository, LoginHistoryRepository, AuditRepository } from './db';
import { User, UserRole } from './types';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET debe estar obligatoriamente configurado como variable de entorno en producción.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'docugestion_secure_jwt_secret_key_2026';
const TOKEN_EXPIRY = '8h'; // 8 hours session expiry

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function validatePasswordComplexity(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'La contraseña debe incluir al menos una letra mayúscula.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'La contraseña debe incluir al menos un número.' };
  }
  return { isValid: true };
}

export function getClientIp(req: Request): string {
  let ip = '';
  // Respetar x-forwarded-for únicamente si app tiene 'trust proxy' configurado
  if (req.app && req.app.get('trust proxy')) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      ip = forwarded.split(',')[0].trim();
    }
  }
  if (!ip) {
    ip = req.socket.remoteAddress || req.ip || '127.0.0.1';
  }
  // Normalizar prefijo IPv4 mapeado en IPv6
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  return ip;
}

export function getUserAgent(req: Request): string {
  return (req.headers['user-agent'] as string) || 'Desconocido';
}

export function getDeviceInfo(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return 'Móvil';
  if (/tablet/i.test(userAgent)) return 'Tableta';
  if (/macintosh|mac os x/i.test(userAgent)) return 'Mac OS Desktop';
  if (/windows/i.test(userAgent)) return 'Windows Desktop';
  if (/linux/i.test(userAgent)) return 'Linux Desktop';
  return 'Navegador Web';
}

// Authentication Middleware
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    return res.status(401).json({
      error: 'No autorizado. Se requiere iniciar sesión.',
    });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.id) {
    return res.status(401).json({
      error: 'Sesión expirada o token inválido.',
    });
  }

  const user = UserRepository.findById(payload.id);
  if (!user) {
    return res.status(401).json({
      error: 'Usuario no encontrado o dado de baja.',
    });
  }

  if (user.status !== 'active') {
    return res.status(403).json({
      error: 'Esta cuenta se encuentra inactiva o bloqueada. Contacte al administrador.',
    });
  }

  req.user = user;
  next();
}

// Role Authorization Middleware
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Audit security attempt
      AuditRepository.create({
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'unauthorized_role_access_attempt',
        resourceType: 'system',
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        details: {
          path: req.originalUrl,
          method: req.method,
          requiredRoles: allowedRoles,
          userRole: req.user.role,
        },
      });

      return res.status(403).json({
        error: 'Acceso denegado. No posee los permisos requeridos para esta acción.',
      });
    }

    next();
  };
}

export const requireAdmin = [requireAuth, requireRole(['admin'])];
export const requireUserOnly = [requireAuth, requireRole(['user'])];
