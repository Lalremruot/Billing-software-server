import QRCodeModel from "./qrcode.model.js";
import MenuItemModel from "./menuitem.model.js";
import OrderModel from "./order.model.js";
import UserModel from "../user/user.model.js";
import QRCode from "qrcode";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get target user ID (similar to product controller)
const getTargetUserId = async (req) => {
  let targetUserId = req.user.id;

  if (req.user.role === "cashier") {
    let cashierBusinessName = req.user.businessName;

    if (!cashierBusinessName) {
      const cashierDoc = await UserModel.findById(req.user.id).select("businessName");
      cashierBusinessName = cashierDoc?.businessName;
    }

    if (!cashierBusinessName || (typeof cashierBusinessName === 'string' && cashierBusinessName.trim() === '')) {
      return null;
    }

    const normalizedBusinessName = String(cashierBusinessName).trim();
    const businessOwner = await UserModel.findOne({
      role: "superadmin",
      businessName: normalizedBusinessName
    });

    if (businessOwner && businessOwner._id) {
      targetUserId = businessOwner._id;
    } else {
      return null;
    }
  }

  return targetUserId;
};

// Create QR Code
export const createQRCode = async (req, res) => {
  try {
    const { tableName } = req.body;

    if (!tableName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Table name is required",
      });
    }

    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Business owner not found. Cannot create QR code.",
      });
    }

    // Create QR entry (tableId auto-generated)
    const qrcode = new QRCodeModel({
      user: targetUserId,
      tableName: tableName.trim(),
    });

    const savedQRCode = await qrcode.save();

    // 🟢 Fetch owner to get custom domain
    let frontendUrl = null;
    const owner = await UserModel.findById(targetUserId).select("domain");
    
    if (process.env.DEV_MODE === "true") {
      frontendUrl = "http://192.168.29.110:9000";
    } else if (owner?.domain && owner.domain.trim() !== "") {
      frontendUrl = `https://${owner.domain.trim()}`;
    } else {
      const urls = process.env.CLIENT_URL?.split(",").map(u => u.trim());
      frontendUrl = urls?.[0] || "https://lamkabill.netlify.app";
    }
    
    frontendUrl = frontendUrl.replace(/\/+$/, "");
    // Final QR link
    const qrCodeData = `${frontendUrl}/public/table/${savedQRCode.tableId}`;

    console.log("Generated QR Code →", qrCodeData);

    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      width: 300,
    });

    savedQRCode.qrCodeUrl = qrCodeDataUrl;
    const finalQRCode = await savedQRCode.save();

    return res.status(201).json({
      success: true,
      message: "QR code created successfully",
      qrcode: finalQRCode,
    });

  } catch (error) {
    console.error("Error creating QR code:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create QR code",
    });
  }
};


export const getQRCodeByTableIdPublic = async (req, res) => {
  try {
    const { tableId } = req.params;

    // Get QR code and populate restaurant info
    const qrcode = await QRCodeModel.findOne({ tableId })
      .populate({
        path: "user",
        select: "businessName logo role",
      });

    if (!qrcode) {
      return res.status(404).json({ success: false, message: "QR code not found" });
    }

    // Determine target user (superadmin)
    let targetUserId = qrcode.user._id;
    if (qrcode.user.role === "cashier") {
      const superadmin = await UserModel.findOne({
        role: "superadmin",
        businessName: qrcode.user.businessName,
      });
      if (superadmin) targetUserId = superadmin._id;
    }

    // Get menu items and populate category names
    const menuItems = await MenuItemModel.find({ user: targetUserId, isAvailable: true })
      .populate({
        path: "category",
        select: "name",
      })
      .sort({ "category.name": 1, createdAt: -1 });

    res.json({
      success: true,
      qrcode,
      menuItems,
    });
  } catch (err) {
    console.error("Error fetching QR code public:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// Get all QR Codes
export const getAllQRCodes = async (req, res) => {
  try {
    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(200).json({
        success: true,
        message: "All QR codes fetched successfully",
        qrcodes: [],
      });
    }

    const qrcodes = await QRCodeModel.find({ user: targetUserId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "All QR codes fetched successfully",
      qrcodes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch QR codes",
      error: error.message,
    });
  }
};

// Get QR Code by ID
export const getQRCodeById = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = await getTargetUserId(req);

    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "QR code not found",
      });
    }

    const qrcode = await QRCodeModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!qrcode) {
      return res.status(404).json({
        success: false,
        message: "QR code not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "QR code fetched successfully",
      qrcode,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch QR code",
      error: error.message,
    });
  }
};

