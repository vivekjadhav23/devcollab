import Snapshot from '../models/snapshot.model.js';
import { getSessionCode, restoreSessionCode } from '../socket/collaboration.js';
import logger from '../utils/logger.js';

// Get all snapshots for a specific session and optionally a specific file
export const listSnapshots = async (req, res) => {
  const { sessionId } = req.params;
  const { fileId } = req.query;

  try {
    const query = { sessionId };
    if (fileId) {
      query.fileId = fileId;
    }

    const snapshots = await Snapshot.find(query)
      .populate('savedBy', 'username avatarUrl')
      .sort({ createdAt: -1 });

    res.json(snapshots);
  } catch (error) {
    logger.error(`Error listing snapshots: ${error.message}`);
    res.status(500).json({ message: 'Failed to retrieve version history' });
  }
};

// Revert the workspace code to a snapshot
export const restoreSnapshot = async (req, res) => {
  const { snapshotId } = req.params;
  const userId = req.user._id;

  try {
    const snapshot = await Snapshot.findById(snapshotId);
    if (!snapshot) {
      return res.status(404).json({ message: 'Snapshot not found' });
    }

    const sessionId = snapshot.sessionId.toString();
    const fileId = snapshot.fileId || 'main.js';
    const targetCode = snapshot.code;

    // Get current code to check if we need to take a manual backup snapshot first
    const currentCode = await getSessionCode(sessionId, fileId);
    
    if (currentCode && currentCode !== targetCode) {
      // Save a manual snapshot of the current state before overwriting it
      await Snapshot.create({
        sessionId,
        fileId,
        code: currentCode,
        language: snapshot.language,
        savedBy: userId // Attributed to the user who triggered restore
      });
      logger.info(`Saved auto-backup snapshot for session ${sessionId}, file ${fileId} before restoring`);
    }

    // Apply the restored code across all active socket connections
    await restoreSessionCode(sessionId, targetCode, fileId);

    logger.info(`Session ${sessionId} restored to snapshot ${snapshotId} for file ${fileId} by User ${userId}`);
    res.json({ message: 'Workspace restored successfully', code: targetCode });
  } catch (error) {
    logger.error(`Error restoring snapshot: ${error.message}`);
    res.status(500).json({ message: 'Failed to restore snapshot' });
  }
};
