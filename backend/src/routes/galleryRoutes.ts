import { Router } from 'express';
import { 
  uploadGalleryItem,
  getApprovedGalleryItems,
  getPendingGalleryItems,
  approveGalleryItem,
  deleteGalleryItem,
  incrementViewCount,
  upload
} from '../controllers/galleryController';
import { authenticate, requireApproval, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.get('/approved', getApprovedGalleryItems);
router.post('/:id/view', incrementViewCount);

// User routes (require authentication and approval)
router.post('/upload', authenticate, requireApproval, upload.single('image'), uploadGalleryItem);

// Admin routes (require superadmin role)
router.get('/pending', authenticate, requireSuperAdmin, getPendingGalleryItems);
router.put('/:id/approve', authenticate, requireSuperAdmin, approveGalleryItem);

// Owner or superadmin can delete
router.delete('/:id', authenticate, requireApproval, deleteGalleryItem);

export default router;