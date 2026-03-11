const express = require("express");
const router = express.Router();
const { getCompany, getCompanyQueue } = require("../controllers/company.controller");
const { protect } = require("../middlewares/auth.middleware");

router.use(protect);

router.get("/:id", getCompany);
router.get("/:id/queue", getCompanyQueue);

module.exports = router;
