const path = require("path");
const generatePDF = require("../../utils/generatePDF");
const Transaction = require('../models/TransactionModel');
const Vendor = require("../models/VendorModel");
const pool = require("../../config/db");

// Convert Number to Indian Format Words (handles only integer portion)
function numberToWords(num) {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
    "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];

  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  if (num === 0) return "Zero";
  if (num < 20) return a[num];
  if (num < 100)
    return (b[Math.floor(num / 10)] + " " + a[num % 10]).trim();
  if (num < 1000)
    return (a[Math.floor(num / 100)] + " Hundred " + numberToWords(num % 100)).trim();
  if (num < 100000)
    return (numberToWords(Math.floor(num / 1000)) + " Thousand " + numberToWords(num % 1000)).trim();
  if (num < 10000000)
    return (numberToWords(Math.floor(num / 100000)) + " Lakh " + numberToWords(num % 100000)).trim();

  return (
    numberToWords(Math.floor(num / 10000000)) +
    " Crore " +
    numberToWords(num % 10000000)
  ).trim();
}


// Helper to convert rupees + paise to words (Indian style)
function amountToWordsWithPaise(amount) {
  const n = Number(amount || 0);
  if (isNaN(n)) return "";

  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);

  const rupeePart = numberToWords(rupees);

  if (paise > 0) {
    const paisePart = numberToWords(paise);
    return `${rupeePart} Rupees and ${paisePart} Paise Only`;
  } else {
    return `${rupeePart} Rupees Only`;
  }
}




// ------------------------------
// PDF GENERATION CONTROLLER
// ------------------------------
exports.generatePDF = async (req, res) => {
  try {
    const id = req.params.id;

    // 1) Fetch transaction
    const trx = await Transaction.fetchTransactionById(id);
    if (!trx) return res.status(404).json({ message: "Transaction not found" });

    // 2) Parse JSON safely (details stored as JSON string in DB)
    // 100% safe JSON parsing
let details = {};

try {
  if (Buffer.isBuffer(trx.details)) {
    // Convert Buffer → String → JSON
    details = JSON.parse(trx.details.toString());
  } else if (typeof trx.details === "string") {
    // Normal JSON string
    details = JSON.parse(trx.details);
  } else if (typeof trx.details === "object") {
    // Already parsed JSON object
    details = trx.details;
  } else {
    details = {};
  }
} catch (err) {
  console.error("Invalid JSON in trx.details:", err);
  details = {};
}





    // 3) Fetch company info (columns may or may not include contact_person)
    const [compRows] = await pool.execute(
      "SELECT company_name, address, gstin, phone, contact_person FROM companies WHERE company_id = ?",
      [trx.company_id]
    );
    const company = compRows[0] || {};

// 4) Fetch vendor using SAME LOGIC as VendorModel.js
let vendorData = {};
let vendor = await Vendor.fetchVendorById(trx.vendor_id);

if (vendor && vendor.data) {
  if (typeof vendor.data === "object") {
    vendorData = vendor.data;
  } else {
    try {
      vendorData = JSON.parse(vendor.data);
    } catch {
      vendorData = {};
    }
  }
}

const vendorName = vendorData.vendor_name || "";
const vendorAddress = vendorData.address || "";
const vendorPhone = vendorData.phone || "";
const vendorContact = vendorData.contact_person || "";
const vendorGST = vendorData.gstin || "";


    // Amount in words (robust with paise)
    const totalAmountNumber = Number(details.total_amount || details.totalAmount || 0);
    const amountWords = amountToWordsWithPaise(totalAmountNumber);

    // Final Data Object (sent to generatePDF)
    const data = {
      noteType: details.transaction_type || "Debit",
      noteNo: trx.transaction_id,
      date: details.transaction_date || details.transaction_date || "",
      invoiceNo: details.invoice_no || details.invoiceNo || "",

      // company
      companyName: company.company_name || "",
      companyAddress: company.address || "",
      companyPhone: company.phone || "",
      companyContact: company.contact_person || "",
      companyGST: company.gstin || company.gst || "",

      // vendor (customer)
      customerName: vendorName,
      customerAddress: vendorAddress,
      customerPhone: vendorPhone,
      customerContact: vendorContact,
      customerGST: vendorGST,

      // summary
      itemamount: details.item_amount || details.sub_total || 0,
      taxAmount: details.tax_amount || details.tax_total || 0,
      totalAmount: totalAmountNumber,
      amountInWords: amountWords,
    };

    // ⭐ ADD THIS ⭐
data.status = details.status || "";
console.log("STATUS PASSED TO PDF:", data.status);


    // Table rows (safe mapping — support multiple key names)
    const items = Array.isArray(details.items) ? details.items : [];
    const rows = items.map((i, idx) => {
      const qty = (i.qty != null) ? i.qty : (i.quantity != null ? i.quantity : 0);
      const rate = (i.rate != null) ? i.rate : (i.price != null ? i.price : 0);
      const tax = (i.tax != null) ? i.tax : (i.taxAmount != null ? i.taxAmount : 0);
      const amount = (Number(qty) * Number(rate)) + Number(tax || 0);
      return {
        particulars: i.particulars || i.description || "",
        remarks: i.remarks || i.note || "",
        qty,
        rate,
        taxAmount: tax,
        amount
      };
    });

    // 7) generate PDF Buffer
    const pdfBuffer = await generatePDF(data, rows);

    // 8) send inline to browser (preview)
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=${trx.transaction_id}.pdf`,
      "Content-Length": pdfBuffer.length,
    });
    return res.end(pdfBuffer);

  } catch (err) {
    console.error("PDF error:", err);
    return res.status(500).json({
      error: "Failed to generate PDF",
      details: err.message,
    });
  }
};

// ------------------------------
// CREATE TRANSACTION
// (kept your original logic intact)
// ------------------------------
exports.create = async (req, res) => {
  try {
    const { company_id: bodyCompanyId, vendor_id } = req.body;
    const company_id = bodyCompanyId || (req.user && req.user.company_id);

    if (!company_id)
      return res.status(400).json({ ok: false, error: "company_id is required" });
    if (!vendor_id)
      return res.status(400).json({ ok: false, error: "vendor_id is required" });

    const details = req.body.details || { ...req.body };
    delete details.company_id;
    delete details.vendor_id;

    const r = await Transaction.insertTransaction(company_id, vendor_id, details);
    res.status(201).json({ ok: true, insertId: r.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// ------------------------------
// OTHER CRUD
// (kept your original endpoints and logic)
// ------------------------------
exports.listByCompany = async (req, res) => {
  try {
    const rows = await Transaction.fetchTransactionsByCompany(req.params.companyId);
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.getById = async (req, res) => {
  try {
    const row = await Transaction.fetchTransactionById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.update = async (req, res) => {
  try {
    await Transaction.updateTransaction(req.params.id, req.body.details || req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.delete = async (req, res) => {
  try {
    await pool.execute("DELETE FROM transactions WHERE transaction_id = ?", [req.params.id]);
    await pool.execute("DELETE FROM transaction_items WHERE transaction_id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json(err);
  }
};

// ===============================
// CANCEL TRANSACTION
// ===============================
exports.cancel = async (req, res) => {
  try {
    const id = req.params.id;

    await pool.execute(
      "UPDATE transactions SET details = JSON_SET(details, '$.status', 'Canceled') WHERE transaction_id = ?",
      [id]
    );

    res.json({ ok: true, message: "Transaction canceled" });
  } catch (err) {
    console.error("Cancel Error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

