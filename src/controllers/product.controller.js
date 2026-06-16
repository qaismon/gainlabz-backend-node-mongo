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