// frontend/public/js/transactions.js

// ------------------------------
// TRANSACTIONS PAGE SCRIPT
// ------------------------------
document.addEventListener("DOMContentLoaded", initTransactionsPage);

let currentCompanyId = null;
let itemsState = [];          // array of item objects for the create form
let editTransactionId = null; // when editing
let vendorsCache = [];        // cached vendors list

async function initTransactionsPage() {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;
  if (!user) {
    window.location.href = "/pages/login.html";
    return;
  }

  currentCompanyId = user.company_id;

  bindUI();
  await loadVendors();
  await loadTransactions();

  // start with one empty item row disabled until vendor selected
  renderItems();
  toggleItemControls(false);
}

// =========================================
// UPDATED BLOCK — UI BINDING WITH DATE LOGIC (CLEAN + FIXED)
// =========================================
function bindUI() {
  const vendorSelect = document.getElementById("tvendor");
  if (vendorSelect) vendorSelect.disabled = true;

  // ❌ REMOVE all addEventListener for vendor add
  // ❌ REMOVE addEventListener for add-item, remove-item, submit, draft

  // KEEP ONLY edit modal logic
  document.getElementById("editModal")?.addEventListener("click", (e) => {
    if (e.target.id === "editModal") closeEdit();
  });

  // DATE LOGIC
  const today = new Date().toISOString().slice(0, 10);
  const dateInput = document.getElementById("tdate");

  dateInput.value = today;
  dateInput.setAttribute("min", today);

  dateInput.addEventListener("change", () => {
    const val = dateInput.value;
    if (val && val >= today) {
      vendorSelect.disabled = false;
    } else {
      vendorSelect.disabled = true;
      vendorSelect.value = "";
      freshToast("Backdate not allowed", "error");
    }
  });
}




// ------------------------------
// VENDORS
// ------------------------------
async function loadVendors() {
  try {
    showLoader("Loading vendors...");
    const res = await fetch(`/api/vendors/${currentCompanyId}`, {
      headers: authHeaders()
    });
    const list = await res.json();
    vendorsCache = Array.isArray(list) ? list : [];

    populateVendorSelect(vendorsCache);
  } catch (err) {
    console.error("loadVendors:", err);
    freshToast("Unable to load vendors", "error");
  } finally {
    hideLoader();
  }
}

function populateVendorSelect(vendors) {
  const sel = document.getElementById("tvendor");
  if (!sel) return;
  sel.innerHTML = "";

  // default
  const optDefault = document.createElement("option");
  optDefault.value = "";
  optDefault.textContent = "-- Select Vendor --";
  sel.appendChild(optDefault);

  // existing vendors
  vendors.forEach(v => {
    const option = document.createElement("option");
    option.value = v.vendor_id;
    option.textContent = `${v.vendor_code ? v.vendor_code + " — " : ""}${v.vendor_name || v.vendor_code || "Vendor " + v.vendor_id}`;
    sel.appendChild(option);
  });

  // divider & add new option
  const addOpt = document.createElement("option");
  addOpt.value = "__new__";
  addOpt.textContent = "➕ Add new vendor";
  sel.appendChild(addOpt);

  // enable selection now
  sel.disabled = false;
}

// =========================================
// FIXED BLOCK — VENDOR SELECTION WITH NEW VENDOR FORM
// =========================================
function onVendorSelect() {
  const sel = document.getElementById("tvendor");
  const dateInput = document.getElementById("tdate");
  const items = document.getElementById("itemsContainer");
  const newVendorForm = document.getElementById("newVendorForm");

  const today = new Date().toISOString().slice(0, 10);

  // date check
  if (!dateInput.value || dateInput.value < today) {
    sel.value = "";
    sel.disabled = true;
    items.classList.add("hidden");
    newVendorForm.classList.add("hidden");
    freshToast("Select a valid date first", "error");
    return;
  }

  const selected = sel.value;

  // CASE 1: NEW VENDOR SELECTED
  if (selected === "__new__") {
    newVendorForm.classList.remove("hidden"); // SHOW NEW VENDOR FORM
    items.classList.add("hidden");            // HIDE ITEM TABLE
    toggleItemControls(false);
    return;
  }

  // CASE 2: NOTHING SELECTED
  if (!selected) {
    newVendorForm.classList.add("hidden");
    items.classList.add("hidden");
    toggleItemControls(false);
    return;
  }

  // CASE 3: EXISTING VENDOR SELECTED
  newVendorForm.classList.add("hidden");      // HIDE NEW VENDOR FORM
  items.classList.remove("hidden");           // SHOW ITEMS TABLE
  toggleItemControls(true);
}




