const pool = require("../../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Find user in database
    const [rows] = await pool.execute(
      "SELECT user_id, company_id, data FROM users WHERE JSON_EXTRACT(data, '$.email') = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid email or password." });
    }

    const user = rows[0];

    // 2) Parse JSON safely
    let userData = user.data;
    if (typeof userData === "string") {
      try {
        userData = JSON.parse(userData);
      } catch (e) {
        console.error("JSON parse error:", e);
        return res.status(500).json({ success: false, error: "Corrupted user data." });
      }
    }

    // 3) Compare hashed password
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Invalid email or password." });
    }

    // 4) Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        company_id: user.company_id,
        email: userData.email,
        role: userData.role   // FIXED
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    // 5) Return sanitized user
    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        company_id: user.company_id,
        email: userData.email,
        phone: userData.phone || "",
        role: userData.role,
        full_name: userData.full_name    // FIXED
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error." });
  }
};
