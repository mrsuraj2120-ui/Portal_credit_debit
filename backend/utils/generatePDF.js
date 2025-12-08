const PDFDocument = require("pdfkit");

module.exports = function generatePDF(data, rows) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 20 });

      // -------------------------------
      // BUFFER COLLECTION
      // -------------------------------
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // -------------------------------
      // TWO DECIMAL HELPER
      // -------------------------------
      const two = (v) => {
        if (v === null || v === undefined || v === "") return "";
        const n = Number(v);
        return isNaN(n) ? String(v) : n.toFixed(2);
      };

      

      // -----------------------------------
      // COMPANY HEADER
      // -----------------------------------
      doc.fontSize(20).text(data.companyName || "", { align: "left" });

      doc.moveDown(0.3);
      doc.fontSize(10).text(data.companyAddress || "", {
        width: 150,
        align: "left",
      });

      if (data.companyContact)
        doc.text("Contact: " + data.companyContact);

      if (data.companyPhone)
        doc.text("Phone: " + data.companyPhone);

      if (data.companyGST)
        doc.text("GSTIN: " + data.companyGST);

      const companyEndY = doc.y;

      // -----------------------------------
// RIGHT SIDE NOTE BLOCK (PERFECT ALIGNMENT)
// -----------------------------------
const rightX = 330;
const labelWidth = 120;   // label ki fixed width
const valuey = rightX + labelWidth + 5;

doc.fontSize(18).text(
  `${(data.noteType || "Credit").toUpperCase()} NOTE`,
  rightX,
  40
);

doc.fontSize(11);

// Line 1
doc.text("Credit/Debit Note No", rightX, 70);
doc.text(":  "+data.noteNo || "", valuey, 70, {
  align: "left",
});

// Line 2
doc.text("Date", rightX, 90);
doc.text(":  "+data.date || "", valuey, 90, {
  align: "left",
});

// Line 3
doc.text("Invoice No", rightX, 110);
doc.text(":  "+data.invoiceNo || "", valuey, 110, {
  align: "left",
});


      // -----------------------------------
      // VENDOR / CUSTOMER DETAILS
      // -----------------------------------
      doc.y = companyEndY + 30;

      doc.fontSize(12).text("Vender:", 20);
      doc.moveDown(0.3);

      doc.fontSize(14).text(data.customerName || "");

      doc.moveDown(0.2);
      doc.fontSize(10).text(data.customerAddress || "", {
        width: 150,
      });

      if (data.customerContact)
        doc.text("Contact: " + data.customerContact);

      if (data.customerPhone)
        doc.text("Phone: " + data.customerPhone);

      if (data.customerGST)
        doc.text("GSTIN: " + data.customerGST);

      doc.moveDown(1);

      // -----------------------------------
      // TABLE SETUP
      // -----------------------------------
      const tableX = 20;
      const tableWidth =
        doc.page.width -
        (doc.options.margins
          ? doc.options.margins.left + doc.options.margins.right
          : doc.options.margin * 2);

      const colWidths = [40, 150, 100, 50, 60, 60, 75];

      const headers = [
        "S.No",
        "Particulars",
        "Remarks",
        "Qty",
        "Rate",
        "Tax %",
        "Amount",
      ];

      const tableTop = doc.y;

      // HEADER BACKGROUND
      doc.rect(tableX, tableTop, tableWidth, 20)
        .fillAndStroke("#E0E0E0", "#000");
      doc.fillColor("#000");

      let x = tableX;

      headers.forEach((header, i) => {
        doc.fontSize(10).text(header, x + 5, tableTop + 5, {
          width: colWidths[i],
        });
        x += colWidths[i];
      });

      let y = tableTop + 20;

      // -----------------------------------
// TOTAL ACCUMULATORS
// -----------------------------------
let totalBasic = 0;
let totalTax = 0;
let grandTotal = 0;

// -----------------------------------
// TABLE BODY
// -----------------------------------
rows.forEach((row, index) => {
  doc.rect(tableX, y, tableWidth, 20).stroke();

  let cellX = tableX;

  // Extract values
  const qty = Number(row.qty || 0);
  const rate = Number(row.rate || 0);
  const taxPercent = Number(row.taxAmount || 0);

  // Calculations
  const basicAmount = qty * rate;
  const taxAmount = (basicAmount * taxPercent) / 100;
  const finalAmount = basicAmount + taxAmount;

  // Add to totals
  totalBasic += basicAmount;
  totalTax += taxAmount;
  grandTotal += finalAmount;

  const values = [
  index + 1,
  row.particulars,
  row.remarks,
  qty,
  two(rate),
  taxPercent + " %",     // Show percent with %
  two(finalAmount),
];

  values.forEach((val, i) => {
    const colWidth = colWidths[i];

    doc.text(String(val), cellX + 5, y + 5, {
      width: colWidth - 10,
      align: i >= 3 ? "" : "left",
    });

    cellX += colWidth;
  });

  y += 20;
});

const tableBottom = y;


      // -----------------------------------
      // AMOUNT IN WORDS
      // -----------------------------------
      doc.fontSize(11).text("Amount in Words:", 20, tableBottom + 20);
      doc.text(data.amountInWords || "", 20, tableBottom + 36);

      // -----------------------------------
// SUMMARY BOX
// -----------------------------------
const boxX =
  tableX +
  colWidths[0] +
  colWidths[1] +
  colWidths[2] +
  colWidths[3] +
  colWidths[4] -
  30;

const boxWidth = colWidths[5] + colWidths[6] + 50;
const boxY = tableBottom + 20;

doc.rect(boxX, boxY, boxWidth, 70).stroke();

const valueX = boxX + boxWidth - 8;

doc.fontSize(10);

doc.text("Amount", boxX + 8, boxY + 10);
doc.text(":    "+two(totalBasic), valueX - 90, boxY + 10, {
  width: 60,
  align: "right",
});

doc.text("Tax Amount", boxX + 8, boxY + 30);
doc.text(":    "+two(totalTax), valueX - 90, boxY + 30, {
  width: 60,
  align: "right",
});

doc.text("Total Amount", boxX + 8, boxY + 50);
doc.text(":    "+two(grandTotal), valueX - 90, boxY + 50, {
  width: 60,
  align: "right",
});


      // -----------------------------------
      // SIGNATURE
      // -----------------------------------
      const sigWidth = 200;
      const sigX = doc.page.width - doc.options.margin - sigWidth;
      const sigY = doc.page.height - doc.options.margin - 150;

      doc.fontSize(12).text(
        "For " + (data.companyName || ""),
        sigX,
        sigY,
        { width: sigWidth, align: "right" }
      );

      doc.text(
        "Authorized Signatory",
        sigX,
        sigY + 60,
        { width: sigWidth, align: "right" }
      );

      // -----------------------------------
// ADD WATERMARK AT THE END (PERFECT)
// -----------------------------------
if (data.status === "Canceled") {
  doc.save();

  doc.fontSize(100)
    .fillColor("red")
    .opacity(0.15)
    .rotate(-30, { origin: [300, 250] })
    .text("CANCELED", -100, 200, {
      width: 800,
      align: "center"
    });

  doc.restore();
}

      // end PDF stream
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};
