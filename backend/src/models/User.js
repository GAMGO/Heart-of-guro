import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  currentStage: {
    type: String,
    enum: ['stage1', 'stage2', 'stage3', 'cupola'],
    default: 'stage1'
  },
  gameProgress: {
    stage1: { completed: Boolean, score: Number, timeSpent: Number },
    stage2: { completed: Boolean, score: Number, timeSpent: Number },
    stage3: { completed: Boolean, score: Number, timeSpent: Number }
  }
}, {
  timestamps: true
});

userSchema.index({ name: 1 });

export default mongoose.model('User', userSchema);
