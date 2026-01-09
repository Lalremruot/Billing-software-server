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

    // Set expiry date to 1 year from now
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const cashier = await UserModel.create({
      businessName: req.user.businessName, // inherit from super admin
      email,
      password: hashedPassword,
      role: "cashier",
      permissions,
      expiryDate,
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