// create vendor inline
async function addNewVendor() {
  const name = document.getElementById("newVendorName").value.trim();
  const gst = document.getElementById("newVendorGST").value.trim();
  const email = document.getElementById("newVendorEmail").value.trim();
  const phone = document.getElementById("newVendorPhone").value.trim();
  const address = document.getElementById("newVendorAddress").value.trim();

  if (!name) return freshToast("Vendor name required", "error");

  try {
    showLoader("Adding vendor...");
    const payload = {
      vendor_name: name,
      gstin: gst,
      email,
      phone,
      address
    };

    const res = await fetch(`/api/vendors/${currentCompanyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    hideLoader();

    if (!data.ok) {
      freshToast("Unable to add vendor", "error");
      return;
    }

    freshToast("Vendor added", "success");

    // reload vendors and auto-select created vendor (returned insertId)
    await loadVendors();

    // try to select the newly added vendor by insertId (best effort)
    if (data.insertId) {
      document.getElementById("tvendor").value = String(data.insertId);
      toggleItemControls(true);
    } else {
      document.getElementById("tvendor").value = "";
    }

    // clear new vendor form
    document.getElementById("newVendorName").value = "";
    document.getElementById("newVendorGST").value = "";
    document.getElementById("newVendorEmail").value = "";
    document.getElementById("newVendorPhone").value = "";
    document.getElementById("newVendorAddress").value = "";

    document.getElementById("newVendorForm").classList.add("hidden");

  } catch (err) {
    hideLoader();
    console.error("addNewVendor:", err);
    freshToast("Server error", "error");
  }
}

// ------------------------------
// ITEMS MANAGEMENT (create form)
// ------------------------------
function toggleItemControls(enable) {
  document.getElementById("addItemBtn").disabled = !enable;
  document.getElementById("removeItemBtn").disabled = !enable;
  const container = document.getElementById("itemsContainer");
  if (enable) {
    container.classList.remove("pointer-events-none", "opacity-60");
  } else {
    container.classList.add("pointer-events-none", "opacity-60");
  }
}

function renderItems() {
  const container = document.getElementById("itemsContainer");
  container.innerHTML = ""

  itemsState.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "grid grid-cols-8 gap-2 mb-2 items-center";

      row.innerHTML = `
        <select data-idx="${idx}" class="p-2 border rounded col-span-1.5 input-particulars">
  <option value="">-- Select --</option>
  <option ${it.particulars === "Rate Difference" ? "selected" : ""}>Rate Difference</option>
  <option ${it.particulars === "Short Quantity" ? "selected" : ""}>Short Quantity</option>
  <option ${it.particulars === "Rejection" ? "selected" : ""}>Rejection</option>
  <option ${it.particulars === "Shrinkage" ? "selected" : ""}>Shrinkage</option>
  <option ${it.particulars === "Colour Fastness" ? "selected" : ""}>Colour Fastness</option>
  <option ${it.particulars === "Wastage" ? "selected" : ""}>Wastage</option>
  <option ${it.particulars === "L-Fold / Width" ? "selected" : ""}>L-Fold / Width</option>
  <option ${it.particulars === "Re Processing Charges" ? "selected" : ""}>Re Processing Charges</option>
  <option ${it.particulars === "Others" ? "selected" : ""}>Others</option>
</select>

        <input data-idx="${idx}" class="p-2 border rounded col-span-1.5 input-remarks" placeholder="Remarks" value="${escapeHtml(it.remarks || "")}" />
        <input data-idx="${idx}" type="number" min="0" class="p-2 border rounded input-qty" placeholder="Qty" value="${it.qty ?? ""}" />
        <input data-idx="${idx}" type="number" min="0" step="0.01" class="p-2 border rounded input-rate" placeholder="Rate" value="${it.rate ?? ""}" />
        <input data-idx="${idx}" type="number" min="0" step="0.01" class="p-2 border rounded input-tax" placeholder="Tax %" value="${it.tax ?? ""}" />
        <div class="p-2 border rounded text-right font-semibold text-sm" id="rowTotal${idx}">₹ ${formatMoney(rowTotal(it))}</div>
      `;

    container.appendChild(row);
  });

  container.querySelectorAll(
    ".input-qty, .input-rate, .input-tax, .input-particulars, .input-remarks"
  ).forEach(el => {
    el.addEventListener("input", onItemInputChange);
  });
}


function showParticularsDropdown(input, idx) {
  const dd = document.getElementById(`dropdown-${idx}`);
  const value = input.value.toLowerCase();

  if (!value) {
    dd.classList.remove("hidden");
    return;
  }

  Array.from(dd.children).forEach(option => {
    const text = option.innerText.toLowerCase();
    option.style.display = text.includes(value) ? "block" : "none";
  });

  dd.classList.remove("hidden");
}

function selectParticular(idx, value) {
  const input = document.querySelector(`.input-particulars[data-idx="${idx}"]`);
  input.value = value;
  itemsState[idx].particulars = value;

  document.getElementById(`dropdown-${idx}`).classList.add("hidden");
}


function addItemRow() {
  itemsState.push({ particulars: "", remarks: "", qty: "", rate: "", tax: "" });
  renderItems();
}

function removeLastItem() {
  if (itemsState.length === 0) return;

  itemsState.pop();  // remove last item
  renderItems();     // re-render UI cleanly
}

function onItemInputChange(e) {
  const idx = Number(e.target.getAttribute("data-idx"));
  const row = itemsState[idx];
  if (!row) return;

  if (e.target.classList.contains("input-particulars")) {
    row.particulars = e.target.value.trim();
  } 
  else if (e.target.classList.contains("input-remarks")) {
    row.remarks = e.target.value.trim();
  }
  else if (e.target.classList.contains("input-qty")) {
    row.qty = Number(e.target.value || 0);
  } 
  else if (e.target.classList.contains("input-rate")) {
    row.rate = Number(e.target.value || 0);
  } 
  else if (e.target.classList.contains("input-tax")) {
    row.tax = Number(e.target.value || 0);
  }

  // update UI total
  const totalEl = document.getElementById(`rowTotal${idx}`);
  if (totalEl) totalEl.innerText = `₹ ${formatMoney(rowTotal(row))}`;
}


function rowTotal(item) {
  const subtotal = (Number(item.qty) || 0) * (Number(item.rate) || 0);
  const taxAmount = subtotal * ((Number(item.tax) || 0) / 100);
  return subtotal + taxAmount;
}

function calculateTotals() {
  let total = 0;
  itemsState.forEach(it => total += rowTotal(it));
  return total;
}

// ------------------------------
// SUBMIT / DRAFT (create transaction)
// ------------------------------
async function submitTransaction(status = "Created") {
  // collect basic
  const transaction_type = document.getElementById("type").value;
  const transaction_date = document.getElementById("tdate").value || new Date().toISOString().slice(0, 10);
  const vendorValue = document.getElementById("tvendor").value;

  let vendor_id = null;
  if (vendorValue === "__new__" || !vendorValue) {
    freshToast("Please select or add a vendor before submitting", "error");
    return;
  } else {
    vendor_id = vendorValue;
  }

  // ITEMS REQUIRED FOR BOTH (Submit + Draft)
  if (!itemsState.length) {
    freshToast("Add at least one item", "error");
    return;
  }

  // ------------------------------
  // FULL VALIDATION ONLY FOR SUBMIT
  // ------------------------------
  if (status === "Created") {
    for (let i = 0; i < itemsState.length; i++) {
      const it = itemsState[i];

      if (!it.particulars) {
        freshToast("Item particulars required", "error");
        return;
      }
      if ((Number(it.qty) || 0) <= 0) {
        freshToast("Item qty must be >0", "error");
        return;
      }
      if ((Number(it.rate) || 0) <= 0) {
        freshToast("Item rate must be >0", "error");
        return;
      }
      if ((Number(it.tax) || 0) <= 0) {
        freshToast("Item tax % must be >0", "error");
        return;
      }
    }
  }

  const total_amount = calculateTotals();

  const payload = {
    company_id: currentCompanyId,
    transaction_type,
    transaction_date,
    vendor_id,
    status,
    total_amount,
    items: itemsState
  };

  try {
    showLoader(status === "Draft" ? "Saving draft..." : "Submitting...");
    const res = await fetch(`/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    hideLoader();

    if (!data || !data.ok) {
      freshToast(data?.error || "Unable to submit transaction", "error");
      return;
    }

    freshToast(status === "Draft" ? "Saved as draft" : "Transaction submitted", "success");

    // reset form and items
    itemsState = [];
    renderItems();
    resetCreateForm();
    await loadTransactions();

  } catch (err) {
    hideLoader();
    console.error("submitTransaction:", err);
    freshToast("Server error", "error");
  }
}


function resetCreateForm() {
  document.getElementById("type").value = "Debit";
  document.getElementById("tdate").value = new Date().toISOString().slice(0,10);
  document.getElementById("tvendor").value = "";
  document.getElementById("newVendorForm").classList.add("hidden");
  toggleItemControls(false);

  // clear new vendor inputs
  ["newVendorName","newVendorGST","newVendorEmail","newVendorPhone","newVendorAddress"].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

// ------------------------------
// TRANSACTIONS LIST & TABLE
// ------------------------------
async function loadTransactions() {
  try {
    showLoader("Loading transactions...");
    const res = await fetch(`/api/transactions/company/${currentCompanyId}`, {
      headers: authHeaders()
    });

    const list = await res.json();
    renderTransactionsTable(Array.isArray(list) ? list : []);
  } catch (err) {
    console.error("loadTransactions:", err);
    freshToast("Unable to load transactions", "error");
  } finally {
    hideLoader();
  }
}

function renderTransactionsTable(rows) {
  const tbody = document.getElementById("transTable");
  tbody.innerHTML = "";

  rows.forEach(r => {
    // DETAILS JSON READ
    const d = r.details || {};
    const id = r.transaction_id || "-";
    const type = d.transaction_type || "-";
    const status = d.status || "-";
    const date = d.transaction_date || "-";
    const total = Number(d.total_amount || 0);

    // TAX: if multiple items, take avg tax OR first tax
    let tax = "-";
    if (Array.isArray(d.items) && d.items.length > 0) {
      tax = d.items[0].tax ?? "-";
    }

    // GET VENDOR NAME FROM vendor_id
    let vendorName = "-";
    const vendorObj = vendorsCache.find(v => v.vendor_id == r.vendor_id);
    if (vendorObj) vendorName = vendorObj.vendor_name || `Vendor ${vendorObj.vendor_id}`;

    // -----------------------------
// ACTION BUTTONS (CONDITIONAL)
// -----------------------------
if (status === "Created") {
  actionHtml = `
    <button class="px-3 py-1 rounded bg-green-600 text-white text-sm mr-2 w-[90px] text-center"
      onclick="viewPDF('${id}')">
      Download
    </button>
    <button class="px-3 py-1 rounded bg-red-600 text-white text-sm w-[90px] text-center"
      onclick="confirmCancel('${id}')">
      Cancel
    </button>
  `;

} else if (status === "Canceled") {
  actionHtml = `
    <button class="px-4 py-1 rounded bg-blue-600 text-white text-sm text-center whitespace-nowrap"
      onclick="viewPDF('${id}')">
      Download Canceled Note
    </button>
  `;

} else {
  actionHtml = `
    <button class="px-3 py-1 rounded bg-yellow-500 text-white text-sm mr-2 w-[90px] text-center"
      onclick="editTransaction('${id}')">
      Edit
    </button>
    <button class="px-3 py-1 rounded bg-red-600 text-white text-sm w-[90px] text-center"
      onclick="deleteTransaction('${id}')">
      Delete
    </button>
  `;
}




    // TABLE ROW
    const tr = document.createElement("tr");
    tr.className = "border-b";
    tr.innerHTML = `
      <td class="px-4 py-2">${id}</td>
      <td class="px-4 py-2">${type}</td>
      <td class="px-4 py-2">${status}</td>
      <td class="px-4 py-2">${date}</td>
      <td class="px-4 py-2">${escapeHtml(vendorName)}</td>
      <td class="px-4 py-2">${tax} %</td>
      <td class="px-4 py-2 text-center">₹ ${formatMoney(total)}</td>
      <td class="px-4 py-2 text-center flex gap-2 justify-center">
        ${actionHtml}
      </td>
    `;

    tbody.appendChild(tr);
  });
}



// ------------------------------
// EDIT TRANSACTION
// ------------------------------
async function editTransaction(id) {
  try {
    showLoader("Loading transaction...");
    const res = await fetch(`/api/transactions/${id}`, { headers: authHeaders() });
    const data = await res.json();
    hideLoader();

    const details =
      typeof data.details === "string"
        ? JSON.parse(data.details)
        : (data.details || data);

    if (!details) {
      freshToast("Transaction not found", "error");
      return;
    }

    editTransactionId = id;

    // ID
    document.getElementById("editTxnId").innerText = id;

    // TYPE — LOCKED
    const typeEl = document.getElementById("editType");
    typeEl.value = details.transaction_type || "Debit";
    typeEl.disabled = true;

    // DATE — UNLOCKED
    const dateEl = document.getElementById("editDate");
    dateEl.value = details.transaction_date;
    dateEl.disabled = false;

    // -------------------------
    // FIX — MAKE SURE vendors ARE LOADED
    // -------------------------
    if (!vendorsCache || vendorsCache.length === 0) {
      await loadVendors(); 
    }

    // -------------------------
    // POPULATE DROPDOWN WITH CORRECT VENDOR
    // -------------------------
    const vendorSelect = document.getElementById("editVendor");
    vendorSelect.innerHTML = "<option value=''>-- Select --</option>";

    vendorsCache.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.vendor_id;
      opt.textContent = v.vendor_name || ("Vendor " + v.vendor_id);
      vendorSelect.appendChild(opt);
    });

    vendorSelect.value = String(details.vendor_id); // <-- IMPORTANT

    vendorSelect.disabled = false;

    // -------------------------
    // ITEMS
    // -------------------------
    renderEditItems(details.items || []);

    document.getElementById("editModal").classList.remove("hidden");

  } catch (err) {
    hideLoader();
    console.error("EDIT ERROR:", err);
    freshToast("Unable to load transaction", "error");
  }
}





