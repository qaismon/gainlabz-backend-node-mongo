# Gainlabz backend-node-mongo

 🚀 Gainlabz Backend API

A production-oriented REST API powering the Gainlabz e-commerce platform.
Built with Node.js, Express, and MongoDB, focusing on scalability, security, and real-world business logic.

🔥 What This Backend Actually Handles

This is not just CRUD — it manages:

- Authentication & authorization (JWT, role-based)
- Cart persistence (DB-based, flavor variants)
- Order lifecycle (COD / UPI / Razorpay)
- Payment verification (HMAC SHA256)
- Inventory management (atomic $inc on order/cancel)
- Admin control system (users, orders, products)
- **Product image upload to Cloudinary**
- **Review system with Cloudinary image upload**
- **Product recommendations** (user-based, item-based, popularity)
- **Full-text search** (Atlas Search → text index → Fuse.js fuzzy → regex)
- **Wishlist / Favorites**
- **Coupon / Discount Codes**
- **Bundle Deals**
- **One-Click Reorder**

⚙️ Tech Stack
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- bcrypt (password hashing)
- Razorpay (payment integration)
- Cloudinary (image uploads)

🧱 Architecture
MVC pattern (Controllers, Models, Routes)
Middleware-based auth system
Role-based access control (user/admin)
Modular and scalable folder structure

```
/src
  /controllers
  /models
  /routes
  /middleware
  /config
server.js
```

🔐 Authentication System
- JWT-based authentication (7-day expiry)
- Password hashing using bcrypt
- Role included in token (admin / user)

Endpoints
```
POST /api/auth/register
POST /api/auth/login
```

🛍️ Product APIs
```
Public
GET  /api/products
GET  /api/products/:id

Admin
POST   /api/products/add
PUT    /api/products/:id
DELETE /api/products/:id
```

Product images can be uploaded as Base64 in the JSON body. The controller uploads them to Cloudinary and stores the returned URL.

🛒 Cart APIs
- DB-based cart (not localStorage)
- Supports variants (flavor)
- Smart quantity merging

```
GET  /api/cart
POST /api/cart/add
POST /api/cart/remove
```

📦 Order APIs
```
User
POST /api/orders                     → Place order (COD / UPI)
POST /api/orders/razorpay            → Create Razorpay order
POST /api/orders/verify-razorpay     → Verify payment & save
GET  /api/orders/my-orders
POST /api/orders/cancel
POST /api/orders/reorder/:orderId    → One-click reorder

Admin
GET  /api/orders/all
POST /api/orders/status
```

**Reorder** — Copies items + deliveryData from a past Delivered order and creates a new COD order in a single request.

💳 Payment Flow (Razorpay)
1. Create order (amount → paise)
2. Complete payment on frontend
3. Verify signature (HMAC SHA256)
4. Store order in DB
- Prevents fake payments
- Ensures data integrity

📦 Inventory System (Key Feature)
- Stock is reduced on order placement
- Stock is restored on cancellation
- Uses atomic updates ($inc in Promise.all)

🖼️ Cloudinary Image Uploads
- **Products** — Images sent as Base64 data URLs in JSON body; controller calls `cloudinary.uploader.upload` with folder `products`
- **Reviews** — Images uploaded via `multer-storage-cloudinary` to folder `reviews`; existing `uploads/...` paths also supported
- **Bundles** — Same Base64 → Cloudinary pattern as products, folder `bundles`
- Allowed formats: jpeg, png, gif, webp, jfif

🌟 Full-Text Search
Four-tier search pipeline with automatic fallback:

| Tier | Method | Handles Typos? | When Used |
|------|--------|----------------|-----------|
| 1 | MongoDB Atlas Search `$search` | ✅ Fuzzy (maxEdits:2) | Deployed with Atlas Search index |
| 2 | MongoDB `$text` index | ❌ Stemming only | Any MongoDB with text index |
| 3 | **Fuse.js** (in-memory) | ✅ **Yes** (threshold 0.5) | Falls through when higher tiers return 0 |
| 4 | `$regex` substring match | ❌ | Last resort |

- **Autocomplete suggestions** — `GET /api/products/suggest?q=...` returns 5 results with name + image (uses Fuse.js fuzzy fallback)
- **"Did you mean?"** — Levenshtein distance analysis extracts the corrected term from product name tokens, shown when the query doesn't appear in any result name
- Paginated results with relevance scoring

```
GET /api/products/search?q=...&page=1&limit=20   → Full search with pagination
GET /api/products/suggest?q=...                   → Autocomplete (5 results)
```

**Resume highlight**: *"Built multi-tier full-text search with fuzzy typo tolerance using MongoDB Atlas Search, text indexes, and Fuse.js — handling corrections like 'whay' → 'whey' via Levenshtein distance"*

🌟 Product Recommendations
Three real-time aggregation strategies (no batch jobs):

1. **User-based** — Finds categories from the user's past orders, then fetches top-selling products in those categories
2. **Item-based ("Frequently Bought Together")** — For a given product, finds orders that also contained it and returns other products from those orders
3. **Popularity-based** — Global top sellers across all orders

```
GET /api/recommendations/user     → User-based (auth required)
GET /api/recommendations/item/:id → Item-based (public)
GET /api/recommendations/popular  → Popularity-based (public)
```

❤️ Wishlist / Favorites
- One document per user containing an array of product references
- Optimistic UI updates on the frontend

```
GET  /api/wishlist       → Get user's wishlist (with populated products)
GET  /api/wishlist/ids   → Get just the product IDs
POST /api/wishlist/add   → Add product
POST /api/wishlist/remove → Remove product
```

🎟️ Coupon / Discount Codes
- Code is stored uppercase (Mongoose `uppercase: true`)
- Supports discount percentage, max uses, and expiration date
- `usedCount` increments only on **successful order placement** (not on validation)

```
User
POST /api/coupons/validate   → Validate & calculate discount

Admin
POST   /api/coupons          → Create coupon
GET    /api/coupons          → List all coupons
DELETE /api/coupons/:id      → Delete coupon
```

📦 Bundle Deals
- Bundle contains name, description, image, array of {product, quantity}, discount percent
- Image supports file upload → Base64 → Cloudinary

```
Public
GET /api/bundles/active   → Only active bundles

Admin (auth required)
POST   /api/bundles       → Create bundle
GET    /api/bundles       → List all bundles
PUT    /api/bundles/:id   → Update bundle
DELETE /api/bundles/:id   → Delete bundle
```

👨‍💼 Admin APIs
```
GET    /api/users/list
DELETE /api/users/:id
PATCH  /api/users/update-role/:id
```

Reviews
```
GET    /api/reviews/product/:productId   → Public
POST   /api/reviews                      → Auth required
DELETE /api/reviews/:id                  → Only review author
```

🔐 Security
- JWT verification middleware
- Role-based route protection
- Password hashing
- Payment signature verification
- Review delete restricted to author

