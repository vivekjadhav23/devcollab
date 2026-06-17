import * as Y from 'yjs';
import { getRedis } from '../config/redis.js';
import logger from '../utils/logger.js';
import { addAIReviewJob } from '../queues/aiReview.queue.js';
import { addExecutionJob } from '../queues/execution.queue.js';

// In-memory registry to track active socket connections per workspace room
// Key: sessionId -> Value: Map(socketId -> { userId, username, avatarUrl })
const activeRoomUsers = new Map();

// In-memory registry to track active socket connections per file room
// Key: fileRoom -> Value: Map(socketId -> { userId, username, avatarUrl })
const activeFileUsers = new Map();

// In-memory registry to track active Yjs document states per active file
// Key: fileRoom (session:sessionId:file:encodedFilename) -> Value: Y.Doc
const activeDocs = new Map();

let ioInstance = null;

export const handleCollaboration = (io) => {
  ioInstance = io;
  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`WebSocket Connected: User "${user.username}" (Socket ID: ${socket.id})`);

    // Handle joining a workspace room
    socket.on('join-session', async ({ sessionId }) => {
      if (!sessionId) return;

      try {
        // 1. Join Socket.io room
        socket.join(sessionId);
        logger.info(`User "${user.username}" joined room: ${sessionId}`);

        // 2. Add user to the active room participants registry
        if (!activeRoomUsers.has(sessionId)) {
          activeRoomUsers.set(sessionId, new Map());
        }
        
        activeRoomUsers.get(sessionId).set(socket.id, {
          userId: user._id.toString(),
          username: user.username,
          avatarUrl: user.avatarUrl,
          isHost: false // default, updated by set-host-status
        });

        // 3. Broadcast updated list of active users in the room to everyone
        const activeUsersList = Array.from(activeRoomUsers.get(sessionId).values());
        io.to(sessionId).emit('room-users', activeUsersList);

        // 4. Send the current session file tree to the newly joined user
        const redis = getRedis();
        const sessionTree = await redis.get(`session:${sessionId}:filetree`);
        if (sessionTree) {
          socket.emit('file-tree-updated', JSON.parse(sessionTree));
        }

        // 5. Ask the host socket to refresh and broadcast the file tree
        const sessionUsers = activeRoomUsers.get(sessionId);
        if (sessionUsers) {
          for (const [sid, u] of sessionUsers.entries()) {
            if (u.isHost && sid !== socket.id) {
              io.to(sid).emit('request-file-tree');
              logger.info(`Requested live file tree refresh from host socket: ${sid}`);
              break;
            }
          }
        }

      } catch (error) {
        logger.error(`Error joining room ${sessionId}: ${error.message}`);
        socket.emit('error', { message: 'Failed to join collaboration room' });
      }
    });

    // Helper function to forward guest requests to the host socket in the session
    const forwardToHost = (sessionId, eventName, payload) => {
      const sessionUsers = activeRoomUsers.get(sessionId);
      if (sessionUsers) {
        for (const [sid, u] of sessionUsers.entries()) {
          if (u.isHost) {
            io.to(sid).emit(eventName, payload);
            logger.info(`Forwarded event "${eventName}" to host socket: ${sid}`);
            return true;
          }
        }
      }
      return false;
    };

    // Forward guest CRUD file system requests to the host
    socket.on('request-create-file', ({ sessionId, name, parentPath }) => {
      forwardToHost(sessionId, 'create-file-on-disk', { name, parentPath });
    });

    socket.on('request-create-folder', ({ sessionId, name, parentPath }) => {
      forwardToHost(sessionId, 'create-folder-on-disk', { name, parentPath });
    });

    socket.on('request-delete-entry', ({ sessionId, path }) => {
      forwardToHost(sessionId, 'delete-entry-on-disk', { path });
    });

    socket.on('request-rename-entry', ({ sessionId, oldPath, newPath }) => {
      forwardToHost(sessionId, 'rename-entry-on-disk', { oldPath, newPath });
    });

    // Handle host status updates
    socket.on('set-host-status', ({ sessionId, isHost }) => {
      if (!sessionId) return;
      const roomUsers = activeRoomUsers.get(sessionId);
      if (roomUsers) {
        const userObj = roomUsers.get(socket.id);
        if (userObj) {
          userObj.isHost = isHost;
          // Broadcast updated room users
          io.to(sessionId).emit('room-users', Array.from(roomUsers.values()));
          logger.info(`User "${user.username}" host status updated to: ${isHost}`);
        }
      }
    });

    // Handle file tree updates from host
    socket.on('update-file-tree', async ({ sessionId, fileTree }) => {
      if (!sessionId) return;
      try {
        const redis = getRedis();
        await redis.set(`session:${sessionId}:filetree`, JSON.stringify(fileTree), 'EX', 7 * 24 * 60 * 60);
        socket.to(sessionId).emit('file-tree-updated', fileTree);
        logger.info(`Shared file tree updated for session ${sessionId}`);
      } catch (err) {
        logger.error(`Error saving shared file tree: ${err.message}`);
      }
    });

    // Handle guest request to write collaborative state back to host disk
    socket.on('request-save-to-disk', ({ sessionId, fileId }) => {
      if (!sessionId || !fileId) return;
      // Find the host socket in the session
      const sessionUsers = activeRoomUsers.get(sessionId);
      if (sessionUsers) {
        for (const [sid, u] of sessionUsers.entries()) {
          if (u.isHost) {
            io.to(sid).emit('save-file-to-disk', { fileId });
            logger.info(`Forwarded save-file-to-disk request for ${fileId} to host socket: ${sid}`);
            break;
          }
        }
      }
    });

    // Handle host providing file contents requested by a guest
    socket.on('provide-file-content', async ({ sessionId, fileId, content, requesterSocketId }) => {
      if (!sessionId || !fileId || !requesterSocketId) return;

      try {
        const fileRoom = `session:${sessionId}:file:${encodeURIComponent(fileId)}`;
        let ydoc = activeDocs.get(fileRoom);
        if (!ydoc) {
          ydoc = new Y.Doc();
          const ytext = ydoc.getText('codestate');
          ytext.insert(0, content || '');
          activeDocs.set(fileRoom, ydoc);

          // Save to Redis
          const redis = getRedis();
          const fullState = Y.encodeStateAsUpdate(ydoc);
          const base64State = Buffer.from(fullState).toString('base64');
          await redis.set(`${fileRoom}:yjs`, base64State, 'EX', 7 * 24 * 60 * 60);
          logger.info(`Created and initialized Yjs document for ${fileId} with host-provided content.`);
        }

        // Send state back to the requester guest
        const fullState = Y.encodeStateAsUpdate(ydoc);
        const base64State = Buffer.from(fullState).toString('base64');
        io.to(requesterSocketId).emit('file-session-joined', { fileId, yjsState: base64State });
      } catch (err) {
        logger.error(`Error saving provided content for file ${fileId}: ${err.message}`);
      }
    });

    // Handle joining a specific file's room channel
    socket.on('join-file', async ({ sessionId, fileId, initialContent }) => {
      if (!sessionId || !fileId) return;

      try {
        const fileRoom = `session:${sessionId}:file:${encodeURIComponent(fileId)}`;
        socket.join(fileRoom);
        logger.info(`User "${user.username}" joined file room: ${fileRoom}`);

        // Track active file users
        if (!activeFileUsers.has(fileRoom)) {
          activeFileUsers.set(fileRoom, new Map());
        }
        activeFileUsers.get(fileRoom).set(socket.id, {
          userId: user._id.toString(),
          username: user.username,
          avatarUrl: user.avatarUrl,
        });

        // Load or create Yjs document state for this file
        let ydoc = activeDocs.get(fileRoom);
        if (!ydoc) {
          const redis = getRedis();
          const storedState = await redis.get(`${fileRoom}:yjs`);
          
          ydoc = activeDocs.get(fileRoom);
          if (!ydoc) {
            if (storedState) {
              ydoc = new Y.Doc();
              const binaryState = Buffer.from(storedState, 'base64');
              Y.applyUpdate(ydoc, binaryState);
              logger.info(`Loaded Yjs document for file ${fileId} from Redis.`);
              activeDocs.set(fileRoom, ydoc);

              // Send state back to the user
              const fullState = Y.encodeStateAsUpdate(ydoc);
              const base64State = Buffer.from(fullState).toString('base64');
              socket.emit('file-session-joined', { fileId, yjsState: base64State });
            } else {
              // No saved state in Redis or memory.
              // Find host socket in the session (if requester is not the host itself)
              const sessionUsers = activeRoomUsers.get(sessionId);
              let hostSocketId = null;
              if (sessionUsers) {
                for (const [sid, u] of sessionUsers.entries()) {
                  if (u.isHost) {
                    hostSocketId = sid;
                    break;
                  }
                }
              }

              if (hostSocketId && hostSocketId !== socket.id) {
                // Requester is guest. Request content from host first.
                io.to(hostSocketId).emit('request-file-content', { fileId, requesterSocketId: socket.id });
                logger.info(`Requested file content for ${fileId} from host: ${hostSocketId}`);
              } else {
                // Requester is host or no host online. Initialize with initialContent.
                ydoc = new Y.Doc();
                if (initialContent) {
                  const ytext = ydoc.getText('codestate');
                  ytext.insert(0, initialContent);
                  logger.info(`Initialized fresh Yjs document for file ${fileId} with client's initialContent.`);
                  
                  // Persist the initialized document to Redis immediately
                  const fullState = Y.encodeStateAsUpdate(ydoc);
                  const base64State = Buffer.from(fullState).toString('base64');
                  await redis.set(`${fileRoom}:yjs`, base64State, 'EX', 7 * 24 * 60 * 60);
                } else {
                  logger.info(`Created fresh empty Yjs document for file ${fileId}.`);
                }
                activeDocs.set(fileRoom, ydoc);

                // Send state back to the user
                const fullState = Y.encodeStateAsUpdate(ydoc);
                const base64State = Buffer.from(fullState).toString('base64');
                socket.emit('file-session-joined', { fileId, yjsState: base64State });
              }
            }
          } else {
            // Document already in memory (but check storedState race)
            const fullState = Y.encodeStateAsUpdate(ydoc);
            const base64State = Buffer.from(fullState).toString('base64');
            socket.emit('file-session-joined', { fileId, yjsState: base64State });
          }
        } else {
          // Document already in memory
          const fullState = Y.encodeStateAsUpdate(ydoc);
          const base64State = Buffer.from(fullState).toString('base64');
          socket.emit('file-session-joined', { fileId, yjsState: base64State });
        }

        // Broadcast to main room that user opened this file
        io.to(sessionId).emit('open-file', { userId: user._id.toString(), username: user.username, fileId });
      } catch (error) {
        logger.error(`Error joining file ${fileId} for room ${sessionId}: ${error.message}`);
      }
    });

    // Handle leaving a specific file's room channel
    socket.on('leave-file', async ({ sessionId, fileId }) => {
      if (!sessionId || !fileId) return;

      try {
        const fileRoom = `session:${sessionId}:file:${encodeURIComponent(fileId)}`;
        socket.leave(fileRoom);
        logger.info(`User "${user.username}" left file room: ${fileRoom}`);

        // Clean up from active file users
        const fileUsers = activeFileUsers.get(fileRoom);
        if (fileUsers) {
          fileUsers.delete(socket.id);
          if (fileUsers.size === 0) {
            activeFileUsers.delete(fileRoom);
            activeDocs.delete(fileRoom);
            logger.info(`Cleaned up empty room Yjs document memory for file: ${fileRoom}`);
          }
        }

        // Broadcast to main room that user closed this file
        io.to(sessionId).emit('close-file', { userId: user._id.toString(), fileId });
      } catch (error) {
        logger.error(`Error leaving file ${fileId} for room ${sessionId}: ${error.message}`);
      }
    });

    // Handle Yjs document updates per file
    socket.on('yjs-update', async ({ sessionId, fileId, update }) => {
      if (!sessionId || !fileId || !update) return;

      try {
        const fileRoom = `session:${sessionId}:file:${encodeURIComponent(fileId)}`;
        const ydoc = activeDocs.get(fileRoom);
        if (ydoc) {
          const binaryUpdate = Buffer.from(update, 'base64');
          Y.applyUpdate(ydoc, binaryUpdate);

          // Broadcast the update to other users in the file room
          socket.to(fileRoom).emit('yjs-update', { fileId, update });

          // Save latest Yjs state back to Redis
          const redis = getRedis();
          const fullState = Y.encodeStateAsUpdate(ydoc);
          const base64State = Buffer.from(fullState).toString('base64');
          await redis.set(`${fileRoom}:yjs`, base64State, 'EX', 7 * 24 * 60 * 60);
        } else {
          logger.warn(`Received yjs-update for inactive file session ${fileRoom}`);
        }
      } catch (error) {
        logger.error(`Error processing yjs-update for file room ${fileId}: ${error.message}`);
      }
    });

    // Handle live cursor tracking movements per file
    socket.on('file-cursors', ({ sessionId, fileId, position }) => {
      if (!sessionId || !fileId || !position) return;
      const fileRoom = `session:${sessionId}:file:${encodeURIComponent(fileId)}`;
      socket.to(fileRoom).emit('file-cursors', {
        userId: user._id.toString(),
        username: user.username,
        avatarUrl: user.avatarUrl,
        fileId,
        position // { lineNumber, column }
      });
    });

    // Handle directory file created action
    socket.on('file-created', ({ sessionId, fileId, name, type }) => {
      if (!sessionId || !fileId) return;
      socket.to(sessionId).emit('file-created', { fileId, name, type });
    });

    // Handle directory file deleted action
    socket.on('file-deleted', ({ sessionId, fileId }) => {
      if (!sessionId || !fileId) return;
      socket.to(sessionId).emit('file-deleted', { fileId });
    });

    // Handle directory file renamed action
    socket.on('file-renamed', async ({ sessionId, oldFileId, newFileId }) => {
      if (!sessionId || !oldFileId || !newFileId) return;

      try {
        const redis = getRedis();
        const oldKey = `session:${sessionId}:file:${encodeURIComponent(oldFileId)}`;
        const newKey = `session:${sessionId}:file:${encodeURIComponent(newFileId)}`;

        // Rename Yjs state in Redis
        const val = await redis.get(`${oldKey}:yjs`);
        if (val) {
          await redis.set(`${newKey}:yjs`, val, 'EX', 7 * 24 * 60 * 60);
          await redis.del(`${oldKey}:yjs`);
        }

        // Rename Yjs document in active registry
        if (activeDocs.has(oldKey)) {
          activeDocs.set(newKey, activeDocs.get(oldKey));
          activeDocs.delete(oldKey);
        }

        // Rename active users in active registry
        if (activeFileUsers.has(oldKey)) {
          activeFileUsers.set(newKey, activeFileUsers.get(oldKey));
          activeFileUsers.delete(oldKey);
        }

        socket.to(sessionId).emit('file-renamed', { oldFileId, newFileId });
      } catch (err) {
        logger.error(`Error renaming file session in socket: ${err.message}`);
      }
    });

    // Handle manual/auto code saves triggering AI reviews for active file
    socket.on('save-code', async ({ sessionId, fileId }) => {
      if (!sessionId || !fileId) return;

      try {
        const fileRoom = `session:${sessionId}:file:${encodeURIComponent(fileId)}`;
        const ydoc = activeDocs.get(fileRoom);
        let code = '';
        if (ydoc) {
          code = ydoc.getText('codestate').toString();
        } else {
          // Fallback to Redis
          const redis = getRedis();
          const storedState = await redis.get(`${fileRoom}:yjs`);
          if (storedState) {
            const binaryState = Buffer.from(storedState, 'base64');
            const tempDoc = new Y.Doc();
            Y.applyUpdate(tempDoc, binaryState);
            code = tempDoc.getText('codestate').toString();
          }
        }

        if (!code || code.trim() === '') {
          code = '// Start coding here...';
        }

        // Resolve language based on extension
        const ext = fileId.split('.').pop().toLowerCase();
        let language = 'javascript';
        if (ext === 'py') language = 'python';
        else if (ext === 'cpp' || ext === 'h') language = 'cpp';
        else if (ext === 'json') language = 'json';
        else if (ext === 'md') language = 'markdown';
        else if (ext === 'html') language = 'html';
        else if (ext === 'css') language = 'css';

        // Add job to the AI Review Queue
        logger.info(`Adding AI code review job for file: ${fileId} in session: ${sessionId}`);
        addAIReviewJob({ sessionId, fileId, code, language });

      } catch (error) {
        logger.error(`Error handling save-code for room ${sessionId}: ${error.message}`);
      }
    });

    // Handle code execution runs for active file
    socket.on('run-code', async ({ sessionId, fileId }) => {
      if (!sessionId || !fileId) return;

      try {
        const fileRoom = `session:${sessionId}:file:${encodeURIComponent(fileId)}`;
        const ydoc = activeDocs.get(fileRoom);
        let code = '';
        if (ydoc) {
          code = ydoc.getText('codestate').toString();
        } else {
          // Fallback to Redis
          const redis = getRedis();
          const storedState = await redis.get(`${fileRoom}:yjs`);
          if (storedState) {
            const binaryState = Buffer.from(storedState, 'base64');
            const tempDoc = new Y.Doc();
            Y.applyUpdate(tempDoc, binaryState);
            code = tempDoc.getText('codestate').toString();
          }
        }

        if (!code || code.trim() === '') {
          code = '// Start coding here...';
        }

        // Resolve language based on extension
        const ext = fileId.split('.').pop().toLowerCase();
        let language = 'javascript';
        if (ext === 'py') language = 'python';
        else if (ext === 'cpp' || ext === 'h') language = 'cpp';

        // Emit run status back to the room
        io.to(sessionId).emit('run-status', { status: 'Running...' });

        // Add code execution job to queue
        logger.info(`Adding code execution job for file: ${fileId} in session ${sessionId}`);
        addExecutionJob({ sessionId, fileId, code, language });

      } catch (error) {
        logger.error(`Error handling run-code for room ${sessionId}: ${error.message}`);
        socket.emit('run-result', {
          stdout: '',
          stderr: `Execution trigger failed: ${error.message}`,
          time: '0 ms',
          memory: 'N/A',
          status: { description: 'Error' }
        });
      }
    });

    // Handle user disconnect lifecycle
    socket.on('disconnecting', () => {
      // Loop through all rooms the socket is currently member of
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          // Clean up main room
          const roomUsers = activeRoomUsers.get(room);
          if (roomUsers) {
            roomUsers.delete(socket.id);
            if (roomUsers.size === 0) {
              activeRoomUsers.delete(room);
              logger.info(`Cleaned up empty session registry for session: ${room}`);
            } else {
              io.to(room).emit('room-users', Array.from(roomUsers.values()));
            }
          }

          // Clean up file rooms
          if (room.includes(':file:')) {
            const fileUsers = activeFileUsers.get(room);
            if (fileUsers) {
              fileUsers.delete(socket.id);
              if (fileUsers.size === 0) {
                activeFileUsers.delete(room);
                activeDocs.delete(room);
                logger.info(`Cleaned up empty file room Yjs document memory: ${room}`);
              }
            }
          }
        }
      }
      logger.info(`WebSocket Disconnected: User "${user.username}" (Socket ID: ${socket.id})`);
    });
  });
};

