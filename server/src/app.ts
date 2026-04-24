import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import maintenanceRouter from './routes/maintenance';
import aiRouter from './routes/ai';
import { authenticateJwt } from './middleware/auth';

dotenv.config();
dotenv.config({ path: '.env.example', override: false });

const app = express();
app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);

// Protected routes – all require a valid JWT
app.use(authenticateJwt);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/ai', aiRouter);

export default app;
