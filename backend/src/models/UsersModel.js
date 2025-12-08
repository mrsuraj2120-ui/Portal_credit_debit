const pool = require("../../config/db");
const bcrypt = require("bcryptjs");

const Users = {

  // ============================
  // GET ALL USERS
  // ============================
  async getAllUsers(company_id) {
    const [rows] = await pool.execute(
      `SELECT 
         user_id,
         JSON_UNQUOTE(JSON_EXTRACT(data, '$.full_name')) AS full_name,
         JSON_UNQUOTE(JSON_EXTRACT(data, '$.email')) AS email,
         JSON_UNQUOTE(JSON_EXTRACT(data, '$.phone')) AS phone,
         JSON_UNQUOTE(JSON_EXTRACT(data, '$.role')) AS role
       FROM users
       WHERE company_id = ?
       ORDER BY user_id DESC`,
      [company_id]
    );

    return rows;
  },

  // ============================
  // GET SINGLE USER
  // ============================
  async getUserById(user_id, company_id) {
    const [rows] = await pool.execute(
      `SELECT data FROM users WHERE user_id = ? AND company_id = ?`,
      [user_id, company_id]
    );

    if (!rows.length) return null;

    let userData = rows[0].data;
    if (typeof userData === "string") {
      userData = JSON.parse(userData);
    }

    return {
      user_id,
      full_name: userData.full_name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
    };
  },

  // ============================
  // GENERATE NEXT USER CODE
  // ============================
  async getNextUserCode(company_id) {
    const [rows] = await pool.execute(
      `SELECT user_id FROM users 
       WHERE company_id = ?
       ORDER BY user_id DESC
       LIMIT 1`,
      [company_id]
    );

    if (!rows.length) return "USR001";

    const last = rows[0].user_id; // e.g., USR004
    const lastNum = parseInt(last.replace("USR", "")) || 0;
    const nextNum = (lastNum + 1).toString().padStart(3, "0");

    return "USR" + nextNum;
  },

  // ============================
  // CREATE USER (WITH user_id + HASHED PASSWORD)
  // ============================
  async createUser(data) {
    const newUserId = await this.getNextUserCode(data.company_id);

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const jsonData = JSON.stringify({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      password: hashedPassword,
      created_at: new Date()
    });

    await pool.execute(
      `INSERT INTO users (user_id, company_id, data) VALUES (?, ?, ?)`,
      [newUserId, data.company_id, jsonData]
    );

    return newUserId;
  },

  // ============================
  // UPDATE USER (SAFE + HASH PASSWORD)
  // ============================
  async updateUser(user_id, company_id, data) {

    const [rows] = await pool.execute(
      `SELECT data FROM users WHERE user_id = ? AND company_id = ?`,
      [user_id, company_id]
    );

    if (!rows.length) return 0;

    let userData = rows[0].data;
    if (typeof userData === "string") {
      userData = JSON.parse(userData);
    }

    if (data.full_name) userData.full_name = data.full_name;
    if (data.email) userData.email = data.email;
    if (data.phone) userData.phone = data.phone;
    if (data.role) userData.role = data.role;

    // ✔ FIX: Hash password on update
    if (data.password) {
      userData.password = await bcrypt.hash(data.password, 10);
    }

    const updatedJson = JSON.stringify(userData);

    const [result] = await pool.execute(
      `UPDATE users SET data = ? WHERE user_id = ? AND company_id = ?`,
      [updatedJson, user_id, company_id]
    );

    return result.affectedRows;
  },

  // ============================
  // DELETE USER
  // ============================
  async deleteUser(user_id, company_id) {
    const [result] = await pool.execute(
      `DELETE FROM users WHERE user_id = ? AND company_id = ?`,
      [user_id, company_id]
    );
    return result.affectedRows;
  },
};

module.exports = Users;
