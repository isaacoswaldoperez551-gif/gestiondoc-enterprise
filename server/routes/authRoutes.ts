import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  UserRepository,
  LoginHistoryRepository,
  AuditRepository,
} from '../db';
import {
  generateToken,
  validatePasswordComplexity,
  getClientIp,
  getUserAgent,
  getDeviceInfo,
  requireAuth,
  AuthRequest,
} from '../auth';
import { NotificationService } from '../notificationService';

// In-memory token storage for password reset
interface PasswordResetEntry {
  userId: string;
  userEmail: string;
  tokenHash: string;
  expiresAt: number;
  used: boolean;
}

const passwordResetTokens: PasswordResetEntry[] = [];
const resetRateLimits = new Map<string, number[]>(); // key (ip or email) -> timestamps

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const attempts = resetRateLimits.get(key) || [];
  const recent = attempts.filter((ts) => now - ts < windowMs);
  if (recent.length >= 5) {
    return false;
  }
  recent.push(now);
  resetRateLimits.set(key, recent);
  return true;
}

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res: Response) => {
  const { email, password } = req.body;
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);
  const deviceInfo = getDeviceInfo(userAgent);

  if (!email || !password) {
    return res.status(400).json({ error: 'Debe ingresar correo y contraseña.' });
  }

  const user = UserRepository.findByEmail(email.trim());

  if (!user) {
    // Audit failed attempt for non-existent user
    LoginHistoryRepository.create({
      userId: 'unknown',
      userEmail: email,
      ipAddress,
      userAgent,
      deviceInfo,
      status: 'failed',
    });

    AuditRepository.create({
      userId: null,
      userEmail: email,
      action: 'login_failed_unknown_user',
      resourceType: 'auth',
      ipAddress,
      userAgent,
      details: { email },
    });

    return res.status(401).json({ error: 'Credenciales inválidas. Verifique su correo y contraseña.' });
  }

  // Check if account is inactive
  if (user.status === 'inactive') {
    return res.status(403).json({
      error: 'Esta cuenta ha sido desactivada por el administrador. Comuníquese con soporte.',
    });
  }

  // Check temporary lockout
  const now = new Date();
  if (user.lockedUntil) {
    const lockedUntilDate = new Date(user.lockedUntil);
    if (lockedUntilDate > now) {
      const minutesRemaining = Math.ceil((lockedUntilDate.getTime() - now.getTime()) / (1000 * 60));
      LoginHistoryRepository.create({
        userId: user.id,
        userEmail: user.email,
        ipAddress,
        userAgent,
        deviceInfo,
        status: 'blocked',
      });

      return res.status(429).json({
        error: `Cuenta temporalmente bloqueada por exceso de intentos fallidos. Intente nuevamente en ${minutesRemaining} minuto(s).`,
      });
    } else {
      // Lock expired, reset
      UserRepository.update(user.id, { lockedUntil: null, failedAttempts: 0 });
      user.failedAttempts = 0;
      user.lockedUntil = null;
    }
  }

  // Verify password
  const isMatch = bcrypt.compareSync(password, user.passwordHash);

  if (!isMatch) {
    const updatedFailed = user.failedAttempts + 1;
    let lockoutTime: string | null = null;
    let message = 'Credenciales inválidas.';

    if (updatedFailed >= 5) {
      // Lock for 15 minutes
      const lockDate = new Date(now.getTime() + 15 * 60 * 1000);
      lockoutTime = lockDate.toISOString();
      message = 'Ha superado el límite de 5 intentos fallidos. Su cuenta ha sido bloqueada temporalmente por 15 minutos.';

      UserRepository.update(user.id, {
        failedAttempts: updatedFailed,
        lockedUntil: lockoutTime,
      });

      LoginHistoryRepository.create({
        userId: user.id,
        userEmail: user.email,
        ipAddress,
        userAgent,
        deviceInfo,
        status: 'blocked',
      });

      AuditRepository.create({
        userId: user.id,
        userEmail: user.email,
        action: 'account_locked_failed_attempts',
        resourceType: 'auth',
        ipAddress,
        userAgent,
        details: { attempts: updatedFailed },
      });

      return res.status(429).json({ error: message });
    }

    UserRepository.update(user.id, { failedAttempts: updatedFailed });

    LoginHistoryRepository.create({
      userId: user.id,
      userEmail: user.email,
      ipAddress,
      userAgent,
      deviceInfo,
      status: 'failed',
    });

    AuditRepository.create({
      userId: user.id,
      userEmail: user.email,
      action: 'login_failed',
      resourceType: 'auth',
      ipAddress,
      userAgent,
      details: { attempt: updatedFailed, remaining: 5 - updatedFailed },
    });

    return res.status(401).json({
      error: `Contraseña incorrecta. Le quedan ${5 - updatedFailed} intento(s) antes del bloqueo temporal.`,
    });
  }

  // Password is correct: reset failed counters
  UserRepository.update(user.id, {
    failedAttempts: 0,
    lockedUntil: null,
  });

  // Record successful login in history
  LoginHistoryRepository.create({
    userId: user.id,
    userEmail: user.email,
    ipAddress,
    userAgent,
    deviceInfo,
    status: 'success',
  });

  // Record in audit log
  AuditRepository.create({
    userId: user.id,
    userEmail: user.email,
    action: 'login_success',
    resourceType: 'auth',
    ipAddress,
    userAgent,
    details: { role: user.role, mustChangePassword: user.mustChangePassword },
  });

  const token = generateToken(user);

  // Set HTTP-only cookie as well for security
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });

  return res.json({
    message: 'Inicio de sesión exitoso',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      department: user.department,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: AuthRequest, res: Response) => {
  if (req.user) {
    AuditRepository.create({
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'logout',
      resourceType: 'auth',
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  }

  res.clearCookie('auth_token');
  return res.json({ message: 'Sesión cerrada correctamente' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      department: user.department,
      totpEnabled: user.totpEnabled,
      createdAt: user.createdAt,
    },
  });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = req.user!;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'La nueva contraseña y su confirmación no coinciden.' });
  }

  // Validate current password
  const isMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ error: 'La contraseña actual ingresada es incorrecta.' });
  }

  // Cannot reuse old password
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la contraseña actual.' });
  }

  // Validate complexity
  const validation = validatePasswordComplexity(newPassword);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.message });
  }

  // Hash new password
  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);

  UserRepository.update(user.id, {
    passwordHash: newHash,
    mustChangePassword: false,
  });

  AuditRepository.create({
    userId: user.id,
    userEmail: user.email,
    action: 'password_changed',
    resourceType: 'user',
    resourceId: user.id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { reason: user.mustChangePassword ? 'mandatory_first_login' : 'user_update' },
  });

  return res.json({
    message: 'Contraseña actualizada correctamente.',
    mustChangePassword: false,
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res: Response) => {
  const { email } = req.body;
  const ip = getClientIp(req);
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ error: 'Debe ingresar una dirección de correo electrónico.' });
  }

  // Rate limiting por correo e IP (máximo 5 solicitudes por hora)
  if (!checkRateLimit(`email:${normalizedEmail}`) || !checkRateLimit(`ip:${ip}`)) {
    return res.status(429).json({
      error: 'Ha excedido el límite de solicitudes de restablecimiento. Intente nuevamente en una hora.',
    });
  }

  const genericResponse: { message: string; devToken?: string } = {
    message: 'Si la dirección de correo electrónico está registrada en el sistema, recibirá las instrucciones y código de recuperación.',
  };

  const user = UserRepository.findByEmail(normalizedEmail);
  if (user && user.status !== 'inactive') {
    // Invalida tokens previos del mismo usuario
    for (const entry of passwordResetTokens) {
      if (entry.userId === user.id) {
        entry.used = true;
      }
    }

    // Genera código aleatorio criptográfico de 6 dígitos
    const code = crypto.randomInt(100000, 999999).toString();
    const tokenHash = crypto.createHash('sha256').update(code).digest('hex');

    passwordResetTokens.push({
      userId: user.id,
      userEmail: user.email,
      tokenHash,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutos
      used: false,
    });

    // Envío del código mediante NotificationService (bandeja simulada + gancho SMTP)
    NotificationService.sendPasswordResetEmail(user, code);

    // Registro de auditoría
    AuditRepository.create({
      userId: user.id,
      userEmail: user.email,
      action: 'password_reset_requested',
      resourceType: 'auth',
      ipAddress: ip,
      userAgent: getUserAgent(req),
    });

    // En desarrollo se incluye para facilitar pruebas manuales sin consultar el buzón
    if (process.env.NODE_ENV !== 'production') {
      genericResponse.devToken = code;
    }
  }

  // SIEMPRE responde el mismo mensaje genérico para evitar enumeración de usuarios
  return res.json(genericResponse);
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res: Response) => {
  const { token, code, newPassword } = req.body;
  const resetCode = (token || code || '').trim();
  const ip = getClientIp(req);

  if (!resetCode || !newPassword) {
    return res.status(400).json({ error: 'El código de seguridad y la nueva contraseña son obligatorios.' });
  }

  // Validar complejidad de contraseña (8+, mayúscula, número)
  const complexity = validatePasswordComplexity(newPassword);
  if (!complexity.isValid) {
    return res.status(400).json({ error: complexity.message });
  }

  // Hash del código ingresado
  const inputHash = crypto.createHash('sha256').update(resetCode).digest('hex');
  const now = Date.now();

  const tokenEntry = passwordResetTokens.find(
    (entry) => entry.tokenHash === inputHash && !entry.used && entry.expiresAt > now
  );

  if (!tokenEntry) {
    return res.status(400).json({
      error: 'El código ingresado es inválido o ha expirado. Por favor solicite uno nuevo.',
    });
  }

  // Marcar token como consumido (de un solo uso)
  tokenEntry.used = true;

  const user = UserRepository.findById(tokenEntry.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado en la base de datos.' });
  }

  // Hash de la nueva contraseña
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);

  // Restablecer valores de seguridad
  UserRepository.update(user.id, {
    passwordHash,
    failedAttempts: 0,
    lockedUntil: null,
    mustChangePassword: false,
    status: user.status === 'locked' ? 'active' : user.status,
  });

  // Registro de auditoría
  AuditRepository.create({
    userId: user.id,
    userEmail: user.email,
    action: 'password_reset_completed',
    resourceType: 'auth',
    resourceId: user.id,
    ipAddress: ip,
    userAgent: getUserAgent(req),
  });

  return res.json({
    message: 'Su contraseña ha sido restablecida con éxito. Ya puede iniciar sesión con sus nuevas credenciales.',
  });
});

export default router;
