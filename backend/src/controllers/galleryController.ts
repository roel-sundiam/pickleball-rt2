import { Response } from 'express';
import { Types } from 'mongoose';
import multer from 'multer';
// import sharp from 'sharp'; // Temporarily disabled due to platform compatibility
import path from 'path';
import fs from 'fs';
import { GalleryItem } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../types/interfaces';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/gallery');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Create thumbnail - temporarily disabled due to sharp platform compatibility
const createThumbnail = async (filePath: string): Promise<string> => {
  // const thumbnailPath = filePath.replace(/(\.[^.]+)$/, '_thumb$1');
  
  // await sharp(filePath)
  //   .resize(300, 300, {
  //     fit: 'cover',
  //     position: 'center'
  //   })
  //   .jpeg({ quality: 80 })
  //   .toFile(thumbnailPath);
    
  // return thumbnailPath;
  
  // Temporary: return original file path as thumbnail
  return filePath;
};

// Upload gallery item
export const uploadGalleryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { title, description, category, tags } = req.body;
    
    // Create thumbnail
    const thumbnailPath = await createThumbnail(req.file.path);
    
    // Parse tags if provided
    const parsedTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [];

    const galleryItem = new GalleryItem({
      title,
      description,
      imageUrl: `/uploads/gallery/${req.file.filename}`,
      thumbnailUrl: `/uploads/gallery/${path.basename(thumbnailPath)}`,
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: userId,
      category: category || 'other',
      tags: parsedTags,
      isApproved: false
    });

    await galleryItem.save();
    await galleryItem.populate('uploadedBy', 'username fullName');

    const response: ApiResponse<any> = {
      success: true,
      message: 'Gallery item uploaded successfully. Pending admin approval.',
      data: galleryItem.toObject(),
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Upload gallery item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload gallery item',
      timestamp: new Date().toISOString()
    });
  }
};

// Get approved gallery items (public)
export const getApprovedGalleryItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, limit = 50, skip = 0 } = req.query;
    
    const filter: any = { isApproved: true };
    if (category && category !== 'all') {
      filter.category = category;
    }

    const galleryItems = await GalleryItem.find(filter)
      .populate('uploadedBy', 'username fullName')
      .sort({ approvedAt: -1, createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip));

    const response: ApiResponse<any[]> = {
      success: true,
      message: 'Gallery items retrieved successfully',
      data: galleryItems,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get gallery items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve gallery items',
      timestamp: new Date().toISOString()
    });
  }
};

// Get pending gallery items (superadmin only)
export const getPendingGalleryItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const galleryItems = await GalleryItem.find({ isApproved: false })
      .populate('uploadedBy', 'username fullName')
      .sort({ createdAt: -1 });

    const response: ApiResponse<any[]> = {
      success: true,
      message: 'Pending gallery items retrieved successfully',
      data: galleryItems,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get pending gallery items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending gallery items',
      timestamp: new Date().toISOString()
    });
  }
};

// Approve gallery item (superadmin only)
export const approveGalleryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?._id?.toString();

    if (!adminUserId) {
      res.status(401).json({
        success: false,
        message: 'Admin not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const galleryItem = await GalleryItem.findById(id);
    
    if (!galleryItem) {
      res.status(404).json({
        success: false,
        message: 'Gallery item not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    galleryItem.isApproved = true;
    galleryItem.approvedBy = new Types.ObjectId(adminUserId);
    galleryItem.approvedAt = new Date();

    await galleryItem.save();
    await galleryItem.populate('uploadedBy', 'username fullName');
    await galleryItem.populate('approvedBy', 'username fullName');

    const response: ApiResponse<any> = {
      success: true,
      message: 'Gallery item approved successfully',
      data: galleryItem.toObject(),
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Approve gallery item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve gallery item',
      timestamp: new Date().toISOString()
    });
  }
};

// Delete gallery item (superadmin or owner)
export const deleteGalleryItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString();
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const galleryItem = await GalleryItem.findById(id);
    
    if (!galleryItem) {
      res.status(404).json({
        success: false,
        message: 'Gallery item not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if user can delete (owner or superadmin)
    const canDelete = userRole === 'superadmin' || galleryItem.uploadedBy.toString() === userId;
    
    if (!canDelete) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this gallery item',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Delete associated files
    const imagePath = path.join(__dirname, '../../uploads/gallery', path.basename(galleryItem.imageUrl));
    const thumbnailPath = path.join(__dirname, '../../uploads/gallery', path.basename(galleryItem.thumbnailUrl || ''));

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    if (galleryItem.thumbnailUrl && fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }

    await GalleryItem.findByIdAndDelete(id);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Gallery item deleted successfully',
      data: null,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete gallery item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete gallery item',
      timestamp: new Date().toISOString()
    });
  }
};

// Increment view count
export const incrementViewCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await GalleryItem.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    const response: ApiResponse<null> = {
      success: true,
      message: 'View count updated',
      data: null,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Increment view count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update view count',
      timestamp: new Date().toISOString()
    });
  }
};