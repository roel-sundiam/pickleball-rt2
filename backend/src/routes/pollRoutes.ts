import { Router } from 'express';
import { 
  createPoll,
  getAllActivePolls,
  getAllPolls,
  getPollById,
  voteOnPoll,
  getPollResults,
  updatePoll,
  deletePoll
} from '../controllers/pollController';
import { authenticate, requireApproval, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// Debug: Log all route registrations
console.log('Registering poll routes...');

// Routes with specific paths must come before generic /:id routes
router.get('/', authenticate, requireApproval, getAllActivePolls);
router.get('/all', authenticate, requireSuperAdmin, getAllPolls);
router.get('/:id/results', authenticate, requireApproval, getPollResults);
router.post('/:id/vote', authenticate, requireApproval, voteOnPoll);

// Admin routes with /:id pattern (must come last)
router.post('/', authenticate, requireSuperAdmin, createPoll);
console.log('Registering GET /:id route for getPollById');
// Temporary test route without auth
router.get('/test/:id', (req, res) => {
  console.log('Test route hit with ID:', req.params.id);
  res.json({ message: 'Test route works', id: req.params.id });
});
router.get('/:id', authenticate, requireApproval, getPollById);
router.put('/:id', authenticate, requireSuperAdmin, updatePoll);
router.delete('/:id', authenticate, requireSuperAdmin, deletePoll);

console.log('Poll routes registered successfully');

export default router;