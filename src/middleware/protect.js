import jwt from "jsonwebtoken";
import UserModel from "../modules/user/user.model.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.id).select("-password")
     if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user; 
    next();
  } catch(error) {
    return res.status(401).json({ message: "Token invalid", error: error.message });
  }
};

export const superAdminOnly = (req, res, next) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Super Admin access required",
    });
  }
  next();
};

export const checkPermission = (permission) => {
  return (req, res, next) => {
    // Super admin has full access
    if (req.user.role === "superadmin") {
      return next();
    }

    // Cashier permission check
    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: "Permission denied",
      });
    }

    next();
  };
};

export const identifyTenant = async (req, res, next) => {
  try {
    const host = req.hostname; // e.g., "arsicloudkitchen.in"

    // Find the user that owns this domain
    const tenant = await UserModel.findOne({ domain: host }).select("-password");

    if (!tenant) {
      return res.status(404).json({ 
        success: false, 
        message: `Tenant not found for domain: ${host}` 
      });
    }

    req.tenant = tenant; // attach tenant info to request
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Tenant identification failed", 
      error: error.message 
    });
  }
};

