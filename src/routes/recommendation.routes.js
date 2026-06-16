const express = require("express");
const router = express.Router();
const recCtrl = require("../controllers/recommendation.controller");
const auth = require("../middleware/auth.middleware");

router.get("/user", auth, recCtrl.getUserRecommendations);
router.get("/product/:productId", recCtrl.getProductRecommendations);
router.get("/popular", recCtrl.getPopularProducts);

module.exports = router;
