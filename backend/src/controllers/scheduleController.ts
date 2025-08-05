import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { CourtReservation, User } from '../models';
import { WeatherService } from '../services/weatherService';
import { 
  ApiResponse, 
  TIME_SLOTS 
} from '../types/interfaces';

interface TimeSlotData {
  timeSlot: string;
  isAvailable: boolean;
  reservation?: any;
  weather?: any;
}

interface ScheduleResponse {
  date: string;
  timeSlots: TimeSlotData[];
  location: string;
}

// Get daily schedule with weather data
export const getDailySchedule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    const isAuthenticated = !!req.user;
    
    // Validate date format
    const scheduleDate = new Date(date);
    if (isNaN(scheduleDate.getTime())) {
      console.error('❌ Invalid date format received:', date);
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format.',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    console.log('🔍 Debug - Daily schedule request:', {
      requestedDate: date,
      parsedDate: scheduleDate.toISOString().split('T')[0],
      isAuthenticated
    });

    // Use Philippine Standard Time for date validation
    const now = new Date();
    const philippineTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    
    // Allow viewing schedule for today, yesterday, and future dates
    // Only reject dates that are more than 2 days in the past
    const twoDaysAgo = new Date(philippineTime);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);
    
    const requestDatePST = new Date(scheduleDate.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    requestDatePST.setHours(0, 0, 0, 0);
    
    console.log('🔍 Debug - Philippine Time comparison:', {
      philippineTimeNow: philippineTime.toLocaleString("en-US", {timeZone: "Asia/Manila"}),
      requestedDate: date,
      requestDatePST: requestDatePST.toLocaleString("en-US", {timeZone: "Asia/Manila"}),
      twoDaysAgo: twoDaysAgo.toLocaleString("en-US", {timeZone: "Asia/Manila"}),
      isPastDate: requestDatePST < twoDaysAgo
    });
    
    if (requestDatePST < twoDaysAgo) {
      console.error('❌ Request for past date rejected:', {
        requestedDate: date,
        requestDatePST: requestDatePST.toLocaleString("en-US", {timeZone: "Asia/Manila"}),
        cutoffDate: twoDaysAgo.toLocaleString("en-US", {timeZone: "Asia/Manila"})
      });
      res.status(400).json({
        success: false,
        message: 'Cannot retrieve schedule for dates more than 2 days in the past',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Initialize time slots
    const timeSlots: TimeSlotData[] = TIME_SLOTS.map(timeSlot => ({
      timeSlot,
      isAvailable: true
    }));

    // Load reservations for the date (if authenticated) or just basic availability
    let reservationsWithPlayerNames: any[] = [];
    
    if (isAuthenticated) {
      // Full reservation data for authenticated users
      const reservations = await CourtReservation.find({
        date: {
          $gte: new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate()),
          $lt: new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate() + 1)
        },
        status: { $ne: 'cancelled' }
      }).populate('userId', 'fullName username email');

      // Populate player names for each reservation
      reservationsWithPlayerNames = await Promise.all(
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
    } else {
      // For non-authenticated users, just get basic availability (no personal details)
      const reservations = await CourtReservation.find({
        date: {
          $gte: new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate()),
          $lt: new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate() + 1)
        },
        status: { $ne: 'cancelled' }
      }, 'startTime endTime timeSlot'); // Only basic fields needed for availability

      reservationsWithPlayerNames = reservations.map(reservation => ({
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        timeSlot: reservation.timeSlot,
        status: 'confirmed' // Generic status for public view
      }));
    }

    // Map reservations to time slots
    reservationsWithPlayerNames.forEach(reservation => {
      const occupiedSlots = getReservationTimeSlots(reservation);
      
      occupiedSlots.forEach(timeSlot => {
        const slot = timeSlots.find(s => s.timeSlot === timeSlot);
        if (slot) {
          slot.isAvailable = false;
          slot.reservation = reservation;
        }
      });
    });

    // Load weather data
    const weatherService = new WeatherService();
    try {
      const weatherData = await weatherService.getForecastWeather(date);
      
      // Map weather data to time slots
      weatherData.forEach(weather => {
        const slot = timeSlots.find(s => s.timeSlot === weather.timeSlot);
        if (slot) {
          slot.weather = weather;
        }
      });
    } catch (error) {
      console.error('Error loading weather data:', error);
      // Continue without weather data - it's not critical
    }

    const scheduleResponse: ScheduleResponse = {
      date,
      timeSlots,
      location: 'Delapaz Norte, San Fernando, Pampanga, Philippines'
    };

    res.status(200).json({
      success: true,
      message: 'Schedule retrieved successfully',
      data: scheduleResponse,
      timestamp: new Date().toISOString()
    } as ApiResponse<ScheduleResponse>);

  } catch (error) {
    console.error('Get daily schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve schedule',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Get weekly schedule overview
// Get detailed weekly schedule with full time slot information
export const getWeeklyDetailedSchedule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string || new Date().toISOString().split('T')[0];
    const days = parseInt(req.query.days as string) || 7;
    const isAuthenticated = !!req.user;
    
    // Validate parameters
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format.',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    if (days < 1 || days > 14) {
      res.status(400).json({
        success: false,
        message: 'Days parameter must be between 1 and 14.',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    console.log(`🔧 DEBUG: getWeeklyDetailedSchedule called with startDate=${startDate}, days=${days}`);
    
    const weeklySchedule = [];
    const weatherService = new WeatherService();

    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`🔧 DEBUG: Today is ${today.toISOString().split('T')[0]}, startDate is ${startDate}`);

    // Process each day
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(currentDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];

      // Skip past dates
      if (currentDate < today) {
        continue;
      }

      // Initialize time slots for this day
      const timeSlots: TimeSlotData[] = TIME_SLOTS.map(timeSlot => ({
        timeSlot,
        isAvailable: true
      }));

      // Load reservations for this date (similar auth handling as daily)
      let reservationsWithPlayerNames: any[] = [];
      
      if (isAuthenticated) {
        // Full reservation data for authenticated users
        const reservations = await CourtReservation.find({
          date: {
            $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
            $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
          },
          status: { $ne: 'cancelled' }
        }).populate('userId', 'fullName username email');

        // Populate player names for each reservation
        reservationsWithPlayerNames = await Promise.all(
          reservations.map(async (reservation) => {
            const reservationObj = reservation.toObject();
            
            if (reservationObj.players && reservationObj.players.length > 0) {
              try {
                const playerUsers = await User.find({ 
                  _id: { $in: reservationObj.players } 
                }, 'fullName username email');
                
                reservationObj.playersData = reservationObj.players.map((playerId: string) => {
                  const playerUser = playerUsers.find(user => (user._id as any).toString() === playerId);
                  return playerUser ? {
                    _id: playerUser._id,
                    fullName: playerUser.fullName,
                    username: playerUser.username,
                    email: playerUser.email
                  } : playerId;
                });
              } catch (error) {
                console.error('Error populating player data:', error);
                reservationObj.playersData = reservationObj.players;
              }
            }
            
            return reservationObj;
          })
        );
      } else {
        // For non-authenticated users, just basic availability
        const reservations = await CourtReservation.find({
          date: {
            $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
            $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
          },
          status: { $ne: 'cancelled' }
        }, 'startTime endTime timeSlot');

        reservationsWithPlayerNames = reservations.map(reservation => ({
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          timeSlot: reservation.timeSlot,
          status: 'confirmed'
        }));
      }

      // Map reservations to time slots
      reservationsWithPlayerNames.forEach(reservation => {
        const occupiedSlots = getReservationTimeSlots(reservation);
        
        occupiedSlots.forEach(timeSlot => {
          const slot = timeSlots.find(s => s.timeSlot === timeSlot);
          if (slot) {
            slot.isAvailable = false;
            slot.reservation = reservation;
          }
        });
      });

      // Load weather data for this date
      let weatherData: any[] = [];
      try {
        weatherData = await weatherService.getForecastWeather(dateString);
      } catch (error) {
        console.error(`Error loading weather for ${dateString}:`, error);
        // Continue without weather data
      }

      // Map weather data to time slots
      weatherData.forEach(weather => {
        const slot = timeSlots.find(s => s.timeSlot === weather.timeSlot);
        if (slot) {
          slot.weather = weather;
        }
      });

      // Add this day's schedule to the weekly schedule
      weeklySchedule.push({
        date: dateString,
        dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        timeSlots,
        location: 'Delapaz Norte, San Fernando, Pampanga, Philippines'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Weekly detailed schedule retrieved successfully',
      data: {
        startDate,
        days: weeklySchedule
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get weekly detailed schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve weekly detailed schedule',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

export const getWeeklySchedule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string || new Date().toISOString().split('T')[0];
    
    // Validate date format
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format.',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Generate 7 days starting from startDate
    const weeklySchedule = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(currentDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Skip past dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (currentDate < today) {
        continue;
      }

      // Get reservations for this date
      const reservations = await CourtReservation.find({
        date: {
          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
          $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
        },
        status: { $ne: 'cancelled' }
      });

      // Calculate availability stats
      const totalSlots = TIME_SLOTS.length;
      let occupiedSlots = 0;
      
      reservations.forEach(reservation => {
        const slots = getReservationTimeSlots(reservation);
        occupiedSlots += slots.length;
      });

      const availableSlots = Math.max(0, totalSlots - occupiedSlots);

      weeklySchedule.push({
        date: dateString,
        dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        totalSlots,
        availableSlots,
        occupiedSlots,
        reservationCount: reservations.length
      });
    }

    res.status(200).json({
      success: true,
      message: 'Weekly schedule retrieved successfully',
      data: {
        startDate,
        days: weeklySchedule
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get weekly schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve weekly schedule',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
};

// Helper function to get time slots occupied by a reservation
function getReservationTimeSlots(reservation: any): string[] {
  if (reservation.startTime && reservation.endTime) {
    // New format with time range
    const startHour = parseInt(reservation.startTime.split(':')[0]);
    const endHour = parseInt(reservation.endTime.split(':')[0]);
    const slots = [];
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    return slots;
  } else if (reservation.timeSlot) {
    // Legacy format with single time slot
    return [reservation.timeSlot];
  }
  
  return [];
}