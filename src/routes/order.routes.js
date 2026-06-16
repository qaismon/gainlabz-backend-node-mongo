const express = require("express");
const router = express.Router();

const {
  placeOrder,
  getUserOrders,
  getAllOrders,
  cancelOrder,
  updateOrderStatus,
  placeOrderRazorpay,
  verifyRazorpay,
  reorder,
} = require("../controllers/order.controller");

const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

// --- USER ROUTES ---

// Standard Checkout (COD / UPI)
router.post("/", auth, placeOrder);

// Razorpay Checkout
router.post("/razorpay", auth, placeOrderRazorpay);
router.post("/verify-razorpay", auth, verifyRazorpay);

// Order History & Management
router.get("/my-orders", auth, getUserOrders);
router.post('/cancel', auth, cancelOrder);
router.post('/reorder/:orderId', auth, reorder);

// --- ADMIN ROUTES ---
router.get("/all", auth, admin, getAllOrders);
router.post("/status", auth, admin, updateOrderStatus);

module.exports = router;