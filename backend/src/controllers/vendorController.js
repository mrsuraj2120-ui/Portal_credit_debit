
const Vendor = require("../models/VendorModel");

exports.create = async (req, res, next) => {
  try {
    const company_id = req.params.companyId || req.body.company_id;
    const data = req.body.data || req.body;

    const result = await Vendor.insertVendor(company_id, data);

    res.status(201).json({
      ok: true,
      insertId: result.insertId,
      vendor_code: result.vendorCode
    });

  } catch (err) {
    next(err);
  }
};


exports.listByCompany = async (req, res, next) => {
  try {
    const company_id = req.params.companyId;
    const rows = await Vendor.fetchVendorsByCompany(company_id);

    const finalData = rows.map(r => {
      let json = {};

      if (typeof r.data === "object") {
        json = r.data;
      } else if (typeof r.data === "string") {
        try {
          json = JSON.parse(r.data);
        } catch (e) {
          console.error("JSON parse error vendor:", r.vendor_id);
          json = {};
        }
      }

      return {
        vendor_id: r.vendor_id,
        company_id: r.company_id,
        vendor_code: json.vendor_code || "",   // 🔥 new
        ...json
      };
    });

    res.json(finalData);

  } catch (err) {
    console.error("Vendor List Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};





exports.getById = async (req, res, next) => {
  try {
    const vendor_id = req.params.id;
    const row = await Vendor.fetchVendorById(vendor_id);

    if (!row) return res.status(404).json({ error: "Vendor not found" });

    let json = {};

    // 🔥 Prevent crash: detect if already object
    if (typeof row.data === "object") {
      json = row.data;
    } else if (typeof row.data === "string") {
      try {
        json = JSON.parse(row.data);
      } catch (e) {
        console.error("JSON PARSE ERROR:", e);
        json = {};
      }
    }

    res.json({
      vendor_id: row.vendor_id,
      company_id: row.company_id,
      ...json
    });

  } catch (err) {
    console.error("Get Vendor Error:", err);
    next(err);
  }
};



// ===============================
// UPDATE Vendor (NEWLY ADDED)
// ===============================
exports.update = async (req, res, next) => {
  try {
    const vendor_id = req.params.id;
    const data = req.body.data || req.body;

    await Vendor.updateVendor(vendor_id, data);

    res.json({
      ok: true,
      message: "Vendor updated successfully"
    });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const vendor_id = req.params.id;
    await Vendor.deleteVendor(vendor_id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
