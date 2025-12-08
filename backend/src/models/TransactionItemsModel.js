// backend/src/models/TransactionItemsModel.js
const pool = require('../../config/db');

exports.insertItems = async (transaction_id, itemsArray) => {
  const sql = `INSERT INTO transaction_items (transaction_id, items) VALUES (?, ?)`;
  const params = [transaction_id, JSON.stringify(itemsArray)];
  const [result] = await pool.execute(sql, params);
  return { insertId: result.insertId };
};

exports.fetchItemsByTransaction = async (transaction_id) => {
  const [rows] = await pool.execute('SELECT item_group_id, transaction_id, items FROM transaction_items WHERE transaction_id = ?', [transaction_id]);
  return rows[0];
};

exports.updateItems = async (transaction_id, itemsArray) => {
  const sql = `UPDATE transaction_items SET items = ? WHERE transaction_id = ?`;
  const params = [JSON.stringify(itemsArray), transaction_id];
  const [result] = await pool.execute(sql, params);
  return result;
};

exports.deleteTransaction = async (transaction_id) => {
  const sql = `DELETE FROM transactions WHERE transaction_id = ?`;
  await pool.execute(sql, [transaction_id]);
};
