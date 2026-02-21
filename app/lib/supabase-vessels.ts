import { supabase } from "./supabase";
import capturedRaw from "./captured-vessels.json";

export interface SupabaseVessel {
  mt_ship_id: string;
  name: string;
  imo: string;
  mmsi: string;
  length: number;
  type: string;
  builder: string;
  year_built: number;
  photo_url: string;
  wikipedia: string | null;
  flag: string | null;
  ship_type: string | null;
  call_sign: string | null;
  beam: number | null;
  notable_info: string | null;
  lat: number | null;
  lon: number | null;
  speed: number | null;
  heading: number | null;
  status: string | null;
  last_seen: string;
  source: string;
}

// Convert Supabase row (snake_case) to app format (camelCase)
function toAppFormat(row: SupabaseVessel) {
  return {
    name: row.name,
    imo: row.imo || "",
    mmsi: row.mmsi || "",
    mtShipId: row.mt_ship_id,
    length: row.length || 0,
    builder: row.builder || "",
    yearBuilt: row.year_built || 0,
    type: (row.type as "motor" | "sailing") || "motor",
    photoUrl: row.photo_url || "",
    wikipedia: row.wikipedia || undefined,
    flag: row.flag || undefined,
    shipType: row.ship_type || undefined,
    callSign: row.call_sign || undefined,
    beam: row.beam || undefined,
    notableInfo: row.notable_info || undefined,
    lat: row.lat ?? undefined,
    lon: row.lon ?? undefined,
    speed: row.speed ?? undefined,
    heading: row.heading ?? undefined,
    status: row.status || undefined,
    lastUpdate: row.last_seen,
  };
}

/**
 * Fetch live vessel data from Supabase.
 * Falls back to captured-vessels.json if Supabase is unreachable.
 */
export async function fetchLiveVessels(maxAgeHours = 72): Promise<any[]> {
  try {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("vessels")
      .select("*")
      .gte("last_seen", cutoff)
      .order("last_seen", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No vessels found");

    return data.map(toAppFormat);
  } catch (e) {
    console.warn("Supabase fetch failed, falling back to captured-vessels.json:", e);
    return (capturedRaw as any[]).map((c) => ({
      ...c,
      length: c.length === 511 ? 0 : c.length,
    }));
  }
}
