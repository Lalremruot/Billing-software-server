import express from "express";
import { protect, superAdminOnly } from "../../middleware/protect.js";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "./employee.controller.js";

const router = express.Router();

router.post("/", protect, superAdminOnly, createEmployee);
router.get("/", protect, superAdminOnly, getAllEmployees);
router.get("/:id", protect, superAdminOnly, getEmployeeById);
router.put("/:id", protect, superAdminOnly, updateEmployee);
router.delete("/:id", protect, superAdminOnly, deleteEmployee);

export default router;

