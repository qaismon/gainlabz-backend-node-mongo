const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const {
  createReview,
  getProductReviews,
  getReviewStats,
  deleteReview,
  checkUserReview
} = require("../controllers/review.controller");
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "reviews",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    max_file_size: 5 * 1024 * 1024,
    transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }]
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(file.originalname.split(".").pop().toLowerCase());
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
