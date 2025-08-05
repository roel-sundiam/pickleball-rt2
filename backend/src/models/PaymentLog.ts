import mongoose, { Schema, Document } from 'mongoose';

export interface PaymentLogDocument extends Document {
  userId: mongoose.Types.ObjectId;
  reservationId: mongoose.Types.ObjectId;
  reservationDate: Date;
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  notes?: string;
  homeownerStatus: 'homeowner' | 'non-homeowner';
  ratePerHour: number;
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
    required: [true, 'Reservation ID is required']
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
paymentLogSchema.index({ userId: 1, reservationId: 1 }, { unique: true }); // Prevent duplicate payments per user per reservation

export default mongoose.model<PaymentLogDocument>('PaymentLog', paymentLogSchema);