// ------------------------------
// RENDER EDIT ITEMS (with REMARKS + SELECT DROPDOWN)
// ------------------------------
function renderEditItems(items = []) {
  const c = document.getElementById("editItemsContainer");
  c.innerHTML = "";

  const options = [
    "Rate Difference",
    "Short Quantity",
    "Rejection",
    "Shrinkage",
    "Colour Fastness",
    "Wastage",
    "L-Fold / Width",
    "Re Processing Charges",
    "Others"
  ];

  items.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "grid grid-cols-7 gap-2 mb-2 items-center";

    // build options HTML
    const opts = options
      .map(o => `<option value="${o}" ${it.particulars === o ? "selected" : ""}>${o}</option>`)
      .join("");

    row.innerHTML = `
      <select data-idx="${idx}" class="p-2 border rounded col-span-1.5 edit-particulars">
        <option value="">-- Select --</option>
        ${opts}
      </select>

      <input data-idx="${idx}" class="p-2 border rounded edit-remarks"
        placeholder="Remarks" value="${escapeHtml(it.remarks || "")}" />

      <input data-idx="${idx}" type="number" min="0"
        class="p-2 border rounded edit-qty" placeholder="Qty"
        value="${it.qty ?? ""}" />

      <input data-idx="${idx}" type="number" min="0" step="0.01"
        class="p-2 border rounded edit-rate" placeholder="Rate"
        value="${it.rate ?? ""}" />

      <input data-idx="${idx}" type="number" min="0" step="0.01"
        class="p-2 border rounded edit-tax" placeholder="Tax %"
        value="${it.tax ?? 0}" />

      <div class="p-2 border rounded text-right font-semibold text-sm"
        id="editRowTotal${idx}">
        ₹ ${formatMoney(rowTotal(it))}
      </div>
    `;

    c.appendChild(row);
  });

  // Listeners for recalculation
  c.querySelectorAll(
    ".edit-qty, .edit-rate, .edit-tax, .edit-particulars, .edit-remarks"
  ).forEach((el) => {
    el.addEventListener("input", () => {
      const idx = Number(el.getAttribute("data-idx"));
      const row = getEditItemRow(idx);
      document.getElementById(`editRowTotal${idx}`).innerText =
        `₹ ${formatMoney(rowTotal(row))}`;
    });
  });
}




