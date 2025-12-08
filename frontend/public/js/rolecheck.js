// js/rolecheck.js

// ------------------------------
// USER AUTH + ROLE CHECK (WITH TOKEN)
// ------------------------------
(function () {

  // Get token + user from localStorage
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // 1) No token → logout → redirect to login
  if (!token) {
    console.warn("No token found. Redirecting...");
    window.location.href = "login.html";
    return;
  }

  // 2) No user object found → redirect
  if (!user) {
    console.warn("User not found. Redirecting...");
    window.location.href = "login.html";
    return;
  }

  // 3) No role found → force login
  if (!user.role && !user.user_type) {
    console.warn("User role missing. Redirecting...");
    window.location.href = "login.html";
    return;
  }

  // 4) Store globally for dashboard pages
  window.authToken = token;  
  window.userCompanyId = user.company_id;
  window.userId = user.user_id;
  window.userRole = user.role || user.user_type;

  console.log("Role check passed using token:", window.userRole);

})();
