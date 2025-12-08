// Loader Notifier Injection Script

// 1️⃣ Remove notifier.html fetch (not needed)
// Because HTML is already included inside dashboard.html

// 2️⃣ Icon Mapping
const icons = {
  success: "✔️",
  error: "❌",
  info: "ℹ️"
};

// 3️⃣ Main function
function showFreshToast(message, type = "info") {
  const container = document.getElementById("freshToastContainer");

  if (!container) {
    console.error("Notifier container missing: #freshToastContainer");
    return;
  }

  const toast = document.createElement("div");
  toast.className = `fresh-toast ${type}`;

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || "ℹ️"}</span>
    <span style="animation: fadeInText 0.5s ease">${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => toast.remove(), 2600);
}

// Optional: Global function
window.freshToast = showFreshToast;