// ------------------------------
// GET VALUES FROM ONE EDIT ROW
// ------------------------------
function getEditItemRow(idx) {
  const container = document.getElementById("editItemsContainer");
  return {
    particulars: container.querySelector(`.edit-particulars[data-idx="${idx}"]`)?.value || "",
    remarks: container.querySelector(`.edit-remarks[data-idx="${idx}"]`)?.value || "",
    qty: Number(container.querySelector(`.edit-qty[data-idx="${idx}"]`)?.value || 0),
    rate: Number(container.querySelector(`.edit-rate[data-idx="${idx}"]`)?.value || 0),
    tax: Number(container.querySelector(`.edit-tax[data-idx="${idx}"]`)?.value || 0)
  };
}

// ------------------------------
// ADD ITEM IN EDIT MODAL
// ------------------------------
function editAddItem() {
  const items = collectEditItems(); // get existing items
  items.push({ particulars: "", remarks: "", qty: "", rate: "", tax: "" });
  renderEditItems(items); // re-render safely
}

// ------------------------------
// REMOVE LAST ITEM
// ------------------------------
function editRemoveLast() {
  const items = collectEditItems();
  if (items.length > 0) {
    items.pop();
    renderEditItems(items);
  }
}


// ------------------------------
// COLLECT ALL EDIT ITEMS (FIXED)
// ------------------------------
function collectEditItems() {
  const rows = document.querySelectorAll("#editItemsContainer > div");
  const items = [];
  rows.forEach((row, idx) => {
    items.push(getEditItemRow(idx));
  });
  return items;
}

