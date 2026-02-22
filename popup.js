const statusEl = document.getElementById("status");
const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", () => {
  statusEl.textContent = "Opening Google login…";

  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError || !token) {
      console.error(chrome.runtime.lastError);
      statusEl.textContent = "❌ Google login failed";
      statusEl.className = "error";
      return;
    }

    console.log("OAuth token:", token);

    statusEl.textContent = "✅ Google login successful";
    statusEl.className = "success";

    // Optional: store token
    chrome.storage.local.set({ gsc_token: token });
  });
});
