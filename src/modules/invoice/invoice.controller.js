import mongoose from "mongoose";
import InvoiceModel from "../invoice/invoice.model.js";
import UserModel from "../user/user.model.js";

const normalizeItems = (items = []) =>
  items
    .filter(item =>
      item &&
      typeof item.name === "string" &&
      item.name.trim() !== "" &&
      (item.quantity !== undefined || item.price !== undefined)
    )
    .map(item => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const packaging = Number(item.packaging) || 0; // new
      
      const total =
  item.total !== undefined
    ? Number(item.total) || (quantity * price) + (item.packaging || 0)
    : (quantity * price) + (item.packaging || 0); // packaging per item

      return {
        name: item.name.trim(),
        quantity,
        price,
        packaging,
        total,
      };
    });

export const createInvoice = async (req, res) => {
  try {
    let targetUserId = req.user.id;
    let targetUser = req.user;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    // Invoices created by cashiers should be linked to their superadmin
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;

      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select(
          "businessName",
        );
        cashierBusinessName = cashierDoc?.businessName;
      }

      if (
        !cashierBusinessName ||
        (typeof cashierBusinessName === "string" &&
          cashierBusinessName.trim() === "")
      ) {
        return res.status(404).json({
          success: false,
          message: "Business owner not found. Cannot create invoice.",
        });
      }

      const normalizedBusinessName = String(cashierBusinessName).trim();
      const businessOwner = await UserModel.findOne({
        role: "superadmin",
        businessName: normalizedBusinessName,
      });

      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
        targetUser = businessOwner;
      } else {
        return res.status(404).json({
          success: false,
          message: "Business owner not found. Cannot create invoice.",
        });
      }
    }

    const user = await UserModel.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const payload = {
      ...req.body,
      user: targetUserId,
      items: normalizeItems(req.body.items),
    };

    if (!payload.invoiceNumber) {
      // Generate sequential invoice number
      const prefix = user.invoicePrefix;

      // Find the highest invoice number for this user
      const highestInvoice = await InvoiceModel.findOne({
        user: targetUserId,
        invoiceNumber: { $exists: true, $ne: null },
      })
        .sort({ invoiceNumber: -1 })
        .select("invoiceNumber");

      let nextNumber = 1;

      if (highestInvoice && highestInvoice.invoiceNumber) {
        // Extract numeric part from invoice number (e.g., "INV#00001" -> 1)
        const match = highestInvoice.invoiceNumber.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Format with leading zeros (5 digits: 00001, 00002, etc.)
      const formattedNumber = String(nextNumber).padStart(5, "0");
      payload.invoiceNumber = `${prefix}${formattedNumber}`;
    }

    const invoice = new InvoiceModel(payload);
    const savedInvoice = await invoice.save();

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      invoice: savedInvoice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllInvoice = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({
        success: false,
        message: "User not authorized or missing user id",
      });
    }

    let targetUserId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    // so cashiers can see the same invoices as their superadmin
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;

      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select(
          "businessName",
        );
        cashierBusinessName = cashierDoc?.businessName;
      }

      if (
        !cashierBusinessName ||
        (typeof cashierBusinessName === "string" &&
          cashierBusinessName.trim() === "")
      ) {
        return res.status(200).json({
          success: true,
          message: "All invoices fetched successfully",
          invoices: [],
        });
      }

      const normalizedBusinessName = String(cashierBusinessName).trim();
      const businessOwner = await UserModel.findOne({
        role: "superadmin",
        businessName: normalizedBusinessName,
      });

      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
      } else {
        // If no superadmin found with same businessName, return empty array
        return res.status(200).json({
          success: true,
          message: "All invoices fetched successfully",
          invoices: [],
        });
      }
    }

    const invoices = await InvoiceModel.find({ user: targetUserId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "All invoices fetched successfully",
      invoices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Fail to fetch all invoices",
      error: error.message,
    });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    let targetUserId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;

      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select(
          "businessName",
        );
        cashierBusinessName = cashierDoc?.businessName;
      }

      if (
        !cashierBusinessName ||
        (typeof cashierBusinessName === "string" &&
          cashierBusinessName.trim() === "")
      ) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found or does not belong to this business",
        });
      }

      const normalizedBusinessName = String(cashierBusinessName).trim();
      const businessOwner = await UserModel.findOne({
        role: "superadmin",
        businessName: normalizedBusinessName,
      });

      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
      } else {
        return res.status(404).json({
          success: false,
          message: "Invoice not found or does not belong to this business",
        });
      }
    }

    const invoice = await InvoiceModel.findOne({ _id: id, user: targetUserId });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found or does not belong to this business",
      });
    }

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      error: error.message,
    });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    let targetUserId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;

      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select(
          "businessName",
        );
        cashierBusinessName = cashierDoc?.businessName;
      }

      if (
        !cashierBusinessName ||
        (typeof cashierBusinessName === "string" &&
          cashierBusinessName.trim() === "")
      ) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found or does not belong to this business",
        });
      }

      const normalizedBusinessName = String(cashierBusinessName).trim();
      const businessOwner = await UserModel.findOne({
        role: "superadmin",
        businessName: normalizedBusinessName,
      });

      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
      } else {
        return res.status(404).json({
          success: false,
          message: "Invoice not found or does not belong to this business",
        });
      }
    }

    const invoice = await InvoiceModel.findOne({ _id: id, user: targetUserId });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found or does not belong to this business",
      });
    }

    const fields = [
      "invoiceNumber",
      "invoiceDate",
      "invoiceDueDate",
      "customerName",
      "customerEmail",
      "customerPhone",
      "customerAddress",
      "tableNumber",
      "withPackaging",
      "deliveryAddress",
      "deliveryCharge",
      "status",
      "paymentMode",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        invoice[field] = req.body[field];
      }
    });

    if (Array.isArray(req.body.items)) {
      invoice.items = normalizeItems(req.body.items);
    }

    const updatedInvoice = await invoice.save();

    return res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      invoice: updatedInvoice,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update invoice",
      error: error.message,
    });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    let targetUserId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;

      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select(
          "businessName",
        );
        cashierBusinessName = cashierDoc?.businessName;
      }

      if (
        !cashierBusinessName ||
        (typeof cashierBusinessName === "string" &&
          cashierBusinessName.trim() === "")
      ) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found or does not belong to this business",
        });
      }

      const normalizedBusinessName = String(cashierBusinessName).trim();
      const businessOwner = await UserModel.findOne({
        role: "superadmin",
        businessName: normalizedBusinessName,
      });

      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
      } else {
        return res.status(404).json({
          success: false,
          message: "Invoice not found or does not belong to this business",
        });
      }
    }

    const invoice = await InvoiceModel.findOneAndDelete({
      _id: id,
      user: targetUserId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found or does not belong to this business",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
      error: error.message,
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    let userId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;

      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select(
          "businessName",
        );
        cashierBusinessName = cashierDoc?.businessName;
      }

      if (
        !cashierBusinessName ||
        (typeof cashierBusinessName === "string" &&
          cashierBusinessName.trim() === "")
      ) {
        return res.json({
          success: true,
          stats: {
            totalInvoices: 0,
            totalDrafts: 0,
            totalFinal: 0,
            totalRevenue: 0,
            recentInvoices: [],
          },
        });
      }

      const normalizedBusinessName = String(cashierBusinessName).trim();
      const businessOwner = await UserModel.findOne({
        role: "superadmin",
        businessName: normalizedBusinessName,
      });

      if (businessOwner && businessOwner._id) {
        userId = businessOwner._id;
      } else {
        // If no superadmin found, return empty stats
        return res.json({
          success: true,
          stats: {
            totalInvoices: 0,
            totalDrafts: 0,
            totalFinal: 0,
            totalRevenue: 0,
            recentInvoices: [],
          },
        });
      }
    }

    const totalInvoices = await InvoiceModel.countDocuments({ user: userId });
    const totalDrafts = await InvoiceModel.countDocuments({
      user: userId,
      status: "draft",
    });
    const totalFinal = await InvoiceModel.countDocuments({
      user: userId,
      status: "final",
    });

    const revenueResult = await InvoiceModel.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId), status: "final" },
      },
      { $unwind: "$items" },
      { $group: { _id: null, totalRevenue: { $sum: "$items.total" } } },
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    const recentInvoices = await InvoiceModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalInvoices,
        totalDrafts,
        totalFinal,
        totalRevenue,
        recentInvoices,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    let userId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;

      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select(
          "businessName",
        );
        cashierBusinessName = cashierDoc?.businessName;
      }

      if (
        !cashierBusinessName ||
        (typeof cashierBusinessName === "string" &&
          cashierBusinessName.trim() === "")
      ) {
        return res.status(200).json({
          success: true,
          reports: {
            invoices: [],
            summary: {
              totalInvoices: 0,
              finalInvoices: 0,
              draftInvoices: 0,
              totalRevenue: 0,
            },
          },
        });
      }

      const normalizedBusinessName = String(cashierBusinessName).trim();
      const businessOwner = await UserModel.findOne({
        role: "superadmin",
        businessName: normalizedBusinessName,
      });

      if (businessOwner && businessOwner._id) {
        userId = businessOwner._id;
      } else {
        // If no superadmin found, return empty reports
        return res.status(200).json({
          success: true,
          reports: {
            invoices: [],
            summary: {
              totalInvoices: 0,
              finalInvoices: 0,
              draftInvoices: 0,
              totalRevenue: 0,
            },
          },
        });
      }
    }

    const { startDate, endDate, status } = req.query;

    // Build query
    const query = { user: userId };

    // Add date range filter
    // Note: invoiceDate is stored as String (YYYY-MM-DD format)
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        // Compare as string (YYYY-MM-DD format)
        query.invoiceDate.$gte = startDate;
      }
      if (endDate) {
        // Compare as string (YYYY-MM-DD format)
        query.invoiceDate.$lte = endDate;
      }
    }

    // Add status filter if provided
    if (status && (status === "draft" || status === "final")) {
      query.status = status;
    }

    // Fetch invoices
    const invoices = await InvoiceModel.find(query)
      .sort({ invoiceDate: -1 })
      .lean();

    // Calculate summary statistics
    const totalInvoices = invoices.length;
    const finalInvoices = invoices.filter((inv) => inv.status === "final");
    const draftInvoices = invoices.filter((inv) => inv.status === "draft");

    // Calculate total revenue from final invoices
    const totalRevenue = finalInvoices.reduce((sum, invoice) => {
      const invoiceTotal =
        invoice.items?.reduce(
          (itemSum, item) => itemSum + (item.total || 0),
          0,
        ) || 0;
      return sum + invoiceTotal;
    }, 0);

    return res.status(200).json({
      success: true,
      reports: {
        invoices,
        summary: {
          totalInvoices,
          finalInvoices: finalInvoices.length,
          draftInvoices: draftInvoices.length,
          totalRevenue,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
};

export const getNextInvoiceNumber = async (req, res) => {
  try {
    let targetUserId = req.user.id;

    // If the logged-in user is a cashier, find their business owner (superadmin with same businessName)
    if (req.user.role === "cashier") {
      let cashierBusinessName = req.user.businessName;

      if (!cashierBusinessName) {
        const cashierDoc = await UserModel.findById(req.user.id).select(
          "businessName",
        );
        cashierBusinessName = cashierDoc?.businessName;
      }

      if (
        !cashierBusinessName ||
        (typeof cashierBusinessName === "string" &&
          cashierBusinessName.trim() === "")
      ) {
        return res.status(404).json({
          success: false,
          message: "Business owner not found. Cannot generate invoice number.",
        });
      }

      const normalizedBusinessName = String(cashierBusinessName).trim();
      const businessOwner = await UserModel.findOne({
        role: "superadmin",
        businessName: normalizedBusinessName,
      });

      if (businessOwner && businessOwner._id) {
        targetUserId = businessOwner._id;
      } else {
        return res.status(404).json({
          success: false,
          message: "Business owner not found. Cannot generate invoice number.",
        });
      }
    }

    const user = await UserModel.findById(targetUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const prefix = user.invoicePrefix;

    // Find the highest invoice number for this user
    const highestInvoice = await InvoiceModel.findOne({
      user: targetUserId,
      invoiceNumber: { $exists: true, $ne: null },
    })
      .sort({ invoiceNumber: -1 })
      .select("invoiceNumber");

    let nextNumber = 1;

    if (highestInvoice && highestInvoice.invoiceNumber) {
      // Extract numeric part from invoice number (e.g., "INV#00001" -> 1)
      const match = highestInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format with leading zeros (5 digits: 00001, 00002, etc.)
    const formattedNumber = String(nextNumber).padStart(5, "0");
    const invoiceNumber = `${prefix}${formattedNumber}`;

    return res.status(200).json({
      success: true,
      invoiceNumber,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate invoice number",
      error: error.message,
    });
  }
};
