import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy for MarineTraffic vessel photos.
 * MT blocks direct hotlinking (403), so we fetch server-side and relay.
 * Usage: /api/photo?id=367029
 * Caches for 7 days via CDN headers.
 */
export async function GET(req: NextRequest) {
  const shipId = req.nextUrl.searchParams.get("id");
  if (!shipId || !/^\d+$/.test(shipId)) {
    return new NextResponse("Missing or invalid id", { status: 400 });
  }

  const mtUrl = `https://www.marinetraffic.com/getAssetDefaultPhoto/?photo_size=800&asset_id=${shipId}&asset_type_id=0`;

  try {
    const res = await fetch(mtUrl, {
      headers: {
        Referer: "https://www.marinetraffic.com/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return new NextResponse("Photo not available", { status: 404 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, s-maxage=604800",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch photo", { status: 502 });
  }
}
