const loginBtn = document.getElementById("loginBtn");
const fetchBtn = document.getElementById("fetchBtn");
const statusEl = document.getElementById("status");
const rangeEl = document.getElementById("range");

const totalsEl = document.getElementById("totals");
const clicksEl = document.getElementById("clicks");
const imprEl = document.getElementById("impr");
const ctrEl = document.getElementById("ctr");

const table = document.getElementById("table");
const tbody = table.querySelector("tbody");

let token = null;
let pageUrl = null;

/* -------- GET CURRENT PAGE URL -------- */
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  try {
    const u = new URL(tab.url);
    if (!u.protocol.startsWith("http")) throw "invalid";
    pageUrl = u.origin + u.pathname;
  } catch {
    statusEl.textContent = "❌ Open a valid website page";
    statusEl.className = "status error";
  }
});

/* -------- LOGIN -------- */
loginBtn.onclick = () => {
  chrome.identity.getAuthToken({ interactive: true }, t => {
    if (chrome.runtime.lastError || !t) {
      statusEl.textContent = "❌ Google login failed";
      statusEl.className = "status error";
      return;
    }

    token = t;
    statusEl.textContent = "✅ Google connected. Ready to fetch GSC data.";
    statusEl.className = "status success";
    fetchBtn.disabled = false;
  });
};

/* -------- FETCH DATA -------- */
fetchBtn.onclick = () => {
  if (!token || !pageUrl) return;

  statusEl.textContent = "Fetching GSC data…";
  statusEl.className = "status";
  totalsEl.style.display = "none";
  table.style.display = "none";
  tbody.innerHTML = "";

  const days = parseInt(rangeEl.value, 10);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  const property = `sc-domain:${new URL(pageUrl).hostname}`;

  const baseBody = {
    startDate: formatDate(start),
    endDate: formatDate(end),
    dimensionFilterGroups: [{
      filters: [{
        dimension: "page",
        operator: "equals",
        expression: pageUrl
      }]
    }]
  };

  /* -------- TOTALS -------- */
  fetchGSC(property, {
    ...baseBody,
    dimensions: []
  }).then(rows => {
    if (!rows.length) return;

    const r = rows[0];
    clicksEl.textContent = r.clicks;
    imprEl.textContent = r.impressions;
    ctrEl.textContent = (r.ctr * 100).toFixed(2) + "%";
    totalsEl.style.display = "block";
  });

  /* -------- QUERIES -------- */
  fetchGSC(property, {
    ...baseBody,
    dimensions: ["query"],
    rowLimit: 10
  }).then(rows => {
    if (!rows.length) {
      statusEl.textContent = "⚠ No query data found";
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.keys[0]}</td>
        <td>${r.clicks}</td>
        <td>${r.impressions}</td>
      </tr>
    `).join("");

    table.style.display = "table";
    statusEl.textContent = "✅ GSC data loaded successfully";
    statusEl.className = "status success";
  });
};

/* -------- HELPERS -------- */
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

function formatDate(d) {
  return d.toISOString().split("T")[0];
}
