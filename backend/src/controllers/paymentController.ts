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
    
    // Calculate total of all individual player payments
    const totalCourtFee = paymentCalculation.playerPayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
    
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
        totalCourtFee, // Total of all individual player payments
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

    // Verify reservation exists and user is a player in the reservation
    const reservation = await CourtReservation.findById(reservationId);

    if (!reservation) {
      res.status(404).json({
        success: false,
        message: 'Reservation not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check if user is in the reservation players
    if (!reservation.players.includes(userId.toString())) {
      res.status(403).json({
        success: false,
        message: 'User not included in this reservation',
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

    // Calculate payment details for all players in the reservation
    const duration = reservation.duration || 1;
    const paymentCalculation = await calculatePlayerPayments(reservation.players, duration);
    const totalCourtFee = paymentCalculation.playerPayments.reduce((sum, payment) => sum + payment.totalAmount, 0);
    const userPayment = paymentCalculation.playerPayments.find(p => p.playerId === userId.toString());
    
    if (!userPayment) {
      res.status(500).json({
        success: false,
        message: 'Unable to calculate payment amount for user',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate that the provided amount matches the total court fee
    if (Math.abs(Number(amount) - totalCourtFee) > 0.01) {
      res.status(400).json({
        success: false,
        message: `Amount mismatch. Expected total court fee: ${totalCourtFee}, Provided: ${amount}`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Create payment log entry for the total court fee
    const paymentLog = new PaymentLog({
      userId,
      reservationId,
      reservationDate: reservation.date,
      amount: totalCourtFee,
      notes: notes || '',
      homeownerStatus: userPayment.homeownerStatus, // Still track the payer's homeowner status
      ratePerHour: userPayment.ratePerHour, // Use the payer's rate for reference
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

// Get court receipts report (admin only)
export const getCourtReceiptsReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const { 
      status, 
      homeownerStatus, 
      startDate, 
      endDate, 
      search,
      page = 1, 
      limit = 50 
    } = req.query;

    // Build filter object
    const filter: any = {};
    
    if (status && typeof status === 'string') {
      filter.status = status;
    }
    
    if (homeownerStatus && typeof homeownerStatus === 'string') {
      filter.homeownerStatus = homeownerStatus;
    }

    // Date range filtering
    if (startDate || endDate) {
      filter.reservationDate = {};
      if (startDate) {
        filter.reservationDate.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        endDateObj.setHours(23, 59, 59, 999); // Include full end date
        filter.reservationDate.$lte = endDateObj;
      }
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get payments with user and reservation details
    const paymentsQuery = PaymentLog.find(filter)
      .populate('userId', 'fullName username email homeownerStatus')
      .populate('reservationId', 'date startTime endTime duration')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // If search is provided, we need to handle it differently since we can't search populated fields directly
    let payments;
    if (search && typeof search === 'string') {
      // First get all payments matching other filters
      const allPayments = await PaymentLog.find(filter)
        .populate('userId', 'fullName username email homeownerStatus')
        .populate('reservationId', 'date startTime endTime duration')
        .sort({ createdAt: -1 });

      // Filter by search term on populated data
      const searchTerm = search.toLowerCase();
      const filteredPayments = allPayments.filter(payment => {
        const user = payment.userId as any;
        return (
          user?.fullName?.toLowerCase().includes(searchTerm) ||
          user?.username?.toLowerCase().includes(searchTerm) ||
          user?.email?.toLowerCase().includes(searchTerm)
        );
      });

      // Apply pagination to filtered results
      payments = filteredPayments.slice(skip, skip + limitNum);
    } else {
      payments = await paymentsQuery;
    }

    // Get total count for pagination
    const total = search && typeof search === 'string' 
      ? (await PaymentLog.find(filter)
          .populate('userId', 'fullName username email homeownerStatus')
          .then(allPayments => {
            const searchTerm = search.toLowerCase();
            return allPayments.filter(payment => {
              const user = payment.userId as any;
              return (
                user?.fullName?.toLowerCase().includes(searchTerm) ||
                user?.username?.toLowerCase().includes(searchTerm) ||
                user?.email?.toLowerCase().includes(searchTerm)
              );
            }).length;
          }))
      : await PaymentLog.countDocuments(filter);

    // Calculate summary statistics
    const summaryStats = await PaymentLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate overall totals
    const overallStats = await PaymentLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          homeownerPayments: {
            $sum: { $cond: [{ $eq: ['$homeownerStatus', 'homeowner'] }, 1, 0] }
          },
          nonHomeownerPayments: {
            $sum: { $cond: [{ $eq: ['$homeownerStatus', 'non-homeowner'] }, 1, 0] }
          }
        }
      }
    ]);

    const summary = {
      totalPayments: overallStats[0]?.totalPayments || 0,
      totalAmount: overallStats[0]?.totalAmount || 0,
      homeownerPayments: overallStats[0]?.homeownerPayments || 0,
      nonHomeownerPayments: overallStats[0]?.nonHomeownerPayments || 0,
      statusBreakdown: summaryStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount
        };
        return acc;
      }, {} as Record<string, { count: number; totalAmount: number }>)
    };

    res.status(200).json({
      success: true,
      message: 'Court receipts report retrieved successfully',
      data: {
        payments,
        summary,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        filters: {
          status,
          homeownerStatus,
          startDate,
          endDate,
          search
        }
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get court receipts report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve court receipts report',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Helper function to check if a date is a weekend (Friday, Saturday, Sunday)
function isWeekendDay(date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return day === 0 || day === 5 || day === 6; // Sunday, Friday, Saturday
}

// Create weekend payment log entry
export const createWeekendPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const { 
      date,
      timeSlot,
      hoursPlayed,
      playerNames = [],
      notes = ''
    } = req.body;

    // Validate required fields
    if (!date || !timeSlot || !hoursPlayed) {
      res.status(400).json({
        success: false,
        message: 'Date, time slot, and hours played are required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Parse and validate date
    const paymentDate = new Date(date);
    if (isNaN(paymentDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate that it's actually a weekend day
    if (!isWeekendDay(paymentDate)) {
      res.status(400).json({
        success: false,
        message: 'Weekend payments are only allowed for Friday, Saturday, and Sunday',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Get user info for payment calculation
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check for existing payment on same date/time
    const existingPayment = await PaymentLog.findOne({
      userId,
      reservationDate: paymentDate,
      timeSlot,
      playType: 'weekend'
    });

    if (existingPayment) {
      res.status(409).json({
        success: false,
        message: 'Payment already logged for this date and time slot',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Calculate payment amount
    const ratePerHour = user.homeownerStatus === 'homeowner' ? 25 : 50;
    const totalAmount = ratePerHour * hoursPlayed;

    // Create payment log entry
    const paymentLog = new PaymentLog({
      userId,
      reservationDate: paymentDate,
      amount: totalAmount,
      status: 'pending',
      notes,
      homeownerStatus: user.homeownerStatus,
      ratePerHour,
      hoursPlayed,
      playType: 'weekend',
      timeSlot,
      playerNames: playerNames.filter(Boolean) // Remove empty strings
    });

    await paymentLog.save();

    res.status(201).json({
      success: true,
      message: 'Weekend payment logged successfully',
      data: paymentLog,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Create weekend payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create weekend payment',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get weekend payment history for current user
export const getUserWeekendPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const { page = 1, limit = 20, status } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {
      userId,
      playType: 'weekend'
    };

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const [payments, total] = await Promise.all([
      PaymentLog.find(filter)
        .sort({ reservationDate: -1, timeSlot: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PaymentLog.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      message: 'Weekend payment history retrieved successfully',
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
    console.error('Get weekend payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve weekend payment history',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Check if user has pending weekend payments for a specific date
export const checkWeekendPaymentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const paymentDate = new Date(date);
    if (isNaN(paymentDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const payments = await PaymentLog.find({
      userId,
      reservationDate: paymentDate,
      playType: 'weekend'
    }).sort({ timeSlot: 1 });

    res.status(200).json({
      success: true,
      message: 'Weekend payment status retrieved successfully',
      data: {
        date,
        payments,
        hasPayments: payments.length > 0,
        pendingCount: payments.filter(p => p.status === 'pending').length,
        paidCount: payments.filter(p => p.status === 'paid').length
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Check weekend payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check weekend payment status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};