// Get QR Code by Table ID (public endpoint)
export const getQRCodeByTableId = async (req, res) => {
  try {
    const { tableId } = req.params;

    console.log("Public endpoint called with tableId:", tableId);

    if (!tableId || !tableId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Table ID is required",
      });
    }

    const qrcode = await QRCodeModel.findOne({
      tableId: tableId.trim(),
      isActive: true
    }).populate("user", "businessName logo");

    if (!qrcode) {
      console.log("QR code not found for tableId:", tableId.trim());
      return res.status(404).json({
        success: false,
        message: "QR code not found or inactive",
      });
    }

    // Get menu items for this restaurant (all QR codes share the same menu)
    const menuItems = await MenuItemModel.find({
      user: qrcode.user._id,
      isAvailable: true
    })
      .populate("category", "name")
      .sort({ "category.name": 1, createdAt: -1 });

    console.log("Found QR code and", menuItems.length, "menu items");

    return res.status(200).json({
      success: true,
      message: "QR code and menu fetched successfully",
      qrcode: {
        tableId: qrcode.tableId,
        tableName: qrcode.tableName,
        restaurant: {
          businessName: qrcode.user.businessName,
          logo: qrcode.user.logo,
        },
      },
      menuItems,
    });
  } catch (error) {
    console.error("Error in getQRCodeByTableId:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch QR code",
      error: error.message,
    });
  }
};

// Update QR Code
export const updateQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { tableName, isActive } = req.body;

    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "QR code not found",
      });
    }

    const qrcode = await QRCodeModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!qrcode) {
      return res.status(404).json({
        success: false,
        message: "QR code not found",
      });
    }

    // Only allow updating tableName and isActive (tableId is auto-generated and cannot be changed)
    if (tableName && tableName.trim()) {
      qrcode.tableName = tableName.trim();
    }

    if (isActive !== undefined) {
      qrcode.isActive = isActive;
    }

    // Regenerate QR code if URL is missing or malformed (check for double slashes or malformed URLs)
    let frontendUrl = process.env.CLIENT_URL;
    if (frontendUrl && (!qrcode.qrCodeUrl || qrcode.qrCodeUrl.trim() === "" || qrcode.qrCodeUrl.includes("//menu"))) {
      // Clean and normalize URL: remove commas, trim, remove trailing slashes
      frontendUrl = frontendUrl.split(',')[0].trim().replace(/\/+$/, '');

      // Validate URL format
      if (!frontendUrl.match(/^https?:\/\//)) {
        return res.status(500).json({
          success: false,
          message: `Invalid CLIENT_URL format: "${frontendUrl}". Cannot regenerate QR code.`,
        });
      }

      const normalizedUrl = frontendUrl;
      const qrCodeData = `${normalizedUrl}/menu/${qrcode.tableId}`;

      console.log("Regenerating QR code with URL:", normalizedUrl);
      console.log("QR code data:", qrCodeData);

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
        errorCorrectionLevel: "M",
        type: "image/png",
        quality: 0.92,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 300,
      });

      qrcode.qrCodeUrl = qrCodeDataUrl;
    }

    const updatedQRCode = await qrcode.save();

    return res.status(200).json({
      success: true,
      message: "QR code updated successfully",
      qrcode: updatedQRCode,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update QR code",
      error: error.message,
    });
  }
};

// Delete QR Code
export const deleteQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = await getTargetUserId(req);

    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "QR code not found",
      });
    }

    const qrcode = await QRCodeModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!qrcode) {
      return res.status(404).json({
        success: false,
        message: "QR code not found",
      });
    }

    await QRCodeModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "QR code deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete QR code",
      error: error.message,
    });
  }
};

