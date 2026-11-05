import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import statsRoutes from "./routes/stats.js";
import adminRoutes from "./routes/admin.js";
import reviewRoutes from "./routes/reviews.js";
import wishlistRoutes from "./routes/wishlist.js";
import paymentRoutes from "./routes/payment.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { initRealtime } from "./realtime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// serve uploaded product/shop images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// simple request log, handy for debugging the flow during dev
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "apnakirana-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api", productRoutes); // /api/shops, /api/products
app.use("/api/orders", orderRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/payment", paymentRoutes);

// Serve frontend static build if present (Unified production deployment)
const frontendDist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = createServer(app);
initRealtime(httpServer);

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n⚠️  PORT ${PORT} IS ALREADY IN USE!`);
    console.error(`A previous Node server process is currently running on port ${PORT}.`);
    console.error(`Run in PowerShell: Stop-Process -Name node -Force -ErrorAction SilentlyContinue\n`);
    process.exit(1);
  } else {
    console.error("Server error:", err);
  }
});

httpServer.listen(PORT, () => {
  console.log(`ApnaKirana backend running on http://localhost:${PORT}`);
  console.log(`Realtime (Socket.IO) attached to the same server.`);
});
