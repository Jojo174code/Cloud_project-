import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import maintenanceRouter from './routes/maintenance';
import aiRouter from './routes/ai';
import financeRouter from './routes/finance';
import { authenticateJwt } from './middleware/auth';

dotenv.config();
dotenv.config({ path: '.env.example', override: false });

const app = express();

const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: false,
  })
);
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'leasepilot-backend' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);

app.use(authenticateJwt);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/ai', aiRouter);
app.use('/api/finance', financeRouter);

export default app;
