import capturedRaw from "./captured-vessels.json";

export interface VesselOwner {
  name: string;
  wikipedia: string;
  business: string;
  netWorth?: string;
}

export interface VesselData {
  name: string;
  imo: string;
  mmsi: string;
  mtShipId: string;
  length: number; // meters, 0 = unknown
  builder: string;
  yearBuilt: number;
  type: "motor" | "sailing";
  photoUrl: string;
  wikipedia?: string;
  flag?: string;
  shipType?: string;
  callSign?: string;
  beam?: number;
  notableInfo?: string;
  owner: VesselOwner;
  lat?: number;
  lon?: number;
  speed?: number;
  heading?: number;
  lastUpdate?: string;
  status?: string;
}

export type YachtOwner = VesselOwner;
export type YachtData = VesselData;

// Curated database of notable vessels with owner info
export const GUSTAVIA_YACHTS: VesselData[] = [
  {
    name: "Koru",
    imo: "9906633",
    mmsi: "319189000",
    mtShipId: "6801289",
    length: 127,
    builder: "Oceanco",
    yearBuilt: 2023,
    type: "sailing",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Koru_Superyacht.jpg/1280px-Koru_Superyacht.jpg",
    wikipedia: "https://en.wikipedia.org/wiki/Koru_(yacht)",
    owner: {
      name: "Jeff Bezos",
      wikipedia: "https://en.wikipedia.org/wiki/Jeff_Bezos",
      business: "Technology (Amazon founder)",
      netWorth: "$200B+",
    },
  },
  {
    name: "Rising Sun",
    imo: "1007858",
    mmsi: "319060800",
    mtShipId: "717658",
    length: 138,
    builder: "Lurssen",
    yearBuilt: 2004,
    type: "motor",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e5/Rising_Sun_Yacht.JPG",
    wikipedia: "https://en.wikipedia.org/wiki/Rising_Sun_(yacht)",
    owner: {
      name: "David Geffen",
      wikipedia: "https://en.wikipedia.org/wiki/David_Geffen",
      business: "Entertainment (DreamWorks co-founder)",
      netWorth: "$10B+",
    },
  },
  {
    name: "Dragonfly",
    imo: "9929451",
    mmsi: "319199000",
    mtShipId: "7474967",
    length: 142,
    builder: "Lurssen",
    yearBuilt: 2024,
    type: "motor",
    photoUrl: "",
    wikipedia: "https://en.wikipedia.org/wiki/Dragonfly_(yacht)",
    owner: {
      name: "Sergey Brin",
      wikipedia: "https://en.wikipedia.org/wiki/Sergey_Brin",
      business: "Technology (Google co-founder)",
      netWorth: "$120B+",
    },
  },
  {
    name: "Kismet",
    imo: "1012874",
    mmsi: "319131400",
    mtShipId: "5564067",
    length: 122,
    builder: "Lurssen",
    yearBuilt: 2024,
    type: "motor",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Kismet_%28ship%2C_2014%29_in_S%C3%A8te.jpg/1280px-Kismet_%28ship%2C_2014%29_in_S%C3%A8te.jpg",
    wikipedia: "https://en.wikipedia.org/wiki/Kismet_(yacht)",
    owner: {
      name: "Shahid Khan",
      wikipedia: "https://en.wikipedia.org/wiki/Shahid_Khan",
      business: "Manufacturing & Sports (Flex-N-Gate, Jacksonville Jaguars)",
      netWorth: "$12B+",
    },
  },
  {
    name: "Venus",
    imo: "1012032",
    mmsi: "319085600",
    mtShipId: "771498",
    length: 78,
    builder: "Feadship",
    yearBuilt: 2012,
    type: "motor",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Venus_%28super_yacht_designed_by_Philippe_Starck%29%2C_Port_de_Palma%2C_Majorca%2C_Spain_-_2022-08-20.jpg/1280px-Venus_%28super_yacht_designed_by_Philippe_Starck%29%2C_Port_de_Palma%2C_Majorca%2C_Spain_-_2022-08-20.jpg",
    wikipedia: "https://en.wikipedia.org/wiki/Venus_(yacht)",
    owner: {
      name: "Laurene Powell Jobs",
      wikipedia: "https://en.wikipedia.org/wiki/Laurene_Powell_Jobs",
      business: "Philanthropy & Investing (Emerson Collective)",
      netWorth: "$13B+",
    },
  },
  {
    name: "Moonrise",
    imo: "9835968",
    mmsi: "244067000",
    mtShipId: "5895199",
    length: 100,
    builder: "Feadship",
    yearBuilt: 2020,
    type: "motor",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/MOONRISE_%2850402156066%29_%28cropped%29.jpg/1280px-MOONRISE_%2850402156066%29_%28cropped%29.jpg",
    wikipedia: "https://en.wikipedia.org/wiki/Moonrise_(yacht)",
    owner: {
      name: "Jan Koum",
      wikipedia: "https://en.wikipedia.org/wiki/Jan_Koum",
      business: "Technology (WhatsApp co-founder)",
      netWorth: "$13B+",
    },
  },
  {
    name: "Mayan Queen IV",
    imo: "1010024",
    mmsi: "319497000",
    mtShipId: "714478",
    length: 97,
    builder: "Blohm+Voss",
    yearBuilt: 2008,
    type: "motor",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Yacht_Mayan_Queen_IV_-_001.jpg/1280px-Yacht_Mayan_Queen_IV_-_001.jpg",
    wikipedia: "https://en.wikipedia.org/wiki/Mayan_Queen_IV",
    owner: {
      name: "Alberto Bailleres",
      wikipedia: "https://en.wikipedia.org/wiki/Alberto_Baill%C3%A8res",
      business: "Mining & Retail (Grupo BAL)",
      netWorth: "$6B+",
    },
  },
  {
    name: "Infinity",
    imo: "9709662",
    mmsi: "319078700",
    mtShipId: "4452269",
    length: 95,
    builder: "Oceanco",
    yearBuilt: 2015,
    type: "motor",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Infinity_Yacht.jpg/1280px-Infinity_Yacht.jpg",
    wikipedia: "https://en.wikipedia.org/wiki/Infinity_(yacht)",
    owner: {
      name: "Eric Schmidt",
      wikipedia: "https://en.wikipedia.org/wiki/Eric_Schmidt",
      business: "Technology (Former Google CEO)",
      netWorth: "$25B+",
    },
  },
  {
    name: "Sophia",
    imo: "9806153",
    mmsi: "319134300",
    mtShipId: "5444949",
    length: 97,
    builder: "Feadship",
    yearBuilt: 2017,
    type: "motor",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Feadship_Motor_Yacht_Faith.jpg/1280px-Feadship_Motor_Yacht_Faith.jpg",
    wikipedia: "https://en.wikipedia.org/wiki/Sophia_(yacht)",
    owner: {
      name: "Lawrence Stroll",
      wikipedia: "https://en.wikipedia.org/wiki/Lawrence_Stroll",
      business: "Fashion & Motorsport (Aston Martin, Tommy Hilfiger)",
      netWorth: "$4B+",
    },
  },
  {
    name: "Bravo Eugenia",
    imo: "9837966",
    mmsi: "319133600",
    mtShipId: "5945529",
    length: 109,
    builder: "Oceanco",
    yearBuilt: 2018,
    type: "motor",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/1012921_Bravo_Eugenia_2018.jpg/1280px-1012921_Bravo_Eugenia_2018.jpg",
    wikipedia: "https://en.wikipedia.org/wiki/Bravo_Eugenia",
    owner: {
      name: "Jerry Jones",
      wikipedia: "https://en.wikipedia.org/wiki/Jerry_Jones",
      business: "Sports & Energy (Dallas Cowboys owner)",
      netWorth: "$14B+",
    },
  },
  {
    name: "Viva",
    imo: "9889498",
    mmsi: "319169800",
    mtShipId: "6480541",
    length: 94,
    builder: "Feadship",
    yearBuilt: 2022,
    type: "motor",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/MY_VIVA_%2851144907706%29.jpg/1280px-MY_VIVA_%2851144907706%29.jpg",
    wikipedia: "https://en.wikipedia.org/wiki/Viva_(yacht)",
    owner: {
      name: "Leon Black",
      wikipedia: "https://en.wikipedia.org/wiki/Leon_Black",
      business: "Private Equity (Apollo Global Management)",
      netWorth: "$12B+",
    },
  },
  {
    name: "Top Five",
    imo: "9938082",
    mmsi: "319201500",
    mtShipId: "7544855",
    length: 78,
    builder: "Lurssen",
    yearBuilt: 2024,
    type: "motor",
    photoUrl: "",
    owner: {
      name: "Terry Pegula",
      wikipedia: "https://en.wikipedia.org/wiki/Terry_Pegula",
      business: "Energy & Sports (Buffalo Bills, Sabres owner)",
      netWorth: "$7B+",
    },
  },
  {
    name: "Excellence",
    imo: "9832399",
    mmsi: "319129600",
    mtShipId: "5868795",
    length: 80,
    builder: "Abeking & Rasmussen",
    yearBuilt: 2019,
    type: "motor",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/The_Excellence_%282019%29.jpg/1280px-The_Excellence_%282019%29.jpg",
    wikipedia: "https://en.wikipedia.org/wiki/Excellence_(yacht)",
    owner: {
      name: "Herb Chambers",
      wikipedia: "https://en.wikipedia.org/wiki/Herb_Chambers",
      business: "Automotive Dealerships (Herb Chambers Companies)",
      netWorth: "$2B+",
    },
  },
  {
    name: "Aquila",
    imo: "9662502",
    mmsi: "319071200",
    mtShipId: "3906499",
    length: 86,
    builder: "Derecktor Shipyards",
    yearBuilt: 2010,
    type: "motor",
    photoUrl: "",
    wikipedia: "https://en.wikipedia.org/wiki/Aquila_(yacht)",
    owner: {
      name: "Nancy Walton Laurie",
      wikipedia: "https://en.wikipedia.org/wiki/Nancy_Walton_Laurie",
      business: "Retail (Walmart heir)",
      netWorth: "$9B+",
    },
  },
  {
    name: "Breakthrough",
    imo: "9935754",
    mmsi: "245951000",
    mtShipId: "7504093",
    length: 119,
    builder: "Feadship",
    yearBuilt: 2024,
    type: "motor",
    photoUrl: "",
    wikipedia: "https://en.wikipedia.org/wiki/Breakthrough_(yacht)",
    owner: {
      name: "Jim Ratcliffe",
      wikipedia: "https://en.wikipedia.org/wiki/Jim_Ratcliffe",
      business: "Chemicals & Sports (INEOS, Manchester United)",
      netWorth: "$20B+",
    },
  },
];

