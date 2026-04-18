import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getUnreadNotifications, markAsRead } from '../services/notificationService';

const router = Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const notifications = await getUnreadNotifications(req.user!.id);
    return res.json(notifications);
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    await markAsRead(req.params.id);
    return res.sendStatus(200);
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
