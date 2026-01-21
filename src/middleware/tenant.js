// middleware/tenant.js
import UserModel from "../modules/user/user.model.js";

export const identifyTenant = async (req, res, next) => {
  try {
    let host = req.hostname; // e.g., "192.168.1.8"

    // If in development, allow overriding host
    if (process.env.DEV_MODE === "true" && process.env.CLIENT_URL) {
      host = new URL(process.env.CLIENT_URL).hostname; // e.g., "localhost"
    }

    // Find tenant by hostname only
    const tenants = await UserModel.find();
    const tenant = tenants.find(t => {
      try {
        const tenantHost = new URL(t.domain).hostname; // ignore protocol & port
        return tenantHost === host;
      } catch (e) {
        return false;
      }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: `Tenant not found for domain: ${host}` });
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: "Tenant identification failed", error: err.message });
  }
};
