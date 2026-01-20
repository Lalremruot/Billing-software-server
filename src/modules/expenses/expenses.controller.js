import ExpenseModel from "./expenses.model.js";

export const createExpenseItem = async (req, res) => {
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

    const expenseItem = new ExpenseModel({
      itemName: itemName.trim(),
      totalPrice: parseFloat(totalPrice) || 0,
      dateAdded: dateAdded ? new Date(dateAdded) : new Date(),
      user: req.user.id,
    });

    const savedItem = await expenseItem.save();
    res.status(201).json({
      success: true,
      message: "Expense item created successfully",
      data: savedItem,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to create expense item" 
    });
  }
};

export const getAllExpenseItems = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({
        success: false,
        message: "User not authorized or missing user id",
      });
    }

    const items = await ExpenseModel.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "All expense items fetched successfully",
      data: items,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense items",
      error: error.message,
    });
  }
};

export const updateExpenseItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, totalPrice, dateAdded } = req.body;

    const item = await ExpenseModel.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Expense item not found or does not belong to this user",
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
      message: "Expense item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update expense item",
      error: error.message,
    });
  }
};

export const deleteExpenseItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await ExpenseModel.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Expense item not found or does not belong to this user",
      });
    }

    await ExpenseModel.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Expense item deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete expense item",
      error: error.message,
    });
  }
};

