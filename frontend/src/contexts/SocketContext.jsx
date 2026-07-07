/* eslint-disable react/only-export-components */
import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const getWsUrl = () => {
      const envUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8000';
      try {
        const urlObj = new URL(envUrl);
        if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
          if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            urlObj.hostname = window.location.hostname;
          }
        }
        return urlObj.toString().replace(/\/$/, '');
      } catch (e) {
        return envUrl;
      }
    };

    const wsUrl = getWsUrl();
    
    // Connect socket
    const socketInstance = io(wsUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // Allow fallback
    });

    socketInstance.on('connect', () => {
      console.log('Socket.IO connection established:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket.IO connection closed:', reason);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
