import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken, verifyToken } from "../utils/jwt.js";

const router = express.Router();

// POST /api/auth/signup
// Creates a new user. role defaults to "researcher" if not provided.
// (In a real deployment you'd want admin-only approval for the "doctor"
// role rather than letting anyone self-assign it — flagging that as a
// TODO for Phase 5, since it matters once review workflows are live.)
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: ["researcher", "doctor", "admin"].includes(role) ? role : "researcher",
    });

    const token = signToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Signup failed:", err.message);
    res.status(500).json({ error: "Signup failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login failed:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
// Returns the logged-in user's own profile — useful for the frontend to
// check "who am I" after page reloads, without re-sending credentials.
router.get("/me", async (req, res) => {
  // Lightweight inline check instead of importing requireAuth, since this
  // route's failure mode (no token) should just mean "not logged in",
  // not a hard 401 block on a protected resource.
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = verifyToken(authHeader.split(" ")[1]);
    const user = await User.findById(decoded.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
