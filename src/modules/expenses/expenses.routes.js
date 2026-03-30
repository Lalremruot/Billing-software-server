import express from "express";
import { protect, checkPermission } from "../../middleware/protect.js";
import {
  createExpenseItem,
  getAllExpenseItems,
  updateExpenseItem,
  deleteExpenseItem,
} from "./expenses.controller.js";

const router = express.Router();

router.post("/v1", protect, checkPermission("expenses:create"), createExpenseItem);
router.get("/v1", protect, checkPermission("expenses:view"), getAllExpenseItems);
router.put("/v1/:id", protect, checkPermission("expenses:create"), updateExpenseItem);
router.delete("/v1/:id", protect, checkPermission("expenses:create"), deleteExpenseItem);

export default router;

