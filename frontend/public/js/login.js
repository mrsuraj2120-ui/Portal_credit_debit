async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        freshToast("Please enter both fields", "error");
        return;
    }

    showLoader(true); // Loader ON

    try {
        const res = await fetch("/api/auth/login", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        // ❗ Always hide loader after response
        showLoader(false);

        if (!res.ok || !data.success) {
            freshToast(data.message || "Invalid credentials", "error");
            return;
        }

        // Save token + user
        localStorage.setItem("token", data.token);

        const user = {
            user_id: data.user.user_id,
            company_id: data.user.company_id,
            email: data.user.email,
            phone: data.user.phone || "",
            role: data.user.role,
            name: data.user.full_name
        };

        localStorage.setItem("user", JSON.stringify(user));

        freshToast("Login successful!", "success");
        setTimeout(() => {
            window.location.href = "../pages/dashbord.html";
        }, 700);

    } catch (err) {
        // ❗ VERY IMPORTANT → hide loader on catch also
        showLoader(false);
        console.error("Login error:", err);
        freshToast("Unable to connect to server", "error");
    }
}
