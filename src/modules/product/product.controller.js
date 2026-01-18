import ProductModel from "../product/product.model.js";
import UserModel from "../user/user.model.js";

export const createProduct = async (req, res) => {
  try {
    const { productName, price } = req.body;

    if (!productName || !productName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    let targetUserId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    // Products created by cashiers should be linked to their superadmin
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;
      
      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select("businessName");
        cashierBusinessName = cashierDoc?.businessName;
      }
      
      if (!cashierBusinessName || (typeof cashierBusinessName === 'string' && cashierBusinessName.trim() === '')) {
        return res.status(404).json({
          success: false,
          message: "Business owner not found. Cannot create product.",
        });
      }
      
      const normalizedBusinessName = String(cashierBusinessName).trim();
      
      // Find superadmin with exact matching businessName
      const businessOwner = await UserModel.findOne({ 
        role: "superadmin",
        businessName: normalizedBusinessName
      });
      
      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
      } else {
        return res.status(404).json({
          success: false,
          message: "Business owner not found. Cannot create product.",
        });
      }
    }

    const product = new ProductModel({
      productName: productName.trim(),
      price: price ? Number(price) : 0,
      user: targetUserId,
    });
    const savedProduct = await product.save();
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: savedProduct,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllProduct = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({
        success: false,
        message: "User not authorized or missing user id",
      });
    }

    let targetUserId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    // so cashiers can see the same products as their superadmin
    if (req.user.role === "cashier") {
      // Get businessName from req.user (protect middleware includes it with .select("-password"))
      // If not available, fetch the cashier document
      let cashierBusinessName = req.user.businessName;
      
      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select("businessName");
        cashierBusinessName = cashierDoc?.businessName;
      }
      
      if (!cashierBusinessName || (typeof cashierBusinessName === 'string' && cashierBusinessName.trim() === '')) {
        return res.status(200).json({
          success: true,
          message: "All Product fetched successfully",
          product: [],
        });
      }
      
      const normalizedBusinessName = String(cashierBusinessName).trim();
      
      // Find superadmin with exact matching businessName (cashiers inherit exact businessName from superadmin)
      const businessOwner = await UserModel.findOne({ 
        role: "superadmin",
        businessName: normalizedBusinessName
      });
      
      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
      } else {
        // If no superadmin found with same businessName, return empty array
        return res.status(200).json({
          success: true,
          message: "All Product fetched successfully",
          product: [],
        });
      }
    }

    // Fetch products for the target user (superadmin for cashiers, self for superadmins)
    const product = await ProductModel.find({ user: targetUserId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "All Product fetched successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Fail to fetch All Product",
      error: error.message,
    });
  }
};


export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let targetUserId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;
      
      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select("businessName");
        cashierBusinessName = cashierDoc?.businessName;
      }
      
      if (!cashierBusinessName || (typeof cashierBusinessName === 'string' && cashierBusinessName.trim() === '')) {
        return res.status(404).json({
          success: false,
          message: "Product not found or does not belong to this business",
        });
      }
      
      const normalizedBusinessName = String(cashierBusinessName).trim();
      
      // Find superadmin with exact matching businessName
      const businessOwner = await UserModel.findOne({ 
        role: "superadmin",
        businessName: normalizedBusinessName
      });
      
      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
      } else {
        return res.status(404).json({
          success: false,
          message: "Product not found or does not belong to this business",
        });
      }
    }

    const product = await ProductModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or does not belong to this business",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      product,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, price } = req.body;

    if (!productName || !productName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    let targetUserId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;
      
      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select("businessName");
        cashierBusinessName = cashierDoc?.businessName;
      }
      
      if (!cashierBusinessName || (typeof cashierBusinessName === 'string' && cashierBusinessName.trim() === '')) {
        return res.status(404).json({
          success: false,
          message: "Product not found or does not belong to this business",
        });
      }
      
      const normalizedBusinessName = String(cashierBusinessName).trim();
      
      // Find superadmin with exact matching businessName
      const businessOwner = await UserModel.findOne({ 
        role: "superadmin",
        businessName: normalizedBusinessName
      });
      
      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
      } else {
        return res.status(404).json({
          success: false,
          message: "Product not found or does not belong to this business",
        });
      }
    }

    const product = await ProductModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or does not belong to this business",
      });
    }

    product.productName = productName.trim();
    if (price !== undefined && price !== null) {
      product.price = Number(price) || 0;
    }
    const updatedProduct = await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    let targetUserId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;
      
      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select("businessName");
        cashierBusinessName = cashierDoc?.businessName;
      }
      
      if (!cashierBusinessName || (typeof cashierBusinessName === 'string' && cashierBusinessName.trim() === '')) {
        return res.status(404).json({
          success: false,
          message: "Product not found or does not belong to this business",
        });
      }
      
      const normalizedBusinessName = String(cashierBusinessName).trim();
      
      // Find superadmin with exact matching businessName
      const businessOwner = await UserModel.findOne({ 
        role: "superadmin",
        businessName: normalizedBusinessName
      });
      
      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
      } else {
        return res.status(404).json({
          success: false,
          message: "Product not found or does not belong to this business",
        });
      }
    }

    const product = await ProductModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or does not belong to this business",
      });
    }

    await ProductModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};