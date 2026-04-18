import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getAnalytics } from '../services/analyticsService';
import { generateCSRReport } from '../services/pdfExporter';

const router = Router();

router.get(
  '/csr-report',
  authenticateToken,
  requireRole('admin', 'restaurant'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const analytics = await getAnalytics();
      const buffer = await generateCSRReport(analytics);
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="csr-report-${date}.pdf"`);
      res.send(buffer);
    } catch {
      res.status(500).json({ error: 'Report generation failed' });
    }
  }
);

export default router;
