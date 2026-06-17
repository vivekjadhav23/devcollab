import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  githubId: {
    type: String,
    unique: true,
    sparse: true,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  provider: {
    type: String,
    enum: ['github', 'google', 'both'],
    default: 'github',
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },
  avatarUrl: {
    type: String,
  },
  refreshTokens: [{
    type: String
  }],
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;
