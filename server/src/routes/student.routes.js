const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  getProfile, updateProfile, getMyCompanies,
  joinQueue, joinWalkIn, leaveQueue, getWalkIns, getQueuePosition,
  getNotifications, markNotifRead, markAllNotifRead, clearAllNotifications,
  submitQuery, getMyQueries,
  uploadResume,
} = require("../controllers/student.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

// Multer config for PDF resume uploads
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/resumes/"),
  filename: (req, file, cb) => cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`),
});
const resumeUpload = multer({
  storage: resumeStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.use(protect, authorize("student"));

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/companies", getMyCompanies);
router.post("/queue/join", joinQueue);
router.post("/queue/walkin", joinWalkIn);
router.post("/queue/leave", leaveQueue);
router.get("/queue/:companyId", getQueuePosition);
router.get("/walkins", getWalkIns);
router.get("/notifications", getNotifications);
router.put("/notifications/read-all", markAllNotifRead);
router.put("/notifications/:id/read", markNotifRead);
router.delete("/notifications", clearAllNotifications);
router.post("/queries", submitQuery);
router.get("/queries", getMyQueries);
router.post("/resume", resumeUpload.single("resume"), uploadResume);

module.exports = router;
