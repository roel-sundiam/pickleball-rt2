import { Router } from 'express';
import {
  createReservation,
  getUserReservations,
  getAllReservations,
  updateReservation,
  cancelReservation,
  getReservationById,
  calculateReservationPayments
} from '../controllers/reservationController';
import { authenticate, requireApproval, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes (require approval) - Allow users to view reservations for booking
router.get('/', requireApproval, getAllReservations);
router.post('/', requireApproval, createReservation);
router.post('/calculate-payments', requireApproval, calculateReservationPayments);
router.get('/my-reservations', requireApproval, getUserReservations);
router.get('/:id', requireApproval, getReservationById);
router.put('/:id', requireApproval, updateReservation);
router.delete('/:id', requireApproval, cancelReservation);

export default router;