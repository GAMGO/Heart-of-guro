import mongoose from "mongoose";

const positionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stage: {
    type: String,
    enum: ['stage1', 'stage2', 'stage3', 'cupola'],
    required: true
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true }
  },
  gameProgress: {
    isCompleted: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 } 
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

positionSchema.index({ userId: 1, stage: 1, timestamp: -1 });

export default mongoose.model('Position', positionSchema);
