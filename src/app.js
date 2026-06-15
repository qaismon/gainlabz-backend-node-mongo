const express = require("express");
const cors = require("cors");
const path = require("path");
const userRoutes = require("./routes/user.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
app.use("/api/user", userRoutes);
app.use("/api/products", require("./routes/product.routes"));
app.use("/api/cart", require("./routes/cart.routes"));
app.use("/api/orders", require("./routes/order.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/reviews", require("./routes/review.routes"));

module.exports = app;