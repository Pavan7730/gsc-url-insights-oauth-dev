// popup.js

const statusEl = document.getElementById("status");
const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", () => {
  statusEl.textContent = "Opening Google login…";
  statusEl.className = "";

  // Step 1: Authenticate with Google
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError || !token) {
      console.error("OAuth error:", chrome.runtime.lastError);
      statusEl.textContent = "❌ Google login failed";
      statusEl.className = "error";
      return;
    }

    // Store token (optional, useful later)
    chrome.storage.local.set({ gscToken: token });

    statusEl.textContent = "✅ Google login successful. Checking GSC access…";

    // Step 2: Check GSC access by listing sites
    fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("GSC API error");
        }
        return res.json();
      })
      .then((data) => {
        if (!data.siteEntry || data.siteEntry.length === 0) {
          statusEl.textContent =
            "⚠ Logged in, but no Google Search Console properties found for this account.";
          statusEl.className = "warning";
        } else {
          statusEl.textContent =
            `✅ GSC connected. ${data.siteEntry.length} properties found.`;
          statusEl.className = "success";
        }
      })
      .catch((err) => {
        console.error(err);
        statusEl.textContent =
          "⚠ Logged in, but unable to read Google Search Console data.";
        statusEl.className = "warning";
      });
  });
});
