"use client";

import React, { useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { VesselData } from "../lib/yachts-database";
import {
  getStatusColor,
  getVesselStatus,
  isKnownVessel,
  isTenderVessel,
} from "../lib/yachts-database";

// Leica-style label: all caps, letter-spaced, rotated to heading
function makeLeicaIcon(
  name: string,
  heading: number,
  length: number,
  speed?: number,
  isSelected?: boolean,
  hasOwner?: boolean
): L.DivIcon {
  // Font size scales with vessel length
  const fontSize = length >= 100 ? 13 : length >= 70 ? 12 : length >= 50 ? 11 : 10;
  const color = isSelected
    ? "#fbbf24"
    : hasOwner
      ? "#f8fafc"
      : "rgba(226,232,240,0.7)";
  const statusColor = getStatusColor(speed);
  // Rotation: 0° = north (up), CSS rotates clockwise from right
  // heading 0 → text horizontal pointing right = rotate(-90deg) then add heading
  const rotation = (heading || 0) - 90;

  const html = `<div style="
    position:relative;
    white-space:nowrap;
    font-family:'SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif;
    font-size:${fontSize}px;
    font-weight:600;
    letter-spacing:0.18em;
    text-transform:uppercase;
    color:${color};
    text-shadow:0 0 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9);
    transform:rotate(${rotation}deg);
    transform-origin:left center;
    pointer-events:auto;
    cursor:pointer;
    line-height:1;
    padding:2px 0;
  "><span style="
    display:inline-block;
    width:6px;height:6px;
    border-radius:50%;
    background:${statusColor};
    margin-right:6px;
    vertical-align:middle;
    box-shadow:0 0 4px ${statusColor};
  "></span>${name}</div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
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

function VesselPopup({ v }: { v: VesselData }) {
  const known = isKnownVessel(v);
  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        minWidth: 220,
        lineHeight: 1.5,
        padding: 2,
      }}
    >
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700 }}>{v.name}</div>
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
      <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
        {v.shipType || v.type}
        {v.builder && <span> &middot; {v.builder}</span>}
        {v.yearBuilt > 0 && <span> &middot; {v.yearBuilt}</span>}
        {v.flag && (
          <span style={{ fontSize: 11, color: "#888" }}> &middot; {v.flag}</span>
        )}
      </div>
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
        {v.speed != null && <span style={{ marginLeft: 8 }}>{v.speed} kn</span>}
        {v.heading != null && v.heading > 0 && (
          <span style={{ marginLeft: 8 }}>{v.heading}&deg;</span>
        )}
      </div>
      {v.notableInfo && (
        <div
          style={{ fontSize: 10, color: "#888", fontStyle: "italic", marginBottom: 4 }}
        >
          {v.notableInfo}
        </div>
      )}
      {known && (
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
            <div style={{ fontSize: 11, color: "#888" }}>{v.owner.business}</div>
          )}
        </div>
      )}
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
          style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}
        >
          MT
        </a>
        {v.imo && (
          <a
            href={`https://www.vesselfinder.com/?imo=${v.imo}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}
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
  );
}

interface Props {
  vessels: VesselData[];
  selected: VesselData | null;
  onSelect: (v: VesselData) => void;
}

export function FullMapLeaflet({ vessels, selected, onSelect }: Props) {
  const large = useMemo(
    () => vessels.filter((v) => v.length >= 30 && !isTenderVessel(v)),
    [vessels]
  );
  const small = useMemo(
    () => vessels.filter((v) => v.length < 30 || v.length === 0 || isTenderVessel(v)),
    [vessels]
  );

  return (
    <MapContainer
      center={[17.905, -62.865]}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FlyToVessel vessel={selected} />

      {/* Small vessels: dots */}
      {small.map((v) => (
        <CircleMarker
          key={v.mtShipId}
          center={[v.lat!, v.lon!]}
          radius={3}
          pathOptions={{
            color: "rgba(148,163,184,0.4)",
            fillColor: "rgba(148,163,184,0.3)",
            fillOpacity: 0.5,
            weight: 1,
          }}
          eventHandlers={{ click: () => onSelect(v) }}
        >
          <Popup>
            <VesselPopup v={v} />
          </Popup>
        </CircleMarker>
      ))}

      {/* Large vessels: Leica-style text labels */}
      {large.map((v) => {
        const isSelected = selected?.mtShipId === v.mtShipId;
        const icon = makeLeicaIcon(
          v.name,
          v.heading || 0,
          v.length,
          v.speed,
          isSelected,
          isKnownVessel(v)
        );
        return (
          <Marker
            key={v.mtShipId}
            position={[v.lat!, v.lon!]}
            icon={icon}
            eventHandlers={{ click: () => onSelect(v) }}
          >
            <Popup>
              <VesselPopup v={v} />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
