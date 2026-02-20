import React from "react";

export const metadata = {
  title: "Vesselka — Live Vessel Tracker",
  description:
    "Track vessels around St. Barthelemy — live positions, owners, and details from MarineTraffic.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#0b1120",
          height: "100vh",
          overflow: "hidden",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: "#e2e8f0",
        }}
      >
        <main style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