export const getActiveSessions = () => {
  return Array.from(activeRoomUsers.keys());
};

export const getActiveSessionFiles = (sessionId) => {
  const files = [];
  const prefix = `session:${sessionId}:file:`;
  for (const key of activeDocs.keys()) {
    if (key.startsWith(prefix)) {
      const encodedFileId = key.substring(prefix.length);
      files.push(decodeURIComponent(encodedFileId));
    }
  }
  return files;
};

export const getSessionCode = async (sessionId, fileId = 'main.js') => {
  const fileRoom = `session:${sessionId}:file:${encodeURIComponent(fileId)}`;
  const ydoc = activeDocs.get(fileRoom);
  if (ydoc) {
    return ydoc.getText('codestate').toString();
  }
  const redis = getRedis();
  const storedState = await redis.get(`${fileRoom}:yjs`);
  if (storedState) {
    const binaryState = Buffer.from(storedState, 'base64');
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, binaryState);
    return tempDoc.getText('codestate').toString();
  }
  return '';
};

export const restoreSessionCode = async (sessionId, code, fileId = 'main.js') => {
  const fileRoom = `session:${sessionId}:file:${encodeURIComponent(fileId)}`;
  const ydoc = activeDocs.get(fileRoom);
  if (ydoc) {
    const ytext = ydoc.getText('codestate');
    ydoc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, code);
    });

    if (ioInstance) {
      ioInstance.to(fileRoom).emit('code-restored', { fileId, code });
    }

    const redis = getRedis();
    const fullState = Y.encodeStateAsUpdate(ydoc);
    const base64State = Buffer.from(fullState).toString('base64');
    await redis.set(`${fileRoom}:yjs`, base64State, 'EX', 7 * 24 * 60 * 60);
    return true;
  }

  // If session is not active in memory, set it directly in Redis
  const redis = getRedis();
  const tempDoc = new Y.Doc();
  const ytext = tempDoc.getText('codestate');
  ytext.insert(0, code);
  const fullState = Y.encodeStateAsUpdate(tempDoc);
  const base64State = Buffer.from(fullState).toString('base64');
  await redis.set(`${fileRoom}:yjs`, base64State, 'EX', 7 * 24 * 60 * 60);
  return true;
};
