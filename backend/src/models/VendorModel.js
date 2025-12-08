const pool = require("../../config/db");

const Vendor = {

  // 🔥 GET NEXT SERIAL LIKE VDR001, VDR002 ...
  async getNextVendorSerial(company_id) {
    const [rows] = await pool.execute(
      "SELECT vendor_id FROM vendors WHERE company_id = ? ORDER BY vendor_id DESC LIMIT 1",
      [company_id]
    );

    const last = rows.length ? rows[0].vendor_id : 0;
    const next = last + 1;

    // Always 3 digits → 001 / 023 / 250
    return String(next).padStart(3, "0");
  },
  
  async insertVendor(company_id, data) {

    // 🔥 Auto-generate VENDOR CODE here
    const serial = await this.getNextVendorSerial(company_id);
    const vendorCode = `VDR${serial}`;

    // Attach vendor_code inside JSON data
    data.vendor_code = vendorCode;

    const sql = `INSERT INTO vendors (company_id, data) VALUES (?, ?)`;
    const [res] = await pool.execute(sql, [
      company_id,
      JSON.stringify(data)
    ]);

    return { ...res, vendorCode };
  },

  async fetchVendorsByCompany(company_id) {
  const [rows] = await pool.execute(
    "SELECT vendor_id, company_id, data FROM vendors WHERE company_id = ? ORDER BY vendor_id DESC",
    [company_id]
  );

  return rows.map(r => {
    let json = {};

    if (typeof r.data === "object") {
      json = r.data;
    } else if (typeof r.data === "string") {
      try {
        json = JSON.parse(r.data);
      } catch {
        json = {};
      }
    }

    // vendor_name added WITHOUT modifying variable structure
    return {
      vendor_id: r.vendor_id,
      company_id: r.company_id,
      data: r.data,  // same as original
      vendor_name: json.vendor_name || ""  // new field
    };
  });
},


  async fetchVendorById(vendor_id) {
  const [rows] = await pool.execute(
    "SELECT vendor_id, company_id, data FROM vendors WHERE vendor_id = ?",
    [vendor_id]
  );

  const r = rows[0];
  if (!r) return null;

  let json = {};

  if (typeof r.data === "object") {
    json = r.data;
  } else if (typeof r.data === "string") {
    try {
      json = JSON.parse(r.data);
    } catch {
      json = {};
    }
  }

  return {
    vendor_id: r.vendor_id,
    company_id: r.company_id,
    data: r.data,        // unchanged
    vendor_name: json.vendor_name || ""  // new field
  };
},


  async updateVendor(vendor_id, data) {

  // 1) Fetch old vendor JSON first
  const [rows] = await pool.execute(
    "SELECT data FROM vendors WHERE vendor_id = ?",
    [vendor_id]
  );

  if (!rows.length) return;

  let oldData = {};

  try {
    oldData = typeof rows[0].data === "string"
      ? JSON.parse(rows[0].data)
      : rows[0].data;
  } catch (err) {
    oldData = {};
  }

  // 2) Always keep existing vendor_code
  data.vendor_code = oldData.vendor_code;

  // 3) Merge new fields with old fields
  const newData = { ...oldData, ...data };

  // 4) Save back to DB
  const sql = `
      UPDATE vendors
      SET data = ?
      WHERE vendor_id = ?
    `;

  return pool.execute(sql, [JSON.stringify(newData), vendor_id]);
},


  

  async deleteVendor(vendor_id) {
    const sql = "DELETE FROM vendors WHERE vendor_id = ?";
    await pool.execute(sql, [vendor_id]);
  }

};

module.exports = Vendor;
