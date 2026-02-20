"use client";

import React, { useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { VesselData } from "./lib/yachts-database";
import {
  getVesselStatus,
  getStatusColor,
  isKnownVessel,
  getVesselCategory,
} from "./lib/yachts-database";

const VesselMapLeaflet = dynamic(
  () => import("./vessel-map").then((mod) => mod.VesselMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100%",
          background: "#0f1729",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          fontSize: 14,
        }}
      >
        Loading map...
      </div>
    ),
  }
);

// --- Heading arrow SVG ---
function HeadingArrow({ heading }: { heading: number }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      style={{
        transform: `rotate(${heading}deg)`,
        verticalAlign: "middle",
        marginRight: 3,
      }}
    >
      <polygon points="8,2 13,13 8,10 3,13" fill="currentColor" />
    </svg>
  );
}

// --- Vessel Card ---
function VesselCard({
  vessel,
  isSelected,
  onSelect,
  distanceNm,
}: {
  vessel: VesselData;
  isSelected: boolean;
  onSelect: () => void;
  distanceNm?: number;
}) {
  const status = getVesselStatus(vessel.speed);
  const statusColor = getStatusColor(vessel.speed);
  const known = isKnownVessel(vessel);
  const category = getVesselCategory(vessel);

  return (
    <div
      id={`vessel-${vessel.mtShipId}`}
      onClick={onSelect}
      style={{
        background: isSelected ? "#1a2744" : "#141c2e",
        borderRadius: 10,
        border: isSelected ? "1px solid #3b82f6" : "1px solid #1e293b",
        cursor: "pointer",
        transition: "all 0.15s",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Photo */}
      {vessel.photoUrl && (
        <div
          style={{
            height: 120,
            background: `url(${vessel.photoUrl}) center/cover no-repeat`,
            backgroundColor: "#0f172a",
            borderBottom: `2px solid ${statusColor}`,
          }}
        />
      )}

      {/* Status bar (only when no photo) */}
      {!vessel.photoUrl && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: statusColor,
            borderRadius: "10px 0 0 10px",
          }}
        />
      )}

      <div style={{ padding: "10px 12px 10px 14px" }}>
        {/* Row 1: Name + Length */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 3,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: known ? "#f1f5f9" : "#cbd5e1",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}
          >
            {vessel.name}
          </div>
          {vessel.length > 0 && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#94a3b8",
                background: "#1e293b",
                padding: "1px 7px",
                borderRadius: 10,
                whiteSpace: "nowrap",
              }}
            >
              {vessel.length}m
            </div>
          )}
        </div>

        {/* Row 2: Type + Builder + Flag + Category */}
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
          {vessel.shipType || vessel.type}
          {vessel.builder && <span> &middot; {vessel.builder}</span>}
          {vessel.yearBuilt > 0 && <span> &middot; {vessel.yearBuilt}</span>}
          {vessel.flag && (
            <span style={{ marginLeft: 4, fontSize: 10, color: "#475569" }}>
              {vessel.flag}
            </span>
          )}
          {category === "tender" && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 9,
                color: "#475569",
                background: "#1e293b",
                padding: "1px 5px",
                borderRadius: 6,
              }}
            >
              tender
            </span>
          )}
        </div>

        {/* Notable info */}
        {vessel.notableInfo && (
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontStyle: "italic",
              marginBottom: 6,
              lineHeight: 1.4,
            }}
          >
            {vessel.notableInfo}
          </div>
        )}

        {/* Row 3: Speed + Heading + Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
            fontSize: 12,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: statusColor,
              flexShrink: 0,
            }}
          />
          <span style={{ color: "#94a3b8", textTransform: "capitalize" }}>
            {status}
          </span>
          {vessel.speed != null && (
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
              {vessel.speed} kn
            </span>
          )}
          {vessel.heading != null && vessel.heading > 0 && (
            <span style={{ color: "#64748b" }}>
              <HeadingArrow heading={vessel.heading} />
              {vessel.heading}&deg;
            </span>
          )}
        </div>

        {/* Row 4: Coordinates + Distance */}
        {vessel.lat != null && vessel.lon != null && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              fontFamily: '"SF Mono", Monaco, monospace',
              color: "#475569",
              marginBottom: known ? 6 : 2,
            }}
          >
            <span>
              {vessel.lat.toFixed(4)}&deg;, {vessel.lon.toFixed(4)}&deg;
            </span>
            {distanceNm != null && (
              <span style={{ color: "#64748b" }}>
                {distanceNm < 0.1
                  ? `${Math.round(distanceNm * 1852)}m`
                  : `${distanceNm.toFixed(1)} nm`}
              </span>
            )}
          </div>
        )}

        {/* Row 5: Owner (if known) */}
        {known && (
          <div
            style={{
              borderTop: "1px solid #1e293b",
              paddingTop: 6,
              marginBottom: 2,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "#93c5fd" }}>
              {vessel.owner.wikipedia ? (
                <a
                  href={vessel.owner.wikipedia}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit", textDecoration: "none" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {vessel.owner.name}
                </a>
              ) : (
                vessel.owner.name
              )}
            </div>
            {vessel.owner.business && (
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                {vessel.owner.business}
              </div>
            )}
          </div>
        )}

        {/* Row 6: Links */}
        <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
          <a
            href={`https://www.marinetraffic.com/en/ais/details/ships/shipid:${vessel.mtShipId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 10,
              color: "#3b82f6",
              textDecoration: "none",
              fontWeight: 600,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            MT
          </a>
          {vessel.imo && (
            <a
              href={`https://www.vesselfinder.com/?imo=${vessel.imo}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10,
                color: "#3b82f6",
                textDecoration: "none",
                fontWeight: 600,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              VF
            </a>
          )}
          <a
            href={
              vessel.wikipedia ||
              `https://www.google.com/search?q=${encodeURIComponent(vessel.name + " yacht")}`
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 10,
              color: vessel.wikipedia ? "#3b82f6" : "#475569",
              textDecoration: "none",
              fontWeight: 600,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {vessel.wikipedia ? "Wiki" : "Search"}
          </a>
        </div>
      </div>
    </div>
  );
}

