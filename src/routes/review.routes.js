const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  createReview,
  getProductReviews,
  getReviewStats,
  deleteReview,
  checkUserReview
} = require("../controllers/review.controller");
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

const uploadDir = path.resolve(process.cwd(), "uploads", "reviews");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

router.post("/", auth, upload.array("images", 5), createReview);
router.get("/:productId", getProductReviews);
router.get("/:productId/stats", getReviewStats);
router.get("/:productId/check", auth, checkUserReview);
router.delete("/:id", auth, deleteReview);

module.exports = router;
