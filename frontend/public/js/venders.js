document.addEventListener("DOMContentLoaded", initVendorsPage);

async function initVendorsPage() {
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  if (!user) {
    window.location.href = "/pages/login.html";
    return;
  }

  window.userCompanyId = user.company_id;

  bindForm();
  loadVendors();
}


// ------------------------------
// BIND EVENTS SAFELY
// ------------------------------
// ------------------------------
// BIND FORM (NO AUTO EVENT LISTENER)
// ------------------------------
function bindForm() {
  // ❌ Do NOT attach click event here
  // We'll manually set onclick depending on mode
  document.getElementById("btnAddVendor").onclick = addVendor;

  // Search binding safe
  const search = document.getElementById("vendorSearch");
  if (search) {
    search.addEventListener("input", filterTable);
  }
}



// ------------------------------
// FORM PAYLOAD
// ------------------------------
function getPayload() {
  return {
    vendor_name: document.getElementById("vendor_name").value,
    gstin: document.getElementById("gstin").value,
    contact_person: document.getElementById("contact_person").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    address: document.getElementById("address").value
  };
}

// ------------------------------
// FORM RESET + CANCEL HANDLER
// ------------------------------
function resetForm() {
  document.getElementById("vendor_name").value = "";
  document.getElementById("gstin").value = "";
  document.getElementById("contact_person").value = "";
  document.getElementById("email").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("address").value = "";

  window.editVendorId = null;

  const btn = document.getElementById("btnAddVendor");
  btn.textContent = "Add Vendor";
  btn.onclick = addVendor;

  // disable cancel button
  const cancelBtn = document.getElementById("btnCancelVendor");
  cancelBtn.disabled = true;
}




// ------------------------------
// ADD VENDOR
// ------------------------------
async function addVendor() {
  const payload = getPayload();

  if (!payload.vendor_name) {
    freshToast("Vendor name required!", "error");
    return;
  }
  if (!payload.gstin) {
    freshToast("GSTIN no required!", "error");
    return;
  }
  if (!payload.address) {
    freshToast("Address required!", "error");
    return;
  }

  try {
    showLoader("Adding Vendor...");

    const res = await fetch(`/api/vendors/${window.userCompanyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    hideLoader();

    if (!data.ok) {
      freshToast("Unable to add vendor", "error");
      return;
    }

    freshToast("Vendor added successfully!", "success");

    resetForm();      // ⭐ auto clear
    loadVendors();    // ⭐ reload table

  } catch (err) {
    hideLoader();
    console.error(err);
    freshToast("Server error", "error");
  }
}



// LOAD VENDORS
async function loadVendors() {
  try {
    showLoader("Loading vendors...");

    const res = await fetch(`/api/vendors/${window.userCompanyId}`);
    const vendors = await res.json();

    if (!Array.isArray(vendors)) {
      console.error("Invalid vendor response:", vendors);
      freshToast("Invalid vendor data", "error");
      return;
    }

    renderTable(vendors);

  } catch (e) {
    console.error("Load Vendors Error:", e);
    freshToast("Unable to load vendors", "error");
  } finally {
    hideLoader();
  }
}


function renderTable(vendors) {
  const tbody = document.getElementById("vendorsbody");
  tbody.innerHTML = "";

  vendors.forEach(v => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="p-2 border">${v.vendor_code || "-"}</td>
      <td class="p-2 border">${v.vendor_name || ""}</td>
      <td class="p-2 border">${v.gstin || ""}</td>
      <td class="p-2 border">${v.contact_person || ""}</td>
      <td class="p-2 border">${v.email || ""}</td>
      <td class="p-2 border">${v.phone || ""}</td>
      <td class="p-2 border">${v.address || ""}</td>

      <td class="p-2 border flex gap-2">
        <button class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                onclick="editVendor(${v.vendor_id})">
          Edit
        </button>

        <button class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                onclick="deleteVendor(${v.vendor_id})">
          Delete
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}


async function editVendor(id) {
  try {
    showLoader("Loading vendor...");

    const res = await fetch(`/api/vendor/by-id/${id}`);
    const v = await res.json();
    hideLoader();

    if (!v.vendor_id) {
      freshToast("Vendor not found", "error");
      return;
    }

    document.getElementById("vendor_name").value = v.vendor_name || "";
    document.getElementById("gstin").value = v.gstin || "";
    document.getElementById("contact_person").value = v.contact_person || "";
    document.getElementById("email").value = v.email || "";
    document.getElementById("phone").value = v.phone || "";
    document.getElementById("address").value = v.address || "";

    window.editVendorId = id;

    const btn = document.getElementById("btnAddVendor");
    btn.textContent = "Update Vendor";
    btn.onclick = updateVendor;

    // ENABLE CANCEL BUTTON IN EDIT MODE
    document.getElementById("btnCancelVendor").disabled = false;

  } catch (err) {
    hideLoader();
    console.error(err);
    freshToast("Error loading vendor", "error");
  }
}




async function updateVendor() {
  const payload = getPayload();

  try {
    showLoader("Updating vendor...");

    const res = await fetch(`/api/vendor/by-id/${window.editVendorId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    hideLoader();

    if (!data.ok) {
      freshToast("Error updating vendor", "error");
      return;
    }

    freshToast("Vendor updated!", "success");

    resetForm();   // ⭐ full reset
    loadVendors(); // ⭐ reload table

  } catch (err) {
    hideLoader();
    console.error(err);
    freshToast("Server error", "error");
  }
}


async function deleteVendor(id) {
  if (!confirm("Are you sure you want to delete this vendor?")) return;

  try {
    showLoader("Deleting vendor...");

    const res = await fetch(`/api/vendor/by-id/${id}`, {
      method: "DELETE"
    });

    const data = await res.json();
    hideLoader();

    if (!data.ok) {
      freshToast("Cannot delete vendor", "error");
      return;
    }

    freshToast("Vendor deleted!", "success");
    loadVendors();

  } catch (err) {
    hideLoader();
    console.error(err);
    freshToast("Server error", "error");
  }
}

// Enable Cancel button when ANY field changes
function enableCancel() {
  document.getElementById("btnCancelVendor").disabled = false;
}

// Attach listeners
["vendor_name", "gstin", "contact_person", "email", "phone", "address"]
  .forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", enableCancel);
  });

document.getElementById("btnCancelVendor").onclick = () => {
  resetForm();
  freshToast("Action cancelled!", "info");
};

// ------------------------------
// SEARCH FILTER
// ------------------------------
function filterTable() {
  const q = document.getElementById("vendorSearch").value.toLowerCase();

  document.querySelectorAll("#vendorsBody tr").forEach(tr => {
    tr.style.display = tr.innerText.toLowerCase().includes(q) ? "" : "none";
  });
}


