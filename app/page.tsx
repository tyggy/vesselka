import { ALL_VESSELS } from "./lib/yachts-database";
import { YachtGrid } from "./yacht-grid";

export const metadata = {
  title: "Vesselka — Live Vessel Tracker",
  description:
    "Track vessels around St. Barthelemy — live positions, owners, and details from MarineTraffic.",
};

export default function Home() {
  return <YachtGrid initialYachts={ALL_VESSELS} />;
}
