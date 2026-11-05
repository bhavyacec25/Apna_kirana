// services/socket.js
// One shared Socket.IO connection for the whole app. Vite's dev proxy
// only handles HTTP, not websockets, so we connect straight to the
// backend's origin (localhost:5000) — this works the same in dev and
// prod since we always know exactly where the backend lives.

import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false, transports: ["websocket", "polling"] });
  }
  return socket;
}

// Call once after login (or on app load if already logged in) so the
// backend knows which room to put this connection in.
export function joinRealtimeRoom({ role, phone, shopId }) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit("join", { role, phone, shopId });
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
