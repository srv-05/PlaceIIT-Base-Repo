const express = require("express");
const router = express.Router();
const {
  getProfile, updateProfile, getMyCompanies,
  joinQueue, joinWalkIn, getWalkIns, getQueuePosition,
  getNotifications, markNotifRead,
} = require("../controllers/student.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.use(protect, authorize("student"));

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/companies", getMyCompanies);
router.post("/queue/join", joinQueue);
router.post("/queue/walkin", joinWalkIn);
router.get("/queue/:companyId", getQueuePosition);
router.get("/walkins", getWalkIns);
router.get("/notifications", getNotifications);
router.put("/notifications/:id/read", markNotifRead);

module.exports = router;
