// background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AUTH_GSC") {
    chrome.identity.getAuthToken(
      { interactive: true },
      (token) => {
        if (chrome.runtime.lastError) {
          console.error(
            "OAuth error:",
            chrome.runtime.lastError.message
          );
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message
          });
          return;
        }

        // Store token locally
        chrome.storage.local.set({ gscToken: token }, () => {
          sendResponse({ success: true });
        });
      }
    );

    // REQUIRED: keep the message channel open
    return true;
  }
});
