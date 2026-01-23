import UserModel from "../modules/user/user.model.js";

export const identifyTenant = async (req, res, next) => {
  try {
    const tenantHeader = req.headers["x-tenant-domain"];
    const rawHost = tenantHeader || req.hostname;

    const normalize = (d) =>
      d.replace(/^https?:\/\//, "")
        .replace(/:\d+$/, "")
        .replace(/\/$/, "")
        .toLowerCase();

    const hostNormalized = normalize(rawHost);

    const tenant = await UserModel.findOne({
      domain: { $regex: new RegExp(`^${hostNormalized}$`, "i") }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: `Tenant not found for domain: ${hostNormalized}`,
        lookupAttempt: {
          tenantHeader,
          hostname: req.hostname
        }
      });
    }

    req.tenant = tenant;
    next();

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Tenant identification failed",
      error: err.message,
    });
  }
};
