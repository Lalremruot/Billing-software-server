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

// Create Category
export const createCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Business owner not found. Cannot create category.",
      });
    }

    // Check if category already exists
    const existingCategory = await CategoryModel.findOne({
      user: targetUserId,
      name: name.trim(),
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = new CategoryModel({
      user: targetUserId,
      name: name.trim(),
      description: description ? description.trim() : "",
      isActive: isActive !== undefined ? isActive : true,
    });

    const savedCategory = await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: savedCategory,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to create category" 
    });
  }
};

// Get all Categories
export const getAllCategories = async (req, res) => {
  try {
    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(200).json({
        success: true,
        message: "All categories fetched successfully",
        categories: [],
      });
    }

    const categories = await CategoryModel.find({ 
      user: targetUserId,
      isActive: true 
    })
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: "All categories fetched successfully",
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

// Get Category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = await getTargetUserId(req);
    
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const category = await CategoryModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
};

// Update Category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const category = await CategoryModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name && name.trim() && name.trim() !== category.name) {
      // Check if new name already exists
      const existingCategory = await CategoryModel.findOne({
        user: targetUserId,
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category name already exists",
        });
      }

      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description ? description.trim() : "";
    }

    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    const updatedCategory = await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category name already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

// Delete Category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = await getTargetUserId(req);
    
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const category = await CategoryModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category is used by any menu items
    const MenuItemModel = (await import("./menuitem.model.js")).default;
    const menuItemsCount = await MenuItemModel.countDocuments({
      category: id,
      user: targetUserId,
    });

    // If category is used by menu items, reassign them to "Uncategorized" category
    if (menuItemsCount > 0) {
      // Find or create "Uncategorized" category
      let uncategorizedCategory = await CategoryModel.findOne({
        name: "Uncategorized",
        user: targetUserId,
      });

      if (!uncategorizedCategory) {
        // Create "Uncategorized" category if it doesn't exist
        uncategorizedCategory = new CategoryModel({
          user: targetUserId,
          name: "Uncategorized",
          description: "Default category for items without a category",
          isActive: true,
        });
        await uncategorizedCategory.save();
      }

      // Reassign all menu items from deleted category to "Uncategorized"
      await MenuItemModel.updateMany(
        {
          category: id,
          user: targetUserId,
        },
        {
          $set: { category: uncategorizedCategory._id },
        }
      );
    }

    // Delete the category
    await CategoryModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: menuItemsCount > 0 
        ? `Category deleted successfully. ${menuItemsCount} menu item(s) moved to "Uncategorized".`
        : "Category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};

