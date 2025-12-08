// backend/src/models/TransactionModel.js
const pool = require('../../config/db');

// ------------------------------
// insertTransaction
// ------------------------------
exports.insertTransaction = async (company_id, vendor_id, details) => {

  const type = details.transaction_type;
  const transaction_id = await this.generateTransactionId(type);

  // Generate item IDs inside details.items[]
  if (Array.isArray(details.items)) {
    for (let i = 0; i < details.items.length; i++) {
      const itemNumber = (i + 1).toString().padStart(3, "0");
      details.items[i].item_id = "ITM" + itemNumber;
    }
  }

  const sql = `INSERT INTO transactions (transaction_id, company_id, vendor_id, details)
               VALUES (?, ?, ?, ?)`;

  const params = [
    transaction_id,
    company_id,
    vendor_id,
    JSON.stringify(details)
  ];

  const [result] = await pool.execute(sql, params);

  return { insertId: result.insertId, transaction_id };
};

// ------------------------------
// create (kept your original behavior)
// ------------------------------
exports.create = async (req, res, next) => {
  try {
    const { company_id: bodyCompanyId, vendor_id } = req.body;
    const company_id = bodyCompanyId || (req.user && req.user.company_id);

    if (!company_id) {
      return res.status(400).json({ ok: false, error: "company_id is required" });
    }
    if (!vendor_id) {
      return res.status(400).json({ ok: false, error: "vendor_id is required" });
    }

    const details = req.body.details || { ...req.body };
    delete details.company_id;
    delete details.vendor_id;

    const r = await exports.insertTransaction(company_id, vendor_id, details);

    res.status(201).json({
      ok: true,
      insertId: r.insertId,
      transaction_id: r.transaction_id
    });

  } catch (err) {
    next(err);
  }
};

// ------------------------------
// generateTransactionId
// ------------------------------
exports.generateTransactionId = async (type) => {
  const prefix = type === "Credit" ? "CRN" : "DBN";

  const [rows] = await pool.execute(
    "SELECT transaction_id FROM transactions ORDER BY transaction_id DESC LIMIT 1"
  );

  if (!rows.length || !rows[0].transaction_id) {
    return prefix + "001";
  }

  const lastId = rows[0].transaction_id;   // e.g., "CRN004"
  const lastNumber = parseInt(lastId.slice(3)) || 0;
  const nextNumber = (lastNumber + 1).toString().padStart(3, "0");

  return prefix + nextNumber;
};

// ------------------------------
// generateItemId
// ------------------------------
exports.generateItemId = async () => {
  const [rows] = await pool.execute(
    "SELECT item_id FROM transaction_items ORDER BY item_id DESC LIMIT 1"
  );

  if (!rows.length || !rows[0].item_id) {
    return "ITM001";
  }

  const lastId = rows[0].item_id; // "ITM007"
  const lastNumber = parseInt(lastId.slice(3)) || 0;
  const nextNumber = (lastNumber + 1).toString().padStart(3, "0");

  return "ITM" + nextNumber;
};

exports.fetchTransactionsByCompany = async (company_id) => {
  const [rows] = await pool.execute(
    `SELECT 
        t.transaction_id,
        t.company_id,
        t.vendor_id,
        t.details,
        JSON_UNQUOTE(JSON_EXTRACT(v.data, '$.vendor_name')) AS vendor_name
      FROM transactions t
      LEFT JOIN vendors v 
        ON t.vendor_id = v.vendor_id
      WHERE t.company_id = ?
      ORDER BY t.transaction_id DESC`,
    [company_id]
  );

  return rows;
};



// ------------------------------
// fetchTransactionById (FINAL FIXED)
// ------------------------------
exports.fetchTransactionById = async (transaction_id) => {
  const [rows] = await pool.execute(
    "SELECT transaction_id, company_id, vendor_id, details, created_at FROM transactions WHERE transaction_id = ?",
    [transaction_id]
  );

  if (!rows[0]) return null;

  const trx = rows[0];

  // vendor_id sanitize
  trx.vendor_id =
    trx.vendor_id === null ||
      trx.vendor_id === undefined ||
      trx.vendor_id === ""
      ? null
      : Number(trx.vendor_id);

  return trx;
};


// ------------------------------
// updateTransaction
// ------------------------------
exports.updateTransaction = async (transaction_id, details) => {
  const sql = `UPDATE transactions SET details = ? WHERE transaction_id = ?`;
  const params = [JSON.stringify(details), transaction_id];
  const [result] = await pool.execute(sql, params);
  return result;
};

// ------------------------------
// deleteTransaction
// ------------------------------
exports.deleteTransaction = async (transaction_id) => {
  const sql = `DELETE FROM transactions WHERE transaction_id = ?`;
  await pool.execute(sql, [transaction_id]);
};
