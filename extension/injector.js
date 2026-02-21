// Content script — injects intercept.js into page context and manages the panel

(function () {
  "use strict";

  // --- Config ---
  const API_URL = "https://vesselka.vercel.app/api/vessels";
  const API_KEY = "6c7d4d20efd4d64c1df2775da05adabf";
  const SYNC_DEBOUNCE_MS = 5000;
  const AUTO_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  // Inject the interceptor into the page's JS context
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("intercept.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // Vessel store — keyed by MMSI or mtShipId to dedupe
  const vessels = new Map();

  // --- Auto-sync to Vesselka API ---
  let syncTimer = null;
  let lastSyncStatus = null; // "ok" | "error" | null

  function scheduleSyncToAPI() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(syncToAPI, SYNC_DEBOUNCE_MS);
  }

  async function syncToAPI() {
    const arr = Array.from(vessels.values()).filter((v) => v.mtShipId && v.lat);
    if (arr.length === 0) return;
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify(arr),
      });
      if (res.ok) {
        lastSyncStatus = "ok";
        const data = await res.json();
        updateSyncIndicator("ok", `Synced ${data.count} vessels`);
        // Fetch photos for vessels that need them
        const needPhoto = (data.needPhoto || []).slice(0, 20);
        if (needPhoto.length > 0) {
          updateSyncIndicator("ok", `Fetching ${needPhoto.length} photos...`);
          window.postMessage({ type: "VESSELKA_FETCH_PHOTOS", shipIds: needPhoto }, "*");
        }
      } else {
        lastSyncStatus = "error";
        updateSyncIndicator("error", `Sync failed: ${res.status}`);
      }
    } catch (e) {
      lastSyncStatus = "error";
      updateSyncIndicator("error", "Sync failed: network error");
    }
  }

  function updateSyncIndicator(status, text) {
    if (!panel) return;
    const indicator = panel.querySelector(".vesselka-sync");
    if (!indicator) return;
    indicator.textContent = text;
    indicator.className = "vesselka-sync vesselka-sync-" + status;
  }

  // Listen for messages from page context
  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;

    // Photo results — upload to API
    if (event.data?.type === "VESSELKA_PHOTOS_RESULT") {
      const photos = event.data.photos || {};
      const entries = Object.entries(photos);
      if (entries.length === 0) return;
      try {
        const res = await fetch(API_URL + "/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
          body: JSON.stringify({ photos }),
        });
        if (res.ok) {
          const data = await res.json();
          updateSyncIndicator("ok", `Uploaded ${data.count} photos`);
        }
      } catch {}
      return;
    }

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
    scheduleSyncToAPI();
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
        <div class="vesselka-sync"></div>
        <div class="vesselka-footer">
          <button class="vesselka-btn vesselka-btn-refresh" title="Nudge map to trigger MT data reload">Refresh</button>
          <button class="vesselka-btn vesselka-btn-sync" title="Push to Vesselka now">Sync</button>
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

    // Refresh — nudge the map to trigger MT API reload
    panel.querySelector(".vesselka-btn-refresh").addEventListener("click", () => {
      nudgeMap();
      showToast("Refreshing map data...");
    });

    // Manual sync
    panel.querySelector(".vesselka-btn-sync").addEventListener("click", () => {
      syncToAPI();
      showToast("Syncing to Vesselka...");
    });

    // Search filter
    panel.querySelector(".vesselka-search").addEventListener("input", () => renderList());
    panel.querySelector(".vesselka-min-length").addEventListener("input", () => renderList());

    // Auto-sync every 30 min: nudge map for fresh positions, then sync
    setInterval(() => {
      nudgeMap();
      setTimeout(() => syncToAPI(), 3000);
    }, AUTO_SYNC_INTERVAL_MS);
  }

  function nudgeMap() {
    window.postMessage({ type: "VESSELKA_NUDGE_MAP" }, "*");
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
