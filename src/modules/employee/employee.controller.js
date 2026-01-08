import EmployeeModel from "./employee.model.js";

export const createEmployee = async (req, res) => {
  try {
    const { name, age, dob, contactNumber, salary } = req.body;

    if (!name || !age || !dob || !contactNumber || !salary) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const employee = new EmployeeModel({
      name: name.trim(),
      age: parseInt(age),
      dob: new Date(dob),
      contactNumber: contactNumber.trim(),
      salary: parseFloat(salary),
      user: req.user.id,
    });

    const savedEmployee = await employee.save();
    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: savedEmployee,
    });
  } catch (error) {
    console.error("Create employee error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create employee",
      error: error.message,
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
    console.error("Get employees error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
      error: error.message,
    });
  }
};

export const getEmployeeById = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      message: "Employee fetched successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Get employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee",
      error: error.message,
    });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, dob, contactNumber, salary } = req.body;

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

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (age !== undefined) updateData.age = parseInt(age);
    if (dob) updateData.dob = new Date(dob);
    if (contactNumber) updateData.contactNumber = contactNumber.trim();
    if (salary !== undefined) updateData.salary = parseFloat(salary);

    const updatedEmployee = await EmployeeModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Update employee error:", error);
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
    console.error("Delete employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete employee",
      error: error.message,
    });
  }
};

