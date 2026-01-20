import OrderModel from "./order.model.js";
import MenuItemModel from "./menuitem.model.js";
import QRCodeModel from "./qrcode.model.js";
import UserModel from "../user/user.model.js";

// Helper function to get target user ID
const getTargetUserId = async (req) => {
  let targetUserId = req.user.id;

  if (req.user.role === "cashier") {
    let cashierBusinessName = req.user.businessName;
    
    if (!cashierBusinessName) {
      const cashierDoc = await UserModel.findById(req.user.id).select("businessName");
      cashierBusinessName = cashierDoc?.businessName;
    }
    
    if (!cashierBusinessName || (typeof cashierBusinessName === 'string' && cashierBusinessName.trim() === '')) {
      return null;
    }
    
    const normalizedBusinessName = String(cashierBusinessName).trim();
    const businessOwner = await UserModel.findOne({ 
      role: "superadmin",
      businessName: normalizedBusinessName
    });
    
    if (businessOwner && businessOwner._id) {
      targetUserId = businessOwner._id;
    } else {
      return null;
    }
  }

  return targetUserId;
};

// Create Order (public endpoint - no auth required)
export const createOrder = async (req, res) => {
  try {
    const { tableId, items, customerName, customerPhone, notes } = req.body;

    if (!tableId || !tableId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Table ID is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });
    }

    // Find QR code to get user and table name
    const qrcode = await QRCodeModel.findOne({ 
      tableId: tableId.trim(),
      isActive: true 
    });

    if (!qrcode) {
      return res.status(404).json({
        success: false,
        message: "Table not found or inactive",
      });
    }

    const targetUserId = qrcode.user;

    // Validate items and calculate totals
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      if (!item.menuItemId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid item data",
        });
      }

      const menuItem = await MenuItemModel.findOne({
        _id: item.menuItemId,
        user: targetUserId,
        isAvailable: true,
      });

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item ${item.menuItemId} not found or unavailable`,
        });
      }

      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        menuItemId: menuItem._id,
        itemName: menuItem.itemName,
        quantity: item.quantity,
        price: menuItem.price,
        total: itemTotal,
      });
    }

    const order = new OrderModel({
      user: targetUserId,
      tableId: tableId.trim(),
      tableName: qrcode.tableName,
      items: orderItems,
      totalAmount,
      status: "pending",
      customerName: customerName || "",
      customerPhone: customerPhone || "",
      notes: notes || "",
    });

    const savedOrder = await order.save();

    // Populate order for socket emission
    const populatedOrder = await OrderModel.findById(savedOrder._id)
      .populate("items.menuItemId", "itemName image");

    // Emit real-time notification to admin
    try {
      const { emitNewOrder } = await import("../../socket/socketServer.js");
      emitNewOrder(targetUserId.toString(), populatedOrder);
    } catch (socketError) {
      console.error("Error emitting socket event:", socketError);
      // Don't fail the request if socket fails
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to create order" 
    });
  }
};

// Get all Orders (for admin)
export const getAllOrders = async (req, res) => {
  try {
    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(200).json({
        success: true,
        message: "All orders fetched successfully",
        orders: [],
      });
    }

    const { tableId, status } = req.query;
    const query = { user: targetUserId };
    
    if (tableId) {
      query.tableId = tableId.trim();
    }
    
    if (status) {
      query.status = status;
    }

    const orders = await OrderModel.find(query)
      .populate("items.menuItemId", "itemName image")
      .sort({ createdAt: -1 });

    // Ensure dates are properly serialized
    const serializedOrders = orders.map(order => ({
      ...order.toObject(),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      message: "All orders fetched successfully",
      orders: serializedOrders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// Get Orders by Table ID (Public - for customer order history)
export const getOrdersByTableIdPublic = async (req, res) => {
  try {
    const { tableId } = req.params;
    
    if (!tableId || !tableId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Table ID is required",
      });
    }

    // Verify table exists and is active
    const qrcode = await QRCodeModel.findOne({
      tableId: tableId.trim(),
      isActive: true,
    });

    if (!qrcode) {
      return res.status(404).json({
        success: false,
        message: "Table not found or inactive",
      });
    }

    // Get orders for this table (public access - customers can see their table's orders)
    const orders = await OrderModel.find({
      tableId: tableId.trim(),
      user: qrcode.user,
    })
      .populate("items.menuItemId", "itemName image")
      .sort({ createdAt: -1 })
      .select("-__v"); // Exclude version field

    // Ensure dates are properly serialized
    const serializedOrders = orders.map(order => ({
      ...order.toObject(),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      orders: serializedOrders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// Get Orders by Table ID (Protected - for admin)
export const getOrdersByTableId = async (req, res) => {
  try {
    const { tableId } = req.params;
    const targetUserId = await getTargetUserId(req);
    
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Orders not found",
      });
    }

    // Verify table belongs to user
    const qrcode = await QRCodeModel.findOne({
      tableId: tableId.trim(),
      user: targetUserId,
    });

    if (!qrcode) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    const orders = await OrderModel.find({
      tableId: tableId.trim(),
      user: targetUserId,
    })
      .populate("items.menuItemId", "itemName image")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// Get Order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = await getTargetUserId(req);
    
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = await OrderModel.findOne({
      _id: id,
      user: targetUserId,
    }).populate("items.menuItemId", "itemName image");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

// Update Order Status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required",
      });
    }

    const targetUserId = await getTargetUserId(req);
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = await OrderModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = status;
    const updatedOrder = await order.save();

    // Populate order for socket emission
    const populatedOrder = await OrderModel.findById(updatedOrder._id)
      .populate("items.menuItemId", "itemName image");

    // Emit real-time update to admin
    try {
      const { emitOrderUpdate } = await import("../../socket/socketServer.js");
      emitOrderUpdate(targetUserId.toString(), populatedOrder);
    } catch (socketError) {
      console.error("Error emitting socket event:", socketError);
      // Don't fail the request if socket fails
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

// Delete Order
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = await getTargetUserId(req);
    
    if (!targetUserId) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = await OrderModel.findOne({
      _id: id,
      user: targetUserId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await OrderModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
};

