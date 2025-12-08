// --------------------------------------------
// USERS MANAGEMENT JS
// --------------------------------------------

// DOM Elements
const userBody = document.getElementById("usersbody");
const btnAddUser = document.getElementById("btnAddUser");
const btnCancelUser = document.getElementById("btnCancelUser");

// Form inputs
const full_name = document.getElementById("full_name");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const role = document.getElementById("role");
const password = document.getElementById("password");

// Update mode flag
let editMode = false;
let editUserId = null;


// ----------------------------------------------------
// INIT
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  fetchAllUsers();
});


// ----------------------------------------------------
// Fetch All Users
// ----------------------------------------------------
async function fetchAllUsers() {
  try {
    showLoader();

    const token = localStorage.getItem("token");
    if (!token) {
      hideLoader();
      return showError("User not logged in! Please login again.");
    }

    const res = await fetch("/api/users", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data.success) {
      hideLoader();
      return showError(data.message || "Failed to load users");
    }

    renderUsers(data.users);
    hideLoader();

  } catch (err) {
    console.log(err);
    hideLoader();
    showError("Server error while loading users");
  }
}


function renderUsers(users) {
  userBody.innerHTML = "";

  if (!users.length) {
    userBody.innerHTML = `
      <tr>
        <td colspan="6" class="p-4 text-center text-gray-500">No users found</td>
      </tr>`;
    return;
  }

  users.forEach((u) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="p-2">${u.user_id}</td>
      <td class="p-2">${u.full_name}</td>
      <td class="p-2">${u.email}</td>
      <td class="p-2">${u.phone}</td>
      <td class="p-2">${u.role}</td>

      <td class="p-2 flex gap-2">
        <button 
          class="px-4 py-2 bg-yellow-500 text-white font-semibold rounded hover:bg-yellow-600"
          onclick="startEditUser('${u.user_id}')">
          Edit
        </button>

        <button 
          class="px-4 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700"
          onclick="handleDelete('${u.user_id}')">
          Delete
        </button>
      </td>
    `;

    userBody.appendChild(row);
  });
}



// ----------------------------------------------------
// Add / Update User
// ----------------------------------------------------
btnAddUser.addEventListener("click", async () => {
  const payload = {
    full_name: full_name.value.trim(),
    email: email.value.trim(),
    phone: phone.value.trim(),
    role: role.value.trim(),
    password: password.value.trim(),
  };

  if (!payload.full_name || !payload.email || !payload.role) {
    return showError("Full name, email & role are required");
  }

  try {
    showLoader();

    const token = localStorage.getItem("token");

    let url = "/api/users";
    let method = "POST";

    if (editMode) {
      url = `/api/users/${editUserId}`;
      method = "PUT";
    }

    const res = await fetch(url, {
      method,
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    hideLoader();

    if (!data.success) return showError(data.message || "Failed to save user");

    showSuccess(editMode ? "User updated successfully" : "User added successfully");

    resetForm();
    fetchAllUsers();

  } catch (err) {
    console.log(err);
    hideLoader();
    showError("Server error while saving user");
  }
});


// ----------------------------------------------------
// Start Edit Mode
// ----------------------------------------------------
function startEditUser(userId) {
  editMode = true;
  editUserId = userId;

  const token = localStorage.getItem("token");

  fetch(`/api/users/${userId}`, {
    headers: { "Authorization": `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) return showError("User not found");

      const user = data.user;

      full_name.value = user.full_name;
      email.value = user.email;
      phone.value = user.phone;
      role.value = user.role;
      password.value = ""; 

      btnAddUser.textContent = "Update User";
      btnCancelUser.disabled = false;
      btnCancelUser.classList.remove("opacity-50", "cursor-not-allowed");
    })
    .catch(() => showError("Unable to fetch user details"));
}


// ----------------------------------------------------
// Cancel Edit Mode
// ----------------------------------------------------
btnCancelUser.addEventListener("click", () => {
  resetForm();
});


// ----------------------------------------------------
// Delete User
// ----------------------------------------------------
async function deleteUser(id) {
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    showLoader();

    const token = localStorage.getItem("token");

    const res = await fetch(`/api/users/${id}`, { 
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();

    hideLoader();

    if (!data.success) return showError(data.message);

    showSuccess("User deleted successfully");
    fetchAllUsers();

  } catch (err) {
    console.log(err);
    hideLoader();
    showError("Server error while deleting user");
  }
}


// ----------------------------------------------------
// Reset Form
// ----------------------------------------------------
function resetForm() {
  editMode = false;
  editUserId = null;

  full_name.value = "";
  email.value = "";
  phone.value = "";
  role.value = "";
  password.value = "";

  btnAddUser.textContent = "Add User";

  btnCancelUser.disabled = true;
  btnCancelUser.classList.add("opacity-50", "cursor-not-allowed");
}


// ----------------------------------------------------
// Helper: Loader / Notifier
// ----------------------------------------------------
function showLoader() {
  document.getElementById("pageLoader").style.display = "block";
}
function hideLoader() {
  document.getElementById("pageLoader").style.display = "none";
}

// YOUR TOAST SYSTEM:
function showSuccess(msg) {
  freshToast(msg, "success");
}
function showError(msg) {
  freshToast(msg, "error");
}