// --- Distance helper (nautical miles) ---
function distNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nm
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Main Grid ---
export function YachtGrid({ initialYachts }: { initialYachts: VesselData[] }) {
  const [vessels] = useState<VesselData[]>(initialYachts);
  const [selectedVessel, setSelectedVessel] = useState<VesselData | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"length" | "name" | "speed" | "distance">("length");
  const [filterCategory, setFilterCategory] = useState<
    "all" | "superyacht" | "yacht" | "boat" | "tender"
  >("all");
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let list = vessels;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.owner?.name?.toLowerCase().includes(q) ||
          v.builder?.toLowerCase().includes(q)
      );
    }

    if (filterCategory !== "all") {
      list = list.filter((v) => getVesselCategory(v) === filterCategory);
    }

    // Find Moonrise position for distance sort
    const moonrise = vessels.find(
      (v) => v.name.toUpperCase() === "MOONRISE" && v.lat != null
    );

    return [...list].sort((a, b) => {
      if (sortBy === "length")
        return (b.length || 0) - (a.length || 0) || a.name.localeCompare(b.name);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "speed") return (b.speed ?? 0) - (a.speed ?? 0);
      if (sortBy === "distance" && moonrise?.lat != null && moonrise?.lon != null) {
        const dA =
          a.lat != null && a.lon != null
            ? distNm(moonrise.lat, moonrise.lon, a.lat, a.lon)
            : Infinity;
        const dB =
          b.lat != null && b.lon != null
            ? distNm(moonrise.lat, moonrise.lon, b.lat, b.lon)
            : Infinity;
        return dA - dB;
      }
      return 0;
    });
  }, [vessels, search, sortBy, filterCategory]);

  const stats = useMemo(() => {
    const src = filtered;
    const withPos = src.filter((v) => v.lat != null);
    const anchored = withPos.filter((v) => (v.speed ?? 0) < 0.3).length;
    const moving = withPos.filter((v) => (v.speed ?? 0) >= 1.5).length;
    const superyachts = src.filter(
      (v) => getVesselCategory(v) === "superyacht"
    ).length;
    const known = src.filter(isKnownVessel).length;
    return {
      total: src.length,
      withPos: withPos.length,
      anchored,
      moving,
      superyachts,
      known,
    };
  }, [filtered]);

  const handleSelectVessel = (v: VesselData) => {
    setSelectedVessel(v);
    setTimeout(() => {
      const el = document.getElementById(`vessel-${v.mtShipId}`);
      if (el && listRef.current) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Map — fixed at top */}
      <div style={{ height: "45vh", flexShrink: 0, minHeight: 280, position: "relative", zIndex: 1 }}>
        <VesselMapLeaflet
          vessels={filtered}
          selectedVessel={selectedVessel}
          onSelectVessel={handleSelectVessel}
        />
      </div>

      {/* Scrollable list area */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px 24px",
          position: "relative",
          zIndex: 2,
          background: "#0b1120",
          borderTop: "1px solid #1e293b",
        }}
      >
        {/* Controls */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "#0f172a",
              color: "#e2e8f0",
              fontSize: 13,
              outline: "none",
              flex: "1 1 150px",
              minWidth: 120,
            }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "#0f172a",
              color: "#94a3b8",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <option value="length">By size</option>
            <option value="name">By name</option>
            <option value="speed">By speed</option>
            <option value="distance">By distance</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "#0f172a",
              color: "#94a3b8",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <option value="all">All ({vessels.length})</option>
            <option value="superyacht">50m+ superyachts</option>
            <option value="yacht">20-49m yachts</option>
            <option value="boat">Boats</option>
            <option value="tender">Tenders</option>
          </select>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
            fontSize: 11,
          }}
        >
          {[
            { label: "shown", value: stats.total, color: "#e2e8f0" },
            { label: "anchored", value: stats.anchored, color: "#60a5fa" },
            { label: "moving", value: stats.moving, color: "#4ade80" },
            { label: "superyachts", value: stats.superyachts, color: "#fbbf24" },
            { label: "known", value: stats.known, color: "#93c5fd" },
          ].map((s) => (
            <div
              key={s.label}
              style={{ display: "flex", alignItems: "baseline", gap: 4 }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>
                {s.value}
              </span>
              <span
                style={{
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
            gap: 10,
          }}
        >
          {filtered.map((vessel) => {
            const moonrise = vessels.find(
              (v) => v.name.toUpperCase() === "MOONRISE" && v.lat != null
            );
            const dist =
              moonrise?.lat != null &&
              moonrise?.lon != null &&
              vessel.lat != null &&
              vessel.lon != null
                ? distNm(moonrise.lat, moonrise.lon, vessel.lat, vessel.lon)
                : undefined;
            return (
            <VesselCard
              key={vessel.mtShipId}
              vessel={vessel}
              isSelected={selectedVessel?.mtShipId === vessel.mtShipId}
              onSelect={() => handleSelectVessel(vessel)}
              distanceNm={dist}
            />
            );
          })}
        </div>
      </div>
    </div>
  );
}
