import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { generatePost } from '../controllers/generation.controller.js';

const router = Router();
router.post('/generate-post', authenticate, generatePost);
export default router;
