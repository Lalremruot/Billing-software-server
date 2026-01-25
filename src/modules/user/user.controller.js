import UserModel from "../user/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export const signUp = async (req, res) => {
  try {
    const { businessName, email, password } = req.body;

    if (!businessName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // Check if email already exists
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Please login instead.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Set expiry date to 1 year from now
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const user = new UserModel({
      businessName,
      email,
      password: hashedPassword,
      role: "superadmin", // 👈 IMPORTANT
      expiryDate,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Super Admin created successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Login failed. Please try again",
      });
    }
    const isPasswordEqual = await bcrypt.compare(password, user.password);
    if (!isPasswordEqual) {
      return res.status(403).json({
        success: false,
        message: "Login failed. Please try again",
      });
    }

    // Set expiry date if it doesn't exist (for existing users)
    if (!user.expiryDate) {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      user.expiryDate = expiryDate;
      await user.save();
    }

    // Check if account is expired
    const now = new Date();
    const isExpired = user.expiryDate && new Date(user.expiryDate) < now;
    if (isExpired) {
      return res.status(403).json({
        success: false,
        message: "Your account has expired. Please contact the developer to renew.",
        isExpired: true,
      });
    }
    const jwtToken = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );
    res.status(200).json({
      success: true,
      message: "Login Successful",
      token: jwtToken,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      businessName: user.businessName || "",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      // For security, don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message:
          "If an account exists for this email, a reset link has been sent.",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    try {
      // Check if email credentials are configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error(
          "❌ Email credentials not configured. EMAIL_USER and EMAIL_PASS must be set in .env"
        );
        // For development, log the reset link to console
        const link = `${
          process.env.CLIENT_URL
        }/auth/reset-password/${token}`;
        console.log(
          "🔗 Password Reset Link (EMAIL NOT CONFIGURED - Use this link):",
          link
        );
        return res.status(200).json({
          success: true,
          message:
            "Reset link generated. Check server console for the link (email not configured).",
          resetLink: process.env.NODE_ENV === "development" ? link : undefined, // Only send in dev
        });
      }

      // Check if we should skip email sending (for testing)
      if (process.env.SKIP_EMAIL === "true") {
        const link = `${
          process.env.CLIENT_URL || "http://localhost:5173"
        }/auth/reset-password/${token}`;
        console.log(
          "🔗 Password Reset Link (EMAIL SKIPPED - Use this link):",
          link
        );
        return res.status(200).json({
          success: true,
          message: "Reset link generated. Check server console for the link.",
          resetLink: link,
        });
      }

      // Determine if using Gmail or custom SMTP
      const emailUser = process.env.EMAIL_USER?.trim();
      const emailPass =
        process.env.EMAIL_PASS?.trim().replace(/\s+/g, "") || "";

      // Debug logging (only show first/last chars for security)
      console.log("📧 Email Configuration:");
      console.log(
        "   EMAIL_USER:",
        emailUser
          ? `${emailUser.substring(0, 3)}***${emailUser.substring(
              emailUser.length - 10
            )}`
          : "NOT SET"
      );
      console.log(
        "   EMAIL_PASS:",
        emailPass
          ? `${emailPass.substring(0, 2)}***${emailPass.substring(
              emailPass.length - 2
            )} (${emailPass.length} chars)`
          : "NOT SET"
      );

      if (!emailUser || !emailPass) {
        throw new Error("EMAIL_USER or EMAIL_PASS not configured in .env file");
      }

      const isGmail = emailUser.endsWith("@gmail.com");

      let transporter;

      if (isGmail) {
        // Gmail configuration
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        });
      } else {
        // Custom SMTP configuration (for non-Gmail emails)
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
          auth: {
            user: emailUser,
            pass: process.env.EMAIL_PASS.trim().replace(/\s+/g, ""),
          },
        });
      }

      // Verify transporter configuration
      try {
        await transporter.verify();
        console.log("✅ Email server connection verified");
      } catch (verifyError) {
        console.error(
          "❌ Email server verification failed:",
          verifyError.message
        );
        console.error("💡 Make sure:");
        console.error("   1. EMAIL_USER is your full Gmail address");
        console.error(
          "   2. EMAIL_PASS is a Gmail App Password (not your regular password)"
        );
        console.error(
          "   3. 2-Step Verification is enabled on your Google account"
        );
        console.error(
          "   4. App Password is generated at: https://myaccount.google.com/apppasswords"
        );

        // Still log the link for development
        const link = `${
          process.env.CLIENT_URL || "http://localhost:5173"
        }/auth/reset-password/${token}`;
        console.log(
          "🔗 Password Reset Link (EMAIL FAILED - Use this link):",
          link
        );

        throw verifyError;
      }

      const link = `${
        process.env.CLIENT_URL || "http://localhost:5173"
      }/auth/reset-password/${token}`;

      // Use EMAIL_FROM if set, otherwise use EMAIL_USER
      const fromEmail = process.env.EMAIL_FROM || emailUser;

      const mailOptions = {
        from: `"Lamka Billing" <${fromEmail}>`,
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #14b8a6;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}" 
                 style="background-color: #14b8a6; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #666; word-break: break-all;">${link}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This link will expire in 15 minutes. If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Password reset email sent successfully!");
      console.log("   Message ID:", info.messageId);
      console.log("   From:", fromEmail);
      console.log("   To:", user.email);
      console.log("   Subject: Password Reset Request");
      console.log("🔗 Password Reset Link:", link);

      return res.status(200).json({
        success: true,
        message: "Reset link sent to your email.",
      });
    } catch (emailError) {
      console.error("❌ Email sending error:", emailError);

      // Always log the reset link when email fails
      const link = `${
        process.env.CLIENT_URL || "http://localhost:5173"
      }/auth/reset-password/${token}`;
      console.log("\n" + "=".repeat(60));
      console.log("🔗 PASSWORD RESET LINK (EMAIL FAILED):");
      console.log(link);
      console.log("=".repeat(60) + "\n");

      // Return error details in development, generic message in production
      const isDevelopment =
        process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
      const errorMessage = isDevelopment
        ? `Email sending failed. Check server console for the reset link.`
        : "If an account exists for this email, a reset link has been sent.";

      return res.status(200).json({
        success: true,
        message: errorMessage,
        ...(isDevelopment && {
          resetLink: link,
          note: "Email failed to send. Use the resetLink above or check server console.",
        }),
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await UserModel.findOne({
      _id: decoded.id,
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      businessName,
      ownerName,
      phone,
      email,
      address,
      licNo,
      fssaiNo,
      invoicePrefix,
      domain, // ✅ add domain here
    } = req.body;

    const updates = {};

    if (businessName !== undefined) updates.businessName = businessName;
    if (ownerName !== undefined) updates.ownerName = ownerName;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (licNo !== undefined) updates.licNo = licNo.trim();
    if (fssaiNo !== undefined) updates.fssaiNo = fssaiNo.trim();
    if (invoicePrefix !== undefined) updates.invoicePrefix = invoicePrefix.trim();

    // Handle domain update
    if (domain !== undefined) {
      const sanitizedDomain = domain.toLowerCase().trim();

      // Check if domain already exists for another user
      const existingDomain = await UserModel.findOne({ domain: sanitizedDomain });
      if (existingDomain && existingDomain._id.toString() !== req.user._id.toString()) {
        return res.status(409).json({
          success: false,
          message: "Domain already in use by another user.",
        });
      }

      updates.domain = sanitizedDomain;
    }

    if (email !== undefined && email !== req.user.email) {
      const existingEmail = await UserModel.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already in use.",
        });
      }
      updates.email = email;
    }

    // Use uploaded file URL from S3 if available, otherwise check for local file
    if (req.uploadedFileUrl) {
      updates.logo = req.uploadedFileUrl;
    } else if (req.file) {
      updates.logo = `uploads/users/${req.file.filename}`;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};


export const getProfile = async (req, res) => {
  try {
    // Set expiry date if it doesn't exist (for existing users)
    if (!req.user.expiryDate) {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      req.user.expiryDate = expiryDate;
      await req.user.save();
    }

    // Check if account is expired
    const now = new Date();
    const isExpired = req.user.expiryDate && new Date(req.user.expiryDate) < now;

    return res.status(200).json({
      success: true,
      data: {
        ...req.user.toObject(),
        isExpired,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

// Get business profile (superadmin profile) - accessible to all authenticated users
// Returns the logged-in superadmin's profile, or the logged-in user's business owner if they're a cashier
export const getBusinessProfile = async (req, res) => {
  try {
    // If the logged-in user is a superadmin, return their own profile
    // req.user is already the full document from protect middleware, so we can use it directly
    if (req.user && req.user.role === "superadmin") {
      return res.status(200).json({
        success: true,
        data: req.user.toObject ? req.user.toObject() : req.user,
      });
    }
    
    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    if (req.user && req.user.businessName) {
      const businessOwner = await UserModel.findOne({ 
        role: "superadmin",
        businessName: req.user.businessName 
      });
      
      if (!businessOwner) {
        return res.status(404).json({
          success: false,
          message: "Business profile not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: businessOwner.toObject(),
      });
    }

    return res.status(404).json({
      success: false,
      message: "Business profile not found",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch business profile",
      error: error.message,
    });
  }
};

// Get all users (Secret endpoint for developer)
export const getAllUsersSecret = async (req, res) => {
  try {
    // Express normalizes headers to lowercase
    const secretKey = (req.headers["x-secret-key"] || "").trim();
    const expectedKey = (process.env.SECRET_KEY || "dev2024").trim();

    if (!secretKey) {
      console.log("ERROR: No secret key header found!");
      return res.status(401).json({
        success: false,
        message: "Secret key header missing",
      });
    }

    if (secretKey !== expectedKey) {
      console.log("ERROR: Secret keys do not match!");
      return res.status(401).json({
        success: false,
        message: "Invalid secret key",
      });
    }

    // Only fetch superadmin users (real users, not cashiers)
    const users = await UserModel.find({ role: "superadmin" })
      .select("-password -resetToken -resetTokenExpire")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get all users secret error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// Extend user expiry (Secret endpoint for developer)
export const extendUserExpirySecret = async (req, res) => {
  try {
    // Express normalizes headers to lowercase, but also check original case
    const secretKey = (req.headers["x-secret-key"] || req.headers["X-Secret-Key"] || "").trim();
    const expectedKey = (process.env.SECRET_KEY || "dev2024").trim();

    if (!secretKey || secretKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        message: "Invalid secret key",
      });
    }

    const { userId } = req.params;
    const { extendYears, expiryDate } = req.body;

    if (!extendYears && !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Either extendYears or expiryDate is required",
      });
    }

    if (extendYears && extendYears < 1) {
      return res.status(400).json({
        success: false,
        message: "extendYears must be at least 1",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let newExpiryDate;

    if (expiryDate) {
      // Set specific expiry date
      newExpiryDate = new Date(expiryDate);
      if (isNaN(newExpiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expiry date format",
        });
      }
    } else if (extendYears) {
      // Extend from current expiry date or from now if expired
      const currentExpiry = user.expiryDate || new Date();
      const baseDate = new Date(currentExpiry) > new Date() ? currentExpiry : new Date();
      newExpiryDate = new Date(baseDate);
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + extendYears);
    }

    user.expiryDate = newExpiryDate;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User expiry date extended successfully",
      data: {
        userId: user._id,
        email: user.email,
        expiryDate: user.expiryDate,
        isExpired: newExpiryDate < new Date(),
      },
    });
  } catch (error) {
    console.error("Extend user expiry secret error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to extend user expiry date",
      error: error.message,
    });
  }
};

// Update user expiry date (Admin only)
export const updateUserExpiry = async (req, res) => {
  try {
    const { userId } = req.params;
    const { expiryDate, extendYears } = req.body;

    // Only superadmin can update expiry dates
    if (req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Only superadmin can update expiry dates",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let newExpiryDate;

    if (extendYears) {
      // Extend from current expiry date or from now if expired
      const currentExpiry = user.expiryDate || new Date();
      const baseDate = new Date(currentExpiry) > new Date() ? currentExpiry : new Date();
      newExpiryDate = new Date(baseDate);
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + extendYears);
    } else if (expiryDate) {
      // Set specific expiry date
      newExpiryDate = new Date(expiryDate);
      if (isNaN(newExpiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expiry date format",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Either expiryDate or extendYears is required",
      });
    }

    user.expiryDate = newExpiryDate;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User expiry date updated successfully",
      data: {
        userId: user._id,
        email: user.email,
        expiryDate: user.expiryDate,
        isExpired: newExpiryDate < new Date(),
      },
    });
  } catch (error) {
    console.error("Update user expiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user expiry date",
      error: error.message,
    });
  }
};
