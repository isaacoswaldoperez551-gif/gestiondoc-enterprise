import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './server/routes/authRoutes';
import userRoutes from './server/routes/userRoutes';
import auditRoutes from './server/routes/auditRoutes';
import folderRoutes from './server/routes/folderRoutes';
import tagRoutes from './server/routes/tagRoutes';
import documentRoutes from './server/routes/documentRoutes';
import versionRoutes from './server/routes/versionRoutes';
import assignmentRoutes from './server/routes/assignmentRoutes';
import userDocumentRoutes from './server/routes/userDocumentRoutes';
import notificationRoutes from './server/routes/notificationRoutes';
import commentRoutes from './server/routes/commentRoutes';
import calendarRoutes from './server/routes/calendarRoutes';
import { getDb } from './server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Basic security and parsing middlewares
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Initialize DB instance / seed data if needed
  getDb();
  console.log('[GestiónDoc] Base de datos y usuarios de prueba inicializados.');

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api/folders', folderRoutes);
  app.use('/api/tags', tagRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/documents', versionRoutes);
  app.use('/api/documents', commentRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/my-documents', userDocumentRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/calendar', calendarRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Frontend integration
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[GestiónDoc] Vite middlewares montados en modo desarrollo.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[GestiónDoc] Sirviendo archivos estáticos desde dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GestiónDoc] Servidor activo y escuchando en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[GestiónDoc] Error fatal iniciando servidor:', err);
  process.exit(1);
});
