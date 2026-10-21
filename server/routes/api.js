const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");
const authController = require("../controllers/authController");
const portfolioController = require("../controllers/portfolioController");
const adminController = require("../controllers/adminController");
const contactController = require("../controllers/contactController");
const uploadController = require("../controllers/uploadController");
const { testConnection, getConnectionStatus } = require("../config/db");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts. Please try again later.",
});
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many messages. Please try again later.",
});

// ==================== PUBLIC ENDPOINTS ====================
router.get("/health", async (req, res) => {
  const isDbConnected = await testConnection();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    postgres: { connected: isDbConnected },
  });
});

// Detailed DB diagnostics are for the admin only
router.get("/admin/health", authenticateToken, async (req, res) => {
  const isDbConnected = await testConnection();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    postgres: {
      connected: isDbConnected,
      ...getConnectionStatus(),
    },
  });
});

router.get("/portfolio", portfolioController.getPortfolioData);
router.post("/contact", contactLimiter, contactController.submitContactMessage);

// ==================== AUTH ENDPOINTS ====================
router.post("/auth/login", authLimiter, authController.login);
router.post("/auth/register", authLimiter, authController.register);
router.get("/auth/me", authenticateToken, authController.me);
router.post("/auth/change-password", authenticateToken, authController.changePassword);

// ==================== PROTECTED ADMIN ENDPOINTS ====================
// Stats & DB management
router.get("/admin/stats", authenticateToken, adminController.getStats);
router.post("/admin/reseed", authenticateToken, adminController.reseedDatabase);

// Sector 1: Intro / Site Profile
router.put("/admin/intro", authenticateToken, adminController.updateSiteProfile);

// Sector 2: About
router.put("/admin/about", authenticateToken, adminController.updateAbout);

// Sector 3: Projects
router.get("/admin/projects", authenticateToken, adminController.getProjects);
router.post("/admin/projects", authenticateToken, adminController.createProject);
router.put("/admin/projects/:id", authenticateToken, adminController.updateProject);
router.delete("/admin/projects/:id", authenticateToken, adminController.deleteProject);

// Sector 4: Experience
router.get("/admin/experiences", authenticateToken, adminController.getExperiences);
router.post("/admin/experiences", authenticateToken, adminController.createExperience);
router.put("/admin/experiences/:id", authenticateToken, adminController.updateExperience);
router.delete("/admin/experiences/:id", authenticateToken, adminController.deleteExperience);

// Sector 5: Timeline
router.get("/admin/timeline", authenticateToken, adminController.getTimeline);
router.post("/admin/timeline", authenticateToken, adminController.createTimelineEvent);
router.put("/admin/timeline/:id", authenticateToken, adminController.updateTimelineEvent);
router.delete("/admin/timeline/:id", authenticateToken, adminController.deleteTimelineEvent);

// Sector 6: Tech Stack
router.get("/admin/techstack", authenticateToken, adminController.getTechStack);
router.post("/admin/techstack", authenticateToken, adminController.createTechStackItem);
router.put("/admin/techstack/:id", authenticateToken, adminController.updateTechStackItem);
router.delete("/admin/techstack/:id", authenticateToken, adminController.deleteTechStackItem);

// Sector 7: Messages
router.get("/admin/messages", authenticateToken, adminController.getMessages);
router.put("/admin/messages/:id/read", authenticateToken, adminController.markMessageRead);
router.delete("/admin/messages/:id", authenticateToken, adminController.deleteMessage);

// Sector 8: Settings
router.get("/admin/settings", authenticateToken, adminController.getSettings);
router.put("/admin/settings", authenticateToken, adminController.updateSettings);

// File / Asset Upload
router.post("/admin/upload", authenticateToken, uploadController.uploadMiddleware, uploadController.handleUpload);

module.exports = router;
