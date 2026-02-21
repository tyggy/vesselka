"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { VesselData } from "../lib/yachts-database";
import {
  getStatusColor,
  getVesselStatus,
  isKnownVessel,
  isTenderVessel,
} from "../lib/yachts-database";

// Brightness by vessel length — bigger = brighter/whiter
function getLabelColor(length: number, isSelected: boolean): string {
  if (isSelected) return "#fbbf24";
  if (length >= 100) return "#ffffff";
  if (length >= 80) return "rgba(248,250,252,0.95)";
  if (length >= 60) return "rgba(226,232,240,0.85)";
  if (length >= 45) return "rgba(203,213,225,0.75)";
  return "rgba(148,163,184,0.65)";
}

// Dot color by length (same gradient but for circle fills)
function getDotColor(length: number): string {
  if (length >= 100) return "#f8fafc";
  if (length >= 80) return "#cbd5e1";
  if (length >= 60) return "#94a3b8";
  if (length >= 45) return "#64748b";
  return "#475569";
}

function makeLeicaIcon(
  name: string,
  heading: number,
  length: number,
  isSelected: boolean,
  scale: number
): L.DivIcon {
  const color = getLabelColor(length, isSelected);
  const rotation = (heading || 0) - 90;
  const fontSize = Math.round(11 * scale);

  const html = `<div style="
    position:absolute;
    white-space:nowrap;
    font-family:'SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif;
    font-size:${fontSize}px;
    font-weight:600;
    letter-spacing:0.18em;
    text-transform:uppercase;
    color:${color};
    text-shadow:0 0 4px rgba(0,0,0,0.6);
    transform:translate(-50%,-50%) rotate(${rotation}deg);
    pointer-events:auto;
    cursor:pointer;
    line-height:1;
  ">${name}</div>`;

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

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });

  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);

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
  const [zoom, setZoom] = useState(14);
  const handleZoom = useCallback((z: number) => setZoom(z), []);

  // z14+: labels for 30m+, z16+: labels for everything
  const showLargeLabels = zoom >= 14;
  const showSmallLabels = zoom >= 16;
  const textScale = Math.max(0.8, Math.min(1.4, 0.5 + zoom * 0.036));

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
      <ZoomTracker onZoom={handleZoom} />

      {/* Small vessels: labels at high zoom, dots otherwise */}
      {small.map((v) => {
        const isSelected = selected?.mtShipId === v.mtShipId;

        if (showSmallLabels) {
          const icon = makeLeicaIcon(
            v.name,
            v.heading || 0,
            v.length || 15,
            isSelected,
            textScale * 0.85
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
        }

        return (
          <CircleMarker
            key={v.mtShipId}
            center={[v.lat!, v.lon!]}
            radius={3}
            pathOptions={{
              color: "rgba(148,163,184,0.4)",
              fillColor: isSelected ? "#fbbf24" : "rgba(148,163,184,0.3)",
              fillOpacity: isSelected ? 1 : 0.5,
              weight: 1,
            }}
            eventHandlers={{ click: () => onSelect(v) }}
          >
            <Popup>
              <VesselPopup v={v} />
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Large vessels: text labels when zoomed in, dots when zoomed out */}
      {large.map((v) => {
        const isSelected = selected?.mtShipId === v.mtShipId;

        if (showLargeLabels) {
          const icon = makeLeicaIcon(
            v.name,
            v.heading || 0,
            v.length,
            isSelected,
            textScale
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
        }

        // Zoomed out: sized/colored dot by vessel length
        const dotColor = isSelected ? "#fbbf24" : getDotColor(v.length);
        const radius = v.length >= 80 ? 5 : v.length >= 50 ? 4 : 3;
        return (
          <CircleMarker
            key={v.mtShipId}
            center={[v.lat!, v.lon!]}
            radius={radius}
            pathOptions={{
              color: isSelected ? "#fbbf24" : "rgba(255,255,255,0.3)",
              fillColor: dotColor,
              fillOpacity: isSelected ? 1 : 0.7,
              weight: isSelected ? 2 : 1,
            }}
            eventHandlers={{ click: () => onSelect(v) }}
          >
            <Popup>
              <VesselPopup v={v} />
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
