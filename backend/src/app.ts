import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import foodRoutes from './routes/foodRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import pdfRoutes from './routes/pdfRoutes';
import predictRoutes from './routes/predictRoutes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/food', foodRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/notifications', notificationRoutes);
app.use('/export', pdfRoutes);
app.use('/', predictRoutes);

export default app;
