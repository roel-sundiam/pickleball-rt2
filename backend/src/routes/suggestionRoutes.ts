import { Router } from 'express';
import { 
  createSuggestion,
  getAllSuggestions,
  getUserSuggestions,
  updateSuggestionStatus,
  deleteSuggestion
} from '../controllers/suggestionController';
import { authenticate, requireApproval, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// User routes (require authentication and approval)
router.post('/', authenticate, requireApproval, createSuggestion);
router.get('/my', authenticate, requireApproval, getUserSuggestions);

// Admin routes (require superadmin role)
router.get('/', authenticate, requireSuperAdmin, getAllSuggestions);
router.put('/:id/status', authenticate, requireSuperAdmin, updateSuggestionStatus);
router.delete('/:id', authenticate, requireSuperAdmin, deleteSuggestion);

export default router;