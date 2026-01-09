import InventoryModel from "./inventory.model.js";

export const createInventoryItem = async (req, res) => {
  try {
    const { itemName, totalPrice, dateAdded } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Item name is required",
      });
    }

    if (totalPrice === undefined || totalPrice === null) {
      return res.status(400).json({
        success: false,
        message: "Total price is required",
      });
    }

    const inventoryItem = new InventoryModel({
      itemName: itemName.trim(),
      totalPrice: parseFloat(totalPrice) || 0,
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
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to create inventory item" 
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
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory items",
      error: error.message,
    });
  }
};

export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, totalPrice, dateAdded } = req.body;

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

    if (itemName !== undefined) {
      item.itemName = itemName.trim();
    }
    if (totalPrice !== undefined) {
      item.totalPrice = parseFloat(totalPrice) || 0;
    }
    if (dateAdded !== undefined) {
      item.dateAdded = new Date(dateAdded);
    }

    const updatedItem = await item.save();
    return res.status(200).json({
      success: true,
      message: "Inventory item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
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
    return res.status(500).json({
      success: false,
      message: "Failed to delete inventory item",
      error: error.message,
    });
  }
};

