import mongoose, { Schema, Document, Types } from 'mongoose';
import { PageVisit as IPageVisit } from '../types/interfaces';

export interface PageVisitDocument extends Omit<IPageVisit, '_id' | 'userId'>, Document {
  userId: Types.ObjectId;
}

const pageVisitSchema = new Schema<PageVisitDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  pageName: {
    type: String,
    required: [true, 'Page name is required'],
    trim: true,
    maxlength: [100, 'Page name cannot exceed 100 characters']
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
    maxlength: [500, 'URL cannot exceed 500 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    trim: true
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  },
  ipAddress: {
    type: String,
    trim: true,
    validate: {
      validator: function(value: string) {
        if (!value) return true; // Optional field
        // More lenient IP validation to handle proxied IPs, IPv6, etc.
        // Allow IPv4, IPv6, and common proxy formats
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
        const proxyRegex = /^[\d\.:a-fA-F,\s-]+$/; // Allow comma-separated IPs and common proxy formats
        return ipv4Regex.test(value) || ipv6Regex.test(value) || proxyRegex.test(value) || value === '::1' || value === 'localhost';
      },
      message: 'Invalid IP address format'
    }
  },
  coinsConsumed: {
    type: Number,
    required: [true, 'Coins consumed is required'],
    min: [0, 'Coins consumed cannot be negative'],
    default: 1
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

// Indexes for better performance and analytics
pageVisitSchema.index({ userId: 1 });
pageVisitSchema.index({ pageName: 1 });
pageVisitSchema.index({ timestamp: -1 });
pageVisitSchema.index({ sessionId: 1 });
pageVisitSchema.index({ userId: 1, timestamp: -1 });
pageVisitSchema.index({ pageName: 1, timestamp: -1 });

// Compound index for analytics queries
pageVisitSchema.index({
  timestamp: -1,
  userId: 1,
  pageName: 1
});

export default mongoose.model<PageVisitDocument>('PageVisit', pageVisitSchema);