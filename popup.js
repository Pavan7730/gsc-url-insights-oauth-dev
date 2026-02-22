const connectBtn = document.getElementById("connectBtn");
const fetchBtn = document.getElementById("fetchBtn");
const statusEl = document.getElementById("status");
const statsEl = document.getElementById("stats");

let token = "";
let sites = [];

/* ---------------- CONNECT GOOGLE ---------------- */

connectBtn.addEventListener("click", () => {
  statusEl.textContent = "Opening Google login…";

  chrome.identity.getAuthToken({ interactive: true }, t => {
    if (chrome.runtime.lastError || !t) {
      statusEl.innerHTML = "<span class='error'>Google login failed</span>";
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
      statusEl.innerHTML = `<span class="success">GSC connected</span>`;
      fetchBtn.disabled = false;
    })
    .catch(() => {
      statusEl.innerHTML = "<span class='error'>Failed to connect GSC</span>";
    });
}

/* ---------------- FETCH PAGE DATA ---------------- */

fetchBtn.addEventListener("click", () => {
  statsEl.innerHTML = "";

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab || !tab.url || !tab.url.startsWith("http")) {
      statusEl.innerHTML = "<span class='error'>Open a website page</span>";
      return;
    }

    const pageUrl = tab.url.split("#")[0];
    const property = findProperty(pageUrl);

    if (!property) {
      statusEl.innerHTML = "<span class='error'>This page is not in GSC</span>";
      return;
    }

    statusEl.textContent = "Fetching GSC data…";
    fetchPageStats(property, pageUrl);
  });
});

function findProperty(pageUrl) {
  const host = new URL(pageUrl).hostname;

  // URL-prefix first
  for (const s of sites) {
    if (s.siteUrl.startsWith("http") && pageUrl.startsWith(s.siteUrl)) {
      return s.siteUrl;
    }
  }

  // Domain fallback
  const domain = `sc-domain:${host}`;
  return sites.find(s => s.siteUrl === domain)?.siteUrl || null;
}

function fetchPageStats(property, pageUrl) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 3);

  const body = {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    dimensions: [],
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
    .then(d => {
      const row = d.rows?.[0];

      if (!row) {
        statusEl.innerHTML = "<span class='error'>No data for this page</span>";
        return;
      }

      statsEl.innerHTML = `
        <div class="stat"><strong>Clicks:</strong> ${row.clicks}</div>
        <div class="stat"><strong>Impressions:</strong> ${row.impressions}</div>
        <div class="stat"><strong>CTR:</strong> ${(row.ctr * 100).toFixed(2)}%</div>
        <div class="stat"><strong>Position:</strong> ${row.position.toFixed(1)}</div>
      `;

      statusEl.innerHTML = "<span class='success'>Data loaded</span>";
    })
    .catch(() => {
      statusEl.innerHTML = "<span class='error'>Failed to fetch data</span>";
    });
}
