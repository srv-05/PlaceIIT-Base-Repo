const express = require("express");
const router = express.Router();
const { getQueue, updateQueueStatus } = require("../controllers/queue.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.use(protect);

router.get("/:companyId", getQueue);
router.put("/status", authorize("coco", "admin"), updateQueueStatus);

module.exports = router;
