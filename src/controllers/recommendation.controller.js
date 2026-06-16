const Order = require("../models/Order.model");
const Product = require("../models/Product.model");

async function fetchPopularProducts(limit) {
  const popular = await Order.aggregate([
    { $match: { status: { $in: ["Delivered", "Paid", "Shipped"] } } },
    { $unwind: "$items" },
    { $match: { "items.product": { $ne: null } } },
    { $group: { _id: "$items.product", orderCount: { $sum: 1 } } },
    { $sort: { orderCount: -1 } },
    { $limit: limit }
  ]);

  const ids = popular.map(p => p._id);
  const products = await Product.find({ _id: { $in: ids } }).lean();
  return ids.map(id => products.find(p => String(p._id) === String(id))).filter(Boolean);
}

exports.getUserRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 8;

    const purchased = await Order.distinct("items.product", {
      user: userId,
      status: { $in: ["Delivered", "Paid", "Shipped"] }
    });

    const purchasedIds = purchased.filter(Boolean);

    if (purchasedIds.length === 0) {
      const products = await fetchPopularProducts(limit);
      return res.json({ success: true, products, strategy: "popularity" });
    }

    const userOrders = await Order.find({
      user: userId,
      status: { $in: ["Delivered", "Paid", "Shipped"] }
    }).lean();

    const seenCategories = {};
    for (const order of userOrders) {
      for (const item of order.items) {
        if (item.product) {
          try {
            const prod = await Product.findById(item.product).lean();
            if (prod && prod.category) {
              seenCategories[prod.category] = (seenCategories[prod.category] || 0) + item.quantity;
            }
          } catch {}
        }
      }
    }

    const topCategories = Object.entries(seenCategories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    const recommended = await Order.aggregate([
      { $match: { status: { $in: ["Delivered", "Paid", "Shipped"] } } },
      { $unwind: "$items" },
      { $match: { "items.product": { $nin: purchasedIds, $ne: null } } },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      { $match: { "productInfo.category": { $in: topCategories } } },
      { $group: { _id: "$items.product", score: { $sum: 1 }, product: { $first: "$productInfo" } } },
      { $sort: { score: -1 } },
      { $limit: limit }
    ]);

    res.json({ success: true, products: recommended.map(r => r.product), strategy: "user-based" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 4;
    const oid = require("mongoose").Types.ObjectId.createFromHexString(productId);

    const purchasedTogether = await Order.aggregate([
      { $match: { "items.product": oid, status: { $in: ["Delivered", "Paid", "Shipped"] } } },
      { $unwind: "$items" },
      { $match: { "items.product": { $ne: oid, $ne: null } } },
      { $group: { _id: "$items.product", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    const ids = purchasedTogether.map(p => p._id);
    const products = await Product.find({ _id: { $in: ids } }).lean();
    const ordered = ids.map(id => products.find(p => String(p._id) === String(id))).filter(Boolean);

    res.json({ success: true, products: ordered, strategy: "item-based" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPopularProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const products = await fetchPopularProducts(limit);
    res.json({ success: true, products, strategy: "popularity" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
