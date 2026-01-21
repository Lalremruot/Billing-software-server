import express from "express";
import { protect, checkPermission, identifyTenant } from "../../middleware/protect.js";
import {
  createQRCode,
  getAllQRCodes,
  getQRCodeById,
  getQRCodeByTableId,
  updateQRCode,
  deleteQRCode,
  getQRCodeByTableIdPublic,
} from "./qrcode.controller.js";
import {
  createMenuItem,
  getAllMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
} from "./menuitem.controller.js";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "./category.controller.js";
import { uploadUserLogo, uploadToMinio } from "../../middleware/upload.js";
import {
  createOrder,
  getAllOrders,
  getOrdersByTableId,
  getOrdersByTableIdPublic,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
} from "./order.controller.js";

const router = express.Router();

// QR Code routes - require authentication
router.post("/v1", protect, checkPermission("qrcodemenu:view"), createQRCode);
router.get("/v1", protect, checkPermission("qrcodemenu:view"), getAllQRCodes);
// router.get("/public/table/:tableId", identifyTenant, getQRCodeByTableId);
router.get("/v1/:id", protect,checkPermission("qrcodemenu:view"), getQRCodeById);
router.put("/v1/:id", protect, checkPermission("qrcodemenu:view"), updateQRCode);
router.delete("/v1/:id", protect, checkPermission("qrcodemenu:view"), deleteQRCode);
router.get("/public/table/:tableId", identifyTenant, getQRCodeByTableIdPublic);

// Public route to get QR code and menu by table ID (no auth required)
// router.get("/public/table/:tableId", getQRCodeByTableId);

// Category routes - require authentication
router.post("/category/v1", protect, checkPermission("qrcodemenu:view"), createCategory);
router.get("/category/v1", protect, checkPermission("qrcodemenu:view"), getAllCategories);
router.get("/category/v1/:id", protect, checkPermission("qrcodemenu:view"), getCategoryById);
router.put("/category/v1/:id", protect, checkPermission("qrcodemenu:view"), updateCategory);
router.delete("/category/v1/:id", protect, checkPermission("qrcodemenu:view"), deleteCategory);

// Menu Item routes - require authentication (with image upload)
router.post("/menu/v1", protect, checkPermission("qrcodemenu:view"), uploadUserLogo.single("image"), uploadToMinio, createMenuItem);
router.get("/menu/v1", protect, checkPermission("qrcodemenu:view"), getAllMenuItems);
router.get("/menu/v1/:id", protect, checkPermission("qrcodemenu:view"), getMenuItemById);
router.put("/menu/v1/:id", protect, checkPermission("qrcodemenu:view"), uploadUserLogo.single("image"), uploadToMinio, updateMenuItem);
router.delete("/menu/v1/:id", protect, checkPermission("qrcodemenu:view"), deleteMenuItem);

// Order routes
router.post("/order/v1", createOrder); // Public - no auth required
router.get("/order/public/table/:tableId", getOrdersByTableIdPublic); // Public - for customer order history
router.get("/order/v1", protect, checkPermission("qrcodemenu:view"), getAllOrders);
router.get("/order/v1/table/:tableId", protect, checkPermission("qrcodemenu:view"), getOrdersByTableId);
router.get("/order/v1/:id", protect, checkPermission("qrcodemenu:view"), getOrderById);
router.put("/order/v1/:id/status", protect, checkPermission("qrcodemenu:view"), updateOrderStatus);
router.delete("/order/v1/:id", protect, checkPermission("qrcodemenu:view"), deleteOrder);

export default router;

