import EmployeeModel from "./employee.model.js";

export const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, position, department } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee name is required",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee email is required",
      });
    }

    // Check if employee with same email already exists for this user
    const existingEmployee = await EmployeeModel.findOne({
      user: req.user.id,
      email: email.toLowerCase().trim(),
    });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "Employee with this email already exists",
      });
    }

    const employee = new EmployeeModel({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || "",
      position: position || "",
      department: department || "",
      user: req.user.id,
    });

    const savedEmployee = await employee.save();
    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: savedEmployee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create employee",
    });
  }
};

export const getAllEmployees = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({
        success: false,
        message: "User not authorized or missing user id",
      });
    }

    const employees = await EmployeeModel.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "All employees fetched successfully",
      data: employees,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
      error: error.message,
    });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, position, department } = req.body;

    const employee = await EmployeeModel.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or does not belong to this user",
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email.toLowerCase().trim() !== employee.email) {
      const existingEmployee = await EmployeeModel.findOne({
        user: req.user.id,
        email: email.toLowerCase().trim(),
        _id: { $ne: id },
      });

      if (existingEmployee) {
        return res.status(409).json({
          success: false,
          message: "Employee with this email already exists",
        });
      }
      employee.email = email.toLowerCase().trim();
    }

    if (name !== undefined) {
      employee.name = name.trim();
    }
    if (phone !== undefined) {
      employee.phone = phone || "";
    }
    if (position !== undefined) {
      employee.position = position || "";
    }
    if (department !== undefined) {
      employee.department = department || "";
    }

    const updatedEmployee = await employee.save();
    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update employee",
      error: error.message,
    });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await EmployeeModel.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or does not belong to this user",
      });
    }

    await EmployeeModel.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete employee",
      error: error.message,
    });
  }
};


