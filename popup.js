const statusEl = document.getElementById("status");
const connectBtn = document.getElementById("connectGSC");

connectBtn.addEventListener("click", () => {
  statusEl.textContent = "Opening Google login...";

  chrome.identity.getAuthToken(
    { interactive: true },
    (token) => {
      if (chrome.runtime.lastError) {
        console.error("OAuth error:", chrome.runtime.lastError);
        statusEl.textContent = "❌ Google login failed";
        return;
      }

      if (!token) {
        statusEl.textContent = "❌ No token received";
        return;
      }

      console.log("OAuth token:", token);
      statusEl.textContent = "✅ Google login successful";

      // OPTIONAL: store token if needed later
      chrome.storage.local.set({ gscToken: token });
    }
  );
});
