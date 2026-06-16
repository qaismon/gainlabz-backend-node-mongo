const Coupon = require("../models/Coupon.model");

exports.createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const { code, amount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon code" });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.json({ success: false, message: "Coupon has expired" });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.json({ success: false, message: "Coupon usage limit reached" });
    }

    const discountAmount = (Number(amount) * coupon.discountPercent) / 100;

    res.json({ success: true, coupon, discountAmount, discountPercent: coupon.discountPercent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const coupon = await Coupon.findOneAndUpdate(
      { code: code.toUpperCase(), isActive: true },
      { $inc: { usedCount: 1 } },
      { new: true }
    );
    res.json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
