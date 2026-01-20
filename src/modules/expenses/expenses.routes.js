import express from "express";
import { protect } from "../../middleware/protect.js";
import {
  createExpenseItem,
  getAllExpenseItems,
  updateExpenseItem,
  deleteExpenseItem,
} from "./expenses.controller.js";

const router = express.Router();

router.post("/v1", protect, createExpenseItem);
router.get("/v1", protect, getAllExpenseItems);
router.put("/v1/:id", protect, updateExpenseItem);
router.delete("/v1/:id", protect, deleteExpenseItem);

export default router;

