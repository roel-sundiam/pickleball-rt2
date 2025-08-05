import mongoose, { Schema, Document, Types } from 'mongoose';

export interface GalleryItemDocument extends Document {
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: Types.ObjectId;
  isApproved: boolean;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  category?: string;
  tags: string[];
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const galleryItemSchema = new Schema<GalleryItemDocument>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  thumbnailUrl: {
    type: String
  },
  originalFilename: {
    type: String,
    required: [true, 'Original filename is required']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    validate: {
      validator: function(v: string) {
        return /^image\/(jpeg|jpg|png|gif|webp)$/.test(v);
      },
      message: 'Only image files are allowed (JPEG, PNG, GIF, WebP)'
    }
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  category: {
    type: String,
    enum: ['events', 'courts', 'members', 'tournaments', 'facilities', 'other'],
    default: 'other'
  },
  tags: {
    type: [String],
    default: []
  },
  viewCount: {
    type: Number,
    default: 0
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
galleryItemSchema.index({ uploadedBy: 1 });
galleryItemSchema.index({ isApproved: 1 });
galleryItemSchema.index({ category: 1 });
galleryItemSchema.index({ createdAt: -1 });
galleryItemSchema.index({ approvedAt: -1 });
galleryItemSchema.index({ tags: 1 });

export default mongoose.model<GalleryItemDocument>('GalleryItem', galleryItemSchema);