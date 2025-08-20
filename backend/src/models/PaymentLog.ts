import mongoose, { Schema, Document } from 'mongoose';

export interface PaymentLogDocument extends Document {
  userId: mongoose.Types.ObjectId;
  reservationId?: mongoose.Types.ObjectId; // Optional for weekend payments
  reservationDate: Date;
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  notes?: string;
  homeownerStatus: 'homeowner' | 'non-homeowner';
  ratePerHour: number;
  hoursPlayed?: number; // Add hours played for weekend payments
  playType: 'reservation' | 'weekend' | 'additional'; // Distinguish payment types
  paymentCategory?: 'equipment' | 'membership' | 'penalty' | 'maintenance' | 'event' | 'correction' | 'other'; // For additional payments
  timeSlot?: string; // For weekend payments, store time slot
  playerNames?: string[]; // Store other player names for weekend sessions
  createdAt: Date;
  updatedAt: Date;
}

const paymentLogSchema = new Schema<PaymentLogDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  reservationId: {
    type: Schema.Types.ObjectId,
    ref: 'CourtReservation',
    required: false // Allow null for weekend/open court payments
  },
  reservationDate: {
    type: Date,
    required: [true, 'Reservation date is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'rejected'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  homeownerStatus: {
    type: String,
    enum: ['homeowner', 'non-homeowner'],
    required: [true, 'Homeowner status is required']
  },
  ratePerHour: {
    type: Number,
    required: [true, 'Rate per hour is required'],
    min: [0, 'Rate per hour must be positive']
  },
  hoursPlayed: {
    type: Number,
    required: false, // Not required for additional payments
    min: [0.5, 'Minimum 0.5 hours'],
    max: [8, 'Maximum 8 hours per session']
  },
  playType: {
    type: String,
    enum: ['reservation', 'weekend', 'additional'],
    required: [true, 'Play type is required'],
    default: 'reservation'
  },
  paymentCategory: {
    type: String,
    enum: ['court-usage', 'equipment', 'membership', 'penalty', 'maintenance', 'event', 'correction', 'other'],
    required: false, // Only required for additional payments
    validate: {
      validator: function(this: PaymentLogDocument, v: string) {
        // Payment category required for additional payments
        if (this.playType === 'additional') {
          return !!v;
        }
        return true;
      },
      message: 'Payment category required for additional payments'
    }
  },
  timeSlot: {
    type: String,
    trim: true,
    validate: {
      validator: function(this: PaymentLogDocument, v: string) {
        // Time slot required for weekend payments
        if (this.playType === 'weekend') {
          return !!(v && /^\d{2}:\d{2}$/.test(v));
        }
        return true;
      },
      message: 'Time slot required for weekend payments (format: HH:MM)'
    }
  },
  playerNames: {
    type: [String],
    default: [],
    validate: {
      validator: function(names: string[]) {
        return names.length <= 8; // Max 8 players
      },
      message: 'Maximum 8 players allowed'
    }
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
paymentLogSchema.index({ userId: 1 });
paymentLogSchema.index({ reservationId: 1 });
paymentLogSchema.index({ reservationDate: 1 });
paymentLogSchema.index({ status: 1 });
// Create partial unique index for reservation-based payments only
paymentLogSchema.index({ userId: 1, reservationId: 1 }, { 
  unique: true, 
  partialFilterExpression: { 
    reservationId: { $exists: true },
    playType: 'reservation'
  } 
}); // Prevent duplicate payments per user per reservation

// Add compound index for weekend payment tracking (userId + date + type)
paymentLogSchema.index({ userId: 1, reservationDate: 1, reservationId: 1 });

// Add validation to prevent duplicate weekend payments on same date/time
paymentLogSchema.index({ 
  userId: 1, 
  reservationDate: 1, 
  timeSlot: 1, 
  playType: 1 
}, { 
  unique: true, 
  partialFilterExpression: { 
    playType: 'weekend',
    timeSlot: { $exists: true }
  } 
});

// Add unique index for additional payments to prevent duplicates within a short time period
paymentLogSchema.index({ 
  userId: 1, 
  reservationDate: 1, 
  paymentCategory: 1,
  amount: 1,
  playType: 1 
}, { 
  unique: true, 
  partialFilterExpression: { 
    playType: 'additional'
  } 
}); // Prevent duplicate additional payments on same date with same category and amount

export default mongoose.model<PaymentLogDocument>('PaymentLog', paymentLogSchema);