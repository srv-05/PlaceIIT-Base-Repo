const express = require("express");
const router = express.Router();
const {
  getStats, getCompanies, addCompany, updateCompany,
  searchStudents, getCocos, assignCoco, removeCoco,
  uploadCompanyExcel, uploadShortlistExcel, uploadCocoRequirementsExcel, getUploadStatus,
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
router.get("/cocos", getCocos);
router.post("/assign-coco", assignCoco);
router.post("/remove-coco", removeCoco);
router.post("/upload/companies", upload.single("file"), uploadCompanyExcel);
router.post("/upload/shortlist", upload.single("file"), uploadShortlistExcel);
router.post("/upload/coordinator-requirements", upload.single("file"), uploadCocoRequirementsExcel);
router.get("/upload/:id", getUploadStatus);

module.exports = router;
