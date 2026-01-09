import UserModel from "../user/user.model.js";
import bcrypt from "bcrypt";

export const getAllCashiers = async (req, res) => {
  try {
    // Only super admin can view all cashiers
    const cashiers = await UserModel.find({ role: "cashier" })
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

    const cashier = await UserModel.findOne({ _id: id, role: "cashier" });

    if (!cashier) {
      return res.status(404).json({
        success: false,
        message: "Cashier not found",
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

    const cashier = await UserModel.findOne({ _id: id, role: "cashier" });

    if (!cashier) {
      return res.status(404).json({
        success: false,
        message: "Cashier not found",
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

