import InventoryModel from "./inventory.model.js";

export const createInventoryItem = async (req, res) => {
  try {
    const { itemName, totalPrice, dateAdded } = req.body;

    if (!itemName || totalPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: "Item name and total price are required",
      });
    }

    const inventoryItem = new InventoryModel({
      itemName: itemName.trim(),
      totalPrice: parseFloat(totalPrice),
      dateAdded: dateAdded ? new Date(dateAdded) : new Date(),
      user: req.user.id,
    });

    const savedItem = await inventoryItem.save();
    res.status(201).json({
      success: true,
      message: "Inventory item created successfully",
      data: savedItem,
    });
  } catch (error) {
    console.error("Create inventory item error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create inventory item",
      error: error.message,
    });
  }
};

export const getAllInventoryItems = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({
        success: false,
        message: "User not authorized or missing user id",
      });
    }

    const items = await InventoryModel.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "All inventory items fetched successfully",
      data: items,
    });
  } catch (error) {
    console.error("Get inventory items error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory items",
      error: error.message,
    });
  }
};

export const getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await InventoryModel.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found or does not belong to this user",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory item fetched successfully",
      data: item,
    });
  } catch (error) {
    console.error("Get inventory item error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory item",
      error: error.message,
    });
  }
};

export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, totalPrice, dateAdded } = req.body;

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory item ID",
      });
    }

    const item = await InventoryModel.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found or does not belong to this user",
      });
    }

    const updateData = {};
    if (itemName) updateData.itemName = itemName.trim();
    if (totalPrice !== undefined) updateData.totalPrice = parseFloat(totalPrice);
    if (dateAdded) updateData.dateAdded = new Date(dateAdded);

    const updatedItem = await InventoryModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Inventory item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Update inventory item error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update inventory item",
      error: error.message,
    });
  }
};

export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory item ID",
      });
    }

    const item = await InventoryModel.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found or does not belong to this user",
      });
    }

    await InventoryModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error) {
    console.error("Delete inventory item error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete inventory item",
      error: error.message,
    });
  }
};

