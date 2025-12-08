// backend/src/models/CompanyModel.js
const pool = require('../../config/db');

exports.insertCompany = async (company) => {
  const sql = `INSERT INTO companies (company_name, address, gstin, email, phone, created_by)
               VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [
    company.company_name,
    company.address || null,
    company.gstin || null,
    company.email || null,
    company.phone || null,
    company.created_by || null
  ];
  const [result] = await pool.execute(sql, params);
  return { insertId: result.insertId };
};

exports.fetchCompanies = async () => {
  const [rows] = await pool.execute('SELECT * FROM companies ORDER BY company_id DESC');
  return rows;
};

exports.fetchCompanyById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM companies WHERE company_id = ?', [id]);
  return rows[0];
};

exports.updateCompany = async (id, company) => {
  const sql = `UPDATE companies SET company_name=?, address=?, gstin=?, email=?, phone=? WHERE company_id=?`;
  const params = [
    company.company_name,
    company.address || null,
    company.gstin || null,
    company.email || null,
    company.phone || null,
    id
  ];
  const [result] = await pool.execute(sql, params);
  return result;
};
