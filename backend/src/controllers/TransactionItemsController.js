// backend/src/controllers/transactionItemsController.js
const Items = require('../models/TransactionItemsModel');

exports.create = async (req, res, next) => {
  try {
    const transaction_id = req.body.transaction_id;
    const items = req.body.items; // expect array
    const r = await Items.insertItems(transaction_id, items);
    res.status(201).json({ ok: true, insertId: r.insertId });
  } catch (err) {
    next(err);
  }
};

exports.getByTransaction = async (req, res, next) => {
  try {
    const transaction_id = req.params.transactionId;
    const row = await Items.fetchItemsByTransaction(transaction_id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const transaction_id = req.params.transactionId;
    const items = req.body.items; // expect array
    await Items.updateItems(transaction_id, items);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const transaction_id = req.params.id;

    // Delete main transaction
    const sql1 = "DELETE FROM transactions WHERE transaction_id = ?";
    await db.execute(sql1, [transaction_id]);

    // Delete its items
    const sql2 = "DELETE FROM transaction_items WHERE transaction_id = ?";
    await db.execute(sql2, [transaction_id]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
