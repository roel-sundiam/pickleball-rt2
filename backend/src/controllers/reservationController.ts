import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { CourtReservation, Payment, CoinTransaction, User } from '../models';
import PaymentLog from '../models/PaymentLog';
import { 
  ReservationRequest, 
  ApiResponse, 
  PaginatedResponse,
  COIN_COSTS,
  COURT_FEES,
  TIME_SLOTS 
} from '../types/interfaces';
import { Types } from 'mongoose';

// Helper function to generate time slots between start and end time
function generateTimeSlotsBetween(startTime: string, endTime: string): string[] {
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  const slots: string[] = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  
  return slots;
}

// Helper function to calculate duration in hours
function calculateDuration(startTime: string, endTime: string): number {
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  return endHour - startHour;
}

// Helper function to check for unsettled payments
async function checkUnsettledPayments(userId: string): Promise<{ hasUnsettled: boolean; count: number }> {
  try {
    const unsettledPayments = await PaymentLog.find({
      userId: new Types.ObjectId(userId),
      status: 'pending'
    });

    return {
      hasUnsettled: unsettledPayments.length > 0,
      count: unsettledPayments.length
    };
  } catch (error) {
    console.error('Error checking unsettled payments:', error);
    return { hasUnsettled: false, count: 0 };
  }
}

// Helper function to calculate payment amounts for players
export async function calculatePlayerPayments(playerIds: string[], duration: number) {
  const players = await User.find({ _id: { $in: playerIds } }, 'homeownerStatus fullName username');
  
  const homeowners = players.filter(p => p.homeownerStatus === 'homeowner');
  const nonHomeowners = players.filter(p => p.homeownerStatus === 'non-homeowner');
  
  const homeownerCount = homeowners.length;
  const nonHomeownerCount = nonHomeowners.length;
  
  // Calculate total per hour based on player composition
  const homeownerTotal = homeownerCount * COURT_FEES.HOMEOWNER_RATE;
  const nonHomeownerTotal = nonHomeownerCount * COURT_FEES.NON_HOMEOWNER_RATE;
  const calculatedTotal = homeownerTotal + nonHomeownerTotal;
  
  // Apply minimum total if needed
  const actualTotal = Math.max(calculatedTotal, COURT_FEES.MINIMUM_TOTAL);
  
  // If we need to adjust to meet minimum, distribute the difference
  let homeownerRate = COURT_FEES.HOMEOWNER_RATE;
  let nonHomeownerRate = COURT_FEES.NON_HOMEOWNER_RATE;
  
  if (actualTotal > calculatedTotal) {
    const difference = actualTotal - calculatedTotal;
    const totalPlayers = homeownerCount + nonHomeownerCount;
    const additionalPerPlayer = difference / totalPlayers;
    
    homeownerRate += additionalPerPlayer;
    nonHomeownerRate += additionalPerPlayer;
  }
  
  // Calculate final amounts per player for the duration
  const playerPayments = players.map(player => ({
    playerId: (player._id as any).toString(),
    playerName: player.fullName,
    username: player.username,
    homeownerStatus: player.homeownerStatus,
    ratePerHour: player.homeownerStatus === 'homeowner' ? homeownerRate : nonHomeownerRate,
    totalAmount: (player.homeownerStatus === 'homeowner' ? homeownerRate : nonHomeownerRate) * duration
  }));
  
  return {
    playerPayments,
    summary: {
      duration,
      homeownerCount,
      nonHomeownerCount,
      homeownerRatePerHour: homeownerRate,
      nonHomeownerRatePerHour: nonHomeownerRate,
      totalPerHour: actualTotal,
      grandTotal: actualTotal * duration
    }
  };
}

