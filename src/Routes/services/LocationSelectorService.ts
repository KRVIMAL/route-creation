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

  // Helper function to extract the actual ID regardless of type
  private extractGeofenceId(geofenceId: any): string | undefined {
    if (!geofenceId) return undefined;
    
    // If it's a string, return it directly
    if (typeof geofenceId === 'string') {
      return geofenceId;
    }
    
    // If it's an object with _id property, return that
    if (typeof geofenceId === 'object' && geofenceId._id) {
      return geofenceId._id;
    }
    
    return undefined;
  }

  public getGeozoneById(id: string | any): GeozoneData | undefined {
    // Extract the actual ID if we were given an object
    const actualId = this.extractGeofenceId(id);
    if (!actualId) return undefined;
    
    return this.geozones.find(g => g._id === actualId);
  }

  // Helper function to extract geozone data from a complex geofenceId object
  public getGeozoneFromComplexId(geofenceId: any): GeozoneData | undefined {
    if (!geofenceId) return undefined;
    
    // If it's already a string ID, find by ID
    if (typeof geofenceId === 'string') {
      return this.getGeozoneById(geofenceId);
    }
    
    // If it's an object with necessary properties, convert it to GeozoneData
    if (typeof geofenceId === 'object' && geofenceId._id && geofenceId.name && geofenceId.geoCodeData) {
      return {
        _id: geofenceId._id,
        name: geofenceId.name,
        finalAddress: geofenceId.finalAddress || '',
        geoCodeData: geofenceId.geoCodeData
      };
    }
    
    // If it's an object with just an _id, try to find by ID
    if (typeof geofenceId === 'object' && geofenceId._id) {
      return this.getGeozoneById(geofenceId._id);
    }
    
    return undefined;
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

    console.log(`Creating location from geozone: ${geozone.name}`);

    // Only include the geozone name, NOT the address
    return {
      name: geozone.name, // Only the name, no address
      lat,
      lng,
      isGeofenceEnabled: true,
      geofenceId: geozone._id,
      geoCodeData: geozone.geoCodeData
    };
  }
  
  // Create location from a complex geofenceId object
  public createLocationFromComplexGeofenceId(geofenceId: any): Location | null {
    const geozone = this.getGeozoneFromComplexId(geofenceId);
    if (!geozone) return null;
    
    return this.createLocationFromGeozone(geozone);
  }
}

export default LocationSelectorService;