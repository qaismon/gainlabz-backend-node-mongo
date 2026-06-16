const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const wishlistCtrl = require("../controllers/wishlist.controller");

router.use(auth);

router.get("/", wishlistCtrl.getWishlist);
router.get("/ids", wishlistCtrl.getWishlistIds);
router.post("/:productId", wishlistCtrl.addToWishlist);
router.delete("/:productId", wishlistCtrl.removeFromWishlist);

module.exports = router;
