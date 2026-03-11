const express = require("express");
const router = express.Router();
const { login, getMe, register } = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/register", protect, authorize("admin"), register);

module.exports = router;
