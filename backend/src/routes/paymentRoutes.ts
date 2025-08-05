import express from 'express';
import { 
  createPaymentLog,
  getUserPayments,
  checkPaymentStatus,
  updatePaymentStatus,
  getAllPayments,
  getUnpaidReservations,
  getReservationPaymentDetails,
  getReservationPaymentStatus,
  checkUnsettledPayments
} from '../controllers/paymentController';
import { authenticate, requireApproval, requireSuperAdmin } from '../middleware/auth';

const router = express.Router();

// Test route (temporary)
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Payment routes are working!' });
});

// User routes - require authentication and approval
router.get('/unpaid-reservations', authenticate, requireApproval, getUnpaidReservations);
router.get('/reservation/:reservationId/details', authenticate, requireApproval, getReservationPaymentDetails);
router.get('/reservation/:reservationId/status', authenticate, requireApproval, getReservationPaymentStatus);
router.post('/log', authenticate, requireApproval, createPaymentLog);
router.get('/user', authenticate, requireApproval, getUserPayments);
router.get('/status/:date', authenticate, requireApproval, checkPaymentStatus);
router.get('/unsettled', authenticate, requireApproval, checkUnsettledPayments);

// Admin routes - require super admin role
router.put('/:id/status', authenticate, requireSuperAdmin, updatePaymentStatus);
router.get('/all', authenticate, requireSuperAdmin, getAllPayments);

export default router;