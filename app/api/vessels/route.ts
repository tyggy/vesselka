import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabase";

const ALLOWED_ORIGINS = [
  "https://www.marinetraffic.com",
  "http://www.marinetraffic.com",
];

function corsHeaders(origin?: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Auth
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.VESSELKA_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "server misconfigured" }, { status: 500, headers });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400, headers });
  }

  const vessels: any[] = Array.isArray(body) ? body : body.vessels;
  if (!vessels?.length) {
    return NextResponse.json({ error: "no vessels" }, { status: 400, headers });
  }

  // Extension upsert — only update position fields to avoid overwriting enriched data
  const rows = vessels
    .filter((v: any) => v.mtShipId || v.mt_ship_id)
    .map((v: any) => ({
      mt_ship_id: v.mtShipId || v.mt_ship_id,
      name: v.name || "Unknown",
      imo: v.imo || "",
      mmsi: v.mmsi || "",
      length: v.length === 511 ? 0 : v.length || 0,
      type: v.type || "motor",
      lat: v.lat ?? null,
      lon: v.lon ?? null,
      speed: v.speed ?? null,
      heading: v.heading ?? null,
      status: v.status || null,
      last_seen: new Date().toISOString(),
      source: "extension",
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "no valid vessels" }, { status: 400, headers });
  }

  const { error } = await supabaseAdmin.from("vessels").upsert(rows, {
    onConflict: "mt_ship_id",
    ignoreDuplicates: false,
  });

  if (error) {
    console.error("Supabase upsert error:", error);
    return NextResponse.json({ error: "db error" }, { status: 500, headers });
  }

  // Find vessels in this batch that need photos
  const shipIds = rows.map((r) => r.mt_ship_id);
  const { data: missing } = await supabaseAdmin
    .from("vessels")
    .select("mt_ship_id")
    .in("mt_ship_id", shipIds)
    .or("photo_url.is.null,photo_url.eq.");

  const needPhoto = (missing || []).map((v) => v.mt_ship_id);

  return NextResponse.json({ ok: true, count: rows.length, needPhoto }, { headers });
}
