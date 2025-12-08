// frontend/public/navbar/navbar.js

(function initNavbar() {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;

    const nameEl = document.getElementById('navbarUserTitle'); // TOP
    const roleEl = document.getElementById('adminRole');       // BOTTOM role
    const userBox = document.querySelector('.user-box');       // BOTTOM user name container

    // ------------------------------------------------------
    // (A) SHOW USER NAME IN BOTTOM SECTION  (FIXED)
    // ------------------------------------------------------
    if (userBox && user && (user.name || user.full_name)) {
      const userNameP = document.createElement("p");
      userNameP.textContent = user.name || user.full_name;
      userNameP.className = "text-sm font-semibold mb-1";
      userBox.prepend(userNameP);
    }

    // ----------------------------------------
    // (B) SHOW USER ROLE IN BOTTOM
    // ----------------------------------------
    if (roleEl) {
      roleEl.textContent = user?.role || "viewer";
    }

    // ------------------------------------------------------
    // (C) SHOW USER NAME AT TOP TEMPORARILY  (FIXED)
    // ------------------------------------------------------
    if (nameEl) {
      nameEl.innerHTML = `<span>${user?.name || user?.full_name || "Guest"}</span>`;
    }

    // ----------------------------------------
    // (D) FETCH COMPANY NAME & UPDATE TOP
    // ----------------------------------------
    if (user?.company_id) {

      fetch(`/api/companies/${user.company_id}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      })
        .then(res => res.json())
        .then(company => {

          const companyName = company.company_name || "Your Company";

          if (nameEl) {
            nameEl.innerHTML = `
              <div class="flex flex-col">
                  <span class="text-xs text-gray-300 tracking-wide">WELCOME</span>
                  <span class="text-lg font-extrabold mt-1 text-white leading-tight">${companyName}</span>
              </div>
            `;
          }

        })
        .catch(err => console.error("Company fetch error: ", err));
    }

    // ----------------------------------------
    // LOGOUT
    // ----------------------------------------
    window.logout = function () {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = "/pages/login.html";
    };

  } catch (e) {
    console.error('Navbar init error', e);
  }
})();
