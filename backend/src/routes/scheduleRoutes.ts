import express from 'express';
import { authenticate, requireApproval } from '../middleware/auth';
import {
  getDailySchedule,
  getWeeklySchedule,
  getWeeklyDetailedSchedule
} from '../controllers/scheduleController';

const router = express.Router();

// Apply authentication middleware but make it optional (doesn't fail if no auth)
router.use((req, res, next) => {
  // Try to authenticate, but don't fail if no token
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    // If token exists, run authentication middleware
    authenticate(req as any, res, next);
  } else {
    // If no token, continue without user info (req.user will be undefined)
    next();
  }
});

// Schedule routes - accessible to all, but show more info to authenticated users
router.get('/daily', getDailySchedule);
router.get('/weekly', getWeeklySchedule);  
router.get('/weekly-detailed', getWeeklyDetailedSchedule);

export default router;