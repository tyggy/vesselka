import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

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

/**
 * Receives base64 vessel photos from the extension,
 * uploads to Supabase Storage, and updates photo_url.
 *
 * Body: { photos: { "shipId": "data:image/jpeg;base64,..." } }
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

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

  const photos: Record<string, string> = body.photos || {};
  const entries = Object.entries(photos);
  if (entries.length === 0) {
    return NextResponse.json({ error: "no photos" }, { status: 400, headers });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  let count = 0;

  for (const [shipId, dataUrl] of entries) {
    try {
      // Parse data URL → buffer
      const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) continue;
      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const buffer = Buffer.from(match[2], "base64");
      if (buffer.length < 1000) continue; // skip tiny/placeholder images

      const path = `${shipId}.${ext}`;

      // Upload to Supabase Storage (upsert)
      const { error: uploadError } = await supabaseAdmin.storage
        .from("vessel-photos")
        .upload(path, buffer, {
          contentType: `image/${match[1]}`,
          upsert: true,
        });

      if (uploadError) {
        console.error(`Photo upload error for ${shipId}:`, uploadError.message);
        continue;
      }

      // Build public URL and update vessel record
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/vessel-photos/${path}`;
      await supabaseAdmin
        .from("vessels")
        .update({ photo_url: publicUrl })
        .eq("mt_ship_id", shipId);

      count++;
    } catch (e) {
      console.error(`Photo processing error for ${shipId}:`, e);
    }
  }

  return NextResponse.json({ ok: true, count }, { headers });
}
