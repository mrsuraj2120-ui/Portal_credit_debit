// backend/src/controllers/companyController.js
const Company = require('../models/CompanyModel');

exports.create = async (req, res, next) => {
  try {
    const payload = req.body;
    const r = await Company.insertCompany(payload);
    res.status(201).json({ ok: true, insertId: r.insertId });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const rows = await Company.fetchCompanies();
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const row = await Company.fetchCompanyById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    await Company.updateCompany(id, payload);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
