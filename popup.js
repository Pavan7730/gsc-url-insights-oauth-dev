const pageUrlEl = document.getElementById("pageUrl");
const statusEl = document.getElementById("status");
const connectBtn = document.getElementById("connectBtn");
const fetchBtn = document.getElementById("fetchBtn");
const rangeSelect = document.getElementById("range");
const table = document.getElementById("table");
const tbody = table.querySelector("tbody");

let pageUrl = "";
let token = "";
let sites = [];

/* ---------------- GET CURRENT TAB URL ---------------- */

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab || !tab.url || !tab.url.startsWith("http")) {
    pageUrlEl.textContent = "❌ Open a normal webpage (http/https)";
    connectBtn.disabled = true;
    fetchBtn.disabled = true;
    return;
  }

  pageUrl = tab.url.split("#")[0];
  pageUrlEl.textContent = pageUrl;
});

/* ---------------- CONNECT GSC ---------------- */

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
      statusEl.innerHTML = `<span class="success">✅ GSC connected. ${sites.length} properties found.</span>`;
      fetchBtn.disabled = false;
    })
    .catch(() => {
      statusEl.innerHTML = "<span class='error'>Failed to load GSC properties</span>";
    });
}

/* ---------------- FETCH PAGE DATA ---------------- */

fetchBtn.addEventListener("click", () => {
  table.style.display = "none";
  tbody.innerHTML = "";

  const property = findProperty();
  if (!property) {
    statusEl.innerHTML = "<span class='error'>Page not found in any GSC property</span>";
    return;
  }

  statusEl.textContent = "Fetching page-level data…";
  fetchData(property);
});

function findProperty() {
  const host = new URL(pageUrl).hostname;

  // Prefer URL-prefix
  for (const s of sites) {
    if (s.siteUrl.startsWith("http") && pageUrl.startsWith(s.siteUrl)) {
      return s.siteUrl;
    }
  }

  // Fallback to domain
  const domainProp = `sc-domain:${host}`;
  return sites.find(s => s.siteUrl === domainProp)?.siteUrl || null;
}

function fetchData(property) {
  const days = parseInt(rangeSelect.value, 10);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  const body = {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
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

  fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })
    .then(r => r.json())
    .then(d => {
      if (!d.rows || !d.rows.length) {
        statusEl.innerHTML = "<span class='error'>No data for this page</span>";
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
      statusEl.innerHTML = "<span class='success'>✅ Page data loaded</span>";
    })
    .catch(() => {
      statusEl.innerHTML = "<span class='error'>Failed to fetch data</span>";
    });
}
