const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");
const bundleCtrl = require("../controllers/bundle.controller");

router.get("/active", bundleCtrl.getActiveBundles);
router.get("/", auth, admin, bundleCtrl.getAllBundles);
router.post("/", auth, admin, bundleCtrl.createBundle);
router.put("/:id", auth, admin, bundleCtrl.updateBundle);
router.delete("/:id", auth, admin, bundleCtrl.deleteBundle);

module.exports = router;
