import express from "express"
import {
    forgotPassword,
    getProfile,
    login,
    resetPassword,
    signUp,
    updateProfile
} from "../user/user.controller.js"
import { protect } from "../../middleware/protect.js"
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

export default router;