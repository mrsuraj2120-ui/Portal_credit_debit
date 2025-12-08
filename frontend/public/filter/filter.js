// frontend/public/filter/filter.js
// Multi-table compatible Smart Filter System

// All table <tbody> IDs you want to support
const TABLE_IDS = ["recentNotes", "transTable", "usersbody", "vendorsbody"];

// UI Elements
const filterBox = document.getElementById("filterBox");
const filterSearch = document.getElementById("filterSearch");
const filterList = document.getElementById("filterList");
const clearColumnBtn = document.getElementById("clearColumn");
const sortAscBtn = document.getElementById("sortAsc");
const sortDescBtn = document.getElementById("sortDesc");

let activeCol = null;
let activeFilters = {};

// ------------------------------
// Find Active Table Automatically
// ------------------------------
function getActiveTbody() {
  for (const id of TABLE_IDS) {
    const el = document.getElementById(id);
    if (el) return el; // Return first table that exists on this page
  }
  return null;
}

// ------------------------------
// Get Rows of Active Table
// ------------------------------
function getRows() {
  const tbody = getActiveTbody();
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll("tr"));
}

// ------------------------------
// Click on Header → Open Filter Box
// ------------------------------
document.querySelectorAll("th.filter").forEach(th => {
  th.addEventListener("click", (ev) => {
    activeCol = Number(th.dataset.col || 0);

    const rect = th.getBoundingClientRect();
    filterBox.style.top = (rect.bottom + window.scrollY) + "px";
    filterBox.style.left = (rect.left + window.scrollX) + "px";
    filterBox.style.width = rect.width + "px";
    filterBox.classList.remove("hidden");

    loadFilterOptions();
  });
});

// ------------------------------
// Load Unique Values for Column
// ------------------------------
function loadFilterOptions() {
  const rows = getRows();
  const values = new Set();

  rows.forEach(row => {
    if (row.style.display === "none") return;
    const cell = row.children[activeCol];
    if (cell) values.add(cell.innerText.trim());
  });

  filterList.innerHTML = "";
  values.forEach(v => {
    const li = document.createElement("li");
    li.textContent = v;
    li.onclick = () => applyFilter(v);
    filterList.appendChild(li);
  });

  if (filterSearch) filterSearch.value = "";
}

// ------------------------------
// Apply Filter
// ------------------------------
function applyFilter(value) {
  activeFilters[activeCol] = value;
  runFilters();
  filterBox.classList.add("hidden");
}

// ------------------------------
// Run All Active Filters
// ------------------------------
function runFilters() {
  const rows = getRows();

  rows.forEach(row => {
    let show = true;

    Object.keys(activeFilters).forEach(col => {
      const c = Number(col);
      const cell = row.children[c];
      const text = cell ? cell.innerText.trim() : "";
      if (text !== activeFilters[c]) show = false;
    });

    row.style.display = show ? "" : "none";
  });
}

// ------------------------------
// Clear Filter
// ------------------------------
if (clearColumnBtn) {
  clearColumnBtn.onclick = () => {
    delete activeFilters[activeCol];
    runFilters();
    filterBox.classList.add("hidden");
  };
}

// ------------------------------
// Sorting
// ------------------------------
if (sortAscBtn) {
  sortAscBtn.onclick = () => { sortTable(activeCol, true); filterBox.classList.add("hidden"); };
}
if (sortDescBtn) {
  sortDescBtn.onclick = () => { sortTable(activeCol, false); filterBox.classList.add("hidden"); };
}

function sortTable(col, asc) {
  const tbody = getActiveTbody();
  if (!tbody || col === null) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));

  rows.sort((a, b) => {
    const x = (a.children[col] && a.children[col].innerText.trim()) || "";
    const y = (b.children[col] && b.children[col].innerText.trim()) || "";

    const xn = parseFloat(x.replace(/[^0-9.\-]/g, ""));
    const yn = parseFloat(y.replace(/[^0-9.\-]/g, ""));

    if (!isNaN(xn) && !isNaN(yn)) {
      return asc ? xn - yn : yn - xn;
    }
    return asc ? x.localeCompare(y) : y.localeCompare(x);
  });

  rows.forEach(r => tbody.appendChild(r));
}

// ------------------------------
// Search in filter-list
// ------------------------------
if (filterSearch) {
  filterSearch.addEventListener("keyup", () => {
    const search = filterSearch.value.toLowerCase();
    const items = Array.from(filterList.children);
    let matchFound = false;

    items.forEach(li => {
      const text = li.textContent.toLowerCase();
      if (text.includes(search)) {
        li.style.display = "";
        matchFound = true;
      } else {
        li.style.display = "none";
      }
    });

    if (!matchFound) items.forEach(li => li.style.display = "none");
  });
}

// ------------------------------
// Hide filter box on outside click
// ------------------------------
document.addEventListener("click", (e) => {
  if (!e.target.closest(".filter") && !e.target.closest("#filterBox")) {
    filterBox.classList.add("hidden");
  }
});
