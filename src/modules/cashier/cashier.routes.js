import express from "express"
import { protect, superAdminOnly } from "../../middleware/protect.js";
import { createCashier } from "./createCashier.js";
import { getAllCashiers, deleteCashier, updateCashier } from "./cashier.controller.js";

const router = express.Router()

router.get("/v1", protect, superAdminOnly, getAllCashiers);
router.post("/create-cashier", protect, superAdminOnly, createCashier);
router.put("/v1/:id", protect, superAdminOnly, updateCashier);
router.delete("/v1/:id", protect, superAdminOnly, deleteCashier);

export default router
