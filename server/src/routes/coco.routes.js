const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const {
  getAssignedCompany, getShortlistedStudents, addStudentToQueue,
  updateStudentStatus, sendNotification, toggleWalkIn,
  addPanel, getPanels, updatePanel, assignPanelStudent, clearPanel,
  getRounds, addRound, getPredefinedNotifications,
  searchAllStudents, addStudentToRound, uploadStudentsToRound,
  getCocoNotifications, markNotifRead, clearAllNotifications, addStudentToCompany,
  promoteStudentsViaExcel,
  getPendingRequests, acceptStudent, rejectStudent, markCompleted,
  updateCompanyVenue,
} = require("../controllers/coco.controller");
const { getStudentCompanies } = require("../controllers/admin.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.use(protect, authorize("coco"));

router.get("/company", getAssignedCompany);
router.get("/company/:companyId/students", getShortlistedStudents);
router.get("/company/:companyId/rounds", getRounds);
router.get("/company/:companyId/panels", getPanels);
router.get("/company/:companyId/pending", getPendingRequests);
router.put("/company/:companyId/walkin", toggleWalkIn);
router.put("/company/:companyId/venue", updateCompanyVenue);
router.post("/queue/add", addStudentToQueue);
router.put("/queue/status", updateStudentStatus);
router.put("/queue/accept", acceptStudent);
router.put("/queue/reject", rejectStudent);
router.put("/queue/complete", markCompleted);
router.post("/notify", sendNotification);
router.get("/notifications/predefined", getPredefinedNotifications);
router.get("/notifications", getCocoNotifications);
router.put("/notifications/:id/read", markNotifRead);
router.delete("/notifications", clearAllNotifications);
router.post("/panel", addPanel);
router.put("/panel/:id", updatePanel);
router.put("/panel/:id/assign", assignPanelStudent);
router.put("/panel/:id/clear", clearPanel);
router.post("/round", addRound);
router.post("/round/add-student", addStudentToRound);
router.post("/round/upload-students", upload.single("file"), uploadStudentsToRound);
router.post("/round/promote", upload.single("file"), promoteStudentsViaExcel);
router.get("/students/search", searchAllStudents);
router.get("/students/:id/companies", getStudentCompanies);
router.post("/company/add-student", addStudentToCompany);

module.exports = router;
