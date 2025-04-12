// types.ts
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location extends Coordinates {
  name: string;
}

export interface DistanceDuration {
  value: number;
  text: string;
}

export interface Route {
  _id?: string;
  routeId?: string;
  name: string;
  travelMode: string;
  distance: DistanceDuration;
  duration: DistanceDuration;
  origin: Location;
  destination: Location;
  waypoints: Location[];
  path: Coordinates[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Route | Route[];
}