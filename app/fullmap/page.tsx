import { ALL_VESSELS } from "../lib/yachts-database";
import { FullMap } from "./full-map";

export const metadata = {
  title: "Vesselka — Map",
};

export default function FullMapPage() {
  return <FullMap vessels={ALL_VESSELS} />;
}
