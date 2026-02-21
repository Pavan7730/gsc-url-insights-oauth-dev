const CLIENT_ID =
  "669869853203-3o9c91v211or0apbsm3c7aq6hp0ild5g.apps.googleusercontent.com";

const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "openid",
  "email",
  "profile"
];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "LOGIN") {
    startOAuth(sendResponse);
    return true; // keep channel open
  }
});

function startOAuth(sendResponse) {
  const redirectUri = chrome.identity.getRedirectURL("oauth2");

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    "?client_id=" + encodeURIComponent(CLIENT_ID) +
    "&response_type=token" +
    "&redirect_uri=" + encodeURIComponent(redirectUri) +
    "&scope=" + encodeURIComponent(SCOPES.join(" ")) +
    "&prompt=consent";

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true
    },
    (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        sendResponse({
          success: false,
          error: "Login cancelled or failed"
        });
        return;
      }

      const params = new URLSearchParams(
        redirectUrl.substring(redirectUrl.indexOf("#") + 1)
      );

      const accessToken = params.get("access_token");

      if (!accessToken) {
        sendResponse({
          success: false,
          error: "No access token received"
        });
        return;
      }

      chrome.storage.local.set({ accessToken }, () => {
        sendResponse({
          success: true
        });
      });
    }
  );
}