// Calculate payment amounts for a reservation
export const calculateReservationPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reservationId, playerIds, startTime, endTime } = req.body;
    let duration: number;
    
    if (reservationId) {
      // Calculate for existing reservation
      const reservation = await CourtReservation.findById(reservationId);
      if (!reservation) {
        res.status(404).json({
          success: false,
          message: 'Reservation not found',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }
      
      duration = reservation.duration || 1;
      const playersToCalculate = playerIds || reservation.players;
      
      const paymentCalculation = await calculatePlayerPayments(playersToCalculate, duration);
      
      res.status(200).json({
        success: true,
        message: 'Payment calculation completed',
        data: paymentCalculation,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      
    } else if (playerIds && startTime && endTime) {
      // Calculate for new reservation
      duration = calculateDuration(startTime, endTime);
      const paymentCalculation = await calculatePlayerPayments(playerIds, duration);
      
      res.status(200).json({
        success: true,
        message: 'Payment calculation completed',
        data: paymentCalculation,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      
    } else {
      res.status(400).json({
        success: false,
        message: 'Either reservationId or (playerIds, startTime, endTime) are required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }
    
  } catch (error) {
    console.error('Calculate payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate payments',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Create a new court reservation
export const createReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reservationData: ReservationRequest = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate date (must be today or future)
    const reservationDate = new Date(reservationData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (reservationDate < today) {
      res.status(400).json({
        success: false,
        message: 'Cannot make reservations for past dates',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate time range (support both new time range and legacy time slot)
    const startTime = reservationData.startTime || reservationData.timeSlot;
    const endTime = reservationData.endTime;

    if (!startTime) {
      res.status(400).json({
        success: false,
        message: 'Start time is required',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // For time range bookings, validate both start and end times
    if (endTime) {
      if (!TIME_SLOTS.includes(startTime as any) || !TIME_SLOTS.includes(endTime as any)) {
        res.status(400).json({
          success: false,
          message: 'Invalid time range. Court is available from 05:00 to 22:00',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);

      if (endHour <= startHour) {
        res.status(400).json({
          success: false,
          message: 'End time must be after start time',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // Check for overlapping reservations in the time range
      const overlappingReservations = await CourtReservation.find({
        date: reservationDate,
        status: { $ne: 'cancelled' },
        $or: [
          // New reservation starts during existing reservation
          {
            $and: [
              { startTime: { $lte: startTime } },
              { endTime: { $gt: startTime } }
            ]
          },
          // New reservation ends during existing reservation  
          {
            $and: [
              { startTime: { $lt: endTime } },
              { endTime: { $gte: endTime } }
            ]
          },
          // New reservation completely contains existing reservation
          {
            $and: [
              { startTime: { $gte: startTime } },
              { endTime: { $lte: endTime } }
            ]
          },
          // Legacy timeSlot check
          {
            timeSlot: { $in: generateTimeSlotsBetween(startTime, endTime) }
          }
        ]
      });

      if (overlappingReservations.length > 0) {
        res.status(409).json({
          success: false,
          message: 'This time range conflicts with existing reservations',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }
    } else {
      // Legacy single time slot validation
      if (!TIME_SLOTS.includes(startTime as any)) {
        res.status(400).json({
          success: false,
          message: 'Invalid time slot. Court is available from 05:00 to 22:00',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }

      // Check if time slot is already reserved
      const existingReservation = await CourtReservation.findOne({
        date: reservationDate,
        $or: [
          { timeSlot: startTime },
          { 
            $and: [
              { startTime: { $lte: startTime } },
              { endTime: { $gt: startTime } }
            ]
          }
        ],
        status: { $ne: 'cancelled' }
      });

      if (existingReservation) {
        res.status(409).json({
          success: false,
          message: 'This time slot is already reserved',
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }
    }

    // Check user's payment status (must have paid membership fees)
    const user = await User.findById(userId);
    if (!user?.membershipFeesPaid) {
      res.status(402).json({
        success: false,
        message: 'Membership fees must be paid before making reservations',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check for unsettled payments (skip for superadmins)
    if (user.role !== 'superadmin') {
      const paymentCheck = await checkUnsettledPayments(userId.toString());
      if (paymentCheck.hasUnsettled) {
        res.status(402).json({
          success: false,
          message: `You have ${paymentCheck.count} unsettled payment${paymentCheck.count > 1 ? 's' : ''}. Please settle all outstanding payments before making new reservations.`,
          timestamp: new Date().toISOString()
        } as ApiResponse);
        return;
      }
    }

    // Calculate cost based on duration
    const duration = endTime ? calculateDuration(startTime, endTime) : 1;
    const totalCost = duration * COIN_COSTS.COURT_RESERVATION;

    // Check if user has sufficient coins (superadmins have unlimited coins)
    if (user.role !== 'superadmin' && user.coinBalance < totalCost) {
      res.status(402).json({
        success: false,
        message: `Insufficient coins. Required: ${totalCost}, Available: ${user.coinBalance}`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Create reservation
    const reservation = new CourtReservation({
      userId,
      date: reservationDate,
      startTime,
      endTime,
      timeSlot: reservationData.timeSlot, // Keep for backward compatibility
      duration,
      players: reservationData.players,
      notes: reservationData.notes,
      status: 'confirmed', // Auto-confirm if payment requirements are met
      paymentStatus: 'pending'
    });

    await reservation.save();

    // Deduct coins from user balance (superadmins don't lose coins)
    if (user.role !== 'superadmin') {
      user.coinBalance -= totalCost;
      await user.save();
    }

    // Create coin transaction record
    const timeDescription = endTime ? 
      `${startTime} to ${endTime}` : 
      `at ${startTime}`;
    
    const coinTransaction = new CoinTransaction({
      userId,
      type: 'spent',
      amount: user.role === 'superadmin' ? 0 : totalCost, // Superadmins spend 0 coins
      description: user.role === 'superadmin' 
        ? `Court reservation for ${reservationData.date} ${timeDescription} (Super Admin - No Cost)`
        : `Court reservation for ${reservationData.date} ${timeDescription}`,
      referenceId: reservation._id,
      status: 'approved'
    });

    await coinTransaction.save();

    // Populate user information in response
    await reservation.populate('userId', 'fullName username email');

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: reservation,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reservation',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get user's reservations
export const getUserReservations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const reservations = await CourtReservation.find({ userId })
      .populate('userId', 'fullName username email')
      .sort({ date: -1, timeSlot: 1 })
      .skip(skip)
      .limit(limit);

    // Populate player names for each reservation
    const reservationsWithPlayerNames = await Promise.all(
      reservations.map(async (reservation) => {
        const reservationObj = reservation.toObject();
        
        // If players array contains user IDs, populate their names
        if (reservationObj.players && reservationObj.players.length > 0) {
          try {
            const playerUsers = await User.find({ 
              _id: { $in: reservationObj.players } 
            }, 'fullName username email');
            
            // Map player IDs to user data, keeping IDs for those not found
            reservationObj.playersData = reservationObj.players.map((playerId: string) => {
              const playerUser = playerUsers.find(user => (user._id as any).toString() === playerId);
              return playerUser ? {
                _id: playerUser._id,
                fullName: playerUser.fullName,
                username: playerUser.username,
                email: playerUser.email
              } : playerId; // Keep as string ID if user not found
            });
          } catch (error) {
            console.error('Error populating player data:', error);
            // If population fails, keep original players array
            reservationObj.playersData = reservationObj.players;
          }
        }
        
        return reservationObj;
      })
    );

    const total = await CourtReservation.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: reservationsWithPlayerNames,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } as PaginatedResponse);

  } catch (error) {
    console.error('Get user reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve reservations',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get all reservations (admin view)
export const getAllReservations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const date = req.query.date as string;
    const status = req.query.status as string;

    // Build filter
    const filter: any = {};
    if (date) {
      const filterDate = new Date(date);
      filter.date = {
        $gte: new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate()),
        $lt: new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate() + 1)
      };
    }
    if (status) {
      filter.status = status;
    }

    const reservations = await CourtReservation.find(filter)
      .populate('userId', 'fullName username email')
      .sort({ date: 1, timeSlot: 1 })
      .skip(skip)
      .limit(limit);

    // Populate player names for each reservation
    const reservationsWithPlayerNames = await Promise.all(
      reservations.map(async (reservation) => {
        const reservationObj = reservation.toObject();
        
        // If players array contains user IDs, populate their names
        if (reservationObj.players && reservationObj.players.length > 0) {
          try {
            const playerUsers = await User.find({ 
              _id: { $in: reservationObj.players } 
            }, 'fullName username email');
            
            // Map player IDs to user data, keeping IDs for those not found
            reservationObj.playersData = reservationObj.players.map((playerId: string) => {
              const playerUser = playerUsers.find(user => (user._id as any).toString() === playerId);
              return playerUser ? {
                _id: playerUser._id,
                fullName: playerUser.fullName,
                username: playerUser.username,
                email: playerUser.email
              } : playerId; // Keep as string ID if user not found
            });
          } catch (error) {
            console.error('Error populating player data:', error);
            // If population fails, keep original players array
            reservationObj.playersData = reservationObj.players;
          }
        }
        
        return reservationObj;
      })
    );

    const total = await CourtReservation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: reservationsWithPlayerNames,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } as PaginatedResponse);

  } catch (error) {
    console.error('Get all reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve reservations',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Update reservation
export const updateReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reservationId = req.params.id;
    const userId = req.user?._id;
    const updates = req.body;

    // Find reservation
    const reservation = await CourtReservation.findById(reservationId);
    if (!reservation) {
      res.status(404).json({
        success: false,
        message: 'Reservation not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check ownership (users can only update their own reservations, unless superadmin)
    if (req.user?.role !== 'superadmin' && !reservation.userId.equals(userId as Types.ObjectId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own reservations.',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Validate allowed updates
    const allowedUpdates = ['players', 'notes'];
    if (req.user?.role === 'superadmin') {
      allowedUpdates.push('status', 'paymentStatus');
    }

    const requestedUpdates = Object.keys(updates);
    const isValidOperation = requestedUpdates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      res.status(400).json({
        success: false,
        message: `Invalid updates. Allowed fields: ${allowedUpdates.join(', ')}`,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Apply updates
    Object.assign(reservation, updates);
    await reservation.save();

    await reservation.populate('userId', 'fullName username email');

    res.status(200).json({
      success: true,
      message: 'Reservation updated successfully',
      data: reservation,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reservation',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Cancel reservation
export const cancelReservation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reservationId = req.params.id;
    const userId = req.user?._id;

    // Find reservation
    const reservation = await CourtReservation.findById(reservationId);
    if (!reservation) {
      res.status(404).json({
        success: false,
        message: 'Reservation not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check ownership
    if (req.user?.role !== 'superadmin' && !reservation.userId.equals(userId as Types.ObjectId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only cancel your own reservations.',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check if reservation can be cancelled
    if (reservation.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: 'Reservation is already cancelled',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    if (reservation.status === 'completed') {
      res.status(400).json({
        success: false,
        message: 'Cannot cancel completed reservation',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Cancel reservation
    reservation.status = 'cancelled';
    await reservation.save();

    // Refund coins to user if reservation was paid with coins
    const user = await User.findById(reservation.userId);
    if (user) {
      // Calculate refund amount based on original reservation duration
      const refundAmount = (reservation.duration || 1) * COIN_COSTS.COURT_RESERVATION;
      
      // Only refund coins if user is not a superadmin (superadmins didn't spend coins)
      if (user.role !== 'superadmin') {
        user.coinBalance += refundAmount;
        await user.save();
      }

      // Create refund transaction record
      const timeDescription = reservation.endTime ? 
        `${reservation.startTime} to ${reservation.endTime}` : 
        `at ${reservation.startTime}`;
        
      const coinTransaction = new CoinTransaction({
        userId: reservation.userId,
        type: 'earned',
        amount: user.role === 'superadmin' ? 0 : refundAmount,
        description: user.role === 'superadmin' 
          ? `Refund for cancelled reservation on ${reservation.date.toDateString()} ${timeDescription} (Super Admin - No Refund)`
          : `Refund for cancelled reservation on ${reservation.date.toDateString()} ${timeDescription}`,
        referenceId: reservation._id,
        status: 'approved'
      });

      await coinTransaction.save();
    }

    await reservation.populate('userId', 'fullName username email');

    res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully. Coins have been refunded.',
      data: reservation,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel reservation',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get reservation by ID
export const getReservationById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reservationId = req.params.id;
    const userId = req.user?._id;

    const reservation = await CourtReservation.findById(reservationId)
      .populate('userId', 'fullName username email');

    if (!reservation) {
      res.status(404).json({
        success: false,
        message: 'Reservation not found',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Check access permissions
    if (req.user?.role !== 'superadmin' && !reservation.userId._id.equals(userId as Types.ObjectId)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Reservation retrieved successfully',
      data: reservation,
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get reservation by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve reservation',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};