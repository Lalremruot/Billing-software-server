import express from "express"
import { protect, superAdminOnly } from "../../middleware/protect.js";
import { createCashier, getAllCashiers, updateCashier, deleteCashier } from "./createCashier.js";

const router = express.Router()

router.post(
  "/create-cashier",
  protect,
  superAdminOnly,
  createCashier
);

router.get(
  "/all",
  protect,
  superAdminOnly,
  getAllCashiers
);

router.put(
  "/:id",
  protect,
  superAdminOnly,
  updateCashier
);

router.delete(
  "/:id",
  protect,
  superAdminOnly,
  deleteCashier
);

export default router
