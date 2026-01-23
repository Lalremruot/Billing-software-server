export const identifyTenant = async (req, res, next) => {
  try {
    const tenantHeader = req.headers["x-tenant-domain"];
    const host = tenantHeader || req.hostname;

    const normalize = (d) =>
      d.replace(/^https?:\/\//, "")
        .replace(/:\d+$/, "")
        .replace(/\/$/, "")
        .toLowerCase();

    const hostNormalized = normalize(host);

    const tenants = await UserModel.find();

    const tenant = tenants.find((t) =>
      t.domain && normalize(t.domain) === hostNormalized
    );

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
