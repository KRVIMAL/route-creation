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
const API_KEY=import.meta.env.VITE_GOOGLE_MAP_API_KEY;
export class MapService {
  mapInstance: google.maps.Map | null = null;
  directionsService: google.maps.DirectionsService | null = null;
  directionsRenderer: google.maps.DirectionsRenderer | null = null;
  autocompleteInstances: Map<string, google.maps.places.Autocomplete> = new Map();

  async initialize(mapRef: HTMLDivElement): Promise<boolean> {
    try {
      const loader = new Loader({
        apiKey: API_KEY,
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