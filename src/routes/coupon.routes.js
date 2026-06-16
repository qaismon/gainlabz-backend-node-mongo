const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");
const couponCtrl = require("../controllers/coupon.controller");

router.post("/validate", auth, couponCtrl.validateCoupon);
router.post("/apply", auth, couponCtrl.applyCoupon);
router.get("/", auth, admin, couponCtrl.getAllCoupons);
router.post("/", auth, admin, couponCtrl.createCoupon);
router.delete("/:id", auth, admin, couponCtrl.deleteCoupon);

module.exports = router;
