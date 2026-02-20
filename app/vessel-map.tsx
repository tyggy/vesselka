"use client";

import React, { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import type { VesselData } from "./lib/yachts-database";
import { getStatusColor, getVesselStatus, isKnownVessel } from "./lib/yachts-database";

function getMarkerRadius(length: number): number {
  if (length <= 0) return 4;
  if (length < 15) return 4;
  if (length < 30) return 5;
  if (length < 50) return 7;
  if (length < 80) return 9;
  if (length < 100) return 11;
  return 13;
}

function FlyToVessel({ vessel }: { vessel: VesselData | null }) {
  const map = useMap();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (vessel?.lat != null && vessel?.lon != null) {
      const id = vessel.mtShipId;
      if (id !== prevId.current) {
        prevId.current = id;
        map.flyTo([vessel.lat, vessel.lon], 16, { duration: 0.8 });
      }
    }
  }, [vessel, map]);

  return null;
}

interface Props {
  vessels: VesselData[];
  selectedVessel: VesselData | null;
  onSelectVessel: (v: VesselData) => void;
}

export function VesselMapLeaflet({
  vessels,
  selectedVessel,
  onSelectVessel,
}: Props) {
  const withPosition = vessels.filter(
    (v) => v.lat != null && v.lon != null
  );

  return (
    <MapContainer
      center={[17.905, -62.865]}
      zoom={14}
      style={{
        height: "100%",
        width: "100%",
      }}
      scrollWheelZoom={true}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FlyToVessel vessel={selectedVessel} />
      {withPosition.map((v) => {
        const isSelected = selectedVessel?.mtShipId === v.mtShipId;
        const color = isSelected ? "#fbbf24" : getStatusColor(v.speed);
        const known = isKnownVessel(v);

        return (
          <CircleMarker
            key={v.mtShipId}
            center={[v.lat!, v.lon!]}
            radius={getMarkerRadius(v.length)}
            pathOptions={{
              color: isSelected ? "#fbbf24" : "#fff",
              fillColor: color,
              fillOpacity: isSelected ? 1 : 0.75,
              weight: isSelected ? 3 : known ? 2 : 1,
            }}
            eventHandlers={{
              click: () => onSelectVessel(v),
            }}
          >
            <Popup>
              <div
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  minWidth: 220,
                  lineHeight: 1.5,
                  padding: 2,
                }}
              >
                {/* Photo */}
                {v.photoUrl && (
                  <div
                    style={{
                      height: 90,
                      margin: "-8px -8px 8px -8px",
                      background: `url(${v.photoUrl}) center/cover no-repeat`,
                      backgroundColor: "#e2e8f0",
                      borderRadius: "4px 4px 0 0",
                    }}
                  />
                )}

                {/* Name + length */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {v.name}
                  </div>
                  {v.length > 0 && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#666",
                        background: "#f1f5f9",
                        padding: "1px 6px",
                        borderRadius: 8,
                      }}
                    >
                      {v.length}m
                    </span>
                  )}
                </div>

                {/* Type + Builder + Year + Flag */}
                <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                  {v.shipType || v.type}
                  {v.builder && <span> &middot; {v.builder}</span>}
                  {v.yearBuilt > 0 && <span> &middot; {v.yearBuilt}</span>}
                  {v.flag && (
                    <span style={{ fontSize: 11, color: "#888" }}>
                      {" "}&middot; {v.flag}
                    </span>
                  )}
                </div>

                {/* Status + Speed + Heading */}
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: getStatusColor(v.speed),
                      marginRight: 6,
                      verticalAlign: "middle",
                    }}
                  />
                  {getVesselStatus(v.speed)}
                  {v.speed != null && (
                    <span style={{ marginLeft: 8 }}>{v.speed} kn</span>
                  )}
                  {v.heading != null && v.heading > 0 && (
                    <span style={{ marginLeft: 8 }}>{v.heading}&deg;</span>
                  )}
                </div>

                {/* Owner */}
                {v.owner?.name && (
                  <div
                    style={{
                      fontSize: 13,
                      borderTop: "1px solid #eee",
                      paddingTop: 4,
                      marginTop: 4,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#2563eb" }}>
                      {v.owner.wikipedia ? (
                        <a
                          href={v.owner.wikipedia}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {v.owner.name}
                        </a>
                      ) : (
                        v.owner.name
                      )}
                    </div>
                    {v.owner.business && (
                      <div style={{ fontSize: 11, color: "#888" }}>
                        {v.owner.business}
                      </div>
                    )}
                  </div>
                )}

                {/* Links */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 6,
                    paddingTop: 4,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <a
                    href={`https://www.marinetraffic.com/en/ais/details/ships/shipid:${v.mtShipId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      color: "#3b82f6",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    MT
                  </a>
                  {v.imo && (
                    <a
                      href={`https://www.vesselfinder.com/?imo=${v.imo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11,
                        color: "#3b82f6",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      VF
                    </a>
                  )}
                  <a
                    href={
                      v.wikipedia ||
                      `https://www.google.com/search?q=${encodeURIComponent(v.name + " yacht")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      color: v.wikipedia ? "#3b82f6" : "#999",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    {v.wikipedia ? "Wiki" : "Search"}
                  </a>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
