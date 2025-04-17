// ViewRouteModal.tsx
import React, { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import LocationSelectorService from '../services/LocationSelectorService';
import '../../App.css';

interface ViewRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: any;
}

const API_KEY=import.meta.env.VITE_GOOGLE_MAP_API_KEY;

const ViewRouteModal: React.FC<ViewRouteModalProps> = ({ isOpen, onClose, route }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const shapesRef = useRef<Array<google.maps.Circle | google.maps.Polygon | google.maps.Polyline | google.maps.Rectangle | google.maps.Marker>>([]);
  
  // Clean up function to remove all shapes and clear references
  const cleanupMap = () => {
    if (shapesRef.current.length > 0) {
      shapesRef.current.forEach(shape => {
        if (shape) {
          shape.setMap(null);
        }
      });
      shapesRef.current = [];
    }
    
    mapInstanceRef.current = null;
  };
  
  // Extract geofenceId from possibly complex object
  const getGeofenceId = (geofenceId: any): string | undefined => {
    if (!geofenceId) return undefined;
    
    if (typeof geofenceId === 'object' && geofenceId !== null && geofenceId._id) {
      return geofenceId._id;
    }
    
    return geofenceId as string;
  };

  // Ensure location has geoCodeData if it has geofenceId
  const ensureGeoCodeData = async (location: any): Promise<any> => {
    if (!location) return location;
    
    if (location.isGeofenceEnabled && !location.geoCodeData && location.geofenceId) {
      const locationService = LocationSelectorService.getInstance();
      await locationService.initialize();
      
      const geofenceId = getGeofenceId(location.geofenceId);
      
      if (geofenceId) {
        const geozone = locationService.getGeozoneById(geofenceId);
        
        if (geozone && geozone.geoCodeData) {
          return {
            ...location,
            geoCodeData: geozone.geoCodeData,
          };
        }
      }
    }
    
    return location;
  };
  
  useEffect(() => {
    if (!isOpen || !mapRef.current || !route) return;
    
    // Clean up previous map
    cleanupMap();
    
    const initializeMap = async () => {
      const loader = new Loader({
        apiKey: API_KEY,
        version: 'weekly',
        libraries: ['places']
      });
      
      try {
        const google = await loader.load();
        
        // Initialize LocationSelectorService
        const locationService = LocationSelectorService.getInstance();
        await locationService.initialize();
        
        // Process locations to ensure they have geoCodeData
        let updatedOrigin = await ensureGeoCodeData(route.origin);
        let updatedDestination = await ensureGeoCodeData(route.destination);
        let updatedWaypoints = [];
        
        if (route.waypoints && route.waypoints.length > 0) {
          updatedWaypoints = await Promise.all(
            route.waypoints.map((waypoint: any) => ensureGeoCodeData(waypoint))
          );
        }

        // Create map
        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: { lat: updatedOrigin.lat, lng: updatedOrigin.lng },
          zoom: 10
        });
        
        // Save ref to map instance
        mapInstanceRef.current = mapInstance;
        
        // Display geozones if they exist
        if (updatedOrigin.isGeofenceEnabled && updatedOrigin.geoCodeData) {
          const shape = createGeozoneShape(mapInstance, google, updatedOrigin);
          if (shape) shapesRef.current.push(shape);
        }
        
        if (updatedDestination.isGeofenceEnabled && updatedDestination.geoCodeData) {
          const shape = createGeozoneShape(mapInstance, google, updatedDestination);
          if (shape) shapesRef.current.push(shape);
        }
        
        if (updatedWaypoints.length > 0) {
          updatedWaypoints.forEach((waypoint: any) => {
            if (waypoint.isGeofenceEnabled && waypoint.geoCodeData) {
              const shape = createGeozoneShape(mapInstance, google, waypoint);
              if (shape) shapesRef.current.push(shape);
            }
          });
        }
        
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: mapInstance,
          suppressMarkers: false
        });
        
        // Prepare waypoints for DirectionsService
        const waypoints = updatedWaypoints.map((wp: any) => ({
          location: { lat: wp.lat, lng: wp.lng },
          stopover: true
        }));
        
        const request: google.maps.DirectionsRequest = {
          origin: { lat: updatedOrigin.lat, lng: updatedOrigin.lng },
          destination: { lat: updatedDestination.lat, lng: updatedDestination.lng },
          waypoints: waypoints,
          travelMode: route.travelMode as unknown as google.maps.TravelMode,
          provideRouteAlternatives: true // Get alternative routes
        };
        
        directionsService.route(request, (response: any, status) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(response);
            
            // If we have a saved path, find the best matching route
            if (route.path && route.path.length > 0) {
              const bestRouteIndex = findBestRouteMatch(response, route.path);
              directionsRenderer.setRouteIndex(bestRouteIndex);
            }
          } else {
            console.error('Directions request failed due to', status);
          }
        });
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };
    
    initializeMap();
    
    // Clean up on component unmount or modal close
    return cleanupMap;
  }, [isOpen, route]);
  
  // Create a geozone shape on the map based on the location type
  const createGeozoneShape = (map: google.maps.Map, google: any, location: any) => {
    if (!location.geoCodeData) return null;
    
    try {
      const { geometry } = location.geoCodeData;
      const { type, coordinates, radius } = geometry;
      let shape: any = null;
      
      switch (type) {
        case 'Circle':
          shape = new google.maps.Circle({
            center: { lat: coordinates[0], lng: coordinates[1] },
            radius: radius || 100,
            map,
            fillColor: "#4285F4",
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: "#4285F4",
          });
          break;
          
        case 'Polygon':
          shape = new google.maps.Polygon({
            paths: coordinates?.map((coord: any) => ({ 
              lat: coord[0], 
              lng: coord[1] 
            })),
            map,
            fillColor: "#4285F4",
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: "#4285F4",
          });
          break;
          
        case 'Polyline':
          shape = new google.maps.Polyline({
            path: coordinates?.map((coord: any) => ({ 
              lat: coord[0], 
              lng: coord[1] 
            })),
            map,
            strokeColor: "#4285F4",
            strokeWeight: 2,
          });
          break;
          
        case 'Rectangle':
          const bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(coordinates[1][0], coordinates[1][1]), // SW corner
            new google.maps.LatLng(coordinates[0][0], coordinates[0][1])  // NE corner
          );
          
          shape = new google.maps.Rectangle({
            bounds: bounds,
            map,
            fillColor: "#4285F4",
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: "#4285F4",
          });
          break;
          
        case 'Point':
          shape = new google.maps.Marker({
            position: { lat: coordinates[0], lng: coordinates[1] },
            map,
            title: location.name,
          });
          break;
      }
      
      if (shape) {
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div>
              <h3>${location.name}</h3>
              ${type === "Circle" ? `<p>Radius: ${radius} meters</p>` : ""}
            </div>
          `,
        });
        
        shape.addListener("click", (e: any) => {
          infoWindow.setPosition(
            type === "Point" ? shape?.getPosition() : e?.latLng
          );
          infoWindow.open(map);
        });
      }
      
      return shape;
    } catch (error) {
      console.error("Error creating geozone shape:", error);
      return null;
    }
  };
  
  // Function to find the best matching route
  const findBestRouteMatch = (response: google.maps.DirectionsResult, savedPath: Array<{lat: number, lng: number}>): number => {
    if (!response.routes || response.routes.length <= 1) return 0;
    
    let bestMatchIndex = 0;
    let bestMatchScore = Number.MAX_VALUE;
    
    response.routes.forEach((route, index) => {
      // Extract the path from the response route
      const routePath = route.overview_path.map(point => ({
        lat: point.lat(),
        lng: point.lng()
      }));
      
      // Calculate a similarity score between this route and our saved path
      const score = calculatePathSimilarity(routePath, savedPath);
      
      // If this route is a better match, update our best match
      if (score < bestMatchScore) {
        bestMatchScore = score;
        bestMatchIndex = index;
      }
    });
    
    return bestMatchIndex;
  };
  
  // Calculate similarity between two paths
  const calculatePathSimilarity = (path1: Array<{lat: number, lng: number}>, path2: Array<{lat: number, lng: number}>): number => {
    // Sample points for comparison
    const numSamplePoints = Math.min(5, Math.min(path1.length, path2.length));
    
    if (numSamplePoints === 0) return Number.MAX_VALUE;
    
    let totalDistance = 0;
    
    // Sample points at regular intervals from each path
    for (let i = 0; i < numSamplePoints; i++) {
      const index1 = Math.floor(i * (path1.length - 1) / (numSamplePoints - 1));
      const index2 = Math.floor(i * (path2.length - 1) / (numSamplePoints - 1));
      
      const point1 = path1[index1];
      const point2 = path2[index2];
      
      // Calculate distance between points
      totalDistance += calculateDistance(point1, point2);
    }
    
    return totalDistance / numSamplePoints;
  };
  
  // Calculate haversine distance between coordinates
  const calculateDistance = (point1: {lat: number, lng: number}, point2: {lat: number, lng: number}): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  // Handle close with proper cleanup
  const handleClose = () => {
    cleanupMap();
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-4/5 max-w-4xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{route.name}</h3>
          <button 
            className="text-2xl font-medium text-gray-500 hover:text-gray-700"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        
        <div className="p-4 border-b overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <div className="flex">
                <span className="font-medium w-24">From:</span>
                <span className="text-gray-700">
                  {route.origin.name} 
                  {route.origin.isGeofenceEnabled && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Geozone</span>}
                </span>
              </div>
              <div className="flex">
                <span className="font-medium w-24">To:</span>
                <span className="text-gray-700">
                  {route.destination.name}
                  {route.destination.isGeofenceEnabled && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Geozone</span>}
                </span>
              </div>
              {route.waypoints.length > 0 && (
                <div className="flex">
                  <span className="font-medium w-24">Via:</span>
                  <div className="text-gray-700">
                    {route.waypoints.map((wp: any, index: any) => (
                      <div key={index} className="flex items-center">
                        {wp.name}
                        {wp.isGeofenceEnabled && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Geozone</span>}
                        {index < route.waypoints.length - 1 && <span className="mx-1">,</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <div className="flex">
                <span className="font-medium w-24">Distance:</span>
                <span className="text-gray-700">{route.distance.text}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-24">Duration:</span>
                <span className="text-gray-700">{route.duration.text}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-24">Travel Mode:</span>
                <span className="text-gray-700">{route.travelMode}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div ref={mapRef} className="flex-grow h-[400px] rounded-b-lg"></div>
      </div>
    </div>
  );
};

export default ViewRouteModal;