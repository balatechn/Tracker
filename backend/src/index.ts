import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import entriesRoutes from './routes/entries';
import employeesRoutes from './routes/employees';
import allocationsRoutes from './routes/allocations';
import requestsRoutes from './routes/requests';
import auditRoutes from './routes/audit';
import tasksRoutes from './routes/tasks';
import subscriptionsRoutes from './routes/subscriptions';
import notifyRoutes from './routes/notify';
import billsRoutes from './routes/bills';
import entityManagersRoutes from './routes/entityManagers';
import credentialsRoutes from './routes/credentials';
import './services/scheduler';

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['https://itasset.junobohotels.com'];

app.use(cors({
  origin: (origin, cb) => {
    // allow no-origin (curl, Postman, server-to-server) and any allowed origin
    if (!origin || allowedOrigins.some(o => origin === o || o === '*')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/entries', entriesRoutes);
app.use('/employees', employeesRoutes);
app.use('/allocations', allocationsRoutes);
app.use('/requests', requestsRoutes);
app.use('/audit', auditRoutes);
app.use('/tasks', tasksRoutes);
app.use('/subscriptions', subscriptionsRoutes);
app.use('/notify', notifyRoutes);
app.use('/bills', billsRoutes);
app.use('/entity-managers', entityManagersRoutes);
app.use('/credentials', credentialsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Tracker API running on port ${PORT}`);
});

export default app;
