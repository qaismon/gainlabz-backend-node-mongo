# Gainlabz backend-node-mongo

 🚀 Gainlabz Backend API

A production-oriented REST API powering the Gainlabz e-commerce platform.
Built with Node.js, Express, and MongoDB, focusing on scalability, security, and real-world business logic.

🔥 What This Backend Actually Handles

This is not just CRUD — it manages:

Authentication & authorization
Cart persistence
Order lifecycle
Payment verification
Inventory management
Admin control system
⚙️ Tech Stack
Node.js
Express.js
MongoDB (Mongoose)
JWT Authentication
bcrypt (password hashing)
Razorpay (payment integration)
🧱 Architecture
MVC pattern (Controllers, Models, Routes)
Middleware-based auth system
Role-based access control (user/admin)
Modular and scalable folder structure
/src
  /controllers
  /models
  /routes
  /middleware
  /config
server.js
🔐 Authentication System
JWT-based authentication (7-day expiry)
Password hashing using bcrypt
Role included in token (admin / user)
Endpoints
POST /api/auth/register
POST /api/auth/login
🛍️ Product APIs
Public
GET /api/products
GET /api/products/:id
Admin
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
🛒 Cart APIs
DB-based cart (not localStorage)
Supports variants (flavor)
Smart quantity merging
GET  /api/cart
POST /api/cart/add
POST /api/cart/remove
📦 Order APIs
User
POST /api/orders                → Place order (COD / UPI)
POST /api/orders/razorpay       → Create Razorpay order
POST /api/orders/verify-razorpay → Verify payment

GET  /api/orders/my-orders
POST /api/orders/cancel
Admin
GET  /api/orders/all
POST /api/orders/status
💳 Payment Flow (Razorpay)
Create order (amount → paise)
Complete payment on frontend
Verify signature (HMAC SHA256)
Store order in DB

✔ Prevents fake payments
✔ Ensures data integrity

📦 Inventory System (Key Feature)
Stock is reduced on order placement
Stock is restored on cancellation
Uses atomic updates ($inc)


👨‍💼 Admin APIs
GET    /api/users/list
DELETE /api/users/:id
PATCH  /api/users/update-role/:id
🔐 Security
JWT verification middleware
Role-based route protection
Password hashing
Payment signature verification

