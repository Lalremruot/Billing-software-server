import express from "express"
import { createProduct, getAllProduct, getProductById } from "./product.controller.js";
import { protect } from "../../middleware/protect.js";

const router = express.Router()



router.post("/v1", protect, createProduct)
router.get("/v1", protect, getAllProduct)
router.get("/v1/:id", protect, getProductById)


export default router
