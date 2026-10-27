
document.addEventListener("DOMContentLoaded", () => {
    const API = "http://localhost:5000/api";

    const token = localStorage.getItem("resolveAIToken");
    const savedUser = localStorage.getItem("resolveAIUser");

    if (!token || !savedUser) {
        window.location.href = "index.html";
        return;
    }

    let user;

    try {
        user = JSON.parse(savedUser);
    } catch {
        localStorage.removeItem("resolveAIToken");
        localStorage.removeItem("resolveAIUser");
        localStorage.removeItem("userRole");
        localStorage.removeItem("isLoggedIn");
        window.location.href = "index.html";
        return;
    }

    if (user.role !== "Customer") {
        window.location.href = "index.html";
        return;
    }

    const form = document.getElementById("complaintForm");
    const nameInput = document.getElementById("customerName");
    const emailInput = document.getElementById("customerEmail");
    const productInput = document.getElementById("product");
    const complaintInput = document.getElementById("complaint");
    const submitBtn = document.getElementById("submitBtn");
    const formMessage = document.getElementById("formMessage");
    const complaintsBody = document.getElementById("complaintsBody");
    const listMessage = document.getElementById("listMessage");
    const refreshBtn = document.getElementById("refreshBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    const totalCount = document.getElementById("totalCount");
    const highCount = document.getElementById("highCount");
    const emailCount = document.getElementById("emailCount");

    nameInput.value = user.name || "";
    emailInput.value = user.email || "";

    document.getElementById("topCustomerName").textContent =
        user.name || "Customer";
    document.getElementById("welcomeText").textContent =
        `Welcome back, ${(user.name || "Customer").split(" ")[0]}!`;
    document.getElementById("userAvatar").textContent =
        (user.name || "C").trim().charAt(0).toUpperCase();

    function setMessage(element, text, type = "") {
        element.textContent = text;
        element.classList.remove("success", "error");

        if (type) element.classList.add(type);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function statusClass(status) {
        const value = String(status || "").toLowerCase();

        if (value === "resolved") return "status-resolved";
        if (value === "pending") return "status-pending";
        if (value.includes("progress")) return "status-progress";

        return "status-default";
    }

    async function loadComplaints() {
        refreshBtn.disabled = true;
        refreshBtn.textContent = "↻ Loading...";
        setMessage(listMessage, "Loading your complaints...");

        try {
            const response = await fetch(`${API}/my-complaints`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem("resolveAIToken");
                localStorage.removeItem("resolveAIUser");
                localStorage.removeItem("userRole");
                localStorage.removeItem("isLoggedIn");
                window.location.href = "index.html";
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Could not load complaints.");
            }

            const complaints = Array.isArray(result.complaints)
                ? result.complaints
                : [];

            totalCount.textContent = complaints.length;

            highCount.textContent = complaints.filter((item) =>
                String(item.priority || "").toLowerCase() === "high"
            ).length;

            emailCount.textContent = complaints.filter((item) =>
                String(item.emailStatus || "").toLowerCase() === "sent"
            ).length;

            if (complaints.length === 0) {
                complaintsBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-state">
                            No complaints yet.<br>
                            Submit your first complaint using the form.
                        </td>
                    </tr>`;
                setMessage(listMessage, "");
                return;
            }

            complaintsBody.innerHTML = complaints.map((item) => `
                <tr>
                    <td>
                        <strong>${escapeHTML(item.id || "Complaint")}</strong>
                    </td>
                    <td>${escapeHTML(item.product || "—")}</td>
                    <td>${escapeHTML(item.priority || "Normal")}</td>
                    <td>
                        <span class="status ${statusClass(item.status)}">
                            ${escapeHTML(item.status || "Pending")}
                        </span>
                    </td>
                </tr>
            `).join("");

            setMessage(listMessage, `${complaints.length} complaint(s) loaded.`);

        } catch (error) {
            console.error("Load complaints error:", error);
            complaintsBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        Could not load complaints. Check that the backend is running.
                    </td>
                </tr>`;
            setMessage(listMessage, error.message || "Could not load complaints.", "error");
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = "↻ Refresh";
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        setMessage(formMessage, "");

        const product = productInput.value.trim();
        const complaint = complaintInput.value.trim();

        if (!product || !complaint) {
            setMessage(formMessage, "Enter the product and complaint details.", "error");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Analysing complaint...";

        try {
            const response = await fetch(`${API}/complaints`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    customerName: user.name,
                    customerEmail: user.email,
                    product,
                    complaint
                })
            });

            const result = await response.json();

            if (response.status === 401 || response.status === 403) {
                throw new Error("Your session expired. Please sign in again.");
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Unable to submit complaint.");
            }

            setMessage(
                formMessage,
                result.message || "Complaint submitted successfully.",
                "success"
            );

            productInput.value = "";
            complaintInput.value = "";

            await loadComplaints();

        } catch (error) {
            console.error("Complaint submission error:", error);
            setMessage(formMessage, error.message || "Could not submit complaint.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Complaint →";
        }
    });

    refreshBtn.addEventListener("click", loadComplaints);

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("resolveAIToken");
        localStorage.removeItem("resolveAIUser");
        localStorage.removeItem("userRole");
        localStorage.removeItem("isLoggedIn");
        window.location.href = "index.html";
    });

    loadComplaints();
});
