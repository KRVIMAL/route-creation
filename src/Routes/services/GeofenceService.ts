// GeofenceService.ts
import axios from 'axios';
// import { API_BASE_URL } from '../config';
const API_BASE_URL = 'http://localhost:9090';
interface GeofencePayload {
  userId: string;
  userEmail: string;
  name: string;
  mobileNumber: string;
  address: {
    zipCode: string;
    country: string;
    state: string;
    area: string;
    city: string;
    district: string;
  };
  finalAddress: string;
  geoCodeData: {
    type: string;
    geometry: {
      type: string;
      coordinates: number[];
      radius?: number;
    };
  };
  isPublic: boolean;
  isPrivate: boolean;
  createdBy: string;
}

export interface GeofenceResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    userId: string;
    name: string;
    mobileNumber: number;
    address: {
      zipCode: string;
      country: string;
      state: string;
      area: string;
      city: string;
      district: string;
      _id: string;
    };
    finalAddress: string;
    geoCodeData: {
      type: string;
      geometry: {
        type: string;
        coordinates: number[];
        radius?: number;
      };
    };
    createdBy: string;
    _id: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
}

class GeofenceService {
  async createGeofence(payload: GeofencePayload): Promise<GeofenceResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/geofences`, payload);
      return response.data;
    } catch (error) {
      console.error('Error creating geofence:', error);
      throw error;
    }
  }

  async getGeofences(): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/geofences`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching geofences:', error);
      throw error;
    }
  }

  async getGeofenceById(id: string): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/geofences/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching geofence with ID ${id}:`, error);
      throw error;
    }
  }

  // Helper method to convert geofence to Location object
  convertGeofenceToLocation(geofence: any) {
    const { geometry } = geofence.geoCodeData;
    const [lat, lng] = geometry.coordinates;
    
    return {
      name: geofence.name,
      lat,
      lng,
      isGeofenceEnabled: true,
      geofenceId: geofence._id,
      geoCodeData: geofence.geoCodeData
    };
  }
}

export default new GeofenceService();