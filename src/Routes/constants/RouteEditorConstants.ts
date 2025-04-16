// RouteEditorConstants.ts
import { Route } from "../types";

export const TRAVEL_MODES = [
  { value: "DRIVING", label: "Driving" },
  { value: "WALKING", label: "Walking" },
  { value: "BICYCLING", label: "Bicycling" },
  { value: "TRANSIT", label: "Transit" }
];

export const DEFAULT_ROUTE: Route = {
  name: "",
  travelMode: "DRIVING",
  distance: { value: 0, text: "" },
  duration: { value: 0, text: "" },
  origin: { name: "", lat: 0, lng: 0 },
  destination: { name: "", lat: 0, lng: 0 },
  waypoints: [],
  path: [],
};