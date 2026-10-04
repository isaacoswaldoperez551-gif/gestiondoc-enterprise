import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRepository, LoginHistoryRepository, AuditRepository } from '../db';
import {
  requireAdmin,
  AuthRequest,
  validatePasswordComplexity,
  getClientIp,
  getUserAgent,
} from '../auth';

const router = Router();

// Apply admin guard to all routes in this router
router.use(requireAdmin);

// Helper to sanitize user object for responses
function sanitizeUser(user: any) {
  const { passwordHash, totpSecret, ...safe } = user;
  return safe;
}

// GET /api/users
router.get('/', (req: AuthRequest, res: Response) => {
  const { search, role, status } = req.query;
  let users = UserRepository.findAll();

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q))
    );
  }

  if (role && (role === 'admin' || role === 'user')) {
    users = users.filter((u) => u.role === role);
  }

  if (status && (status === 'active' || status === 'inactive' || status === 'locked')) {
    users = users.filter((u) => u.status === status);
  }

  return res.json({
    users: users.map(sanitizeUser),
    total: users.length,
  });
});

// POST /api/users
router.post('/', (req: AuthRequest, res: Response) => {
  const { name, email, role, department, password, generateRandomPassword, mustChangePassword } = req.body;
  const admin = req.user!;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nombre, correo electrónico y rol son obligatorios.' });
  }

  if (role !== 'admin' && role !== 'user') {
    return res.status(400).json({ error: 'El rol debe ser "admin" o "user".' });
  }

  const existing = UserRepository.findByEmail(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'Ya existe un usuario registrado con este correo electrónico.' });
  }

  let finalPassword = password;
  if (generateRandomPassword || !finalPassword) {
    // Generate secure random temp password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    finalPassword = Array.from(crypto.randomBytes(12))
      .map((b) => chars[b % chars.length])
      .join('');
  } else {
    const validation = validatePasswordComplexity(finalPassword);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.message });
    }
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(finalPassword, salt);

  const newUser = UserRepository.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role,
    status: 'active',
    mustChangePassword: mustChangePassword !== false, // default true
    totpSecret: null,
    totpEnabled: false,
    department: department ? department.trim() : undefined,
  });

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'user_created',
    resourceType: 'user',
    resourceId: newUser.id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: {
      createdUserEmail: newUser.email,
      role: newUser.role,
      department: newUser.department,
      mustChangePassword: newUser.mustChangePassword,
    },
  });

  return res.status(201).json({
    message: 'Usuario creado exitosamente.',
    user: sanitizeUser(newUser),
    generatedPassword: finalPassword, // Sent only once upon creation for admin to hand over
  });
});

// PUT /api/users/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, role, status, department, mustChangePassword } = req.body;
  const admin = req.user!;

  const user = UserRepository.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  // Safety: Prevent admin from demoting or disabling their own account
  if (user.id === admin.id) {
    if (role && role !== 'admin') {
      return res.status(400).json({ error: 'No puede degradar su propia cuenta de administrador.' });
    }
    if (status && status !== 'active') {
      return res.status(400).json({ error: 'No puede desactivar o bloquear su propia cuenta.' });
    }
  }

  const updates: any = {};
  if (name !== undefined) updates.name = name.trim();
  if (role !== undefined && (role === 'admin' || role === 'user')) updates.role = role;
  if (status !== undefined && ['active', 'inactive', 'locked'].includes(status)) updates.status = status;
  if (department !== undefined) updates.department = department.trim();
  if (mustChangePassword !== undefined) updates.mustChangePassword = Boolean(mustChangePassword);

  const updatedUser = UserRepository.update(id, updates);

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'user_updated',
    resourceType: 'user',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { targetEmail: user.email, updates },
  });

  return res.json({
    message: 'Usuario actualizado correctamente.',
    user: sanitizeUser(updatedUser),
  });
});

// POST /api/users/:id/reset-password
router.post('/:id/reset-password', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { newPassword, generateRandom } = req.body;
  const admin = req.user!;

  const user = UserRepository.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  let finalPassword = newPassword;
  if (generateRandom || !finalPassword) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    finalPassword = Array.from(crypto.randomBytes(12))
      .map((b) => chars[b % chars.length])
      .join('');
  } else {
    const validation = validatePasswordComplexity(finalPassword);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.message });
    }
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(finalPassword, salt);

  UserRepository.update(id, {
    passwordHash,
    mustChangePassword: true, // Forces change on next login
    failedAttempts: 0,
    lockedUntil: null,
  });

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'admin_password_reset',
    resourceType: 'user',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { targetEmail: user.email },
  });

  return res.json({
    message: 'Contraseña restablecida exitosamente. Se requerirá cambio en el próximo inicio de sesión.',
    temporaryPassword: finalPassword,
  });
});

// POST /api/users/:id/unlock
router.post('/:id/unlock', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const admin = req.user!;

  const user = UserRepository.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  UserRepository.update(id, {
    failedAttempts: 0,
    lockedUntil: null,
    status: 'active',
  });

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'account_unlocked_by_admin',
    resourceType: 'user',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { targetEmail: user.email },
  });

  return res.json({ message: 'Cuenta desbloqueada exitosamente.' });
});

// DELETE /api/users/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const admin = req.user!;

  const user = UserRepository.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  // Safety: Admin cannot delete their own account
  if (user.id === admin.id) {
    return res.status(400).json({ error: 'No puede eliminar su propia cuenta de administrador activa.' });
  }

  UserRepository.delete(id);

  AuditRepository.create({
    userId: admin.id,
    userEmail: admin.email,
    action: 'user_deleted',
    resourceType: 'user',
    resourceId: id,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    details: { deletedEmail: user.email, deletedName: user.name, role: user.role },
  });

  return res.json({ message: `La cuenta de ${user.name} (${user.email}) ha sido eliminada.` });
});

// GET /api/users/:id/login-history
router.get('/:id/login-history', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = UserRepository.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const history = LoginHistoryRepository.findByUserId(id);
  return res.json({
    user: sanitizeUser(user),
    history,
  });
});

export default router;
