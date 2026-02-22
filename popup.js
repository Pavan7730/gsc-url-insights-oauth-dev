const statusEl = document.getElementById("status");
const connectBtn = document.getElementById("connectBtn");
const fetchBtn = document.getElementById("fetchBtn");

let accessToken = null;
let pageUrl = null;

/* -------------------- GET CURRENT PAGE URL -------------------- */
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs || !tabs[0] || !tabs[0].url) {
    showInvalidPage();
    return;
  }

  const url = tabs[0].url;

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    showInvalidPage();
    return;
  }

  pageUrl = url;
});

/* -------------------- CONNECT GOOGLE -------------------- */
connectBtn.addEventListener("click", () => {
  statusEl.textContent = "Connecting to Google…";

  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError || !token) {
      statusEl.textContent = "❌ Google login failed";
      return;
    }

    accessToken = token;
    statusEl.textContent = "✅ Google connected. Ready to fetch GSC data.";
  });
});

/* -------------------- FETCH PAGE GSC DATA -------------------- */
fetchBtn.addEventListener("click", () => {
  if (!accessToken) {
    statusEl.textContent = "❌ Please connect Google first";
    return;
  }

  if (!pageUrl) {
    showInvalidPage();
    return;
  }

  statusEl.textContent = "Fetching GSC data…";

  const host = new URL(pageUrl).hostname;
  const property = `sc-domain:${host}`;

  const today = new Date();
  const endDate = formatDate(today);
  const startDate = formatDate(new Date(today.setDate(today.getDate() - 3)));

  fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: [],
      dimensionFilterGroups: [{
        filters: [{
          dimension: "page",
          operator: "equals",
          expression: pageUrl
        }]
      }]
    })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.rows || !data.rows.length) {
        statusEl.textContent = "⚠ No GSC data for this page";
        return;
      }

      const r = data.rows[0];
      statusEl.textContent =
        `✅ Clicks: ${r.clicks}, Impressions: ${r.impressions}, CTR: ${(r.ctr * 100).toFixed(2)}%`;
    })
    .catch(() => {
      statusEl.textContent = "❌ Failed to fetch GSC data";
    });
});

/* -------------------- HELPERS -------------------- */
function showInvalidPage() {
  statusEl.textContent = "❌ Open a valid website page (http/https)";
}

function formatDate(d) {
  return d.toISOString().split("T")[0];
}
