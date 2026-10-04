import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
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

// GET /api/auth/my-login-history
router.get('/my-login-history', requireAuth, (req: AuthRequest, res: Response) => {
  const history = LoginHistoryRepository.findByUserId(req.user!.id);
  return res.json({ history });
});

export default router;
