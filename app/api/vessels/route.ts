import { NextResponse } from "next/server";
import { GUSTAVIA_YACHTS, type YachtData } from "../../lib/yachts-database";

const MT_HEADERS = {
  "sec-ch-ua":
    '"Not_A Brand";v="99", "Google Chrome";v="131", "Chromium";v="131"',
  Accept: "*/*",
  "X-Requested-With": "XMLHttpRequest",
  "sec-ch-ua-mobile": "?0",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "sec-ch-ua-platform": '"Windows"',
  host: "www.marinetraffic.com",
};

const VF_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchFromMarineTraffic(
  shipId: string
): Promise<{ lat: number; lon: number; speed: number; status: string } | null> {
  try {
    const url = `https://www.marinetraffic.com/vesselDetails/latestPosition/shipid:${shipId}`;
    const res = await fetch(url, {
      headers: MT_HEADERS,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.lat && data.lon) {
      return {
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon),
        speed: parseFloat(data.speed || "0"),
        status: data.status || "unknown",
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchFromVesselFinder(
  yacht: YachtData
): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://www.vesselfinder.com/vessels/details/${yacht.imo}`;
    const res = await fetch(url, {
      headers: VF_HEADERS,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const coordMatch = html.match(
      /coordinates['":\s]+([0-9.-]+)\s*[,/]\s*([0-9.-]+)/i
    );
    if (coordMatch) {
      return { lat: parseFloat(coordMatch[1]), lon: parseFloat(coordMatch[2]) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const results: YachtData[] = await Promise.all(
    GUSTAVIA_YACHTS.map(async (yacht) => {
      // Try MarineTraffic first, then VesselFinder
      const mtData = await fetchFromMarineTraffic(yacht.mtShipId);
      if (mtData) {
        return {
          ...yacht,
          lat: mtData.lat,
          lon: mtData.lon,
          speed: mtData.speed,
          status: mtData.status,
          lastUpdate: new Date().toISOString(),
        };
      }

      const vfData = await fetchFromVesselFinder(yacht);
      if (vfData) {
        return {
          ...yacht,
          lat: vfData.lat,
          lon: vfData.lon,
          lastUpdate: new Date().toISOString(),
        };
      }

      // Return yacht without live position data
      return { ...yacht };
    })
  );

  return NextResponse.json({
    yachts: results,
    harbor: {
      name: "Gustavia Harbor",
      location: "St. Barthélemy",
      lat: 17.8964,
      lon: -62.8494,
    },
    fetchedAt: new Date().toISOString(),
    sources: ["MarineTraffic", "VesselFinder"],
  });
}
