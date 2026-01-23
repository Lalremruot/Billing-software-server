export const identifyTenant = async (req, res, next) => {
  try {
    // 1. Read domain from header OR fallback to req.hostname
    let host = req.headers["x-tenant-domain"] || req.hostname;

    // 2. Normalize domain (remove http, https, slashes)
    const normalize = (d) =>
      d.replace(/^https?:\/\//, "").replace(/:\d+$/, "").replace(/\/$/, "").toLowerCase();

    const hostNormalized = normalize(host);

    // 3. Fetch tenants
    const tenants = await UserModel.find();

    // 4. Match tenant by normalized domain
    const tenant = tenants.find((t) => {
      if (!t.domain) return false;
      const tenantDomain = normalize(t.domain);
      return tenantDomain === hostNormalized;
    });

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
