import axios from 'axios';
import { store } from '../../store';

export const apiClient = axios.create({
  baseURL: 'http://localhost:3000/gateway/', // Replace with your base API URL
  timeout: 5000, // Set a timeout for requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject the accessToken
apiClient.interceptors.request.use(
  (config) => {
    // Add Authorization token if available
    const token = store.getState().auth.accessToken; // Replace with your token logic
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors (e.g., unauthorized, network errors)
    if (error.response?.status === 401) {
      // Perform logout or token refresh logic
      console.error('Unauthorized access - redirecting to login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
