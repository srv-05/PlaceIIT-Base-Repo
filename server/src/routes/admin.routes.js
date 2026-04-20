const express = require("express");
const router = express.Router();
const {
  getStats, getCompanies, addCompany, updateCompany,
  searchStudents, getCocos, addCoco, addStudent,
  assignCoco, removeCoco,
  uploadCompanyExcel, uploadShortlistExcel, uploadCocoExcel,
  uploadStudentExcel,
  uploadCocoRequirementsExcel, getUploadStatus, getStudentCompanies,
  shortlistStudents, getShortlistedStudents, autoAllocateCocos, getCocoConflicts, addApc, getApcs, removeApc, uploadApcExcel,
  deleteCoco, deleteStudent,
  getQueries, respondToQuery,
  getDriveState, updateDriveState, sendBroadcastNotification,
  getApcNotifications, markApcNotifRead, clearAllApcNotifications,
  updateApcProfile,
  deleteAllSubApcs, deleteAllStudents, deleteAllCocos,
  deleteAllCompanies, removeAllCocoAllocations
} = require("../controllers/admin.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const upload = require("../middlewares/excelUpload.middleware");

router.use(protect, authorize("admin"));

router.get("/stats", getStats);
router.get("/companies", getCompanies);
router.post("/companies", addCompany);
router.put("/companies/:id", updateCompany);
router.get("/students/search", searchStudents);
router.post("/students/shortlist", shortlistStudents);
router.post("/students", addStudent);
router.post("/apc", addApc);
router.get("/students/:id/companies", getStudentCompanies);
router.delete("/students/:id", deleteStudent);
router.get("/companies/:id/students", getShortlistedStudents);
router.get("/cocos", getCocos);
router.post("/cocos", addCoco);
router.post("/assign-coco", assignCoco);
router.post("/remove-coco", removeCoco);
router.delete("/cocos/:id", deleteCoco);
router.get("/apcs", getApcs);
router.post("/remove-apc", removeApc);
router.post("/upload/companies", protect, authorize("admin"), upload.single("file"), uploadCompanyExcel);
router.post("/upload/shortlist", protect, authorize("admin", "coco"), upload.single("file"), uploadShortlistExcel);
router.post("/upload/cocos", protect, authorize("admin"), upload.single("file"), uploadCocoExcel);
router.post("/upload/apcs", protect, authorize("admin"), upload.single("file"), uploadApcExcel);
router.post("/upload/students", protect, authorize("admin"), upload.single("file"), uploadStudentExcel);
router.post("/upload/coordinator-requirements", upload.single("file"), uploadCocoRequirementsExcel);
router.get("/upload/:id", getUploadStatus);
router.post("/auto-allocate-cocos", autoAllocateCocos);
router.get("/coco-conflicts", getCocoConflicts);
router.get("/queries", getQueries);
router.put("/queries/:id", respondToQuery);
router.get("/drive-state", getDriveState);
router.put("/drive-state", updateDriveState);
router.post("/broadcast-notification", sendBroadcastNotification);
router.get("/notifications", getApcNotifications);
router.put("/notifications/:id/read", markApcNotifRead);
router.delete("/notifications", clearAllApcNotifications);
router.put("/profile", updateApcProfile);

// Bulk reset endpoints
router.post("/reset/apcs", deleteAllSubApcs);
router.post("/reset/students", deleteAllStudents);
router.post("/reset/cocos", deleteAllCocos);
router.post("/reset/companies", deleteAllCompanies);
router.post("/reset/coco-allocations", removeAllCocoAllocations);

module.exports = router;
