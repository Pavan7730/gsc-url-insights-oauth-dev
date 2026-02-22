const pageUrlEl = document.getElementById("pageUrl");
const connectBtn = document.getElementById("connectBtn");
const fetchBtn = document.getElementById("fetchBtn");
const statusEl = document.getElementById("status");
const statsEl = document.getElementById("stats");
const table = document.getElementById("table");
const tbody = table.querySelector("tbody");

const rangeSelect = document.getElementById("dateRange");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");

let token = null;
let sites = [];
let pageUrl = "";

/* ---------------- LOAD PAGE URL ---------------- */

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  try {
    const u = new URL(tab.url);
    u.search = "";
    u.hash = "";
    pageUrl = u.toString();
    pageUrlEl.textContent = pageUrl;
    connectBtn.disabled = false;
  } catch {
    pageUrlEl.textContent = "Invalid page URL";
  }
});

/* ---------------- DATE UI ---------------- */

rangeSelect.addEventListener("change", () => {
  const custom = rangeSelect.value === "custom";
  fromDate.style.display = custom ? "block" : "none";
  toDate.style.display = custom ? "block" : "none";
});

/* ---------------- CONNECT GSC ---------------- */

connectBtn.addEventListener("click", () => {
  statusEl.textContent = "Connecting to Google…";

  chrome.identity.getAuthToken({ interactive: true }, (t) => {
    if (chrome.runtime.lastError || !t) {
      statusEl.textContent = "❌ Google login failed";
      return;
    }

    token = t;
    loadSites();
  });
});

function loadSites() {
  fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(d => {
      sites = d.siteEntry || [];
      statusEl.textContent = `✅ GSC connected. ${sites.length} properties found.`;
      fetchBtn.disabled = false;
    })
    .catch(() => {
      statusEl.textContent = "❌ Failed to load GSC sites";
    });
}

/* ---------------- FETCH DATA ---------------- */

fetchBtn.addEventListener("click", () => {
  statsEl.innerHTML = "";
  table.style.display = "none";

  const property = findPropertyForPage();
  if (!property) {
    statusEl.textContent = "⚠ Page not found in any GSC property";
    return;
  }

  statusEl.textContent = "Fetching page-level data…";
  fetchPageData(property);
});

/* ---------------- PROPERTY MATCHING ---------------- */

function findPropertyForPage() {
  // URL-prefix first
  for (const s of sites) {
    if (s.siteUrl.startsWith("http") && pageUrl.startsWith(s.siteUrl)) {
      return s.siteUrl;
    }
  }

  // Domain fallback
  const host = new URL(pageUrl).hostname;
  const domain = `sc-domain:${host}`;
  if (sites.find(s => s.siteUrl === domain)) return domain;

  return null;
}

/* ---------------- GSC QUERY ---------------- */

function fetchPageData(property) {
  const end = formatDate(new Date());
  let start;

  if (rangeSelect.value === "custom") {
    if (!fromDate.value || !toDate.value) {
      statusEl.textContent = "⚠ Select custom dates";
      return;
    }
    start = fromDate.value;
  } else {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(rangeSelect.value, 10));
    start = formatDate(d);
  }

  const body = {
    startDate: start,
    endDate: end,
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

/* ---------------- RENDER ---------------- */

function renderData(rows) {
  if (!rows.length) {
    statusEl.textContent = "⚠ No data for this page";
    return;
  }

  let clicks = 0, impr = 0;
  rows.forEach(r => {
    clicks += r.clicks;
    impr += r.impressions;
  });

  statsEl.innerHTML = `
    <div class="card"><strong>${clicks}</strong>Clicks</div>
    <div class="card"><strong>${impr}</strong>Impressions</div>
  `;

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.keys[0]}</td>
      <td>${r.clicks}</td>
      <td>${r.impressions}</td>
    </tr>
  `).join("");

  table.style.display = "table";
  statusEl.textContent = "✅ Page-level data loaded";
}

/* ---------------- UTIL ---------------- */

function formatDate(d) {
  return d.toISOString().split("T")[0];
}
