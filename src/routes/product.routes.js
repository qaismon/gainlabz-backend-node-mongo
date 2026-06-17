const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const productController = require("../controllers/product.controller");

const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "jfif"],
    transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }]
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|jfif/;
    const ext = allowed.test(file.originalname.split(".").pop().toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// USER ROUTES
router.get("/suggest", productController.suggestProducts);
router.get("/search", productController.searchProducts);
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

// ADMIN ROUTES
router.post("/add", auth, admin, upload.single("image"), productController.addProduct);
router.post("/", auth, admin, upload.single("image"), productController.addProduct);
router.put("/:id", auth, admin, upload.single("image"), productController.updateProduct);
router.delete("/:id", auth, admin, productController.deleteProduct);

module.exports = router;