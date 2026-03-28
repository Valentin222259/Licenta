const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "belvedere-jwt-secret-2025-upt-licenta";

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Token lipsă" });
  }

  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, error: "Token invalid sau expirat" });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Acces interzis" });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
