import { Request, Response } from 'express';
import { User, CourtReservation, PaymentLog } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types/interfaces';
import { calculatePlayerPayments } from './reservationController';

// Get payment details for a specific reservation
export const getReservationPaymentDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reservationId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Find the reservation
    const reservation = await CourtReservation.findById(reservationId);
    if (!reservation) {
      res.status(404).json({
        success: false,
        message: 'Reservation not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check if user is in the reservation
    if (!reservation.players.includes(userId.toString())) {
      res.status(403).json({
        success: false,
        message: 'User not included in this reservation',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Calculate payment details for all players
    const duration = reservation.duration || 1;
    const paymentCalculation = await calculatePlayerPayments(reservation.players, duration);
    
    // Check if current user has already paid
    const existingPayment = await PaymentLog.findOne({
      userId,
      reservationId
    });

    res.status(200).json({
      success: true,
      message: 'Payment details retrieved successfully',
      data: {
        reservation: {
          _id: reservation._id,
          date: reservation.date,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          duration
        },
        paymentCalculation,
        userPayment: paymentCalculation.playerPayments.find(p => p.playerId === userId.toString()),
        hasPaid: !!existingPayment,
        existingPayment
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get reservation payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get completed unpaid reservations for current user
export const getUnpaidReservations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const now = new Date();
    
    // Find all confirmed reservations for the user
    const allReservations = await CourtReservation.find({
      userId,
      status: 'confirmed'
    }).populate('userId', 'fullName username email');

    // Filter to only completed reservations (simple check)
    const completedReservations = allReservations.filter(reservation => {
      try {
        const reservationDate = new Date(reservation.date);
        const endTime = reservation.endTime || reservation.startTime;
        
        // Create end datetime by combining date and end time
        const [hours, minutes] = endTime.split(':').map(Number);
        const reservationEndDateTime = new Date(reservationDate);
        reservationEndDateTime.setHours(hours, minutes, 0, 0);
        
        return reservationEndDateTime < now;
      } catch (error) {
        console.error('Error processing reservation date:', error);
        return false;
      }
    });

    // Get reservations that already have payments for this user
    const paidReservationIds = await PaymentLog.find({
      userId,
      status: { $in: ['pending', 'paid'] }
    }).distinct('reservationId');

    // Filter out reservations that already have payments for this user
    const unpaidReservations = completedReservations.filter(
      reservation => !paidReservationIds.some(paidId => paidId.toString() === (reservation._id as any).toString())
    );

    res.status(200).json({
      success: true,
      message: 'Unpaid reservations retrieved successfully',
      data: unpaidReservations,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get unpaid reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve unpaid reservations',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Create a new payment log entry
export const createPaymentLog = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reservationId, amount, notes } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check if user exists and is approved
    const user = await User.findById(userId);
    if (!user || !user.isApproved) {
      res.status(403).json({
        success: false,
        message: 'User not found or not approved',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate required fields
    if (!reservationId || !amount) {
      res.status(400).json({
        success: false,
        message: 'Reservation ID and amount are required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Verify reservation exists and belongs to user
    const reservation = await CourtReservation.findOne({
      _id: reservationId,
      userId
    });

    if (!reservation) {
      res.status(404).json({
        success: false,
        message: 'Reservation not found or does not belong to user',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check if reservation is completed (past end time)
    const now = new Date();
    const reservationEndTime = new Date(`${reservation.date.toISOString().split('T')[0]}T${reservation.endTime || reservation.startTime}:00`);
    
    if (reservationEndTime > now) {
      res.status(400).json({
        success: false,
        message: 'Cannot log payment for future or ongoing reservations',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check if payment already exists for this user and reservation
    const existingPayment = await PaymentLog.findOne({
      userId,
      reservationId
    });

    if (existingPayment) {
      res.status(400).json({
        success: false,
        message: 'Payment already logged for this reservation',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Calculate payment details based on player type and reservation
    const duration = reservation.duration || 1;
    const paymentCalculation = await calculatePlayerPayments([userId.toString()], duration);
    const userPayment = paymentCalculation.playerPayments.find(p => p.playerId === userId.toString());
    
    if (!userPayment) {
      res.status(500).json({
        success: false,
        message: 'Unable to calculate payment amount for user',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate that the provided amount matches the calculated amount
    if (Math.abs(Number(amount) - userPayment.totalAmount) > 0.01) {
      res.status(400).json({
        success: false,
        message: `Amount mismatch. Expected: ${userPayment.totalAmount}, Provided: ${amount}`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Create payment log entry
    const paymentLog = new PaymentLog({
      userId,
      reservationId,
      reservationDate: reservation.date,
      amount: userPayment.totalAmount,
      notes: notes || '',
      homeownerStatus: userPayment.homeownerStatus,
      ratePerHour: userPayment.ratePerHour,
      status: 'pending'
    });

    await paymentLog.save();

    // Populate user and reservation information for response
    await paymentLog.populate([
      { path: 'userId', select: 'fullName username email' },
      { path: 'reservationId', select: 'date startTime endTime' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Payment logged successfully',
      data: paymentLog,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Create payment log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment log',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get payment history for current user
export const getUserPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const payments = await PaymentLog.find({ userId })
      .sort({ reservationDate: -1 })
      .populate('userId', 'fullName username email');

    res.status(200).json({
      success: true,
      message: 'Payment history retrieved successfully',
      data: payments,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment history',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Check if user has paid for a specific date
export const checkPaymentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { date } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    if (!date) {
      res.status(400).json({
        success: false,
        message: 'Date parameter is required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const payment = await PaymentLog.findOne({
      userId,
      reservationDate: new Date(date),
      status: 'paid'
    });

    res.status(200).json({
      success: true,
      message: 'Payment status checked',
      data: {
        hasPaid: !!payment,
        payment: payment || null
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Update payment status (admin only)
export const updatePaymentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Check if user is admin
    if (req.user?.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    if (!['pending', 'paid', 'rejected'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, paid, or rejected',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const payment = await PaymentLog.findByIdAndUpdate(
      id,
      { 
        status,
        notes: notes || '',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('userId', 'fullName username email');

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: payment,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Check payment status for all players in a reservation
export const getReservationPaymentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reservationId } = req.params;

    if (!reservationId) {
      res.status(400).json({
        success: false,
        message: 'Reservation ID is required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Find the reservation
    const reservation = await CourtReservation.findById(reservationId);
    if (!reservation) {
      res.status(404).json({
        success: false,
        message: 'Reservation not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Get all payment logs for this reservation
    const paymentLogs = await PaymentLog.find({ reservationId })
      .populate('userId', 'fullName username homeownerStatus');

    // Get all players in the reservation
    const players = await User.find({ _id: { $in: reservation.players } }, 'fullName username homeownerStatus');

    // Create payment status for each player
    const playerPaymentStatus = players.map(player => {
      const payment = paymentLogs.find(log => (log.userId as any)._id.toString() === (player._id as any).toString());
      return {
        playerId: player._id,
        playerName: player.fullName,
        username: player.username,
        homeownerStatus: player.homeownerStatus,
        hasPaid: !!payment,
        paymentStatus: payment?.status || 'unpaid',
        paymentAmount: payment?.amount || 0,
        paymentDate: payment?.createdAt || null
      };
    });

    const totalPlayers = players.length;
    const paidPlayers = playerPaymentStatus.filter(p => p.hasPaid).length;
    const allPlayersPaid = paidPlayers === totalPlayers;

    res.status(200).json({
      success: true,
      message: 'Reservation payment status retrieved successfully',
      data: {
        reservationId,
        totalPlayers,
        paidPlayers,
        allPlayersPaid,
        playerPaymentStatus
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get reservation payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve reservation payment status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get all payments (admin only)
export const getAllPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const { status, page = 1, limit = 20 } = req.query;
    const filter: any = {};
    
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const payments = await PaymentLog.find(filter)
      .populate('userId', 'fullName username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await PaymentLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        payments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payments',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Check for unsettled payments for current user
export const checkUnsettledPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Find all pending payments for the user
    const unsettledPayments = await PaymentLog.find({
      userId,
      status: 'pending'
    }).populate('reservationId', 'date startTime endTime')
      .sort({ createdAt: -1 });

    const responseData = {
      hasUnsettled: unsettledPayments.length > 0,
      count: unsettledPayments.length,
      payments: unsettledPayments
    };

    res.status(200).json({
      success: true,
      message: 'Unsettled payments check completed',
      data: responseData,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Check unsettled payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check unsettled payments',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};