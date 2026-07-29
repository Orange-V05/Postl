import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { repurposeContent } from '../controllers/repurpose.controller.js';

const router = Router();
router.post('/repurpose', authenticate, repurposeContent);
export default router;
