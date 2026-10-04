import { verifyToken } from "../utils/jwt.js";

// requireAuth: checks for a valid JWT in the Authorization header.
// On success, attaches { userId, role } to req.user for downstream routes.
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; // expected: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { userId, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// requireRole: use AFTER requireAuth. Restricts a route to specific roles.
// Usage: router.post("/review", requireAuth, requireRole("doctor", "admin"), handler)
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions for this action" });
    }
    next();
  };
}
