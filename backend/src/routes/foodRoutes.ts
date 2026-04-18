import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  createListing,
  getAvailableListings,
  getMyListings,
  acceptRequest,
  updateRequestStatus,
  FoodServiceError,
} from '../services/foodService';
import { FoodRequestModel } from '../models/FoodRequest';
import { FoodListingModel } from '../models/FoodListing';
import { UserModel } from '../models/User';

const router = Router();

function handleError(err: unknown, res: Response): void {
  if (err instanceof FoodServiceError) {
    res.status(err.statusCode).json({ error: err.message });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}

router.post('/addFood', authenticateToken, requireRole('restaurant'), async (req: Request, res: Response) => {
  try {
    const listing = await createListing(req.user!.id, req.body);
    res.status(201).json(listing);
  } catch (err) {
    handleError(err, res);
  }
});

router.get('/availableFood', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user!.role === 'restaurant') {
      const listings = await getMyListings(req.user!.id);
      res.json(listings);
    } else {
      const lat = parseFloat(req.query.lat as string) || 0;
      const lng = parseFloat(req.query.lng as string) || 0;
      const listings = await getAvailableListings(lat, lng);
      res.json(listings);
    }
  } catch (err) {
    handleError(err, res);
  }
});

router.post('/acceptRequest', authenticateToken, requireRole('ngo'), async (req: Request, res: Response) => {
  try {
    const { listingId } = req.body;
    const request = await acceptRequest(req.user!.id, listingId);
    res.status(201).json(request);
  } catch (err) {
    handleError(err, res);
  }
});

router.patch('/requests/:id/status', authenticateToken, requireRole('restaurant'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const updated = await updateRequestStatus(req.user!.id, req.params.id, status);
    res.json(updated);
  } catch (err) {
    handleError(err, res);
  }
});

router.get('/myListings', authenticateToken, requireRole('restaurant'), async (req: Request, res: Response) => {
  try {
    const listings = await getMyListings(req.user!.id);
    res.json(listings);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /food/myRequests — NGO: get all accepted/requested food with listing + restaurant details
router.get('/myRequests', authenticateToken, requireRole('ngo'), async (req: Request, res: Response) => {
  try {
    const mongoose = await import('mongoose');
    const ngoObjectId = new mongoose.Types.ObjectId(req.user!.id);
    const requests = await FoodRequestModel.find({ ngoId: ngoObjectId }).lean();
    const enriched = await Promise.all(requests.map(async (r) => {
      const listing = await FoodListingModel.findById(r.listingId).lean();
      const restaurant = await UserModel.findById(r.restaurantId).select('orgName location').lean();
      return { ...r, listing, restaurant };
    }));
    res.json(enriched);
  } catch (err) {
    console.error('myRequests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /food/incomingRequests — Restaurant: get all NGO requests for their listings
router.get('/incomingRequests', authenticateToken, requireRole('restaurant'), async (req: Request, res: Response) => {
  try {
    const mongoose = await import('mongoose');
    const restaurantObjectId = new mongoose.Types.ObjectId(req.user!.id);
    const requests = await FoodRequestModel.find({ restaurantId: restaurantObjectId }).sort({ createdAt: -1 }).lean();
    const enriched = await Promise.all(requests.map(async (r) => {
      const listing = await FoodListingModel.findById(r.listingId).lean();
      const ngo = await UserModel.findById(r.ngoId).select('orgName location email').lean();
      return { ...r, listing, ngo };
    }));
    res.json(enriched);
  } catch (err) {
    console.error('incomingRequests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/myListingsWithRequests', authenticateToken, requireRole('restaurant'), async (req: Request, res: Response) => {
  try {
    const listings = await FoodListingModel.find({ restaurantId: req.user!.id }).sort({ createdAt: -1 }).lean();
    const enriched = await Promise.all(listings.map(async (l) => {
      const request = await FoodRequestModel.findOne({ listingId: l._id }).lean();
      let ngo = null;
      if (request) {
        ngo = await UserModel.findById(request.ngoId).select('orgName location').lean();
      }
      return { ...l, request, ngo };
    }));
    res.json(enriched);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
