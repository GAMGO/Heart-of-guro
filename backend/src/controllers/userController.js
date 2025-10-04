import User from '../models/User.js';

export const createOrUpdateUser = async (req, res) => {
  try {
    const { name, email, currentStage, settings } = req.body;
    
    const user = await User.findOneAndUpdate(
      { email },
      {
        name,
        email,
        currentStage: currentStage || 'stage1',
        settings: settings || { ballastKg: 5, difficulty: 'normal' },
        $setOnInsert: {
          completedStages: [],
          progress: {
            stage1: { completed: false, attempts: 0, levels: [] },
            stage2: { completed: false, attempts: 0, repairsCompleted: 0 },
            stage3: { completed: false, attempts: 0, depthAchieved: 0 }
          },
          statistics: {
            totalPlayTime: 0,
            totalAttempts: 0,
            averageDepth: 0,
            lastPlayed: new Date()
          }
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const updateStageProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { stageId, completed, bestTime, score, levelData } = req.body;
    
    const updateData = {
      [`progress.${stageId}.completed`]: completed,
      [`progress.${stageId}.bestTime`]: bestTime,
      [`progress.${stageId}.attempts`]: { $inc: 1 },
      'statistics.lastPlayed': new Date()
    };

    if (score) {
      updateData[`progress.${stageId}.score`] = score;
    }

    if (levelData) {
      updateData[`progress.${stageId}.levels`] = levelData;
    }

    if (completed) {
      updateData.currentStage = getNextStage(stageId);
      updateData.completedStages = { $addToSet: { stageId, completedAt: new Date(), bestTime, score } };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { settings } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { settings } },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const updateStatistics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { playTime, depth, attempts } = req.body;
    
    const updateData = {
      'statistics.totalPlayTime': { $inc: playTime || 0 },
      'statistics.totalAttempts': { $inc: attempts || 0 },
      'statistics.lastPlayed': new Date()
    };

    if (depth) {
      updateData['statistics.averageDepth'] = depth;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getNextStage = (currentStage) => {
  const stageOrder = ['stage1', 'stage2', 'stage3', 'cupola'];
  const currentIndex = stageOrder.indexOf(currentStage);
  return currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : 'cupola';
};
