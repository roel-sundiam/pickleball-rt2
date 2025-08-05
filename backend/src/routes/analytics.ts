import express from 'express';
import { 
  trackPageVisit, 
  getPageVisitAnalytics, 
  getUserPageVisitHistory 
} from '../controllers/analyticsController';
import { authenticate, requireApproval, requireSuperAdmin } from '../middleware/auth';

const router = express.Router();

// Track a page visit (authenticated users only)
router.post('/page-visit', authenticate, requireApproval, trackPageVisit);

// Get page visit analytics (superadmin only)
router.get('/page-visits', authenticate, requireSuperAdmin, getPageVisitAnalytics);

// Get user's own page visit history (authenticated users)
router.get('/my-page-visits', authenticate, requireApproval, getUserPageVisitHistory);

export default router;