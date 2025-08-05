import { Router } from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  changePassword,
  getAllUsers 
} from '../controllers/authController';
import { authenticate, requireApproval } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', (req, res, next) => {
  console.log('🚀 Registration request received at route level');
  console.log('Request body keys:', Object.keys(req.body));
  next();
}, register);
router.post('/login', login);

// Protected routes (require authentication only)
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

// Protected routes (require authentication and approval)
router.put('/profile', authenticate, requireApproval, updateProfile);
router.get('/users', authenticate, requireApproval, getAllUsers);

export default router;