// LocationSelectorService.ts
import { Location } from '../types';
import { fetchGeofences } from '../services/routes.service';

export interface GeozoneData {
  _id: string;
  name: string;
  finalAddress: string;
  geoCodeData: {
    type: string;
    geometry: {
      type: string;
      coordinates: number[] | number[][];
      radius?: number;
    };
  };
}

class LocationSelectorService {
  private static instance: LocationSelectorService;
  private geozones: GeozoneData[] = [];
  private isLoading: boolean = false;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): LocationSelectorService {
    if (!LocationSelectorService.instance) {
      LocationSelectorService.instance = new LocationSelectorService();
    }
    return LocationSelectorService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      this.isLoading = true;
      const data = await fetchGeofences();
      this.geozones = data;
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing location selector service:', error);
    } finally {
      this.isLoading = false;
    }
  }

  public getGeozones(): GeozoneData[] {
    return this.geozones;
  }

  public isGeozonesLoading(): boolean {
    return this.isLoading;
  }

  public getGeozoneById(id: string): GeozoneData | undefined {
    return this.geozones.find(g => g._id === id);
  }

  public createLocationFromGeozone(geozone: GeozoneData): Location {
    // Extract coordinates based on the geometry type
    let lat = 0;
    let lng = 0;
    
    const { geometry } = geozone.geoCodeData;
    
    switch (geometry.type) {
      case 'Point':
        // For Point, coordinates are [lat, lng]
        lat = geometry.coordinates[0] as number;
        lng = geometry.coordinates[1] as number;
        break;
        
      case 'Circle':
        // For Circle, coordinates are [lat, lng]
        lat = geometry.coordinates[0] as number;
        lng = geometry.coordinates[1] as number;
        break;
        
      case 'Polygon':
      case 'Polyline':
        // For Polygon/Polyline, use the first coordinate
        if (Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0) {
          const firstCoord = geometry.coordinates[0];
          if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
            lat = firstCoord[0];
            lng = firstCoord[1];
          }
        }
        break;
        
      case 'Rectangle':
        // For Rectangle, use the first coordinate (northeast corner)
        if (Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0) {
          const neCorner = geometry.coordinates[0];
          if (Array.isArray(neCorner) && neCorner.length >= 2) {
            lat = neCorner[0];
            lng = neCorner[1];
          }
        }
        break;
    }
    
    return {
      name: geozone.name + (geozone.finalAddress ? ` (${geozone.finalAddress})` : ''),
      lat,
      lng,
      isGeofenceEnabled: true,
      geozoneId: geozone._id,
      geoCodeData: geozone.geoCodeData
    };
  }
}

export default LocationSelectorService;