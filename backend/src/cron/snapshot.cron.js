import cron from 'node-cron';
import { getActiveSessions, getActiveSessionFiles, getSessionCode } from '../socket/collaboration.js';
import Snapshot from '../models/snapshot.model.js';
import logger from '../utils/logger.js';

export const initSnapshotCron = () => {
  // Execute every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Automatic session snapshot scheduler running...');

    try {
      const activeSessionIds = getActiveSessions();
      if (activeSessionIds.length === 0) {
        logger.info('No active workspace sessions to snapshot.');
        return;
      }

      logger.info(`Taking snapshots for ${activeSessionIds.length} active sessions...`);

      for (const sessionId of activeSessionIds) {
        const activeFiles = getActiveSessionFiles(sessionId);
        if (activeFiles.length === 0) {
          activeFiles.push('main.js'); // default fallback
        }

        for (const fileId of activeFiles) {
          const code = await getSessionCode(sessionId, fileId);
          
          // Skip empty states
          if (!code || code.trim() === '') {
            continue;
          }

          // Optimization: Find the last snapshot for this session + file
          const lastSnapshot = await Snapshot.findOne({ sessionId, fileId }).sort({ createdAt: -1 });
          
          // Skip saving if code is identical to the last captured state
          if (lastSnapshot && lastSnapshot.code === code) {
            continue;
          }

          // Resolve language from file extension
          const ext = fileId.split('.').pop().toLowerCase();
          let language = 'javascript';
          if (ext === 'py') language = 'python';
          else if (ext === 'cpp' || ext === 'h') language = 'cpp';
          else if (ext === 'json') language = 'json';
          else if (ext === 'md') language = 'markdown';
          else if (ext === 'html') language = 'html';
          else if (ext === 'css') language = 'css';

          // Persist system snapshot
          await Snapshot.create({
            sessionId,
            fileId,
            code,
            language,
            savedBy: null // null indicates system-generated automatic backup
          });

          logger.info(`Auto-snapshot successfully saved for session: ${sessionId}, file: ${fileId}`);
        }
      }
    } catch (error) {
      logger.error(`Error executing automatic snapshot cron job: ${error.message}`);
    }
  });

  logger.info('Node-cron automatic snapshot scheduler initialized (Every 5 minutes)');
};
