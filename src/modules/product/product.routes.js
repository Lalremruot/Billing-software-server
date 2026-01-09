import express from "express"
import { createProduct, getAllProduct, getProductById, updateProduct, deleteProduct } from "./product.controller.js";
import { protect, superAdminOnly } from "../../middleware/protect.js";

const router = express.Router()

router.post("/v1", protect, superAdminOnly, createProduct)
router.get("/v1", protect, superAdminOnly, getAllProduct)
router.get("/v1/:id", protect, superAdminOnly, getProductById)
router.put("/v1/:id", protect, superAdminOnly, updateProduct)
router.delete("/v1/:id", protect, superAdminOnly, deleteProduct)

export default router
