// Injected into the page context to intercept XHR/fetch responses
// Communicates back to injector.js via window.postMessage

(function () {
  "use strict";

  const INTERCEPT_PATTERNS = [
    /\/getData\//i,
    /exportVessels/i,
    /\/vesselDetails\//i,
    /\/get_data_json/i,
    /\/ais\/gettrackjson/i,
    /\/vesselTrack/i,
  ];

  function shouldIntercept(url) {
    return INTERCEPT_PATTERNS.some((p) => p.test(url));
  }

  // Ship type code → "motor" | "sailing"
  function mapShipType(typeCode) {
    // MarineTraffic type codes: 36 = sailing, 0/6/7/8/9 common for yachts
    const code = parseInt(typeCode, 10);
    if (code === 36) return "sailing";
    return "motor";
  }

  // Normalize a single vessel record from various MT response shapes
  function normalizeVessel(raw) {
    // MT returns speed in tenths of a knot
    const speed = raw.SPEED != null ? raw.SPEED / 10 : undefined;
    const lat = parseFloat(raw.LAT) || undefined;
    const lon = parseFloat(raw.LON) || undefined;
    if (!lat && !lon) return null; // skip entries without position

    return {
      name: raw.SHIPNAME || raw.NAME || raw.shipname || "",
      imo: String(raw.IMO || raw.imo || ""),
      mmsi: String(raw.MMSI || raw.mmsi || ""),
      mtShipId: String(raw.SHIP_ID || raw.ship_id || raw.SHIPID || ""),
      length: parseInt(raw.LENGTH || raw.length || 0, 10) || 0,
      builder: "",
      yearBuilt: parseInt(raw.YEAR_BUILT || raw.year_built || 0, 10) || 0,
      type: mapShipType(raw.SHIPTYPE || raw.shiptype || raw.TYPE_SPECIFIC),
      photoUrl: "",
      owner: { name: "", wikipedia: "", business: "" },
      lat,
      lon,
      speed,
      heading:
        raw.HEADING != null ? parseInt(raw.HEADING, 10) : undefined,
      lastUpdate: raw.LAST_POS
        ? new Date(raw.LAST_POS * 1000).toISOString()
        : raw.TIMESTAMP || undefined,
      status: raw.STATUS != null ? String(raw.STATUS) : undefined,
    };
  }

  // Try to extract vessel array from various response shapes
  function extractVessels(data) {
    if (!data) return [];

    // Array at top level
    if (Array.isArray(data)) {
      return data.map(normalizeVessel).filter(Boolean);
    }

    // { data: { rows: [...] } } — common getData response
    if (data.data && Array.isArray(data.data.rows)) {
      return data.data.rows.map(normalizeVessel).filter(Boolean);
    }
    if (data.data && Array.isArray(data.data)) {
      return data.data.map(normalizeVessel).filter(Boolean);
    }

    // { rows: [...] }
    if (Array.isArray(data.rows)) {
      return data.rows.map(normalizeVessel).filter(Boolean);
    }

    // Nested under type keys like { 0: [...], 1: [...] }
    const values = Object.values(data);
    for (const v of values) {
      if (Array.isArray(v) && v.length > 0 && (v[0].SHIPNAME || v[0].MMSI || v[0].LAT)) {
        return v.map(normalizeVessel).filter(Boolean);
      }
    }

    return [];
  }

  function processResponse(url, text) {
    try {
      const json = JSON.parse(text);
      const vessels = extractVessels(json);
      if (vessels.length > 0) {
        window.postMessage(
          { type: "VESSELKA_VESSELS", vessels, sourceUrl: url },
          "*"
        );
      }
    } catch (_) {
      // Not JSON or parse error — ignore
    }
  }

  // --- Patch XMLHttpRequest ---
  const OrigXHR = XMLHttpRequest;
  const origOpen = OrigXHR.prototype.open;
  const origSend = OrigXHR.prototype.send;

  OrigXHR.prototype.open = function (method, url) {
    this._vesselkaUrl = url;
    return origOpen.apply(this, arguments);
  };

  OrigXHR.prototype.send = function () {
    if (this._vesselkaUrl && shouldIntercept(this._vesselkaUrl)) {
      const url = this._vesselkaUrl;
      this.addEventListener("load", function () {
        processResponse(url, this.responseText);
      });
    }
    return origSend.apply(this, arguments);
  };

  // --- Patch fetch ---
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    const promise = origFetch.apply(this, arguments);

    if (shouldIntercept(url)) {
      promise.then((response) => {
        // Clone so the original consumer still works
        response
          .clone()
          .text()
          .then((text) => processResponse(url, text))
          .catch(() => {});
      });
    }

    return promise;
  };

  console.log("[Vesselka] Intercept active — monitoring MarineTraffic API");
})();
