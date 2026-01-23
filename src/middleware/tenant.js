export const identifyTenant = async (req, res, next) => {
  try {
    // 🔹 Always read the tenant from header first
    let host = req.headers["x-tenant-domain"];

    if (!host) {
      host = req.hostname; // fallback
    }

    // Normalize domain (remove protocol, port, slashes, lowercase)
    const normalize = (d) =>
      d.replace(/^https?:\/\//, "")
       .replace(/:\d+$/, "")
       .replace(/\/$/, "")
       .toLowerCase();

    const hostNormalized = normalize(host);

    // Fetch tenants
    const tenants = await UserModel.find();

    // Match tenant by normalized domain
    const tenant = tenants.find((t) => t.domain && normalize(t.domain) === hostNormalized);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: `Tenant not found for domain: ${hostNormalized}`,
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
