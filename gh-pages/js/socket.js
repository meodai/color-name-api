// Socket.io logic for real-time color updates
import { createColorObjectsFromData } from './physics.js';
import { elements } from './elements.js';
import { addColorsToVisualization } from './visualization.js'; // We'll modularize this next

let socket = null;
let isPageVisible = true;

export function initializeSocket() {
  try {
    socket = window.io('https://api.color.pizza', {
      transports: ['websocket'],
      reconnectionAttempts: 5
    });
    socket.on('connect', () => console.log('Connected to Socket.io server'));
    socket.on('disconnect', () => console.log('Disconnected from Socket.io server'));
    socket.on('colors', (msg) => {
      addColorsToVisualization(msg);
      if (isPageVisible) {
        createColorObjectsFromData(msg);
      }
    });
    socket.on('connect_error', (error) => console.error('Socket connection error:', error));
    if (!isPageVisible) {
      socket.wasConnected = true;
      socket.disconnect();
    }
  } catch (error) {
    console.error('Error initializing socket:', error);
  }
}

export function setPageVisibility(visible) {
  isPageVisible = visible;
  if (socket) {
    if (isPageVisible && socket.disconnected && socket.wasConnected) {
      socket.connect();
    } else if (!isPageVisible && socket.connected) {
      socket.wasConnected = true;
      socket.disconnect();
    }
  }
}
