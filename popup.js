const connectBtn = document.getElementById("connectBtn");
const fetchBtn = document.getElementById("fetchBtn");
const statusEl = document.getElementById("status");
const statsEl = document.getElementById("stats");

let token = null;
let sites = [];

/* ---------------- CONNECT GSC ---------------- */

connectBtn.addEventListener("click", () => {
  statusEl.textContent = "Signing in with Google…";

  chrome.identity.getAuthToken({ interactive: true }, t => {
    if (chrome.runtime.lastError || !t) {
      statusEl.innerHTML = "<span style='color:red'>Google login failed</span>";
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
      statusEl.innerHTML = `<span style="color:green">GSC connected (${sites.length} properties)</span>`;
      fetchBtn.disabled = false;
    })
    .catch(() => {
      statusEl.innerHTML = "<span style='color:red'>Failed to load GSC sites</span>";
    });
}

/* ---------------- FETCH PAGE DATA ---------------- */

fetchBtn.addEventListener("click", () => {
  statsEl.innerHTML = "";

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];

    if (!tab || !tab.url || !tab.url.startsWith("http")) {
      statusEl.innerHTML = "<span style='color:red'>Open a valid website page</span>";
      return;
    }

    let pageUrl;
    try {
      const u = new URL(tab.url);
      u.hash = "";
      pageUrl = u.toString();
    } catch {
      statusEl.innerHTML = "<span style='color:red'>Invalid page URL</span>";
      return;
    }

    const property = matchProperty(pageUrl);

    if (!property) {
      statusEl.innerHTML = "<span style='color:red'>Page not found in GSC</span>";
      return;
    }

    statusEl.textContent = "Fetching page-level GSC data…";
    fetchPageData(property, pageUrl);
  });
});

/* ---------------- PROPERTY MATCHING ---------------- */

function matchProperty(pageUrl) {
  const host = new URL(pageUrl).hostname;

  // URL-prefix (best)
  for (const s of sites) {
    if (s.siteUrl.startsWith("http") && pageUrl.startsWith(s.siteUrl)) {
      return s.siteUrl;
    }
  }

  // Domain property fallback
  const domainProp = `sc-domain:${host}`;
  return sites.find(s => s.siteUrl === domainProp)?.siteUrl || null;
}

/* ---------------- FETCH DATA ---------------- */

function fetchPageData(property, pageUrl) {
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
        statusEl.innerHTML = "<span style='color:red'>No data for this page</span>";
        return;
      }

      statsEl.innerHTML = `
        <div><strong>Clicks:</strong> ${row.clicks}</div>
        <div><strong>Impressions:</strong> ${row.impressions}</div>
        <div><strong>CTR:</strong> ${(row.ctr * 100).toFixed(2)}%</div>
        <div><strong>Position:</strong> ${row.position.toFixed(1)}</div>
      `;

      statusEl.innerHTML = "<span style='color:green'>Data loaded successfully</span>";
    })
    .catch(() => {
      statusEl.innerHTML = "<span style='color:red'>GSC API error</span>";
    });
}
