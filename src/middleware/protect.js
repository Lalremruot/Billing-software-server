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
