import mongoose, { Schema, Document, Types } from 'mongoose';
import { Payment as IPayment } from '../types/interfaces';

export interface PaymentDocument extends Omit<IPayment, '_id' | 'userId' | 'reservationId'>, Document {
  userId: Types.ObjectId;
  reservationId: Types.ObjectId;
}

const paymentSchema = new Schema<PaymentDocument>({
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
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['coins', 'cash', 'transfer'],
    required: [true, 'Payment method is required']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  receiptNumber: {
    type: String,
    required: [true, 'Receipt number is required'],
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [200, 'Description cannot exceed 200 characters']
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
paymentSchema.index({ userId: 1 });
paymentSchema.index({ reservationId: 1 });
paymentSchema.index({ receiptNumber: 1 });
paymentSchema.index({ paymentDate: 1 });
paymentSchema.index({ status: 1 });

// Generate receipt number before saving
paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.receiptNumber = `PB${timestamp}${random}`;
  }
  next();
});

export default mongoose.model<PaymentDocument>('Payment', paymentSchema);