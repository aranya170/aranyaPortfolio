const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../../public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${Date.now()}_${baseName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // SVG is excluded on purpose: it can carry scripts
    const allowedExt = /^\.(jpe?g|png|webp|gif|pdf)$/;
    const allowedMime = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExt.test(ext) && allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (PNG, JPG, WEBP, GIF) and PDF files are allowed"));
    }
  },
});

const singleUpload = upload.single("file");

// Wrap multer so filter/size errors come back as JSON instead of Express's HTML error page
exports.uploadMiddleware = (req, res, next) => {
  singleUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

exports.handleUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  // Absolute URL, because the frontend is hosted on a different origin than the API
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  return res.json({
    success: true,
    message: "File uploaded successfully",
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
  });
};
