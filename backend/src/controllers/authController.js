const pool = require("../../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function generateToken(payload) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRE || "7d";

  if (!secret) {
    console.error("❌ ERROR: JWT_SECRET is missing in environment variables");
    throw new Error("Server misconfiguration: JWT secret is missing");
  }

  return jwt.sign(payload, secret, { expiresIn });
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Find user
    const [rows] = await pool.execute(
      "SELECT user_id, company_id, data FROM users WHERE JSON_EXTRACT(data, '$.email') = ?",
      [email]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid email or password." });
    }

    const user = rows[0];

    // 2) Parse JSON
    let userData = user.data;
    if (typeof userData === "string") {
      userData = JSON.parse(userData);
    }

    // 3) Compare password hash
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid email or password." });
    }

    // 4) JWT
    const token = generateToken({
      user_id: user.user_id,
      company_id: user.company_id,
      email: userData.email,
      role: userData.role,
    });

    // 5) Response
    return res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        company_id: user.company_id,
        email: userData.email,
        phone: userData.phone || "",
        role: userData.role,
        full_name: userData.full_name || "",
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
    return res
      .status(500)
      .json({ success: false, error: "Server error: " + err.message });
  }
};
