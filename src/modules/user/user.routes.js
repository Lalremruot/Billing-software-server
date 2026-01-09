import express from "express"
import {
    forgotPassword,
    getProfile,
    login,
    resetPassword,
    signUp,
    updateProfile,
    updateUserExpiry,
    getAllUsersSecret,
    extendUserExpirySecret
} from "../user/user.controller.js"
import { protect, superAdminOnly } from "../../middleware/protect.js"
import { uploadUserLogo } from "../../middleware/upload.js"

const router = express.Router()

router.post("/register", signUp)
router.post("/login", login)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password/:token", resetPassword)
router.get("/profile", protect, getProfile)
router.put(
  "/profile",
  protect,
  uploadUserLogo.single("logo"),
  updateProfile
)
router.put(
  "/expiry/:userId",
  protect,
  superAdminOnly,
  updateUserExpiry
)
// Secret routes for developer (no auth required, but secret key needed)
router.get("/all-users", getAllUsersSecret)
router.put("/extend-expiry/:userId", extendUserExpirySecret)

export default router;