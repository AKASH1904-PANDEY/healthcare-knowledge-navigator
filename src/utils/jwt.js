import jwt from "jsonwebtoken";

// Creates a signed token containing the user's id and role.
// We keep the payload minimal — just enough to identify and authorize
// the user on future requests, without re-querying the DB every time
// for basic role checks.
export function signToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Verifies a token and returns its decoded payload, or throws if invalid.
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
