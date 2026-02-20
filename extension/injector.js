// Content script — injects intercept.js into page context and manages the panel

(function () {
  "use strict";

  // Inject the interceptor into the page's JS context
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("intercept.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // Vessel store — keyed by MMSI or mtShipId to dedupe
  const vessels = new Map();

  // Listen for intercepted data from page context
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== "VESSELKA_VESSELS") return;

    for (const v of event.data.vessels) {
      const key = v.mmsi || v.mtShipId || v.name;
      if (!key) continue;
      // Merge — keep richer record
      const existing = vessels.get(key);
      if (existing) {
        vessels.set(key, { ...existing, ...v });
      } else {
        vessels.set(key, v);
      }
    }

    renderPanel();
  });

  // --- Panel UI ---
  let panel = null;
  let minimized = false;

  function createPanel() {
    panel = document.createElement("div");
    panel.id = "vesselka-panel";
    panel.innerHTML = `
      <div class="vesselka-header">
        <span class="vesselka-title">Vesselka</span>
        <span class="vesselka-count">0 vessels</span>
        <div class="vesselka-actions">
          <button class="vesselka-btn vesselka-btn-min" title="Minimize">_</button>
          <button class="vesselka-btn vesselka-btn-close" title="Close">x</button>
        </div>
      </div>
      <div class="vesselka-body">
        <div class="vesselka-filters">
          <input type="text" class="vesselka-search" placeholder="Filter by name...">
          <label class="vesselka-filter-label">
            <input type="number" class="vesselka-min-length" placeholder="Min length (m)" min="0" step="1">
          </label>
        </div>
        <div class="vesselka-list"></div>
        <div class="vesselka-footer">
          <button class="vesselka-btn vesselka-btn-copy">Copy JSON</button>
          <button class="vesselka-btn vesselka-btn-download">Download JSON</button>
          <button class="vesselka-btn vesselka-btn-clear">Clear</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Drag support
    let isDragging = false, startX, startY, startLeft, startTop;
    const header = panel.querySelector(".vesselka-header");
    header.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON") return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      panel.style.left = startLeft + (e.clientX - startX) + "px";
      panel.style.top = startTop + (e.clientY - startY) + "px";
      panel.style.right = "auto";
    });
    document.addEventListener("mouseup", () => { isDragging = false; });

    // Minimize
    panel.querySelector(".vesselka-btn-min").addEventListener("click", () => {
      minimized = !minimized;
      panel.querySelector(".vesselka-body").style.display = minimized ? "none" : "flex";
      panel.querySelector(".vesselka-btn-min").textContent = minimized ? "+" : "_";
    });

    // Close
    panel.querySelector(".vesselka-btn-close").addEventListener("click", () => {
      panel.style.display = "none";
    });

    // Copy JSON
    panel.querySelector(".vesselka-btn-copy").addEventListener("click", () => {
      const json = buildExportJSON();
      navigator.clipboard.writeText(json).then(() => {
        showToast("Copied " + vessels.size + " vessels to clipboard");
      });
    });

    // Download JSON
    panel.querySelector(".vesselka-btn-download").addEventListener("click", () => {
      const json = buildExportJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vesselka-capture-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Downloaded " + vessels.size + " vessels");
    });

    // Clear
    panel.querySelector(".vesselka-btn-clear").addEventListener("click", () => {
      vessels.clear();
      renderPanel();
    });

    // Search filter
    panel.querySelector(".vesselka-search").addEventListener("input", () => renderList());
    panel.querySelector(".vesselka-min-length").addEventListener("input", () => renderList());
  }

  function getFilteredVessels() {
    const search = panel?.querySelector(".vesselka-search")?.value?.toLowerCase() || "";
    const minLength = parseInt(panel?.querySelector(".vesselka-min-length")?.value || "0", 10) || 0;
    return Array.from(vessels.values())
      .filter((v) => {
        if (search && !v.name.toLowerCase().includes(search)) return false;
        if (minLength && v.length < minLength) return false;
        return true;
      })
      .sort((a, b) => (b.length || 0) - (a.length || 0));
  }

  function renderList() {
    if (!panel) return;
    const list = panel.querySelector(".vesselka-list");
    const filtered = getFilteredVessels();

    list.innerHTML = filtered
      .map(
        (v) => `
      <div class="vesselka-vessel">
        <div class="vesselka-vessel-name">${escapeHtml(v.name || "Unknown")}</div>
        <div class="vesselka-vessel-meta">
          ${v.length ? v.length + "m" : ""}
          ${v.type === "sailing" ? " sail" : ""}
          ${v.speed != null ? " | " + v.speed + "kn" : ""}
          ${v.imo ? " | IMO " + v.imo : ""}
        </div>
        <div class="vesselka-vessel-pos">
          ${v.lat?.toFixed(4) || "?"}, ${v.lon?.toFixed(4) || "?"}
        </div>
      </div>`
      )
      .join("");
  }

  function renderPanel() {
    if (!panel) createPanel();
    panel.style.display = "flex";
    panel.querySelector(".vesselka-count").textContent = vessels.size + " vessels";
    renderList();
  }

  function buildExportJSON() {
    const filtered = getFilteredVessels();
    return JSON.stringify(filtered, null, 2);
  }

  function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "vesselka-toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
