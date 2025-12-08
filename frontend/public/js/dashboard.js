// js/dashboard.js

// GLOBAL LOAD
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
});

// MAIN FUNCTION
async function loadDashboard() {

  showLoader("Fetching your data...");

  try {
    const companyId = window.userCompanyId;
    const token = window.authToken;

    const res = await fetch(`/api/transactions/company/${companyId}`, {
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();

    if (!Array.isArray(data)) throw new Error("Invalid API response");

    updateDashboardStats(data);
    renderRecentNotes(data);
    buildCharts(data);

  } catch (err) {
    freshToast("Error loading dashboard: " + err.message, "error");
  }

  hideLoader();
}


// ------------------------------
// STAT CALCULATIONS
// ------------------------------
function updateDashboardStats(transactions) {
  let credit = 0;
  let debit = 0;
  let pending = 0;
  let Canceled = 0;

  transactions.forEach((t) => {
    const d = t.details;

    if (!d || !d.transaction_type) return;

    if (d.transaction_type.toLowerCase() === "credit") {
      credit += Number(d.total_amount || 0);
    }

    if (d.transaction_type.toLowerCase() === "debit") {
      debit += Number(d.total_amount || 0);
    }

    // Count Draft instead of Pending
    if (d.status && d.status.toLowerCase() === "draft") {
      pending++;
    }

    if (d.status && d.status.toLowerCase() === "canceled") {
      Canceled++;
    }
  });

  const net = credit - debit;

  document.getElementById("creditCount").textContent = "₹ " + credit;
  document.getElementById("debitCount").textContent = "₹ " + debit;
  document.getElementById("draftcount").textContent = pending;
  document.getElementById("canceledcount").textContent = Canceled;
  document.getElementById("netBalance").textContent = "₹ " + net;
}


// ------------------------------
// RECENT NOTES TABLE
// ------------------------------
function renderRecentNotes(transactions) {
  const tbody = document.getElementById("recentNotes");
  tbody.innerHTML = "";

  const recent = transactions.slice(0, 10);

  recent.forEach((t) => {
    const d = t.details || {};

    const tr = document.createElement("tr");
    tr.className = "border-b";

    tr.innerHTML = `
      <td class="p-2">${t.transaction_id}</td>
      <td class="p-2">${d.transaction_type || "-"}</td>
      <td class="p-2">${d.transaction_date || "-"}</td>
      <td class="p-2">${t.vendor_name || "-"}</td>
      <td class="p-2">₹${d.total_amount || 0}</td>
      <td class="p-2 capitalize">${d.status || "-"}</td>
    `;

    tbody.appendChild(tr);
  });
}

 (async function loadNavbar() {
    try {
      const res = await fetch('/navbar/navbar.html');
      if (!res.ok) {
        console.warn('Navbar load failed:', res.status);
        return;
      }
      const html = await res.text();
      document.getElementById('navbar-container').innerHTML = html;

      // now load navbar behavior script (absolute path)
      const s = document.createElement('script');
      s.src = '/navbar/navbar.js';
      document.body.appendChild(s);
    } catch (e) {
      console.error('Navbar fetch error', e);
    }
  })();
  
// ------------------------------
// CHARTS
// ------------------------------
let monthlyTrendChart = null;

function buildCharts(transactions) {

  // ----------------------------
  // DONUT CHART (COUNT BASED)
  // ----------------------------
  let creditCount = 0;
  let debitCount = 0;
  let draftCount = 0;
  let canceledCount = 0;

  transactions.forEach((t) => {
    const d = t.details || {};
    const type = (d.transaction_type || "").toLowerCase();
    const status = (d.status || "").toLowerCase();

    if (type === "credit") creditCount++;
    if (type === "debit") debitCount++;
    if (status === "draft") draftCount++;
    if (status === "canceled") canceledCount++;
  });

  new Chart(document.getElementById("creditDebitChart"), {
    type: "doughnut",
    data: {
      labels: ["Credit", "Debit", "Draft", "Canceled"],
      datasets: [
        {
          data: [creditCount, debitCount, draftCount, canceledCount],
          backgroundColor: ["#2563eb", "#f97316", "#facc15", "#ef4444"],
        },
      ],
    },
  });

  // ----------------------------
  // MONTHLY TREND CALCULATION
  // ----------------------------
  window.allTransactions = transactions;

  let monthlyCredit = {};
  let monthlyDebit = {};
  let monthlyDraft = {};
  let monthlyCanceled = {};

  transactions.forEach((t) => {
    const d = t.details || {};
    if (!d.transaction_date) return;

    const month = d.transaction_date.substring(0, 7);
    const type = (d.transaction_type || "").toLowerCase();
    const status = (d.status || "").toLowerCase();

    if (type === "credit")
      monthlyCredit[month] = (monthlyCredit[month] || 0) + Number(d.total_amount || 0);

    if (type === "debit")
      monthlyDebit[month] = (monthlyDebit[month] || 0) + Number(d.total_amount || 0);

    if (status === "draft")
      monthlyDraft[month] = (monthlyDraft[month] || 0) + 1;

    if (status === "canceled")
      monthlyCanceled[month] = (monthlyCanceled[month] || 0) + 1;
  });

  // ----------------------------
  // MONTH FILTER POPULATE
  // ----------------------------
  const select = document.getElementById("monthFilter");
  const months = [...new Set([
    ...Object.keys(monthlyCredit),
    ...Object.keys(monthlyDebit),
    ...Object.keys(monthlyDraft),
    ...Object.keys(monthlyCanceled),
  ])].sort();

  select.innerHTML = `<option value="all">All Months</option>`;
  months.forEach((m) => {
    select.innerHTML += `<option value="${m}">${m}</option>`;
  });

  // IF FILTER CHANGED → REBUILD CHART
  select.onchange = () => buildCharts(window.allTransactions);

  const selectedMonth = select.value;

  const labels = selectedMonth === "all" ? months : [selectedMonth];

  const creditData = labels.map((m) => monthlyCredit[m] || 0);
  const debitData = labels.map((m) => monthlyDebit[m] || 0);
  const draftData = labels.map((m) => monthlyDraft[m] || 0);
  const canceledData = labels.map((m) => monthlyCanceled[m] || 0);

  // REMOVE OLD CHART
  if (monthlyTrendChart) monthlyTrendChart.destroy();

  // ----------------------------
// MONTHLY TREND CHART (BAR STYLE)
// ----------------------------
monthlyTrendChart = new Chart(document.getElementById("monthlyTrend"), {
  type: "bar",
  data: {
    labels: labels,
    datasets: [
      {
        label: "Credit (₹)",
        data: creditData,
        backgroundColor: "#2563eb",
        borderColor: "#2563eb",
        borderWidth: 1,
        yAxisID: "y1",
      },
      {
        label: "Debit (₹)",
        data: debitData,
        backgroundColor: "#f97316",
        borderColor: "#f97316",
        borderWidth: 1,
        yAxisID: "y1",
      },
      {
        label: "Draft (Count)",
        data: draftData,
        backgroundColor: "#facc15",
        borderColor: "#facc15",
        borderWidth: 1,
        yAxisID: "y2",
      },
      {
        label: "Canceled (Count)",
        data: canceledData,
        backgroundColor: "#ef4444",
        borderColor: "#ef4444",
        borderWidth: 1,
        yAxisID: "y2",
      }
    ],
  },
  options: {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (ctx) {
            return `${ctx.dataset.label}: ${ctx.raw}`;
          }
        }
      },
      legend: {
        position: "top",
      }
    },
    scales: {
      y1: {
        type: "linear",
        position: "left",
        title: { display: true, text: "Amount (₹)" }
      },
      y2: {
        type: "linear",
        position: "right",
        grid: { drawOnChartArea: false },
        title: { display: true, text: "Count" }
      }
    }
  }
});
}  
