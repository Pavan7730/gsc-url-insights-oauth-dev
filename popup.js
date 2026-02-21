// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const connectBtn = document.getElementById("connect");

  if (!connectBtn) return;

  connectBtn.addEventListener("click", () => {
    connectBtn.disabled = true;
    connectBtn.textContent = "Connecting…";

    chrome.runtime.sendMessage(
      { type: "AUTH_GSC" },
      (response) => {
        connectBtn.disabled = false;
        connectBtn.textContent = "Connect GSC";

        if (chrome.runtime.lastError) {
          alert("❌ Extension error. Please reload the extension.");
          return;
        }

        if (response && response.success) {
          alert("✅ Google login successful");
        } else {
          alert(
            "❌ Google login failed or was cancelled.\nPlease try again."
          );
        }
      }
    );
  });
});
