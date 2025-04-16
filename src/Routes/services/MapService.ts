// MapService.ts
import { Loader } from "@googlemaps/js-api-loader";
import { Route, Location, Coordinates } from "../types";

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
      if (!place.geometry || !place.geometry.location) return;
      onPlaceSelected(place);
    });
  }

  calculateRoute(
    origin: Location, 
    destination: Location, 
    waypoints: Location[],
    travelMode: string,
    onSuccess: (response: google.maps.DirectionsResult) => void,
    onError: (status: string) => void
  ): void {
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
    if (!this.mapInstance || !window.google || !location.isGeofenceEnabled || !location.geoCodeData) return null;
    
    // First, check if we already have a shape for this location and remove it if it exists
    const locationId = location.geozoneId || `location-${Math.random()}`;
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
    
    if (origin.isGeofenceEnabled && origin.geoCodeData) {
      this.displayGeozone(origin);
    }
    
    if (destination.isGeofenceEnabled && destination.geoCodeData) {
      this.displayGeozone(destination);
    }
    
    waypoints.forEach(waypoint => {
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