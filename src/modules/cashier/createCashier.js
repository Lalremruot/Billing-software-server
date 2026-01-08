import UserModel from "../user/user.model.js";
import bcrypt from "bcrypt";

export const createCashier = async (req, res) => {
  try {
    // Called by SUPER ADMIN
    const { email, password, permissions = [] } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Cashier already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const cashier = await UserModel.create({
      businessName: req.user.businessName, // inherit from super admin
      email,
      password: hashedPassword,
      role: "cashier",
      permissions,
    });

    return res.status(201).json({
      success: true,
      message: "Cashier created successfully",
      data: {
        email: cashier.email,
        role: cashier.role,
        permissions: cashier.permissions,
      },
    });
  } catch (error) {
    console.error("Create cashier error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create cashier",
    });
  }
};

export const getAllCashiers = async (req, res) => {
  try {
    const cashiers = await UserModel.find({ 
      role: "cashier",
      businessName: req.user.businessName 
    }).select("-password").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Cashiers fetched successfully",
      data: cashiers,
    });
  } catch (error) {
    console.error("Get cashiers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cashiers",
    });
  }
};

export const updateCashier = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, permissions } = req.body;

    const cashier = await UserModel.findOne({
      _id: id,
      role: "cashier",
      businessName: req.user.businessName,
    });

    if (!cashier) {
      return res.status(404).json({
        success: false,
        message: "Cashier not found",
      });
    }

    const updateData = {};
    if (email) updateData.email = email;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedCashier = await UserModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Cashier updated successfully",
      data: updatedCashier,
    });
  } catch (error) {
    console.error("Update cashier error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update cashier",
    });
  }
};

export const deleteCashier = async (req, res) => {
  try {
    const { id } = req.params;

    const cashier = await UserModel.findOne({
      _id: id,
      role: "cashier",
      businessName: req.user.businessName,
    });

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
