import { Route, ApiResponse } from '../types';
import axios from 'axios';
const API_URL = 'http://192.168.1.36.:5678';
const API_BASE_URL = 'http://localhost:9090';
export const fetchRoutes = async (page: number, limit: number): Promise<Route[]> => {
  try {
    const response = await fetch(`${API_URL}/routes?page=${page}&limit=${limit}`);
    const data: any = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }

    return data?.data?.data;
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
};


export const getRouteById = async (id: string): Promise<Route | null> => {
  try {
    const response = await fetch(`${API_URL}/routes/${id}`);
    const data: ApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data.data as Route;
  } catch (error) {
    console.error(`Error fetching route ${id}:`, error);
    return null;
  }
};

export const createRoute = async (route: Route): Promise<Route | null> => {
  try {
    const response = await fetch(`${API_URL}/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(route),
    });
    
    const data: ApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data as any;
  } catch (error) {
    console.error('Error creating route:', error);
    return null;
  }
};

export const updateRoute = async (id: string, route: Route): Promise<Route | null> => {
  try {
    const response = await fetch(`${API_URL}/routes/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(route),
    });
    
    const data: ApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data as any;
  } catch (error) {
    console.error(`Error updating route ${id}:`, error);
    return null;
  }
};

export const deleteRoute = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/routes/${id}`, {
      method: 'DELETE',
    });
    
    const data: ApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    return data as any;
  } catch (error) {
    console.error(`Error deleting route ${id}:`, error);
    return false;
  }
};

export const searchRoutes = async (
  searchText: string,
  page: number = 1,
  limit: number = 10
): Promise<any> => {
  try {
    const response = await fetch(
      `${API_URL}/routes/search?searchText=${encodeURIComponent(searchText)}&page=${page}&limit=${limit}`
    );
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    // Handle the nested data structure in the response
    return data.data.data;
  } catch (error) {
    console.error('Error searching routes:', error);
    return { routes: [], total: 0 };
  }
};

export const fetchGeofences = async (page = 1, limit = 50): Promise<any[]> => {
  try {
    const response:any = await axios.get<ApiResponse>(`${API_BASE_URL}/geofences?page=${page}&limit=${limit}`);
    console.log()
    // if (response.data.success && response.data.statusCode === 200) {
      const geofenceResponse = response.data.data as any;
      console.log(geofenceResponse.data,"data")
      return geofenceResponse.data;
    // }
    // return response.data.data;
  } catch (error) {
    console.error('Error fetching geofences:', error);
    return [];
  }
};