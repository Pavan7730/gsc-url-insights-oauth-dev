const statusEl = document.getElementById("status");

document.getElementById("connect").addEventListener("click", () => {
  statusEl.textContent = "Opening Google login...";

  chrome.runtime.sendMessage({ type: "LOGIN" }, async (res) => {
    if (!res || !res.success) {
      statusEl.textContent = "❌ Google login failed";
      return;
    }

    statusEl.textContent = "✅ Logged in successfully";

    // OPTIONAL: test GSC access safely
    try {
      const resp = await fetch(
        "https://www.googleapis.com/webmasters/v3/sites",
        {
          headers: {
            Authorization: `Bearer ${res.token}`
          }
        }
      );

      if (!resp.ok) {
        statusEl.textContent = "⚠ Logged in, but no GSC access";
        return;
      }

      const data = await resp.json();

      if (!data.siteEntry || data.siteEntry.length === 0) {
        statusEl.textContent = "⚠ No GSC properties found";
      } else {
        statusEl.textContent = `✅ ${data.siteEntry.length} GSC properties found`;
      }

    } catch (e) {
      statusEl.textContent = "⚠ Logged in, GSC not available";
    }
  });
});
