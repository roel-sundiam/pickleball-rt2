import express from 'express';
import { authenticate } from '../middleware/auth';
import * as coinController from '../controllers/coinController';

const router = express.Router();

// Debug middleware to log all coin route requests
router.use((req, res, next) => {
  console.log('🪙 COIN ROUTE - Request received:', req.method, req.url);
  console.log('🪙 COIN ROUTE - Headers:', req.headers);
  console.log('🪙 COIN ROUTE - Body:', req.body);
  next();
});


// Get user's coin balance
router.get('/balance', authenticate, coinController.getUserBalance);

// Request coins from admin
router.post('/request', authenticate, coinController.requestCoins);

// Submit purchase request with GCash payment
router.post('/purchase-request', authenticate, coinController.submitPurchaseRequest);

// Get user's pending coin requests
router.get('/my-pending-requests', authenticate, coinController.getUserPendingRequests);

// Get coin balance statistics (superadmin only)
router.get('/balance-statistics', authenticate, coinController.getCoinBalanceStatistics);

export default router;