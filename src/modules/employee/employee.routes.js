import express from "express";
import { protect, superAdminOnly } from "../../middleware/protect.js";
import {
  createEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
} from "./employee.controller.js";

const router = express.Router();

router.get("/v1", protect, superAdminOnly, getAllEmployees);
router.post("/v1", protect, superAdminOnly, createEmployee);
router.put("/v1/:id", protect, superAdminOnly, updateEmployee);
router.delete("/v1/:id", protect, superAdminOnly, deleteEmployee);

export default router;
