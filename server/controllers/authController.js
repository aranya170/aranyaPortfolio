const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool, getFallbackStore, saveFallbackStore, testConnection } = require("../config/db");
const { JWT_SECRET } = require("../middleware/auth");

const MIN_PASSWORD_LENGTH = 8;

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  try {
    const isDbConnected = await testConnection();

    if (isDbConnected && pool) {
      const result = await pool.query("SELECT * FROM admin_users WHERE username = $1 OR email = $1", [username]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (match) {
          const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: "7d" }
          );
          return res.json({
            success: true,
            message: "Login successful",
            token,
            user: { id: user.id, username: user.username, email: user.email },
          });
        }
      }
    }

    // Fallback store is only consulted when Postgres is unreachable, and only via a bcrypt hash
    if (!isDbConnected) {
      const fallbackAdmin = getFallbackStore().admin;
      if (
        fallbackAdmin &&
        fallbackAdmin.password_hash &&
        (username === fallbackAdmin.username || username === fallbackAdmin.email) &&
        (await bcrypt.compare(password, fallbackAdmin.password_hash))
      ) {
        const token = jwt.sign(
          { id: 1, username: fallbackAdmin.username, email: fallbackAdmin.email },
          JWT_SECRET,
          { expiresIn: "7d" }
        );
        return res.json({
          success: true,
          message: "Login successful",
          token,
          user: { id: 1, username: fallbackAdmin.username, email: fallbackAdmin.email },
        });
      }
    }

    return res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (err) {
    console.error("Auth login error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "Username, email and password are required" });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ success: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  try {
    const isDbConnected = await testConnection();

    // Registration only bootstraps the very first admin account
    const adminExists =
      isDbConnected && pool
        ? (await pool.query("SELECT 1 FROM admin_users LIMIT 1")).rows.length > 0
        : Boolean(getFallbackStore().admin?.password_hash);
    if (adminExists) {
      return res.status(403).json({ success: false, message: "Registration is closed" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (isDbConnected && pool) {
      const result = await pool.query(
        "INSERT INTO admin_users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
        [username, email, hashedPassword]
      );
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.json({ success: true, message: "Admin created", token, user });
    }

    const store = getFallbackStore();
    store.admin = { username, email, password_hash: hashedPassword };
    saveFallbackStore(store);

    const token = jwt.sign({ id: 1, username, email }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ success: true, message: "Admin created in local storage", token, user: { id: 1, username, email } });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to register" });
  }
};

exports.me = async (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  if (!currentPassword || !newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ success: false, message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  try {
    const isDbConnected = await testConnection();

    if (isDbConnected && pool) {
      const userRes = await pool.query("SELECT * FROM admin_users WHERE id = $1", [userId]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      const user = userRes.rows[0];
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        return res.status(400).json({ success: false, message: "Current password does not match" });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.query("UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, userId]);
      return res.json({ success: true, message: "Password updated successfully" });
    }

    const store = getFallbackStore();
    if (!store.admin?.password_hash || !(await bcrypt.compare(currentPassword, store.admin.password_hash))) {
      return res.status(400).json({ success: false, message: "Current password does not match" });
    }
    delete store.admin.password;
    store.admin.password_hash = await bcrypt.hash(newPassword, 10);
    saveFallbackStore(store);
    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ success: false, message: "Failed to update password" });
  }
};
