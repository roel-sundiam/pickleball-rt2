import mongoose, { Schema, Document, Types } from 'mongoose';
import { CoinTransaction as ICoinTransaction } from '../types/interfaces';

export interface CoinTransactionDocument extends Omit<ICoinTransaction, '_id' | 'userId' | 'referenceId'>, Document {
  userId: Types.ObjectId;
  referenceId?: Types.ObjectId;
}

const coinTransactionSchema = new Schema<CoinTransactionDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    enum: ['earned', 'spent', 'requested', 'granted'],
    required: [true, 'Transaction type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    validate: {
      validator: function(value: number) {
        return value >= 0; // Allow zero amounts for notification/audit records
      },
      message: 'Amount must be non-negative'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  referenceId: {
    type: Schema.Types.ObjectId,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: function() {
      return ['earned', 'spent'].includes(this.type) ? 'approved' : 'pending';
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
coinTransactionSchema.index({ userId: 1 });
coinTransactionSchema.index({ type: 1 });
coinTransactionSchema.index({ status: 1 });
coinTransactionSchema.index({ createdAt: -1 });
coinTransactionSchema.index({ referenceId: 1 });

export default mongoose.model<CoinTransactionDocument>('CoinTransaction', coinTransactionSchema);