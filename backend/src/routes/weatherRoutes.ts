import { Router } from 'express';
import {
  getCurrentWeather,
  getWeatherForecast,
  getWeatherForTimeSlot,
  getWeatherForDateRange
} from '../controllers/weatherController';
import { authenticate, requireApproval } from '../middleware/auth';

const router = Router();

// All weather routes require authentication and approval
router.use(authenticate, requireApproval);

// Weather routes
router.get('/current', getCurrentWeather);
router.get('/forecast/:date', getWeatherForecast);
router.get('/timeslot/:date', getWeatherForTimeSlot);
router.get('/range', getWeatherForDateRange);

export default router;