import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  fileId: {
    type: String,
    default: 'main.js'
  },
  language: {
    type: String,
    required: true
  },
  savedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: '30d' } // 30-day TTL index
  }
});

const Snapshot = mongoose.model('Snapshot', snapshotSchema);
export default Snapshot;
