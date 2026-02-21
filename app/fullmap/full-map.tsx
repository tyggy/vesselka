"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { VesselData } from "../lib/yachts-database";

const FullMapLeaflet = dynamic(
  () => import("./full-map-leaflet").then((m) => m.FullMapLeaflet),
  { ssr: false }
);

export function FullMap({ vessels }: { vessels: VesselData[] }) {
  const [selected, setSelected] = useState<VesselData | null>(null);

  const withPosition = useMemo(
    () => vessels.filter((v) => v.lat != null && v.lon != null),
    [vessels]
  );

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0b1120" }}>
      <FullMapLeaflet
        vessels={withPosition}
        selected={selected}
        onSelect={setSelected}
      />
    </div>
  );
}
