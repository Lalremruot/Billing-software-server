import { protect } from "../../middleware/protect.js";
import {
  createInvoice,
  deleteInvoice,
  getAllInvoice,
  getDashboardStats,
  getInvoiceById,
  getNextInvoiceNumber,
  getReports,
  updateInvoice,
} from "./invoice.controller.js";
import express from "express";


const router = express.Router()


router.post("/v1", protect, createInvoice);
router.get("/dashboard/v1", protect, getDashboardStats);
router.get("/all/v1", protect, getAllInvoice);
router.get("/reports/v1", protect, getReports);
router.get("/v1/:id", protect, getInvoiceById);
router.put("/v1/:id", protect, updateInvoice);
router.delete("/v1/:id", protect, deleteInvoice);
router.get("/next-number", protect, getNextInvoiceNumber);




export default router;