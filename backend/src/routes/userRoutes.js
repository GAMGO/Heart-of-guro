import express from 'express';
import {
  createOrUpdateUser,
  getUser,
  updateStageProgress,
  updateUserSettings,
  updateStatistics
} from '../controllers/userController.js';

const router = express.Router();

router.post('/', createOrUpdateUser);

router.get('/:userId', getUser);

router.put('/:userId/progress', updateStageProgress);

router.put('/:userId/settings', updateUserSettings);

router.put('/:userId/statistics', updateStatistics);

export default router;
