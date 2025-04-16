export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location extends Coordinates {
  name: string;
  isGeofenceEnabled?: boolean;
  geofenceId?: string; // Changed from geozoneId to geofenceId
  geoCodeData?: GeoCodeData; // We'll still include this but won't send it to the backend
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
  userId?: any;
}

export interface ApiResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Route | Route[];
  total?: number;
}

export interface Geometry {
  type: string;
  coordinates: number[] | number[][];
  radius?: number;
}

export interface GeoCodeData {
  type: string;
  geometry: Geometry;
}

export interface User {
  _id: string;
  fullName: string;
  email: string;
}

export interface GeozoneData {
  _id: string;
  name: string;
  finalAddress: string;
  userId: User | string;
  mobileNumber?: number | null;
  address?: {
    zipCode: string;
    country: string;
    state: string;
    area: string;
    city: string;
    district: string;
    _id?: string;
  };
  geoCodeData: GeoCodeData;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  searchText?: string;
}