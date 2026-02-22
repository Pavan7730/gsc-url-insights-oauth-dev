const statusEl = document.getElementById("status");
const statsEl = document.getElementById("stats");
const table = document.getElementById("queriesTable");
const tbody = table.querySelector("tbody");

const rangeSelect = document.getElementById("dateRange");
const fromInput = document.getElementById("fromDate");
const toInput = document.getElementById("toDate");
const fetchBtn = document.getElementById("fetchBtn");

let currentUrl = "";

// Get current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  currentUrl = tab.url;
  document.getElementById("pageUrl").textContent = currentUrl;
});

// Toggle custom dates
rangeSelect.addEventListener("change", () => {
  const isCustom = rangeSelect.value === "custom";
  fromInput.style.display = isCustom ? "block" : "none";
  toInput.style.display = isCustom ? "block" : "none";
});

// Main fetch
fetchBtn.addEventListener("click", () => {
  fetchBtn.disabled = true;
  statusEl.textContent = "Fetching GSC data…";
  statsEl.innerHTML = "";
  table.style.display = "none";

  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError || !token) {
      statusEl.textContent = "❌ Google login required";
      fetchBtn.disabled = false;
      return;
    }

    getPageData(token);
  });
});

function getPageData(token) {
  const today = new Date();
  const endDate = formatDate(today);

  let startDate;
  if (rangeSelect.value === "custom") {
    startDate = fromInput.value;
  } else {
    const days = parseInt(rangeSelect.value, 10);
    const d = new Date();
    d.setDate(d.getDate() - days);
    startDate = formatDate(d);
  }

  // Find property via domain
  const property = `sc-domain:${new URL(currentUrl).hostname}`;

  // Page totals
  const totalsBody = {
    startDate,
    endDate,
    dimensions: [],
    dimensionFilterGroups: [{
      filters: [{
        dimension: "page",
        operator: "equals",
        expression: currentUrl
      }]
    }]
  };

  fetchGSC(property, token, totalsBody)
    .then(totals => {
      renderTotals(totals);
      return fetchQueries(property, token, startDate, endDate);
    })
    .then(renderQueries)
    .catch(() => {
      statusEl.textContent = "⚠ No data found for this page";
    })
    .finally(() => {
      fetchBtn.disabled = false;
    });
}

function fetchQueries(property, token, startDate, endDate) {
  const body = {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: 10,
    dimensionFilterGroups: [{
      filters: [{
        dimension: "page",
        operator: "equals",
        expression: currentUrl
      }]
    }]
  };

  return fetchGSC(property, token, body);
}

function fetchGSC(property, token, body) {
  return fetch(
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
    .then(d => d.rows || []);
}

function renderTotals(rows) {
  const r = rows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  statsEl.innerHTML = `
    <div class="card"><strong>${r.clicks}</strong>Clicks</div>
    <div class="card"><strong>${r.impressions}</strong>Impressions</div>
    <div class="card"><strong>${(r.ctr * 100).toFixed(2)}%</strong>CTR</div>
    <div class="card"><strong>${r.position.toFixed(1)}</strong>Position</div>
  `;
}

function renderQueries(rows) {
  if (!rows.length) return;

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.keys[0]}</td>
      <td>${r.clicks}</td>
      <td>${r.impressions}</td>
    </tr>
  `).join("");

  table.style.display = "table";
  statusEl.textContent = "✅ Page-level GSC data loaded";
}

function formatDate(d) {
  return d.toISOString().split("T")[0];
}
