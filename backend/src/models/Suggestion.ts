import mongoose, { Schema, Document, Types } from 'mongoose';
import { Suggestion as ISuggestion } from '../types/interfaces';

export interface SuggestionDocument extends Omit<ISuggestion, '_id' | 'userId' | 'respondedBy'>, Document {
  userId: Types.ObjectId;
  respondedBy?: Types.ObjectId;
}

const suggestionSchema = new Schema<SuggestionDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: ['suggestion', 'complaint', 'maintenance', 'other'],
    required: [true, 'Category is required']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  response: {
    type: String,
    maxlength: [1000, 'Response cannot exceed 1000 characters'],
    default: null
  },
  respondedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  },
  attachments: {
    type: [String],
    default: []
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
suggestionSchema.index({ userId: 1 });
suggestionSchema.index({ category: 1 });
suggestionSchema.index({ status: 1 });
suggestionSchema.index({ priority: 1 });
suggestionSchema.index({ createdAt: -1 });

export default mongoose.model<SuggestionDocument>('Suggestion', suggestionSchema);