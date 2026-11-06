import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health" || req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", service: "apnakirana-showcase" }));
  }

  // Serve showcase landing page
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
  fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ApnaKirana showcase landing page running on port ${PORT}`);
});
