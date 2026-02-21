const CLIENT_ID =
  "669869853203-la12753n1ac5u8m5apt26fmgcnliprq0.apps.googleusercontent.com";

const SCOPES = "https://www.googleapis.com/auth/webmasters.readonly";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "AUTH") {
    authenticate(sendResponse);
    return true;
  }
});

function authenticate(sendResponse) {
  const redirectUri = chrome.identity.getRedirectURL();

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    "?client_id=" + encodeURIComponent(CLIENT_ID) +
    "&response_type=token" +
    "&redirect_uri=" + encodeURIComponent(redirectUri) +
    "&scope=" + encodeURIComponent(SCOPES) +
    "&prompt=consent";

  chrome.identity.launchWebAuthFlow(
    { url: authUrl, interactive: true },
    (redirectUrl) => {
      if (!redirectUrl) {
        sendResponse({ error: "Login cancelled" });
        return;
      }

      const params = new URLSearchParams(
        redirectUrl.substring(redirectUrl.indexOf("#") + 1)
      );
      const token = params.get("access_token");

      if (!token) {
        sendResponse({ error: "No token received" });
        return;
      }

      chrome.storage.local.set({ gscToken: token }, () => {
        sendResponse({ success: true });
      });
    }
  );
}
