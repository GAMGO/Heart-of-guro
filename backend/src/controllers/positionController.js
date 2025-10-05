import mongoose from 'mongoose';
import Position from '../models/Position.js';

export const savePosition = async (req, res) => {
  try {
    const { userId, stage, position, physics, sessionId, metadata } = req.body;
    
    const positionData = new Position({
      userId,
      stage,
      position,
      physics,
      sessionId,
      metadata
    });

    const savedPosition = await positionData.save();

    res.status(201).json({
      success: true,
      data: savedPosition
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getPositionsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 100, skip = 0 } = req.query;
    
    const positions = await Position.find({ sessionId })
      .sort({ timestamp: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.status(200).json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getRecentPositions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { stage, limit = 50 } = req.query;
    
    const query = { userId };
    if (stage) {
      query.stage = stage;
    }

    const positions = await Position.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: positions
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getStageStatistics = async (req, res) => {
  try {
    const { userId, stage } = req.params;
    
    const stats = await Position.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), stage } },
      {
        $group: {
          _id: null,
          totalSessions: { $addToSet: '$sessionId' },
          averageDepth: { $avg: '$physics.depth' },
          maxDepth: { $max: '$physics.depth' },
          totalPlayTime: { $sum: 1 }, 
          lastPlayed: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          _id: 0,
          totalSessions: { $size: '$totalSessions' },
          averageDepth: { $round: ['$averageDepth', 2] },
          maxDepth: { $round: ['$maxDepth', 2] },
          totalPlayTime: '$totalPlayTime',
          lastPlayed: '$lastPlayed'
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteSessionPositions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await Position.deleteMany({ sessionId });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} position records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
