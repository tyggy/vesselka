#!/usr/bin/env node
/**
 * Vessel Discovery Script for Vesselka
 *
 * Enriches captured vessel data with details from MarineTraffic + Wikipedia.
 *
 * Usage:
 *   node scripts/discover.mjs                   # Enrich vessels missing data
 *   node scripts/discover.mjs --limit 10        # Process max 10 vessels
 *   node scripts/discover.mjs --min-length 30   # Only vessels >= 30m
 *   node scripts/discover.mjs --all             # Re-fetch all vessels
 *   node scripts/discover.mjs --dry-run         # Don't save, just log
 *
 * Sources:
 *   1. r.jina.ai → MarineTraffic detail pages (rendered markdown)
 *   2. Wikipedia API — vessel page link, owner, builder, year
 *
 * Rate limited: 3s between MT requests, 1s between Wikipedia requests.
 * Updates: app/lib/captured-vessels.json (in place)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const CAPTURED_PATH = resolve(PROJECT_ROOT, "app/lib/captured-vessels.json");

const MT_DELAY = 3500;
const WIKI_DELAY = 1000;

function needsEnrichment(v) {
  return !v.imo || !v.builder || v.yearBuilt === 0;
}

function needsOwnerEnrichment(v) {
  return !v.owner?.name || !v.owner?.business;
}

function isTender(name) {
  return /\bTT\b|TENDER|CHASE\b|\bRIB\b|\bAUX\b|UTILITY/i.test(name);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- MarineTraffic via r.jina.ai ---

async function fetchMTPage(mtShipId) {
  const mtUrl = `https://www.marinetraffic.com/en/ais/details/ships/shipid:${mtShipId}`;
  const url = `https://r.jina.ai/${mtUrl}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "text/plain",
        "X-Return-Format": "markdown",
        "X-Timeout": "15",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseMTMarkdown(md) {
  if (!md) return {};
  const fields = {};

  // IMO — from table row "| IMO | 8603509 |" or inline "IMO: 8603509"
  const imo = md.match(/\|\s*IMO\s*\|\s*(\d{7})\s*\|/) || md.match(/IMO[:\s]*(\d{7})/i);
  if (imo) fields.imo = imo[1];

  // MMSI — from table row "| MMSI | 309056000 |" or inline
  const mmsi = md.match(/\|\s*MMSI\s*\|\s*(\d{9})\s*\|/) || md.match(/MMSI[:\s]*(\d{9})/i);
  if (mmsi) fields.mmsi = mmsi[1];

  // Flag — from table "| Flag | BAHAMAS |" or from summary "flag of **BAHAMAS**"
  const flag =
    md.match(/\|\s*Flag\s*\|\s*([A-Z][A-Z\s]+?)\s*\|/) ||
    md.match(/flag of \*\*([A-Z][A-Z\s]+?)\*\*/);
  if (flag) fields.flag = flag[1].trim();

  // Year Built — table or inline
  const year =
    md.match(/\|\s*Year\s*built\s*\|\s*(\d{4})\s*\|/i) ||
    md.match(/(?:Year\s*Built|Build\s*Year)[:\s]*(\d{4})/i);
  if (year) fields.yearBuilt = parseInt(year[1], 10);

  // Builder / Shipyard — table or inline
  const builder =
    md.match(/\|\s*(?:Builder|Shipyard)\s*\|\s*([^|]+?)\s*\|/i) ||
    md.match(/(?:Builder|Shipyard|Built\s*by)[:\s]*([A-ZÀ-ÿ][A-Za-zÀ-ÿ&\s\+\-'.]+?)(?:\n|,|\||\[)/i);
  if (builder) {
    const b = builder[1].trim();
    if (b && !/upgrade|unlock/i.test(b)) fields.builder = b;
  }

  // Gross Tonnage — table or inline
  const gt =
    md.match(/\|\s*(?:Gross\s*Tonnage|GT)\s*\|\s*([\d,]+)\s*\|/i) ||
    md.match(/(?:Gross\s*Tonnage|GT)[:\s]*([\d,]+)/i);
  if (gt) fields.grossTonnage = parseInt(gt[1].replace(/,/g, ""), 10);

  // Length — from summary "LOA) is 134 meters" or table or inline
  const len =
    md.match(/LOA\)\s*is\s*([\d.]+)\s*meter/i) ||
    md.match(/length[^.]*?is\s*([\d.]+)\s*meter/i) ||
    md.match(/\|\s*(?:Length|LOA)\s*\|\s*([\d.]+)\s*m/i) ||
    md.match(/(?:Length(?:\s*Overall)?|LOA)[:\s]*([\d.]+)\s*(?:m\b|meter)/i);
  if (len) fields.length = Math.round(parseFloat(len[1]));

  // Beam/Width — from summary "width is 15.8 meters"
  const beam =
    md.match(/width[^.]*?is\s*([\d.]+)\s*meter/i) ||
    md.match(/\|\s*(?:Beam|Width)\s*\|\s*([\d.]+)\s*m/i) ||
    md.match(/(?:Beam|Width)[:\s]*([\d.]+)\s*(?:m\b|meter)/i);
  if (beam) fields.beam = Math.round(parseFloat(beam[1]));

  // Type — from table "| Detailed vessel type | Passenger Ship |" or inline
  const detailedType =
    md.match(/\|\s*Detailed vessel type\s*\|\s*([^|]+?)\s*\|/i) ||
    md.match(/\|\s*General vessel type\s*\|\s*([^|]+?)\s*\|/i);
  if (detailedType) {
    const t = detailedType[1].trim();
    if (t && !/upgrade|unlock/i.test(t)) {
      fields.shipType = t;
      if (/sail/i.test(t)) fields.type = "sailing";
      else if (/yacht/i.test(t)) fields.type = "motor";
    }
  }

  // Photo URL — MT asset photo
  const photo =
    md.match(/!\[.*?Vessel.*?image\]\((https:\/\/www\.marinetraffic\.com\/getAssetDefaultPhoto[^\s)]+)\)/) ||
    md.match(/!\[.*?\]\((https:\/\/photos\.marinetraffic\.com\/[^\s)]+)\)/);
  if (photo) fields.photoUrl = photo[1];

  // Deadweight
  const dwt =
    md.match(/\|\s*(?:Deadweight|DWT)\s*\|\s*([\d,]+)\s*\|/i) ||
    md.match(/(?:Deadweight|DWT)[:\s]*([\d,]+)/i);
  if (dwt) fields.deadweight = parseInt(dwt[1].replace(/,/g, ""), 10);

  // Call sign
  const callsign = md.match(/\|\s*Call sign\s*\|\s*([A-Z0-9]+)\s*\|/i);
  if (callsign) fields.callSign = callsign[1];

  return fields;
}

