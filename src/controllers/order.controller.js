const Order = require("../models/Order.model");
const User = require("../models/User.model");
const Product = require("../models/Product.model");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpayInstance = new Razorpay({
    key_id: process.env.VITE_RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


/**
 * Helper to update stock levels
 * @param {Array} items - The items array from the order
 * @param {Number} multiplier - Use -1 to reduce stock, 1 to restore it
 */
const updateInventory = async (items, multiplier) => {
    // Use Promise.all so we wait for every single item to update in the DB
    await Promise.all(items.map(async (item) => {
        try {
            const productId = new mongoose.Types.ObjectId(item.product);
            
            // This is the magic line: 
            // If multiplier is -1, change is negative. If 1, change is positive.
            const stockChange = Number(item.quantity) * multiplier;

            console.log(`INVENTORY UPDATE: Product ${productId} | Change: ${stockChange}`);

            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                { $inc: { stock: stockChange } }, // Increment by the calculated change
                { new: true, runValidators: true }
            );

            if (updatedProduct) {
                console.log(`SUCCESS: ${updatedProduct.name} stock is now ${updatedProduct.stock}`);
            } else {
                console.error(`FAILURE: Product ID ${item.product} not found.`);
            }
        } catch (err) {
            console.error(`CRITICAL ERROR for product ${item.product}:`, err.message);
        }
    }));
};

// --- RAZORPAY INITIALIZATION ---
exports.placeOrderRazorpay = async (req, res) => {
    try {
        const { amount } = req.body;
        const options = {
            amount: Math.round(Number(amount) * 100),
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };
        const order = await razorpayInstance.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- RAZORPAY VERIFICATION & DB SAVE ---
exports.verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, formData, items, amount } = req.body;
        const userId = req.user.id || req.user._id;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        const formattedItems = items.map(item => ({
            product: new mongoose.Types.ObjectId(item.product),
            name: item.name,
            flavor: item.flavor || "Default",
            price: Number(item.price),
            quantity: Number(item.quantity)
        }));

        const newOrder = new Order({
            user: new mongoose.Types.ObjectId(userId),
            items: formattedItems,
            amount: Number(amount),
            payment: "Paid",
            deliveryData: formData,
            status: "Pending",
            date: Date.now()
        });

        await newOrder.save();
        
        // REDUCE STOCK
        await updateInventory(formattedItems, -1);

        await User.findByIdAndUpdate(userId, { cartData: {} });
        res.status(201).json({ success: true, message: "Order placed and stock updated." });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- ORIGINAL PLACE ORDER (COD / UPI) ---
exports.placeOrder = async (req, res) => {
    try {
        const { items, amount, payment, upiId, deliveryData } = req.body;
        const userId = req.user.id || req.user._id;

        // 1. Pre-check Stock
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product || product.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for ${item.name}` });
            }
        }

        const formattedItems = items.map(item => ({
            product: new mongoose.Types.ObjectId(item.product), 
            name: item.name,
            flavor: item.flavor || "Default",
            price: Number(item.price),
            quantity: Number(item.quantity)
        }));

        const newOrder = new Order({
            user: new mongoose.Types.ObjectId(userId),
            items: formattedItems,
            amount: Number(amount),
            payment: payment,
            upiId: upiId || null,
            deliveryData: deliveryData,
            status: "Pending", 
        });

        await newOrder.save();

        // 2. REDUCE STOCK
        await updateInventory(formattedItems, -1);

        await User.findByIdAndUpdate(userId, { cartData: {} });
        res.status(201).json({ success: true, message: "Order placed successfully" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Database Error: " + error.message });
    }
};

// --- CANCEL ORDER (WITH STOCK RESTORATION) ---
// --- REORDER (ONE-CLICK) ---
exports.reorder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id;

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) return res.status(404).json({ success: false, message: "Order not found" });
    if (existingOrder.user.toString() !== userId.toString()) return res.status(401).json({ success: false, message: "Unauthorized" });

    const newOrder = new Order({
      user: existingOrder.user,
      items: existingOrder.items.map(item => ({
        product: item.product,
        name: item.name,
        flavor: item.flavor,
        price: item.price,
        quantity: item.quantity
      })),
      amount: existingOrder.amount,
      payment: "COD",
      deliveryData: existingOrder.deliveryData,
      status: "Pending"
    });

    await newOrder.save();
    res.status(201).json({ success: true, message: "Order re-placed successfully", order: newOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user.id || req.user._id;
        const order = await Order.findById(orderId);

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });
        if (order.user.toString() !== userId.toString()) return res.status(401).json({ success: false, message: "Unauthorized" });

        if (["Shipped", "Delivered", "Cancelled"].includes(order.status)) {
            return res.status(400).json({ success: false, message: "Cannot cancel this order." });
        }

        // RESTORE STOCK
        await updateInventory(order.items, 1);

        order.status = "Cancelled";
        await order.save();
        res.json({ success: true, message: "Order cancelled and stock restored" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- ADMIN / USER GETTERS ---
exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const orders = await Order.find({ user: userId }).sort({ date: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 }); 
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        await Order.findByIdAndUpdate(orderId, { status });
        res.json({ success: true, message: "Status Updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};