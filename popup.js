const statusEl = document.getElementById("status");
const connectBtn = document.getElementById("connectBtn");
const fetchBtn = document.getElementById("fetchBtn");
const dateRange = document.getElementById("dateRange");
const statsEl = document.getElementById("stats");
const table = document.getElementById("table");
const tbody = table.querySelector("tbody");

let token = null;
let sites = [];
let pageUrl = "";

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  pageUrl = tab.url;
  document.getElementById("pageUrl").textContent = pageUrl;
});

/* ---------- CONNECT ---------- */
connectBtn.onclick = () => {
  statusEl.textContent = "Connecting to Google…";

  chrome.identity.getAuthToken({ interactive: true }, t => {
    if (chrome.runtime.lastError || !t) {
      statusEl.textContent = "❌ Google login failed";
      return;
    }

    token = t;
    loadSites();
  });
};

/* ---------- LOAD PROPERTIES ---------- */
function loadSites() {
  fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(d => {
      sites = d.siteEntry || [];

      statusEl.textContent = `✅ GSC connected. ${sites.length} properties found.`;
      fetchBtn.disabled = false;
      dateRange.disabled = false;
    })
    .catch(() => {
      statusEl.textContent = "❌ Unable to load GSC properties";
    });
}

/* ---------- FETCH PAGE DATA ---------- */
fetchBtn.onclick = () => {
  const matchedProperty = findPropertyForPage();

  if (!matchedProperty) {
    statusEl.textContent = "⚠ Page not found in any GSC property";
    return;
  }

  statusEl.textContent = "Fetching page-level data…";
  fetchPageData(matchedProperty);
};

/* ---------- PROPERTY MATCHING ---------- */
function findPropertyForPage() {
  const url = new URL(pageUrl);

  // 1️⃣ Exact URL-prefix match
  for (const s of sites) {
    if (s.siteUrl.startsWith("http") && pageUrl.startsWith(s.siteUrl)) {
      return s.siteUrl;
    }
  }

  // 2️⃣ Domain property fallback
  return sites.find(s =>
    s.siteUrl === `sc-domain:${url.hostname}`
  )?.siteUrl;
}

/* ---------- PAGE QUERY ---------- */
function fetchPageData(property) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Number(dateRange.value));

  const body = {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    dimensions: ["query"],
    rowLimit: 10,
    dimensionFilterGroups: [{
      filters: [{
        dimension: "page",
        operator: "equals",
        expression: pageUrl
      }]
    }]
  };

  fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  )
    .then(r => r.json())
    .then(d => renderData(d.rows || []))
    .catch(() => statusEl.textContent = "❌ Failed to fetch data");
}

/* ---------- RENDER ---------- */
function renderData(rows) {
  statsEl.innerHTML = "";
  tbody.innerHTML = "";

  if (!rows.length) {
    statusEl.textContent = "⚠ No page-level data found";
    return;
  }

  table.style.display = "table";
  statusEl.textContent = "✅ Page-level GSC data loaded";

  rows.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.keys[0]}</td>
        <td>${r.clicks}</td>
        <td>${r.impressions}</td>
      </tr>
    `;
  });
}
