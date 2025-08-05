import mongoose, { Schema, Document, Types } from 'mongoose';
import { CourtReservation as ICourtReservation, TIME_SLOTS } from '../types/interfaces';

export interface CourtReservationDocument extends Omit<ICourtReservation, '_id' | 'userId'>, Document {
  userId: Types.ObjectId;
  playersData?: (any | string)[];
}

const courtReservationSchema = new Schema<CourtReservationDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function(value: Date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return value >= today;
      },
      message: 'Reservation date cannot be in the past'
    }
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(value: string) {
        return TIME_SLOTS.includes(value as any);
      },
      message: 'Invalid start time. Must be between 05:00 and 22:00'
    }
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: function(value: string) {
        return TIME_SLOTS.includes(value as any);
      },
      message: 'Invalid end time. Must be between 05:00 and 22:00'
    }
  },
  timeSlot: {
    type: String,
    validate: {
      validator: function(value: string) {
        return !value || TIME_SLOTS.includes(value as any);
      },
      message: 'Invalid time slot. Must be between 05:00 and 22:00'
    }
  },
  duration: {
    type: Number,
    min: [1, 'Duration must be at least 1 hour'],
    max: [8, 'Duration cannot exceed 8 hours']
  },
  players: {
    type: [String],
    required: [true, 'At least one player is required'],
    validate: {
      validator: function(value: string[]) {
        return value.length > 0; // No limit on number of players
      },
      message: 'Must have at least one player'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for better performance
courtReservationSchema.index({ userId: 1 });
courtReservationSchema.index({ date: 1, startTime: 1, endTime: 1 });
courtReservationSchema.index({ status: 1 });
courtReservationSchema.index({ paymentStatus: 1 });

// Support legacy timeSlot index
courtReservationSchema.index({ date: 1, timeSlot: 1 });

// Pre-save validation to check for time range conflicts
courtReservationSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('date') || this.isModified('startTime') || this.isModified('endTime') || this.isModified('timeSlot')) {
    try {
      const CourtReservationModel = mongoose.model('CourtReservation');
      const startTime = (this as any).startTime;
      const endTime = (this as any).endTime;
      const timeSlot = (this as any).timeSlot;
      
      // Check for overlapping time range reservations
      const overlappingQuery: any = {
        date: (this as any).date,
        status: { $ne: 'cancelled' },
        _id: { $ne: this._id }
      };

      if (startTime && endTime) {
        // Check for time range conflicts
        overlappingQuery.$or = [
          // New reservation starts during existing reservation
          { $and: [{ startTime: { $lte: startTime } }, { endTime: { $gt: startTime } }] },
          // New reservation ends during existing reservation  
          { $and: [{ startTime: { $lt: endTime } }, { endTime: { $gte: endTime } }] },
          // New reservation completely contains existing reservation
          { $and: [{ startTime: { $gte: startTime } }, { endTime: { $lte: endTime } }] },
          // Legacy timeSlot check
          { timeSlot: { $exists: true, $ne: null } }
        ];
      } else if (timeSlot) {
        // Legacy single time slot check
        overlappingQuery.$or = [
          { timeSlot: timeSlot },
          { $and: [{ startTime: { $lte: timeSlot } }, { endTime: { $gt: timeSlot } }] }
        ];
      }

      const existingReservation = await CourtReservationModel.findOne(overlappingQuery);

      if (existingReservation) {
        const error = new Error('This time conflicts with an existing reservation');
        return next(error);
      }
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

export default mongoose.model<CourtReservationDocument>('CourtReservation', courtReservationSchema);