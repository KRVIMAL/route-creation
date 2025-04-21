// MapService.ts - Enhanced with immediate marker display
import { Loader } from "@googlemaps/js-api-loader";
import { Route, Location, Coordinates } from "../types";
import LocationSelectorService from "./LocationSelectorService";

export interface ProcessedRouteData {
  originLocation: Location;
  destinationLocation: Location;
  extractedWaypoints: Location[];
  pathCoords: Coordinates[];
  distanceText: string;
  durationText: string;
  totalDistance: number;
  totalDuration: number;
}

export class MapService {
  mapInstance: google.maps.Map | null = null;
  directionsService: google.maps.DirectionsService | null = null;
  directionsRenderer: google.maps.DirectionsRenderer | null = null;
  autocompleteInstances: Map<string, google.maps.places.Autocomplete> = new Map();
  geozoneShapes: Map<string, google.maps.Circle | google.maps.Polygon | google.maps.Polyline | google.maps.Rectangle | google.maps.Marker> = new Map();
  locationMarkers: Map<string, google.maps.Marker> = new Map(); // Store markers for locations
  
  private API_KEY=import.meta.env.VITE_GOOGLE_MAP_API_KEY;
  
  async initialize(mapRef: HTMLDivElement): Promise<boolean> {
    try {
      const loader = new Loader({
        apiKey: this.API_KEY,
        version: "weekly",
        libraries: ["places"],
      });

      const google = await loader.load();
      
      this.mapInstance = new google.maps.Map(mapRef, {
        center: { lat: 28.6139, lng: 77.209 }, // New Delhi
        zoom: 10,
      });

      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        map: this.mapInstance,
        draggable: true,
        hideRouteList: false,
        // Customize marker appearance to make them more visible
        markerOptions: {
          draggable: false, // We'll handle draggable markers separately
        }
      });

      return true;
    } catch (error) {
      console.error("Error loading Google Maps:", error);
      return false;
    }
  }

  setupAutocomplete(elementId: string, onPlaceSelected: (place: google.maps.places.PlaceResult) => void): void {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;

    const input = document.getElementById(elementId) as HTMLInputElement;
    if (!input) return;

    const autocomplete = new window.google.maps.places.Autocomplete(input);
    if (this.mapInstance) {
      autocomplete.bindTo("bounds", this.mapInstance);
    }

    // Store the autocomplete instance for potential later use
    this.autocompleteInstances.set(elementId, autocomplete);

    // Handle place selection
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        // Try to parse as lat,lng if no geometry
        this.handleLatLngInput(input.value, onPlaceSelected);
        return;
      }
      
      // Setup marker for the place immediately
      const locationType = this.getLocationTypeFromElementId(elementId);
      this.addOrUpdateMarker(locationType, {
        name: place.formatted_address || place.name || "",
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      });
      
      onPlaceSelected(place);
    });
  }

  // New method to handle lat,lng input
  handleLatLngInput(value: string, onPlaceSelected: (place: google.maps.places.PlaceResult) => void): void {
    // Simple regex to check for lat,lng format (e.g., "28.6139, 77.209")
    const latLngRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
    const match = value.match(latLngRegex);
    
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[3]);
      
      if (!isNaN(lat) && !isNaN(lng) && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180) {
        
        // Create a place result with just the coordinates
        const place = {
          geometry: {
            location: {
              lat: () => lat,
              lng: () => lng
            }
          },
          formatted_address: `${lat}, ${lng}`,
          name: `${lat}, ${lng}`
        } as google.maps.places.PlaceResult;
        
        // Get location name by reverse geocoding
        this.reverseGeocode(lat, lng, (address) => {
          if (address) {
            place.formatted_address = address;
            place.name = address;
          }
          onPlaceSelected(place);
        });
      }
    }
  }
  
  // Reverse geocode to get address from coordinates
  reverseGeocode(lat: number, lng: number, callback: (address: string | null) => void): void {
    if (!window.google || !window.google.maps) {
      callback(null);
      return;
    }
    
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        callback(results[0].formatted_address);
      } else {
        callback(null);
      }
    });
  }
  
  // Helper to determine location type from element ID
  getLocationTypeFromElementId(elementId: string): string {
    if (elementId === 'origin-input') return 'origin';
    if (elementId === 'destination-input') return 'destination';
    if (elementId.startsWith('waypoint-input-')) return `waypoint-${elementId.split('-').pop()}`;
    return elementId; // Fallback
  }
  
  // Add or update marker for a location
 // Add or update marker for a location
