const Product = require("../models/Product.model");
const cloudinary = require("../config/cloudinary");

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, results: [], totalCount: 0, page: 1, totalPages: 0 });
    }
    const query = q.trim();
    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Number(limit);

    // Tier 1: Atlas Search ($search aggregation)
    try {
      const pipeline = [
        {
          $search: {
            index: "default",
            compound: {
              should: [
                { autocomplete: { query, path: "name", tokenOrder: "any", fuzzy: { maxEdits: 2 } } },
                { autocomplete: { query, path: "description", tokenOrder: "any", fuzzy: { maxEdits: 1 } } }
              ]
            }
          }
        },
        { $match: { stock: { $gt: 0 } } },
        { $addFields: { score: { $meta: "searchScore" } } },
        { $sort: { score: -1 } },
        { $skip: skip },
        { $limit: limitNum }
      ];

      const countPipeline = [
        {
          $search: {
            index: "default",
            compound: {
              should: [
                { autocomplete: { query, path: "name", tokenOrder: "any", fuzzy: { maxEdits: 2 } } },
                { autocomplete: { query, path: "description", tokenOrder: "any", fuzzy: { maxEdits: 1 } } }
              ]
            }
          }
        },
        { $match: { stock: { $gt: 0 } } },
        { $count: "total" }
      ];

      const [results, countResult] = await Promise.all([
        Product.aggregate(pipeline),
        Product.aggregate(countPipeline)
      ]);

      const totalCount = countResult[0]?.total || 0;

      return res.json({
        success: true,
        results,
        totalCount,
        page: Number(page),
        totalPages: Math.ceil(totalCount / limitNum)
      });
    } catch (_) {}

    // Tier 2: $text search (MongoDB text index)
    try {
      const filter = { $text: { $search: query }, stock: { $gt: 0 } };
      const projection = { score: { $meta: "textScore" } };
      const [results, totalCount] = await Promise.all([
        Product.find(filter, projection).sort({ score: { $meta: "textScore" } }).skip(skip).limit(limitNum),
        Product.countDocuments(filter)
      ]);
      return res.json({
        success: true,
        results,
        totalCount,
        page: Number(page),
        totalPages: Math.ceil(totalCount / limitNum)
      });
    } catch (_) {}

    // Tier 3: $regex fallback (substring match)
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const filter = {
      $or: [
        { name: { $regex: regex } },
        { description: { $regex: regex } },
        { category: { $regex: regex } }
      ],
      stock: { $gt: 0 }
    };
    const [results, totalCount] = await Promise.all([
      Product.find(filter).skip(skip).limit(limitNum),
      Product.countDocuments(filter)
    ]);
    return res.json({
      success: true,
      results,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / limitNum)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.suggestProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ success: true, suggestions: [] });
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const results = await Product.find({ name: { $regex: regex }, stock: { $gt: 0 } })
      .select("name image price offerPrice onSale")
      .limit(5)
      .lean();
    res.json({ success: true, suggestions: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

async function uploadBase64ToCloudinary(imageArray) {
  if (!imageArray || !Array.isArray(imageArray)) return imageArray;
  const uploaded = await Promise.all(imageArray.map(async (img) => {
    if (typeof img === "string" && img.startsWith("data:")) {
      const result = await cloudinary.uploader.upload(img, { folder: "products" });
      return result.secure_url;
    }
    return img;
  }));
  return uploaded;
}

function parseProductData(body, file) {
  const data = { ...body };

  if (body.existingImages) {
    try {
      data.image = JSON.parse(body.existingImages);
    } catch {
      data.image = [];
    }
  }

  if (file) {
    data.image = [...(data.image || []), file.path];
  }

  if (!body.existingImages && !file && body.image) {
    try {
      data.image = typeof body.image === "string" ? JSON.parse(body.image) : body.image;
    } catch {
      data.image = [body.image];
    }
  }

  if (data.price) data.price = Number(data.price);
  if (data.stock) data.stock = Number(data.stock);
  if (data.bestseller) data.bestseller = data.bestseller === "true" || data.bestseller === true;

  if (typeof data.flavor === "string") {
    try {
      data.flavor = JSON.parse(data.flavor);
    } catch {
      data.flavor = data.flavor.split(",").map(f => f.trim()).filter(Boolean);
    }
  }

  return data;
}

exports.addProduct = async (req, res) => {
    try {
        const productData = parseProductData(req.body, req.file);
        if (productData.image) {
          productData.image = await uploadBase64ToCloudinary(productData.image);
        }
        const product = new Product(productData);
        await product.save();
        res.status(201).json({ success: true, message: "Product added" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createProduct = exports.addProduct;

exports.updateProduct = async (req, res) => {
    try {
        const productData = parseProductData(req.body, req.file);
        if (productData.image) {
          productData.image = await uploadBase64ToCloudinary(productData.image);
        }
        await Product.findByIdAndUpdate(req.params.id, productData);
        res.json({ success: true, message: "Product updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};