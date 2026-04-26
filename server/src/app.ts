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
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

app.use(authenticateJwt);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/ai', aiRouter);
app.use('/api/finance', financeRouter);

export default app;
