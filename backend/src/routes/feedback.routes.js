import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.post('/feedback', authenticate, (req, res) => {
  res.status(202).json({
    data: {
      accepted: true,
      message: 'Feedback endpoint is ready. Persistence will be added with the Firestore workspace phase.',
      received: { type: req.body?.type || null },
    },
    error: null,
  });
});

export default router;
