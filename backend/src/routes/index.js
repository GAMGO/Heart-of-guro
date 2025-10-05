import express from 'express';
import userRoutes from './userRoutes.js';
import positionRoutes from './positionRoutes.js';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'NASA Training API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.use('/users', userRoutes);
router.use('/positions', positionRoutes);

export default router;
