import ProductModel from "../product/product.model.js";

export const createProduct = async (req, res) => {
  try {
    const { productName } = req.body;

    if (!productName || !productName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    const product = new ProductModel({
      productName: productName.trim(),
      user: req.user.id,
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

    const product = await ProductModel.find({ user: req.user.id }).sort({
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
      error: error.message, // <-- include to see real cause
    });
  }
};


export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await ProductModel.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or does not belong to this user",
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
    const { productName } = req.body;

    if (!productName || !productName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    const product = await ProductModel.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or does not belong to this user",
      });
    }

    product.productName = productName.trim();
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

    const product = await ProductModel.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or does not belong to this user",
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