import { Router } from 'express';
import { 
  getAllUsersAdmin,
  getUserById,
  approveUser,
  rejectUser,
  updateUserStatus,
  updateMembershipFeeStatus,
  getUserStats,
  bulkApproveUsers,
  grantCoins,
  deductCoins,
  getCoinStatistics,
  getPendingCoinRequests,
  approveCoinRequest,
  rejectCoinRequest
} from '../controllers/adminController';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and super admin privileges
router.use(authenticate);
router.use(requireSuperAdmin);

// User management routes
router.get('/users', getAllUsersAdmin);
router.get('/users/stats', getUserStats);
router.get('/users/:userId', getUserById);

// User approval/rejection
router.put('/users/:userId/approve', approveUser);
router.put('/users/:userId/reject', rejectUser);

// User status management
router.put('/users/:userId/status', updateUserStatus);
router.put('/users/:userId/membership-fee', updateMembershipFeeStatus);

// Bulk operations
router.put('/users/bulk/approve', bulkApproveUsers);

// Coin management routes
router.post('/users/:userId/grant-coins', grantCoins);
router.post('/users/:userId/deduct-coins', deductCoins);
router.get('/coins/statistics', getCoinStatistics);

// Coin request management routes
router.get('/coin-requests/pending', getPendingCoinRequests);
router.put('/coin-requests/:requestId/approve', approveCoinRequest);
router.put('/coin-requests/:requestId/reject', rejectCoinRequest);

export default router;