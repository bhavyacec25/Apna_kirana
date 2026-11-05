// realtime.js
// Thin wrapper around socket.io so routes can just call
// emitOrderCreated()/emitOrderStatusChanged() without needing to know
// about the socket server directly. Rooms scope broadcasts:
//   - "shop:<shopId>"     → shopkeepers watching their own shop's orders
//   - "customer:<phone>"  → a specific customer's own order updates
//   - "admin"             → admins watching everything platform-wide
//
// This is what replaces 8-second polling with instant updates: the
// frontend joins the relevant room right after login, and the backend
// emits into that room the moment something changes. The frontend
// still keeps a slow polling fallback too, in case a socket drops.

import { Server } from "socket.io";

let io = null;

export function initRealtime(httpServer) {
  io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.on("join", ({ role, phone, shopId }) => {
      if (role === "customer" && phone) socket.join(`customer:${phone}`);
      if (role === "shopkeeper" && shopId) socket.join(`shop:${shopId}`);
      if (role === "admin") socket.join("admin");
    });
  });

  return io;
}

export function emitOrderCreated(order) {
  if (!io) return;
  if (order.shopId) io.to(`shop:${order.shopId}`).emit("order:new", order);
  io.to("admin").emit("order:new", order);
}

export function emitOrderStatusChanged(order) {
  if (!io) return;
  io.to(`customer:${order.phone}`).emit("order:status", order);
  if (order.shopId) io.to(`shop:${order.shopId}`).emit("order:status", order);
  io.to("admin").emit("order:status", order);
}

export function emitOrderLocation(order) {
  if (!io) return;
  if (order.phone) io.to(`customer:${order.phone}`).emit("order:location", order);
  if (order.shopId) io.to(`shop:${order.shopId}`).emit("order:location", order);
  io.emit("order:location", order); // Global broadcast so tracking page receives live GPS without room drops
}

export function getIo() {
  return io;
}
