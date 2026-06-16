const Bundle = require("../models/Bundle.model");
const cloudinary = require("../config/cloudinary");

async function uploadToCloudinary(img) {
  if (typeof img === "string" && img.startsWith("data:")) {
    const result = await cloudinary.uploader.upload(img, { folder: "bundles" });
    return result.secure_url;
  }
  return img;
}

exports.createBundle = async (req, res) => {
  try {
    const data = { ...req.body };
    data.image = await uploadToCloudinary(data.image);
    const bundle = await Bundle.create(data);
    const populated = await bundle.populate("products.product");
    res.status(201).json({ success: true, bundle: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllBundles = async (req, res) => {
  try {
    const bundles = await Bundle.find().populate("products.product").sort({ createdAt: -1 });
    res.json({ success: true, bundles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getActiveBundles = async (req, res) => {
  try {
    const bundles = await Bundle.find({ isActive: true }).populate("products.product");
    res.json({ success: true, bundles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBundle = async (req, res) => {
  try {
    const data = { ...req.body };
    data.image = await uploadToCloudinary(data.image);
    const bundle = await Bundle.findByIdAndUpdate(req.params.id, data, { new: true }).populate("products.product");
    res.json({ success: true, bundle });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBundle = async (req, res) => {
  try {
    await Bundle.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
