import { Route, ApiResponse } from '../types';

const API_URL = 'http://192.168.1.36.:5678';

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