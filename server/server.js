const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { initDatabase } = require("./db/initDb");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
// FRONTEND_URL may hold a comma-separated list of extra origins
const allowedOrigins = [
  "https://aranyaportfolio.web.app",
  "https://aranyaportfolio.firebaseapp.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  ...(process.env.FRONTEND_URL || "").split(",").map((o) => o.trim()),
].filter(Boolean);

app.set("trust proxy", 1); // Render sits behind a proxy; needed for per-IP rate limiting

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server) or from an allowed site
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Static files for uploads & public assets
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));
app.use("/assets", express.static(path.join(__dirname, "../public/assets")));

// API router
app.use("/api", apiRoutes);

// Serve React frontend production build if available
const buildPath = path.join(__dirname, "../build");
const fs = require("fs");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path.startsWith("/assets")) {
      return next();
    }
    res.sendFile(path.join(buildPath, "index.html"));
  });
} else {
  // Root healthcheck fallback when build is not local
  app.get("/", (req, res) => {
    res.json({
      name: "Aranya Kishor Das Portfolio Backend",
      status: "online",
      documentation: "/api/health",
    });
  });
}

// Start server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 Portfolio Backend Server running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🛠️  Healthcheck:  http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);

  // Initialize DB tables and seed data if reachable
  try {
    await initDatabase(false);
  } catch (err) {
    console.error("Auto DB initialization notice:", err.message);
  }
});
