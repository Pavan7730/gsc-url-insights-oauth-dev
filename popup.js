const loginBtn = document.getElementById("login");
const statusEl = document.getElementById("status");

loginBtn.addEventListener("click", () => {
  statusEl.textContent = "Opening Google login…";

  chrome.runtime.sendMessage(
    { type: "LOGIN" },
    (response) => {
      if (!response) {
        statusEl.textContent = "Unexpected error.";
        return;
      }

      if (response.success) {
        statusEl.textContent = "✅ Login successful";
      } else {
        statusEl.textContent = "❌ " + response.error;
      }
    }
  );
});
