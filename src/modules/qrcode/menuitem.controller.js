import mongoose from "mongoose";
import MenuItemModel from "./menuitem.model.js";
import CategoryModel from "./category.model.js";
import UserModel from "../user/user.model.js";

// Helper function to get target user ID
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

// Create Menu Item
export const createMenuItem = async (req, res) => {
  try {
    // When using multer with FormData, fields are in req.body
    const itemName = req.body.itemName;
    const price = req.body.price;
    const category = req.body.category;
    const description = req.body.description;

    console.log("Create Menu Item - Request body:", req.body);
    console.log("Category type:", typeof category, "Category value:", category);
    console.log("All body keys:", Object.keys(req.body));

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Item name is required",
      });
    }

    if (price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    // Convert category to string and validate that it's a valid ObjectId
    const categoryId = String(category || "").trim();
    console.log("Category ID after conversion:", categoryId, "Length:", categoryId.length);
    
    if (!categoryId || categoryId === "") {
      return res.status(400).json({
        success: false,
        message: "Category is required. Please select a category.",
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.error("Invalid ObjectId format:", categoryId);
      return res.status(400).json({
        success: false,
        message: `Invalid category ID format: "${categoryId}". Expected a 24-character hex string. Please select a valid category from the dropdown.`,
      });
    }

    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Business owner not found. Cannot create menu item.",
      });
    }

    // Verify category belongs to user
    const categoryDoc = await CategoryModel.findOne({
      _id: categoryId,
      user: targetUserId,
      isActive: true,
    });

    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Category not found or inactive",
      });
    }

    // Use uploaded image URL if available, otherwise empty string
    const imageUrl = req.uploadedFileUrl || "";

    const menuItem = new MenuItemModel({
      user: targetUserId,
      itemName: itemName.trim(),
      price: Number(price),
      category: categoryId,
      description: description ? description.trim() : "",
      image: imageUrl,
      isAvailable: true,
    });

    const savedMenuItem = await menuItem.save();
    await savedMenuItem.populate("category", "name");

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      menuItem: savedMenuItem,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to create menu item" 
    });
  }
};

// Get all Menu Items
export const getAllMenuItems = async (req, res) => {
  try {
    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(200).json({
        success: true,
        message: "All menu items fetched successfully",
        menuItems: [],
      });
    }

    const menuItems = await MenuItemModel.find({ user: targetUserId })
      .populate("category", "name")
      .sort({ "category.name": 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "All menu items fetched successfully",
      menuItems,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch menu items",
      error: error.message,
    });
  }
};

// Get Menu Item by ID
export const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = await getTargetUserId(req);
    
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    const menuItem = await MenuItemModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Menu item fetched successfully",
      menuItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch menu item",
      error: error.message,
    });
  }
};

// Update Menu Item
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, price, category, description, isAvailable } = req.body;

    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    const menuItem = await MenuItemModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    if (itemName && itemName.trim()) {
      menuItem.itemName = itemName.trim();
    }

    if (price !== undefined && price !== null) {
      menuItem.price = Number(price) >= 0 ? Number(price) : menuItem.price;
    }

    if (category) {
      // Validate that category is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID format. Please select a valid category.",
        });
      }

      // Verify category belongs to user
      const categoryDoc = await CategoryModel.findOne({
        _id: category,
        user: targetUserId,
        isActive: true,
      });

      if (!categoryDoc) {
        return res.status(404).json({
          success: false,
          message: "Category not found or inactive",
        });
      }

      menuItem.category = category;
    }

    if (description !== undefined) {
      menuItem.description = description ? description.trim() : "";
    }

    // Update image if new file uploaded
    if (req.uploadedFileUrl) {
      menuItem.image = req.uploadedFileUrl;
    }

    if (isAvailable !== undefined) {
      menuItem.isAvailable = isAvailable;
    }

    const updatedMenuItem = await menuItem.save();
    await updatedMenuItem.populate("category", "name");

    return res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
      menuItem: updatedMenuItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update menu item",
      error: error.message,
    });
  }
};

// Delete Menu Item
export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = await getTargetUserId(req);
    
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    const menuItem = await MenuItemModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    await MenuItemModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete menu item",
      error: error.message,
    });
  }
};

