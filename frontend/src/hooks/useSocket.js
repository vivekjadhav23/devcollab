import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export default function useSocket() {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    // Create socket connection injecting accessToken for handshake verification
    const socketInstance = io(socketUrl, {
      auth: {
        token: token
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'] // Enforce websocket connection directly
    });

    socketInstance.on('connect', () => {
      console.log(`Connected to collaborative WebSocket server: ${socketInstance.id}`);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection authentication error:', error.message);
    });

    setSocket(socketInstance);

    const handleBeforeUnload = () => {
      socketInstance.disconnect();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up socket connection on hook unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socketInstance.disconnect();
      console.log('Cleaned up WebSocket socket instance');
    };
  }, [token]);

  return socket;
}
