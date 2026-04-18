import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import axios from 'axios';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

router.post('/predict-surplus', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { foodType, quantity, expectedGuests, prepTime, expiryTime } = req.body;

    if (!foodType || !quantity || !expectedGuests || !expiryTime) {
      return res.status(400).json({ error: 'foodType, quantity, expectedGuests and expiryTime are required' });
    }

    // Calculate hours until expiry
    const hoursUntilExpiry = (new Date(expiryTime).getTime() - Date.now()) / 3600000;
    const dayOfWeek = new Date().getDay();

    // Call Python ML service
    const mlRes = await axios.post(`${ML_SERVICE_URL}/predict`, {
      foodType,
      quantity: Number(quantity),
      expectedGuests: Number(expectedGuests),
      hoursUntilExpiry: Math.max(0, hoursUntilExpiry),
      dayOfWeek,
    });

    return res.json(mlRes.data);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown }; code?: string };
    if (axiosErr.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'ML service is not running. Start it with: cd ml && python predict_service.py' });
    }
    return res.status(500).json({ error: 'Prediction failed', detail: axiosErr.response?.data });
  }
});

export default router;
