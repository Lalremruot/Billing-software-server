import express from "express";
import { protect, superAdminOnly } from "../../middleware/protect.js";
import {
  createInventoryItem,
  getAllInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
} from "./inventory.controller.js";

const router = express.Router();

router.post("/", protect, superAdminOnly, createInventoryItem);
router.get("/", protect, superAdminOnly, getAllInventoryItems);
router.get("/:id", protect, superAdminOnly, getInventoryItemById);
router.put("/:id", protect, superAdminOnly, updateInventoryItem);
router.delete("/:id", protect, superAdminOnly, deleteInventoryItem);

export default router;

