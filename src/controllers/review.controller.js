const Review = require("../models/Review.model");
const Order = require("../models/Order.model");
const fs = require("fs");
const path = require("path");

exports.createReview = async (req, res) => {
  try {
    const { product, rating, title, comment } = req.body;

    const existing = await Review.findOne({ product, user: req.user.id });
    if (existing) {
      return res.status(400).json({ success: false, message: "You have already reviewed this product" });
    }

    const hasOrdered = await Order.findOne({
      user: req.user.id,
      "items.product": product,
      status: { $in: ["Delivered", "Paid", "Shipped"] }
    });

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(f => `uploads/reviews/${f.filename}`);
    }

    const review = new Review({
      product,
      user: req.user.id,
      rating,
      title,
      comment,
      images,
      verifiedPurchase: !!hasOrdered
    });

    await review.save();

    const populated = await Review.findById(review._id)
      .populate("user", "name")
      .lean();

    res.status(201).json({ success: true, review: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || "newest";

    let sortObj = { createdAt: -1 };
    if (sort === "highest") sortObj = { rating: -1, createdAt: -1 };
    if (sort === "lowest") sortObj = { rating: 1, createdAt: -1 };

    const total = await Review.countDocuments({ product: productId });
    const reviews = await Review.find({ product: productId })
      .populate("user", "name")
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReviewStats = async (req, res) => {
  try {
    const { productId } = req.params;

    const stats = await Review.aggregate([
      { $match: { product: require("mongoose").Types.ObjectId.createFromHexString(productId) } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const total = stats.reduce((acc, s) => acc + s.count, 0);
    const avgRating = total > 0
      ? stats.reduce((acc, s) => acc + s._id * s.count, 0) / total
      : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats.forEach(s => { distribution[s._id] = s.count; });

    res.json({
      success: true,
      stats: {
        average: Math.round(avgRating * 10) / 10,
        total,
        distribution
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    if (review.images && review.images.length > 0) {
      review.images.forEach(imgPath => {
        const fullPath = path.resolve(process.cwd(), imgPath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      });
    }

    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkUserReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const review = await Review.findOne({ product: productId, user: req.user.id }).lean();
    res.json({ success: true, hasReviewed: !!review, review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
