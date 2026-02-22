const loginBtn = document.getElementById("loginBtn");
const fetchBtn = document.getElementById("fetchBtn");
const statusEl = document.getElementById("status");
const rangeSelect = document.getElementById("range");
const table = document.getElementById("queryTable");
const tbody = table.querySelector("tbody");

let token = null;
let pageUrl = "";

/* ---------------- Get active tab URL ---------------- */

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  try {
    const u = new URL(tab.url);
    if (u.protocol === "http:" || u.protocol === "https:") {
      pageUrl = u.origin + u.pathname;
    } else {
      statusEl.innerHTML = `<span class="error">Open a valid website page</span>`;
    }
  } catch {
    statusEl.innerHTML = `<span class="error">Open a valid website page</span>`;
  }
});

/* ---------------- Google Login ---------------- */

loginBtn.addEventListener("click", () => {
  chrome.identity.getAuthToken({ interactive: true }, (t) => {
    if (chrome.runtime.lastError || !t) {
      statusEl.innerHTML = `<span class="error">Google login failed</span>`;
      return;
    }

    token = t;
    fetchBtn.disabled = false;
    statusEl.innerHTML = `<span class="success">✔ Google connected. Ready to fetch GSC data.</span>`;
  });
});

/* ---------------- Fetch Page Data ---------------- */

fetchBtn.addEventListener("click", () => {
  if (!pageUrl) {
    statusEl.innerHTML = `<span class="error">Open a valid website page</span>`;
    return;
  }

  fetchBtn.disabled = true;
  statusEl.textContent = "Fetching GSC data...";
  table.style.display = "none";
  tbody.innerHTML = "";

  const days = parseInt(rangeSelect.value, 10);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  const startDate = start.toISOString().split("T")[0];
  const endDate = end.toISOString().split("T")[0];

  const property = `sc-domain:${new URL(pageUrl).hostname}`;

  /* -------- Totals -------- */

  fetchGSC(property, {
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
    .then(rows => {
      const r = rows[0] || { clicks: 0, impressions: 0, ctr: 0 };
      statusEl.innerHTML = `
        <span class="success">
          ✔ Clicks: ${r.clicks},
          Impressions: ${r.impressions},
          CTR: ${(r.ctr * 100).toFixed(2)}%
        </span>`;
      return fetchQueries(property, startDate, endDate);
    })
    .then(renderQueries)
    .catch(() => {
      statusEl.innerHTML = `<span class="error">No data found for this page</span>`;
    })
    .finally(() => {
      fetchBtn.disabled = false;
    });
});

/* ---------------- Queries ---------------- */

function fetchQueries(property, startDate, endDate) {
  return fetchGSC(property, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: 10,
    dimensionFilterGroups: [{
      filters: [{
        dimension: "page",
        operator: "equals",
        expression: pageUrl
      }]
    }]
  });
}

/* ---------------- GSC API ---------------- */

function fetchGSC(property, body) {
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

/* ---------------- Render Queries ---------------- */

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
}