addOrUpdateMarker(locationType: string, location: Location): void {
  if (!this.mapInstance || !window.google) return;
  
  // Remove existing marker if any
  if (this.locationMarkers.has(locationType)) {
    const existingMarker = this.locationMarkers.get(locationType);
    if (existingMarker) {
      existingMarker.setMap(null);
    }
    this.locationMarkers.delete(locationType);
  }
  
  // Skip if location has no coordinates
  if (!location.lat || !location.lng) return;
  
  // Determine marker color/icon based on location type
  let markerIcon = {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 10,
    fillColor: "#4285F4", // Default blue
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: "#FFFFFF"
  };
  
  if (locationType === 'origin') {
    markerIcon.fillColor = "#0000FF"; // Blue for origin
  } else if (locationType === 'destination') {
    markerIcon.fillColor = "#00FF00"; // Green for destination
  } else if (locationType.startsWith('waypoint')) {
    markerIcon.fillColor = "#FFA500"; // Orange for waypoints
  }
  
  // Create new marker
  const marker = new window.google.maps.Marker({
    position: { lat: location.lat, lng: location.lng },
    map: this.mapInstance,
    title: location.name,
    draggable: true, // Make marker draggable
    icon: markerIcon,
    zIndex: 999 // Ensure it's above other elements
  });
  
  // Add info window
  const infoWindow = new window.google.maps.InfoWindow({
    content: `<div><b>${location.name || 'Location'}</b></div>`
  });
  
  marker.addListener("click", () => {
    infoWindow.open(this.mapInstance, marker);
  });
  
  // Handle marker drag events
  marker.addListener("dragend", () => {
    if (!marker.getPosition()) return;
    
    const newPosition = marker.getPosition();
    const newLat = newPosition?.lat() || 0;
    const newLng = newPosition?.lng() || 0;
    
    // Reverse geocode to get address
    this.reverseGeocode(newLat, newLng, (address) => {
      // Dispatch a custom event with the updated location
      const locationUpdateEvent = new CustomEvent("location-marker-moved", {
        detail: {
          locationType,
          location: {
            name: address || `${newLat}, ${newLng}`,
            lat: newLat,
            lng: newLng,
            isGeofenceEnabled: location.isGeofenceEnabled,
            geofenceId: location.geofenceId,
            geoCodeData: location.geoCodeData
          }
        }
      });
      
      document.dispatchEvent(locationUpdateEvent);
    });
  });
  
  // Store the marker
  this.locationMarkers.set(locationType, marker);
  
  // Center map on the new marker with proper null checks
  if (this.mapInstance && location.lat && location.lng) {
    this.mapInstance.setCenter({ lat: location.lat, lng: location.lng });
    
    // Check zoom level
    const currentZoom = this.mapInstance.getZoom();
    if (currentZoom !== undefined && currentZoom < 12) {
      this.mapInstance.setZoom(14);
    }
  }
}
  
  // Update an existing marker's position (when coordinates change in UI)
  updateMarkerPosition(locationType: string, location: Location): void {
    if (this.locationMarkers.has(locationType)) {
      const marker = this.locationMarkers.get(locationType);
      if (marker && location.lat && location.lng) {
        marker.setPosition({ lat: location.lat, lng: location.lng });
      }
    } else {
      // Create a new marker if it doesn't exist
      this.addOrUpdateMarker(locationType, location);
    }
  }
  
  // Clear a specific marker
  clearMarker(locationType: string): void {
    if (this.locationMarkers.has(locationType)) {
      const marker = this.locationMarkers.get(locationType);
      if (marker) {
        marker.setMap(null);
      }
      this.locationMarkers.delete(locationType);
    }
  }
  
  // Clear all location markers
  clearAllMarkers(): void {
    this.locationMarkers.forEach(marker => {
      marker.setMap(null);
    });
    this.locationMarkers.clear();
  }

  calculateRoute(
    origin: Location, 
    destination: Location, 
    waypoints: Location[],
    travelMode: string,
    onSuccess: (response: google.maps.DirectionsResult) => void,
    onError: (status: string) => void
  ): void {
    // Clear any existing markers when calculating a route
    this.clearAllMarkers();
    
    // Prepare waypoints for DirectionsService
    const validWaypoints = waypoints
      .filter((wp) => wp.name.trim() !== "")
      .map((wp) => ({
        location: { lat: wp.lat, lng: wp.lng },
        stopover: true,
      }));

    const request: google.maps.DirectionsRequest = {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      waypoints: validWaypoints,
      optimizeWaypoints: false,
      travelMode: travelMode as unknown as google.maps.TravelMode,
      provideRouteAlternatives: validWaypoints.length === 0,
    };

    this.directionsService?.route(request, (response: any, status) => {
      if (status === "OK") {
        if (this.directionsRenderer) {
          this.directionsRenderer.setDirections(response);
          this.directionsRenderer.setRouteIndex(0);
        }
        onSuccess(response);
      } else {
        onError(status);
      }
    });
  }

  processRouteData(response: google.maps.DirectionsResult, routeIndex = 0): ProcessedRouteData {
    if (!response || !response.routes || response.routes.length === 0) {
      throw new Error("Invalid route data");
    }
    
    const route = response.routes[routeIndex];
    const path = route.overview_path;
    const legs = route.legs;
    
    // Calculate total distance and duration
    let totalDistance = 0;
    let totalDuration = 0;
    legs.forEach((leg: any) => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
    });
    
    // Convert to appropriate units
    const distanceInKm = (totalDistance / 1000).toFixed(2);
    const distanceInMiles = (totalDistance / 1609.344).toFixed(2);
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    
    const distanceText = `${distanceInKm} km (${distanceInMiles} miles)`;
    const durationText = `${hours > 0 ? `${hours} hr ` : ""}${minutes} min`;
    
    // Origin with name
    const originName = legs[0].start_address;
    const originLocation = {
      name: originName,
      lat: legs[0].start_location.lat(),
      lng: legs[0].start_location.lng(),
    };
    
    // Extract waypoints
    const extractedWaypoints: Location[] = [];
    if (legs.length > 1) {
      for (let i = 0; i < legs.length - 1; i++) {
        extractedWaypoints.push({
          name: legs[i].end_address,
          lat: legs[i].end_location.lat(),
          lng: legs[i].end_location.lng(),
        });
      }
    }
    
    // Destination with name
    const lastLeg = legs[legs.length - 1];
    const destinationName = lastLeg.end_address;
    const destinationLocation = {
      name: destinationName,
      lat: lastLeg.end_location.lat(),
      lng: lastLeg.end_location.lng(),
    };
    
    // Path coordinates
    const pathCoords: Coordinates[] = path.map((point: any) => ({
      lat: point.lat(),
      lng: point.lng(),
    }));
    
    return {
      originLocation,
      destinationLocation,
      extractedWaypoints,
      pathCoords,
      distanceText,
      durationText,
      totalDistance,
      totalDuration
    };
  }

  processRouteDataWithCustomWaypoints(
    response: google.maps.DirectionsResult, 
    routeIndex = 0, 
    customWaypoints: Location[] = []
  ): ProcessedRouteData {
    const result = this.processRouteData(response, routeIndex);
    
    // Override with custom waypoints
    return {
      ...result,
      extractedWaypoints: customWaypoints
    };
  }
  
  // Function to display geozones on map
  displayGeozone(location: Location): any {
    if (!this.mapInstance || !window.google || !location.isGeofenceEnabled) return null;
    
    if (!location.geoCodeData) {
      // If geoCodeData is missing but we have a geofenceId, try to get it from the service
      if (location.geofenceId) {
        // Type checking and handling of geofenceId
        let geofenceId: string;
        if (typeof location.geofenceId === 'object' && location.geofenceId !== null) {
          // Use type assertion to tell TypeScript that it has _id property
          geofenceId = (location.geofenceId as { _id: string })._id;
        } else {
          geofenceId = location.geofenceId as string;
        }
        
        const locationService = LocationSelectorService.getInstance();
        const geozone = locationService.getGeozoneById(geofenceId);
        if (geozone && geozone.geoCodeData) {
          // Use the geoCodeData from the service
          location.geoCodeData = geozone.geoCodeData;
        } else {
          // No geoCodeData found, can't display the shape
          console.warn('No geoCodeData found for geozone:', geofenceId);
          return null;
        }
      } else {
        return null;
      }
    }
    
    // First, check if we already have a shape for this location and remove it if it exists
    let locationId: string;
    if (typeof location.geofenceId === 'object' && location.geofenceId !== null) {
      // Type assertion to tell TypeScript that the object has _id property
      locationId = (location.geofenceId as { _id: string })._id;
    } else if (location.geofenceId) {
      locationId = location.geofenceId as string;
    } else {
      locationId = `location-${Math.random()}`;
    }
    
    if (this.geozoneShapes.has(locationId)) {
      const existingShape = this.geozoneShapes.get(locationId);
      if (existingShape) {
        existingShape.setMap(null);
      }
      this.geozoneShapes.delete(locationId);
    }
    
    const { geometry }:any = location.geoCodeData;
    const { type, coordinates, radius } = geometry;
    
    let shape: any = null;
    
    switch (type) {
      case "Circle":
        shape = new window.google.maps.Circle({
          center: { lat: coordinates[0], lng: coordinates[1] },
          radius: radius || 100,
          map: this.mapInstance,
          fillColor: "#4285F4",
          fillOpacity: 0.3,
          strokeWeight: 2,
          strokeColor: "#4285F4",
        });
        break;
        
      case "Polygon":
        shape = new window.google.maps.Polygon({
          paths: coordinates?.map((coord: any) => ({ 
            lat: coord[0], 
            lng: coord[1] 
          })),
          map: this.mapInstance,
          fillColor: "#4285F4",
          fillOpacity: 0.3,
          strokeWeight: 2,
          strokeColor: "#4285F4",
        });
        break;
        
      case "Polyline":
        shape = new window.google.maps.Polyline({
          path: coordinates?.map((coord: any) => ({ 
            lat: coord[0], 
            lng: coord[1] 
          })),
          map: this.mapInstance,
          strokeColor: "#4285F4",
          strokeWeight: 2,
        });
        break;
        
      case "Rectangle":
        const bounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(coordinates[1][0], coordinates[1][1]), // SW corner
          new window.google.maps.LatLng(coordinates[0][0], coordinates[0][1])  // NE corner
        );
        
        shape = new window.google.maps.Rectangle({
          bounds: bounds,
          map: this.mapInstance,
          fillColor: "#4285F4",
          fillOpacity: 0.3,
          strokeWeight: 2,
          strokeColor: "#4285F4",
        });
        break;
        
      case "Point":
        shape = new window.google.maps.Marker({
          position: { lat: coordinates[0], lng: coordinates[1] },
          map: this.mapInstance,
          title: location.name,
        });
        break;
    }
    
    if (shape) {
      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
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
        infoWindow.open(this.mapInstance);
      });
      
      // Store the shape for later reference
      this.geozoneShapes.set(locationId, shape);
      
      return shape;
    }
    
    return null;
  }
    
  // Display geozones for origin, destination, and all waypoints
  displayAllGeozones(origin: Location, destination: Location, waypoints: Location[]): void {
    // Clear any previous shapes
    this.clearGeozones();
    
    // Helper function to ensure a location has geoCodeData if it has a geofenceId
    const ensureGeoCodeData = (location: Location): Location => {
      if (location.isGeofenceEnabled && !location.geoCodeData && location.geofenceId) {
        // Handle the case where geofenceId might be an object
        let geofenceId: string;
        if (typeof location.geofenceId === 'object' && location.geofenceId !== null) {
          // Use type assertion to tell TypeScript that it has _id property
          geofenceId = (location.geofenceId as { _id: string })._id;
        } else {
          geofenceId = location.geofenceId as string;
        }
        
        const locationService = LocationSelectorService.getInstance();
        const geozone = locationService.getGeozoneById(geofenceId);
        
        if (geozone && geozone.geoCodeData) {
          // Create a new location object with the geoCodeData
          return {
            ...location,
            geoCodeData: geozone.geoCodeData,
            // If the name is missing, use the one from the geozone
            name: location.name || geozone.name
          };
        }
      }
      return location;
    };
    
    // Apply the helper to ensure all locations have geoCodeData
    const updatedOrigin = ensureGeoCodeData(origin);
    const updatedDestination = ensureGeoCodeData(destination);
    const updatedWaypoints = waypoints.map(wp => ensureGeoCodeData(wp));
    
    // Display geozones
    if (updatedOrigin.isGeofenceEnabled && updatedOrigin.geoCodeData) {
      this.displayGeozone(updatedOrigin);
    }
    
    if (updatedDestination.isGeofenceEnabled && updatedDestination.geoCodeData) {
      this.displayGeozone(updatedDestination);
    }
    
    updatedWaypoints.forEach(waypoint => {
      if (waypoint.isGeofenceEnabled && waypoint.geoCodeData) {
        this.displayGeozone(waypoint);
      }
    });
  }
    
  // Clear all geozone shapes from the map
  clearGeozones(): void {
    this.geozoneShapes.forEach(shape => {
      if (shape) {
        shape.setMap(null);
      }
    });
    this.geozoneShapes.clear();
  }

  setRouteIndex(index: number): void {
    if (this.directionsRenderer) {
      this.directionsRenderer.setRouteIndex(index);
    }
  }

  addDirectionsChangedListener(callback: () => void): void {
    if (this.directionsRenderer) {
      this.directionsRenderer.addListener("directions_changed", callback);
    }
  }

  getDirections(): google.maps.DirectionsResult | null {
    if (this.directionsRenderer) {
      return this.directionsRenderer.getDirections();
    }
    return null;
  }
}

export default MapService;