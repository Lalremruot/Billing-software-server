import express from "express";
import { protect } from "../../middleware/protect.js";
import {
  createInventoryItem,
  getAllInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
} from "./inventory.controller.js";

const router = express.Router();

router.post("/v1", protect, createInventoryItem);
router.get("/v1", protect, getAllInventoryItems);
router.put("/v1/:id", protect, updateInventoryItem);
router.delete("/v1/:id", protect, deleteInventoryItem);

export default router;

