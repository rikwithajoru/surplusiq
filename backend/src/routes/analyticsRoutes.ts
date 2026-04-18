import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getAnalytics } from '../services/analyticsService';

const router = Router();

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    if (from && isNaN(from.getTime())) {
      res.status(400).json({ error: "Invalid 'from' date" });
      return;
    }
    if (to && isNaN(to.getTime())) {
      res.status(400).json({ error: "Invalid 'to' date" });
      return;
    }

    const result = await getAnalytics(from, to);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
