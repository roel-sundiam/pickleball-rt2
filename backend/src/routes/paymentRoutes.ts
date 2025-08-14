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
  checkUnsettledPayments,
  getCourtReceiptsReport,
  createWeekendPayment,
  getUserWeekendPayments,
  checkWeekendPaymentStatus,
  createAdditionalPayment
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

// Weekend payment routes
router.post('/weekend', authenticate, requireApproval, createWeekendPayment);
router.get('/weekend/history', authenticate, requireApproval, getUserWeekendPayments);
router.get('/weekend/status/:date', authenticate, requireApproval, checkWeekendPaymentStatus);

// Additional payment routes
router.post('/additional', authenticate, requireApproval, createAdditionalPayment);

// Admin routes - require super admin role
// Note: Specific routes must come before parameterized routes
router.get('/reports/court-receipts', authenticate, requireSuperAdmin, getCourtReceiptsReport);
router.get('/all', authenticate, requireSuperAdmin, getAllPayments);
router.put('/:id/status', authenticate, requireSuperAdmin, updatePaymentStatus);

export default router;