// ===============================
// FIXED — POPULATE EDIT VENDOR SELECT
// ===============================
function populateEditVendorSelect(selectedVendorId = null) {
  const sel = document.getElementById("editVendor");
  if (!sel) return;

  sel.innerHTML = "<option value=''>-- Select --</option>";

  vendorsCache.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.vendor_id;
    opt.textContent =
      `${v.vendor_code ? v.vendor_code + " — " : ""}${v.vendor_name || "Vendor " + v.vendor_id}`;
    sel.appendChild(opt);
  });

  if (selectedVendorId) {
    sel.value = String(selectedVendorId);
  }
}



// ------------------------------
// SAVE EDIT TRANSACTION
// ------------------------------
async function saveEdit(status = "Created") {
  if (!editTransactionId) return freshToast("No transaction selected", "error");

  const items = collectEditItems();

  // VALIDATION RULES
  if (status === "Created") {
    // Full validation only for SUBMIT
    for (let it of items) {
      if (!it.particulars) return freshToast("Item particulars required", "error");
      if ((Number(it.qty) || 0) <= 0) return freshToast("Qty must be >0", "error");
      if ((Number(it.rate) || 0) <= 0) return freshToast("Rate must be >0", "error");
      if ((Number(it.tax) || 0) <= 0) return freshToast("Tax % must be >0", "error");
    }
  }
  // Draft = No validation required except vendor & one item



  const payload = {
    transaction_type: document.getElementById("editType").value,
    transaction_date: document.getElementById("editDate").value,
    vendor_id: document.getElementById("editVendor").value,
    status,
    total_amount: items.reduce((s, it) => s + rowTotal(it), 0),
    items,
  };

  try {
    showLoader("Saving...");
    const res = await fetch(`/api/transactions/${editTransactionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    hideLoader();

    if (!data.ok) return freshToast("Unable to save", "error");

    freshToast(status === "Draft" ? "Saved as draft" : "Updated", "success");
    closeEdit();
    await loadTransactions();
  } catch (err) {
    hideLoader();
    freshToast("Server error", "error");
  }
}


function closeEdit() {
  editTransactionId = null;
  document.getElementById("editModal").classList.add("hidden");
  document.getElementById("editItemsContainer").innerHTML = "";
}

// ------------------------------
// DELETE TRANSACTION
// ------------------------------
function freshConfirm(message, onYes, onNo = null) {
  const box = document.createElement("div");
  box.className = "fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]";
  box.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-xl w-80 text-center">
      <p class="text-lg font-semibold mb-4">${escapeHtml(message)}</p>
      <div class="flex justify-center gap-4">
        <button id="fcYes" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md">Yes</button>
        <button id="fcNo" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-md">No</button>
      </div>
    </div>
  `;
  document.body.appendChild(box);
  document.getElementById("fcYes").onclick = () => { box.remove(); onYes(); };
  document.getElementById("fcNo").onclick = () => { box.remove(); if (onNo) onNo(); };
}

function confirmCancel(id) {
  if (confirm("Are you sure you want to cancel this transaction?")) {
    // Call API to set status = 'Canceled'
    fetch(`/api/transactions/${id}/cancel`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Canceled" })
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        alert("Transaction canceled successfully!");
        location.reload();
      } else {
        alert("Failed to cancel transaction.");
      }
    })
    .catch(() => alert("Server error"));
  }
}

async function deleteTransaction(id) {
  freshConfirm("Are you sure you want to delete this transaction?", async () => {
    try {
      showLoader("Deleting...");
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const data = await res.json();
      hideLoader();
      if (!data.ok) {
        freshToast("Unable to delete", "error");
        return;
      }
      freshToast("Deleted", "success");
      await loadTransactions();
    } catch (err) {
      hideLoader();
      console.error("deleteTransaction:", err);
      freshToast("Server error", "error");
    }
  }, () => {
    freshToast("Delete cancelled", "info");
  });
}

// ------------------------------
// UTIL
// ------------------------------
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

function formatMoney(n) {
  return Number(n || 0).toFixed(2);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ===============================
// VIEW PDF IN NEW TAB
// ===============================
function viewPDF(id) {
  const url = `/api/transactions/${id}/pdf`;
  window.open(url, "_blank");
}

function confirmCancel(id) {
  if (confirm("Are you sure you want to cancel this transaction?")) {
    fetch(`/api/transactions/${id}/cancel`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "Canceled" })
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        alert("Transaction canceled successfully");
        location.reload();
      } else {
        alert("Failed to cancel transaction");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Server error");
    });
  }
}