chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOGIN") {
    chrome.identity.getAuthToken(
      { interactive: true },
      (token) => {
        if (chrome.runtime.lastError || !token) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError?.message || "Login failed"
          });
          return;
        }

        sendResponse({
          success: true,
          token
        });
      }
    );
    return true;
  }
});