export const GUSTAVIA_COORDS = {
  lat: 17.8964,
  lon: -62.8494,
  zoom: 14,
};

// --- Merge captured MarineTraffic data with curated database ---

function isTender(name: string): boolean {
  return /\bTT\b|TENDER|CHASE\b|RIB\b|\bAUX\b|UTILITY/i.test(name);
}

export function getVesselStatus(speed?: number): string {
  if (speed == null) return "unknown";
  if (speed < 0.3) return "anchored";
  if (speed < 1.5) return "slow";
  if (speed < 5) return "cruising";
  return "underway";
}

export function getStatusColor(speed?: number): string {
  const s = getVesselStatus(speed);
  switch (s) {
    case "anchored": return "#60a5fa";
    case "slow": return "#22d3ee";
    case "cruising": return "#4ade80";
    case "underway": return "#fb923c";
    default: return "#94a3b8";
  }
}

function mergeVessels(): VesselData[] {
  const captured = (capturedRaw as any[]).map((c) => ({
    ...c,
    length: c.length === 511 ? 0 : c.length,
  }));

  // Build a lookup from curated yachts by uppercase name
  const curatedByName = new Map<string, (typeof GUSTAVIA_YACHTS)[number]>();
  for (const curated of GUSTAVIA_YACHTS) {
    curatedByName.set(curated.name.toUpperCase(), curated);
  }

  // Only show captured vessels — enrich with curated data if matched
  return captured.map((c) => {
    const curated = curatedByName.get(c.name.toUpperCase());
    const matched =
      curated &&
      (c.length <= 0 ||
        curated.length <= 0 ||
        Math.min(c.length, curated.length) /
          Math.max(c.length, curated.length) >
          0.6);

    return {
      name: c.name,
      imo: c.imo || (matched ? curated!.imo : ""),
      mmsi: c.mmsi || (matched ? curated!.mmsi : ""),
      mtShipId: c.mtShipId || (matched ? curated!.mtShipId : ""),
      length: c.length || (matched ? curated!.length : 0),
      builder: c.builder || (matched ? curated!.builder : ""),
      yearBuilt: c.yearBuilt || (matched ? curated!.yearBuilt : 0),
      type: c.type || (matched ? curated!.type : "motor"),
      photoUrl: c.photoUrl || (matched ? curated!.photoUrl : ""),
      wikipedia: c.wikipedia || (matched ? curated!.wikipedia : undefined),
      flag: c.flag || undefined,
      shipType: c.shipType || undefined,
      callSign: c.callSign || undefined,
      beam: c.beam || undefined,
      notableInfo: c.notableInfo || undefined,
      owner:
        matched && curated!.owner?.name
          ? curated!.owner
          : c.owner?.name
            ? c.owner
            : { name: "", wikipedia: "", business: "" },
      lat: c.lat,
      lon: c.lon,
      speed: c.speed,
      heading: c.heading,
    } as VesselData;
  });
}

export const ALL_VESSELS = mergeVessels();

// Helpers for UI
export function isKnownVessel(v: VesselData): boolean {
  return v.owner?.name?.length > 0;
}

export function isTenderVessel(v: VesselData): boolean {
  return isTender(v.name);
}

export function getVesselCategory(v: VesselData): "superyacht" | "yacht" | "boat" | "tender" | "unknown" {
  if (isTender(v.name)) return "tender";
  if (v.length >= 50) return "superyacht";
  if (v.length >= 20) return "yacht";
  if (v.length > 0) return "boat";
  return "unknown";
}
