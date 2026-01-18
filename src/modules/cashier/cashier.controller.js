import UserModel from "../user/user.model.js";
import bcrypt from "bcrypt";

export const getAllCashiers = async (req, res) => {
  try {
    // Only super admin can view cashiers
    // Filter cashiers by the logged-in superadmin's businessName
    const businessName = req.user?.businessName;
    
    if (!businessName) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Business name not found",
      });
    }

    const cashiers = await UserModel.find({ 
      role: "cashier",
      businessName: businessName 
    })
      .select("-password") // Don't send password
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Cashiers fetched successfully",
      data: cashiers,
    });
  } catch (error) {
    console.error("Get all cashiers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cashiers",
    });
  }
};

export const deleteCashier = async (req, res) => {
  try {
    const { id } = req.params;
    const businessName = req.user?.businessName;

    if (!businessName) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Business name not found",
      });
    }

    // Only allow deleting cashiers with the same businessName as the logged-in superadmin
    const cashier = await UserModel.findOne({ 
      _id: id, 
      role: "cashier",
      businessName: businessName 
    });

    if (!cashier) {
      return res.status(404).json({
        success: false,
        message: "Cashier not found or you don't have permission to delete this cashier",
      });
    }

    await UserModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Cashier deleted successfully",
    });
  } catch (error) {
    console.error("Delete cashier error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete cashier",
    });
  }
};

export const updateCashier = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, permissions, password } = req.body;
    const businessName = req.user?.businessName;

    if (!businessName) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Business name not found",
      });
    }

    // Only allow updating cashiers with the same businessName as the logged-in superadmin
    const cashier = await UserModel.findOne({ 
      _id: id, 
      role: "cashier",
      businessName: businessName 
    });

    if (!cashier) {
      return res.status(404).json({
        success: false,
        message: "Cashier not found or you don't have permission to update this cashier",
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== cashier.email) {
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
      cashier.email = email;
    }

    // Update password if provided
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      cashier.password = hashedPassword;
    }

    if (permissions !== undefined) {
      cashier.permissions = Array.isArray(permissions) ? permissions : [];
    }

    await cashier.save();

    return res.status(200).json({
      success: true,
      message: "Cashier updated successfully",
      data: {
        email: cashier.email,
        role: cashier.role,
        permissions: cashier.permissions,
      },
    });
  } catch (error) {
    console.error("Update cashier error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update cashier",
    });
  }
};

