
document.addEventListener("DOMContentLoaded", () => {
    const API = "http://localhost:5000/api";

    const form = document.getElementById("authForm");
    const role = document.getElementById("role");
    const nameField = document.getElementById("nameField");
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmField = document.getElementById("confirmField");
    const confirmInput = document.getElementById("confirmPassword");
    const heading = document.getElementById("heading");
    const eyebrow = document.getElementById("eyebrow");
    const subtitle = document.getElementById("subtitle");
    const submitButton = document.getElementById("submitButton");
    const buttonLabel = document.getElementById("buttonLabel");
    const message = document.getElementById("message");
    const switchCopy = document.getElementById("switchCopy");
    const switchButton = document.getElementById("switchButton");

    let isSignup = false;
    let isSubmitting = false;

    function showMessage(text, success = false) {
        message.textContent = text;
        message.classList.toggle("success", success);
        message.classList.toggle("error", Boolean(text) && !success);
    }

    function updateForm() {
        // This page is exclusively for customers.
        role.value = "Customer";

        nameField.hidden = !isSignup;
        confirmField.hidden = !isSignup;

        nameInput.required = isSignup;
        confirmInput.required = isSignup;

        passwordInput.autocomplete = isSignup
            ? "new-password"
            : "current-password";

        if (isSignup) {
            eyebrow.textContent = "CREATE YOUR ACCOUNT";
            heading.textContent = "Join ResolveAI.";
            subtitle.textContent =
                "Create an account to submit and track complaints.";
            buttonLabel.textContent = "Create Account";
            switchButton.textContent = "Sign in";
        } else {
            eyebrow.textContent = "CUSTOMER ACCESS";
            heading.textContent = "Your resolution starts here.";
            subtitle.textContent =
                "Sign in to access your complaint workspace.";
            buttonLabel.textContent = "Sign In";
            switchButton.textContent = "Create an account";
        }

        switchCopy.hidden = false;
        showMessage("");
    }

    switchButton.addEventListener("click", () => {
        if (isSubmitting) return;

        isSignup = !isSignup;
        form.reset();
        updateForm();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isSubmitting) return;

        showMessage("");

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const name = nameInput.value.trim();

        if (!email || !password) {
            showMessage("Please enter your email and password.");
            return;
        }

        if (isSignup) {
            if (!name) {
                showMessage("Please enter your full name.");
                return;
            }

            if (password.length < 8) {
                showMessage("Password must contain at least 8 characters.");
                return;
            }

            if (password !== confirmInput.value) {
                showMessage("Passwords do not match.");
                return;
            }
        }

        const endpoint = isSignup
            ? "/auth/signup"
            : "/auth/login";

        const body = { email, password };

        if (isSignup) {
            body.name = name;
        }

        isSubmitting = true;
        submitButton.disabled = true;
        buttonLabel.textContent = isSignup
            ? "Creating account..."
            : "Signing in...";

        let loginSucceeded = false;

        try {
            const response = await fetch(`${API}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                if (response.status === 409) {
                    throw new Error(
                        "This email already exists. Please sign in instead."
                    );
                }

                throw new Error(
                    result.message || "Authentication failed. Please try again."
                );
            }

            if (!result.token || !result.user) {
                throw new Error(
                    "Login session is missing. Please check the backend response."
                );
            }

            if (result.user.role !== "Customer") {
                throw new Error(
                    "This page is for customer accounts only."
                );
            }

            // Save the customer session.
            localStorage.setItem("resolveAIToken", result.token);
            localStorage.setItem(
                "resolveAIUser",
                JSON.stringify(result.user)
            );
            localStorage.setItem("userRole", "Customer");
            localStorage.setItem("isLoggedIn", "true");

            // Build the dashboard URL relative to the current login page.
            const dashboardURL = new URL(
                "customer-dashboard.html",
                window.location.href
            );

            loginSucceeded = true;
            showMessage(
                "Login successful. Opening your dashboard...",
                true
            );

            // Navigate to the resolved dashboard path.
            window.location.href = dashboardURL.href;

        } catch (error) {
            console.error("ResolveAI authentication error:", error);

            if (error instanceof TypeError) {
                showMessage(
                    "Cannot connect to the backend. Check that the server is running on port 5000."
                );
            } else {
                showMessage(
                    error.message || "Something went wrong. Please try again."
                );
            }
        } finally {
            if (!loginSucceeded) {
                isSubmitting = false;
                submitButton.disabled = false;
                updateForm();
            }
        }
    });

    updateForm();
});