// --- Wikipedia API ---

async function searchWikipedia(vesselName) {
  // Normalize name for matching
  const nameLower = vesselName.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 1);

  const queries = [
    `"${vesselName}" yacht`,
    `"${vesselName}" superyacht motor vessel`,
  ];

  for (const query of queries) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Vesselka/1.0 (vessel tracker)" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const results = data?.query?.search || [];

      for (const r of results) {
        const title = r.title.toLowerCase();
        const snippet = (r.snippet || "").toLowerCase().replace(/<[^>]+>/g, "");

        // Skip list/disambiguation/unrelated pages
        if (/^list of /i.test(r.title) || /disambiguation/i.test(r.title)) continue;
        if (/USS |HMS /i.test(r.title) && !/USS |HMS /i.test(vesselName)) continue;

        // Title must contain the vessel name (or most of its words)
        const titleMatches = nameWords.filter((w) => title.includes(w));
        const snippetHasName = nameWords.every((w) => snippet.includes(w));
        const nameInTitle = titleMatches.length >= Math.max(1, nameWords.length - 1);

        if (!nameInTitle && !snippetHasName) continue;

        // Must be about a vessel, not a person/company/other thing
        const isVessel =
          title.includes("yacht") ||
          title.includes("ship") ||
          title.includes("vessel") ||
          snippet.includes("yacht") ||
          snippet.includes("superyacht") ||
          snippet.includes("motor yacht") ||
          snippet.includes("sailing yacht") ||
          snippet.includes("luxury vessel") ||
          snippet.includes("megayacht");

        if (isVessel) {
          return {
            title: r.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
            pageId: r.pageid,
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchWikipediaExtract(pageTitle) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&exintro=true&explaintext=true&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Vesselka/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    return page?.extract || null;
  } catch {
    return null;
  }
}

function parseWikiExtract(extract) {
  if (!extract) return {};
  const fields = {};

  const builderMatch = extract.match(
    /(?:built by|constructed by|built at|shipyard|builder)[:\s]+([A-Z][A-Za-zÀ-ÿ&\s\+\-']+?)(?:[,.\n]|in \d)/i
  );
  if (builderMatch) fields.builder = builderMatch[1].trim();

  const yearMatch = extract.match(
    /(?:built in|launched in|completed in|delivered in)\s+(\d{4})/i
  );
  if (yearMatch) fields.yearBuilt = parseInt(yearMatch[1], 10);

  const ownerMatch = extract.match(
    /(?:owned by|owner is|belongs to|commissioned by)\s+([A-Z][A-Za-zÀ-ÿ\s\-']+?)(?:[,.\n])/i
  );
  if (ownerMatch) fields.ownerName = ownerMatch[1].trim();

  const lengthMatch = extract.match(
    /(?:length|LOA)[:\s]+([\d.]+)\s*(?:m\b|metres|meters)/i
  );
  if (lengthMatch) fields.length = Math.round(parseFloat(lengthMatch[1]));

  if (/sailing yacht|sailing vessel|sailboat/i.test(extract)) {
    fields.type = "sailing";
  }

  return fields;
}

// --- Wikipedia wikitext (infobox parsing) ---

async function fetchWikitext(pageTitle) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Vesselka/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.parse?.wikitext?.["*"] || null;
  } catch {
    return null;
  }
}

function parseWikiInfobox(wikitext) {
  if (!wikitext) return {};
  const fields = {};

  // Owner — "| Ship owner = [[Name]]" or "| Ship owner = Name"
  const ownerPatterns = [
    /\|\s*(?:Ship\s*owner|Owner)\s*=\s*\[\[([^\]|]+)/im,
    /\|\s*(?:Ship\s*owner|Owner)\s*=\s*([A-ZÀ-ÿ][A-Za-zÀ-ÿ\s\-'.]+?)(?:\n|\||\[|<)/im,
  ];
  for (const pat of ownerPatterns) {
    const m = wikitext.match(pat);
    if (m) {
      const name = m[1].trim().replace(/\]\].*/, "");
      if (name && name.length > 2 && !/unknown|undisclosed|private|various/i.test(name)) {
        fields.ownerName = name;
        break;
      }
    }
  }

  // Builder from infobox
  const builderPatterns = [
    /\|\s*(?:Ship\s*builder|Builder|Ship\s*yard)\s*=\s*\[\[([^\]|]+)/im,
    /\|\s*(?:Ship\s*builder|Builder|Ship\s*yard)\s*=\s*([A-ZÀ-ÿ][A-Za-zÀ-ÿ&\s\+\-'.]+?)(?:\n|\||\[|<)/im,
  ];
  for (const pat of builderPatterns) {
    const m = wikitext.match(pat);
    if (m) {
      const b = m[1].trim();
      if (b && b.length > 2) { fields.builder = b; break; }
    }
  }

  // Year from infobox — "| Ship completed = 2002" or "| Ship launched = 2019"
  const yearMatch = wikitext.match(
    /\|\s*(?:Ship\s*completed|Ship\s*launched|Ship\s*christened|Ship\s*delivered)\s*=\s*.*?(\d{4})/im
  );
  if (yearMatch) fields.yearBuilt = parseInt(yearMatch[1], 10);

  // Length from infobox
  const lenMatch = wikitext.match(
    /\|\s*(?:Ship\s*length)\s*=\s*.*?([\d.]+)\s*(?:m\b|metres|meters)/im
  );
  if (lenMatch) fields.length = Math.round(parseFloat(lenMatch[1]));

  return fields;
}

// --- Owner enrichment via Wikipedia ---

async function enrichOwnerFromWiki(ownerName) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(ownerName)}&format=json&srlimit=3`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Vesselka/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.query?.search || [];

    // Find the person's page — title should closely match the name
    const nameWords = ownerName.toLowerCase().split(/\s+/);
    const match = results.find((r) => {
      const t = r.title.toLowerCase();
      return nameWords.every((w) => t.includes(w));
    });
    if (!match) return null;

    const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(match.title.replace(/ /g, "_"))}`;

    // Get extract for business description
    await sleep(500);
    const extract = await fetchWikipediaExtract(match.title);
    if (!extract) return { wikipedia: wikiUrl };

    const result = { wikipedia: wikiUrl };

    // Extract business/profession from first sentence
    const firstSentence = extract.split(/\.\s/)[0] || "";
    const businessPatterns = [
      /(?:is|was)\s+(?:an?\s+)?([A-Za-z\s,\-]+?)\s+(?:billionaire|entrepreneur|businessman|businesswoman|investor|executive|magnate|tycoon)/i,
      /(?:is|was)\s+(?:an?\s+)?(?:[A-Za-z\s]+?\s+)?(billionaire|entrepreneur|businessman|businesswoman|investor|executive|magnate|tycoon)/i,
      /(?:is|was)\s+(?:an?\s+)?([A-Za-z\s,\-]+?)(?:\.|who\b|known\b|He\b|She\b)/i,
    ];

    for (const pat of businessPatterns) {
      const m = firstSentence.match(pat);
      if (m) {
        let biz = m[1]?.trim() || m[0]?.trim();
        if (biz && biz.length > 3 && biz.length < 120) {
          result.business = biz;
          break;
        }
      }
    }

    // Extract known-for / company affiliations from the extract
    const companyPatterns = [
      /(?:founder|co-founder|CEO|chairman|owner)\s+(?:of\s+)?(?:the\s+)?([A-Z][A-Za-z\s&\-'.]+?)(?:[,.\n])/g,
      /(?:founded|co-founded|leads?|runs?|heads?)\s+([A-Z][A-Za-z\s&\-'.]+?)(?:[,.\n])/g,
    ];

    const companies = [];
    for (const pat of companyPatterns) {
      let cm;
      while ((cm = pat.exec(extract)) !== null) {
        const c = cm[1].trim();
        if (c.length > 2 && c.length < 60 && !/He |She |His |Her |The /i.test(c)) {
          companies.push(c);
        }
      }
    }
    if (companies.length > 0 && !result.business) {
      result.business = companies.slice(0, 2).join(", ");
    }

    // Net worth
    const nwMatch = extract.match(
      /net\s*worth[^.]*?\$\s*([\d.]+\s*(?:billion|million|B|M))/i
    );
    if (nwMatch) result.netWorth = `$${nwMatch[1]}`;

    // Also try "Forbes ... $X billion"
    if (!result.netWorth) {
      const forbesMatch = extract.match(
        /(?:Forbes|estimated|worth)[^.]*?\$\s*([\d.]+)\s*(billion|million)/i
      );
      if (forbesMatch) result.netWorth = `$${forbesMatch[1]} ${forbesMatch[2]}`;
    }

    return result;
  } catch {
    return null;
  }
}

// --- LLM enrichment via Anthropic API ---

async function enrichWithLLM(vessel, wikiExtract) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const cleanLength = vessel.length === 511 ? 0 : vessel.length;
  const vesselInfo = [
    `Name: ${vessel.name}`,
    cleanLength > 0 ? `Length: ${cleanLength}m` : null,
    vessel.builder ? `Builder: ${vessel.builder}` : null,
    vessel.yearBuilt ? `Year: ${vessel.yearBuilt}` : null,
    vessel.flag ? `Flag: ${vessel.flag}` : null,
    vessel.shipType ? `Type: ${vessel.shipType}` : null,
    vessel.owner?.name ? `Known owner: ${vessel.owner.name}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const wikiContext = wikiExtract
    ? `\nWikipedia extract:\n${wikiExtract.slice(0, 1500)}`
    : "";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are a superyacht database enrichment tool. Given this vessel data, provide ONLY facts you are confident about. Return a JSON object with any of these fields (omit if unknown):

{
  "ownerName": "Full name of current or most recent known owner",
  "ownerBusiness": "Their main business/company in brief (e.g. 'Technology (Google co-founder)')",
  "builder": "Shipyard that built it",
  "yearBuilt": 2020,
  "notableInfo": "One sentence of interesting context about the vessel"
}

Vessel data:
${vesselInfo}
${wikiContext}

Return ONLY valid JSON, no explanation. Omit fields you're not confident about.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (!text) return null;

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const limit = args.includes("--limit")
    ? parseInt(args[args.indexOf("--limit") + 1], 10)
    : Infinity;
  const minLength = args.includes("--min-length")
    ? parseInt(args[args.indexOf("--min-length") + 1], 10)
    : 0;
  const fetchAll = args.includes("--all");
  const dryRun = args.includes("--dry-run");
  const enrichOwners = args.includes("--enrich-owners");
  const useLLM = args.includes("--llm");

  const vessels = JSON.parse(readFileSync(CAPTURED_PATH, "utf8"));
  console.log(`Loaded ${vessels.length} vessels from captured data`);

  if (useLLM && !process.env.ANTHROPIC_API_KEY) {
    console.log("Warning: --llm requires ANTHROPIC_API_KEY env var\n");
  }

  let toProcess;
  if (enrichOwners) {
    // Re-process vessels that have some data but missing owner info
    toProcess = vessels
      .filter((v) => !isTender(v.name))
      .filter((v) => needsOwnerEnrichment(v))
      .filter((v) => {
        const len = v.length === 511 ? 0 : v.length;
        return len >= minLength || len === 0;
      })
      .slice(0, limit);
    console.log(
      `Enriching owners for ${toProcess.length} vessels\n`
    );
  } else {
    toProcess = vessels
      .filter((v) => fetchAll || needsEnrichment(v))
      .filter((v) => !isTender(v.name))
      .filter((v) => {
        const len = v.length === 511 ? 0 : v.length;
        return len >= minLength || len === 0;
      })
      .slice(0, limit);
    console.log(
      `Processing ${toProcess.length} vessels (skipping tenders and enriched)\n`
    );
  }

  let mtSuccess = 0;
  let mtFail = 0;
  let wikiFound = 0;
  let ownersFound = 0;
  let llmEnriched = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const v = toProcess[i];
    const idx = vessels.findIndex((x) => x.mtShipId === v.mtShipId);
    if (idx === -1) continue;

    const lenStr = v.length > 0 && v.length !== 511 ? `${v.length}m` : "?m";
    console.log(
      `[${i + 1}/${toProcess.length}] ${v.name} (${lenStr}, shipid:${v.mtShipId})`
    );

    let wikiExtract = null;

    if (!enrichOwners) {
      // --- MarineTraffic via r.jina.ai ---
      const md = await fetchMTPage(v.mtShipId);
      const mt = parseMTMarkdown(md);

      if (Object.keys(mt).length > 0) {
        mtSuccess++;
        if (mt.imo) vessels[idx].imo = mt.imo;
        if (mt.mmsi) vessels[idx].mmsi = mt.mmsi;
        if (mt.yearBuilt) vessels[idx].yearBuilt = mt.yearBuilt;
        if (mt.builder) vessels[idx].builder = mt.builder;
        if (mt.length && (vessels[idx].length === 0 || vessels[idx].length === 511)) {
          vessels[idx].length = mt.length;
        }
        if (mt.type) vessels[idx].type = mt.type;
        if (mt.flag) vessels[idx].flag = mt.flag;
        if (mt.grossTonnage) vessels[idx].grossTonnage = mt.grossTonnage;
        if (mt.photoUrl && !vessels[idx].photoUrl) vessels[idx].photoUrl = mt.photoUrl;

        const found = Object.entries(mt)
          .filter(([, val]) => val)
          .map(([k, val]) => `${k}=${val}`)
          .join(", ");
        console.log(`  MT: ${found}`);
      } else {
        mtFail++;
        console.log(`  MT: no data`);
      }

      await sleep(MT_DELAY);
    }

    // --- Wikipedia ---
    const effectiveLength = vessels[idx].length || 0;
    if (effectiveLength >= 30 || enrichOwners) {
      // Search for wiki page if we don't have one yet
      let wikiTitle = null;
      if (vessels[idx].wikipedia) {
        // Extract title from existing URL
        const m = vessels[idx].wikipedia.match(/\/wiki\/(.+)$/);
        if (m) wikiTitle = decodeURIComponent(m[1].replace(/_/g, " "));
      } else {
        const wiki = await searchWikipedia(v.name);
        if (wiki) {
          vessels[idx].wikipedia = wiki.url;
          wikiTitle = wiki.title;
          wikiFound++;
          console.log(`  Wiki: ${wiki.title} → ${wiki.url}`);
        } else {
          console.log(`  Wiki: not found`);
        }
        await sleep(WIKI_DELAY);
      }

      if (wikiTitle) {
        // Fetch wikitext for infobox parsing (better than extract for structured data)
        const wikitext = await fetchWikitext(wikiTitle);
        const infoboxFields = parseWikiInfobox(wikitext);
        await sleep(WIKI_DELAY);

        // Also get extract for LLM context
        wikiExtract = await fetchWikipediaExtract(wikiTitle);
        const extractFields = parseWikiExtract(wikiExtract);
        await sleep(WIKI_DELAY);

        // Merge: prefer infobox data, fall back to extract
        const wikiFields = { ...extractFields, ...infoboxFields };

        if (wikiFields.builder && !vessels[idx].builder) {
          vessels[idx].builder = wikiFields.builder;
        }
        if (wikiFields.yearBuilt && !vessels[idx].yearBuilt) {
          vessels[idx].yearBuilt = wikiFields.yearBuilt;
        }
        if (wikiFields.length && (vessels[idx].length === 0 || vessels[idx].length === 511)) {
          vessels[idx].length = wikiFields.length;
        }
        if (wikiFields.type) vessels[idx].type = wikiFields.type;

        // Owner from infobox/extract
        if (wikiFields.ownerName && !vessels[idx].owner?.name) {
          vessels[idx].owner = {
            ...vessels[idx].owner,
            name: wikiFields.ownerName,
            wikipedia: "",
            business: "",
          };

          // Now look up the owner on Wikipedia
          const ownerInfo = await enrichOwnerFromWiki(wikiFields.ownerName);
          if (ownerInfo) {
            ownersFound++;
            if (ownerInfo.wikipedia) vessels[idx].owner.wikipedia = ownerInfo.wikipedia;
            if (ownerInfo.business) vessels[idx].owner.business = ownerInfo.business;
            if (ownerInfo.netWorth) vessels[idx].owner.netWorth = ownerInfo.netWorth;
            console.log(
              `  Owner: ${wikiFields.ownerName}` +
              (ownerInfo.business ? ` — ${ownerInfo.business}` : "") +
              (ownerInfo.netWorth ? ` (${ownerInfo.netWorth})` : "")
            );
          }
          await sleep(WIKI_DELAY);
        }

        if (Object.keys(wikiFields).length > 0) {
          console.log(
            `  Wiki data: ${Object.entries(wikiFields)
              .map(([k, val]) => `${k}=${val}`)
              .join(", ")}`
          );
        }
      }
    }

    // --- LLM enrichment (fills gaps) ---
    if (
      useLLM &&
      process.env.ANTHROPIC_API_KEY &&
      effectiveLength >= 30 &&
      needsOwnerEnrichment(vessels[idx])
    ) {
      const llmResult = await enrichWithLLM(vessels[idx], wikiExtract);
      if (llmResult) {
        llmEnriched++;
        if (llmResult.ownerName && !vessels[idx].owner?.name) {
          vessels[idx].owner = {
            name: llmResult.ownerName,
            wikipedia: "",
            business: llmResult.ownerBusiness || "",
          };
          console.log(`  LLM owner: ${llmResult.ownerName} — ${llmResult.ownerBusiness || "?"}`);

          // Look up owner on Wikipedia too
          const ownerInfo = await enrichOwnerFromWiki(llmResult.ownerName);
          if (ownerInfo) {
            ownersFound++;
            if (ownerInfo.wikipedia) vessels[idx].owner.wikipedia = ownerInfo.wikipedia;
            if (ownerInfo.business && !vessels[idx].owner.business) {
              vessels[idx].owner.business = ownerInfo.business;
            }
            if (ownerInfo.netWorth) vessels[idx].owner.netWorth = ownerInfo.netWorth;
          }
          await sleep(WIKI_DELAY);
        }
        if (llmResult.builder && !vessels[idx].builder) {
          vessels[idx].builder = llmResult.builder;
        }
        if (llmResult.yearBuilt && !vessels[idx].yearBuilt) {
          vessels[idx].yearBuilt = llmResult.yearBuilt;
        }
        if (llmResult.notableInfo) {
          vessels[idx].notableInfo = llmResult.notableInfo;
          console.log(`  LLM note: ${llmResult.notableInfo}`);
        }
      }
    }

    console.log("");

    // Save progress every 5 vessels
    if (!dryRun && (i + 1) % 5 === 0) {
      writeFileSync(CAPTURED_PATH, JSON.stringify(vessels, null, 2));
      console.log(`  [saved progress]\n`);
    }
  }

  // Final save
  console.log("─".repeat(50));
  console.log(`Done!`);
  if (!enrichOwners) {
    console.log(`  MarineTraffic: ${mtSuccess} enriched, ${mtFail} no data`);
  }
  console.log(`  Wikipedia: ${wikiFound} new pages found`);
  console.log(`  Owners: ${ownersFound} enriched`);
  if (useLLM) console.log(`  LLM: ${llmEnriched} enriched`);

  if (!dryRun) {
    writeFileSync(CAPTURED_PATH, JSON.stringify(vessels, null, 2));
    console.log(`  Saved: ${CAPTURED_PATH}`);
  } else {
    console.log(`  Dry run — not saved`);
  }
}

main().catch(console.error);
