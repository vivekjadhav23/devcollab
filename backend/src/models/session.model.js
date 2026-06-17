import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const generateInviteCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

const sessionSchema = new mongoose.Schema({
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    default: () => generateInviteCode()
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  language: {
    type: String,
    required: true,
    default: 'javascript'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Session = mongoose.model('Session', sessionSchema);
export default Session;
