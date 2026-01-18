import express from "express"
import { createProduct, getAllProduct, getProductById, updateProduct, deleteProduct } from "./product.controller.js";
import { protect, checkPermission } from "../../middleware/protect.js";

const router = express.Router()

// Products routes - accessible to superadmins and cashiers with product:view permission
router.post("/v1", protect, checkPermission("product:view"), createProduct)
router.get("/v1", protect, checkPermission("product:view"), getAllProduct)
router.get("/v1/:id", protect, checkPermission("product:view"), getProductById)
router.put("/v1/:id", protect, checkPermission("product:view"), updateProduct)
router.delete("/v1/:id", protect, checkPermission("product:view"), deleteProduct)

export default router
