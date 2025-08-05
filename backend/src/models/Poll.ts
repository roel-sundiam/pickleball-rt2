import mongoose, { Schema, Document, Types } from 'mongoose';
import { Poll as IPoll, PollOption } from '../types/interfaces';

export interface PollDocument extends Omit<IPoll, '_id' | 'createdBy' | 'votedUsers'>, Document {
  createdBy: Types.ObjectId;
  votedUsers: Types.ObjectId[];
}

const pollOptionSchema = new Schema<PollOption>({
  text: {
    type: String,
    required: [true, 'Option text is required'],
    trim: true,
    maxlength: [200, 'Option text cannot exceed 200 characters']
  },
  votes: {
    type: Number,
    default: 0,
    min: [0, 'Votes cannot be negative']
  },
  voters: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { _id: true });

const pollSchema = new Schema<PollDocument>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  options: {
    type: [pollOptionSchema],
    validate: {
      validator: function(value: PollOption[]) {
        return value.length >= 2 && value.length <= 10;
      },
      message: 'Poll must have between 2 and 10 options'
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value: Date) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  votedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
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
pollSchema.index({ createdBy: 1 });
pollSchema.index({ isActive: 1 });
pollSchema.index({ startDate: 1, endDate: 1 });
pollSchema.index({ createdAt: -1 });

// Virtual to check if poll is currently active
pollSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && this.startDate <= now && this.endDate >= now;
});

export default mongoose.model<PollDocument>('Poll', pollSchema);