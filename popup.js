const connectBtn = document.getElementById("connectBtn");
const fetchBtn = document.getElementById("fetchBtn");
const statusEl = document.getElementById("status");
const rangeSelect = document.getElementById("rangeSelect");
const table = document.getElementById("queryTable");
const tbody = table.querySelector("tbody");

let token = null;
let pageUrl = null;

// --------- GET CURRENT PAGE URL ----------
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0] || !tabs[0].url) return;

  const url = tabs[0].url;
  if (!url.startsWith("http")) {
    statusEl.textContent = "❌ Open a valid website page";
    return;
  }

  pageUrl = url;

  if (token) fetchBtn.disabled = false;
});

// --------- CONNECT GOOGLE ----------
connectBtn.addEventListener("click", () => {
  statusEl.textContent = "Connecting to Google…";

  chrome.identity.getAuthToken({ interactive: true }, (t) => {
    if (chrome.runtime.lastError || !t) {
      statusEl.textContent = "❌ Google login failed";
      return;
    }

    token = t;
    statusEl.textContent = "✅ Google connected. Ready to fetch GSC data.";

    if (pageUrl) fetchBtn.disabled = false;
  });
});

// --------- FETCH PAGE DATA ----------
fetchBtn.addEventListener("click", () => {
  if (!token || !pageUrl) return;

  statusEl.textContent = "Fetching page-level data…";
  table.style.display = "none";
  tbody.innerHTML = "";

  const days = parseInt(rangeSelect.value, 10);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  const property = `sc-domain:${new URL(pageUrl).hostname}`;

  fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startDate: formatDate(start),
        endDate: formatDate(end),
        dimensions: ["query"],
        rowLimit: 10,
        dimensionFilterGroups: [{
          filters: [{
            dimension: "page",
            operator: "equals",
            expression: pageUrl
          }]
        }]
      })
    }
  )
    .then(r => r.json())
    .then(d => {
      if (!d.rows || !d.rows.length) {
        statusEl.textContent = "⚠ No query data for this page";
        return;
      }

      tbody.innerHTML = d.rows.map(r => `
        <tr>
          <td>${r.keys[0]}</td>
          <td>${r.clicks}</td>
          <td>${r.impressions}</td>
        </tr>
      `).join("");

      table.style.display = "table";
      statusEl.textContent = "✅ Top queries loaded";
    })
    .catch(() => {
      statusEl.textContent = "❌ Failed to fetch query data";
    });
});

// --------- UTIL ----------
function formatDate(d) {
  return d.toISOString().split("T")[0];
}
