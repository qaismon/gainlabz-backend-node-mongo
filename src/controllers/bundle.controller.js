const Bundle = require("../models/Bundle.model");

exports.createBundle = async (req, res) => {
  try {
    const bundle = await Bundle.create(req.body);
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
    const bundle = await Bundle.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate("products.product");
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
