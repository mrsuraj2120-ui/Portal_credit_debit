function backToStep1() {
  document.getElementById("step1").classList.remove("hidden");
  document.getElementById("step2").classList.add("hidden");
}


// STEP 1: USER DETAILS
async function step1Next() {
  const fname = firstName.value.trim();
  const lname = lastName.value.trim();
  const emailVal = email.value.trim();
  const pass = password.value;
  const repass = rePassword.value;
  const roleVal = role.value;

  if (!fname || !lname || !emailVal || !pass || !repass || !roleVal) {
    showFreshToast("Please fill all fields", "error");
    return;
  }

  if (pass !== repass) {
    showFreshToast("Passwords do not match!", "error");
    return;
  }

  showLoader(true);

  // Check email exists
  const res = await fetch(`/api/auth/check-email?email=${emailVal}`);
  const data = await res.json();

  showLoader(false);

  if (data.exists) {
    showFreshToast("User already exists with this email.", "error");
    return;
  }

  // Proceed to step 2
  document.getElementById("step1").classList.add("hidden");
  document.getElementById("step2").classList.remove("hidden");
  showFreshToast("Email available — continue", "info");
}



// COMPLETE SIGNUP
async function completeSignup() {

  const companyNameVal = companyName.value.trim();

  if (!companyNameVal) {
    showFreshToast("Company Name is required", "error");
    return;
  }

  showLoader(true);

  // Check company exists
  const resCheck = await fetch(`/api/auth/check-company?name=${companyNameVal}`);
  const comp = await resCheck.json();

  if (comp.exists) {
    showFreshToast("Company already exists — linking user…", "info");
    await createUser(comp.company_id);
    showLoader(false);
    return;
  }

  await createCompanyAndUser();
  showLoader(false);
}


async function createCompanyAndUser() {
  const companyPayload = {
    company_name: companyName.value,
    gstin: gstin.value,
    email: companyEmail.value,
    phone: companyPhone.value,
    address: address.value,
    created_by: 0
  };

  const res = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(companyPayload)
  });

  const data = await res.json();
  if (!data.insertId) {
    showFreshToast("Company creation failed!", "error");
    return;
  }

  await createUser(data.insertId);
}



async function createUser(companyId) {
  const userPayload = {
    company_id: companyId,
    data: {
      first_name: firstName.value,
      last_name: lastName.value,
      email: email.value,
      password: password.value,
      user_type: role.value,
      created_at: new Date()
    }
  };

  const res = await fetch(`/api/users/${companyId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userPayload)
  });

  const data = await res.json();

  if (data.ok) {
    showFreshToast("Signup successful!", "success");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 800);
  } else {
    showFreshToast("Signup failed!", "error");
  }
}
