import express from 'express';
import {
  savePosition,
  getPositionsBySession,
  getRecentPositions,
  getStageStatistics,
  deleteSessionPositions
} from '../controllers/positionController.js';

const router = express.Router();

router.post('/', savePosition);

router.get('/session/:sessionId', getPositionsBySession);

router.get('/user/:userId', getRecentPositions);

router.get('/statistics/:userId/:stage', getStageStatistics);

router.delete('/session/:sessionId', deleteSessionPositions);

export default router;
