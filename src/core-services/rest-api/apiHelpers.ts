import apiClient from './api-client';

// Helper for GET requests
export const getRequest = async (url: string, params = {}) => {
  try {
    const response = await apiClient.get(url, { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'API GET request failed');
  }
};

// Helper for POST requests
export const postRequest = async (url: string, data = {}) => {
  try {
    const response = await apiClient.post(url, data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'API POST request failed');
  }
};

// Helper for PATCH requests
export const patchRequest = async (url: string, data = {}) => {
  try {
    const response = await apiClient.patch(url, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || 'API PATCH request failed'
    );
  }
};

// Helper for DELETE requests
export const deleteRequest = async (url: string) => {
  try {
    const response = await apiClient.delete(url);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || 'API DELETE request failed'
    );
  }
};
