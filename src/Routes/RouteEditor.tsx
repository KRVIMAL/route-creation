// RouteEditor.tsx
import React, { useState, useEffect, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FaPlus } from "react-icons/fa";
import { Route, Location } from "./types";
import WaypointItem from "./component/WaypointItem";
import MapService from "./services/MapService";
import { TRAVEL_MODES, DEFAULT_ROUTE } from "./constants/RouteEditorConstants";
import "../App.css";

// Main RouteEditor component
interface RouteEditorProps {
  initialRoute?: Route | null;
  onSave: (route: Route) => void;
  onCancel: () => void;
}

const RouteEditor: React.FC<RouteEditorProps> = ({
  initialRoute,
  onSave,
  onCancel,
}) => {
  const [route, setRoute] = useState<Route>(initialRoute || DEFAULT_ROUTE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [routeOptions, setRouteOptions] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [directionsResponse, setDirectionsResponse] = useState<any>(null);
  const [googleLoaded, setGoogleLoaded] = useState<boolean>(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapServiceRef = useRef<MapService | null>(null);

  // Initialize map service
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;
      
      const mapService = new MapService();
      const initialized = await mapService.initialize(mapRef.current);
      
      if (initialized) {
        setGoogleLoaded(true);
        mapServiceRef.current = mapService;
        
        // Setup direction changed listener
        mapService.addDirectionsChangedListener(() => {
          const updatedDirections = mapService.getDirections();
          if (updatedDirections) {
            processRouteData(updatedDirections);
          }
        });
        
        // Initialize autocomplete fields
        setupAutocompleteFields();
        
        // If editing existing route, calculate and display it
        if (initialRoute && initialRoute.origin.lat && initialRoute.destination.lat) {
          calculateRoute();
        }
      }
    };
    
    initMap();
  }, []);

  // Update autocomplete for dynamically added waypoints
  useEffect(() => {
    if (googleLoaded && route.waypoints.length > 0) {
      route.waypoints.forEach((_, idx) => {
        setupWaypointAutocomplete(idx);
      });
    }
  }, [route.waypoints.length, googleLoaded]);

  const setupAutocompleteFields = () => {
    if (!mapServiceRef.current) return;
    
    // Setup origin autocomplete
    mapServiceRef.current.setupAutocomplete("origin-input", (place:any) => {
      setRoute((prev) => ({
        ...prev,
        origin: {
          name: place.formatted_address || place.name || "",
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng(),
        },
      }));
    });
    
    // Setup destination autocomplete
    mapServiceRef.current.setupAutocomplete("destination-input", (place:any) => {
      setRoute((prev) => ({
        ...prev,
        destination: {
          name: place.formatted_address || place.name || "",
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng(),
        },
      }));
    });
    
    // Setup any initial waypoints
    if (route.waypoints.length > 0) {
      route.waypoints.forEach((_, idx) => {
        setupWaypointAutocomplete(idx);
      });
    }
  };

  const setupWaypointAutocomplete = (index: number) => {
    if (!mapServiceRef.current) return;
    
    const elementId = `waypoint-input-${index}`;
    
    mapServiceRef.current.setupAutocomplete(elementId, (place:any) => {
      const newWaypoints = [...route.waypoints];
      newWaypoints[index] = {
        name: place.formatted_address || place.name || "",
        lat: place.geometry!.location!.lat(),
        lng: place.geometry!.location!.lng(),
      };
      setRoute((prev) => ({ ...prev, waypoints: newWaypoints }));
    });
  };

  // Move waypoint from one index to another
  const moveWaypoint = (dragIndex: number, hoverIndex: number) => {
    // Create a new array to avoid mutating state directly
    const updatedWaypoints = [...route.waypoints];

    // Remove the item from its original position
    const draggedItem = updatedWaypoints[dragIndex];

    // Don't proceed if the item doesn't exist
    if (!draggedItem) return;

    // Remove from original position and insert at new position
    updatedWaypoints.splice(dragIndex, 1);
    updatedWaypoints.splice(hoverIndex, 0, draggedItem);

    // Update the state with the new array
    setRoute((prev) => ({
      ...prev,
      waypoints: updatedWaypoints,
    }));
  };

  const calculateRoute = () => {
    if (!mapServiceRef.current) return;
    
    if (!route.origin.name || !route.destination.name) {
      alert("Please enter both origin and destination");
      return;
    }

    setIsLoading(true);

    // Make a copy of the current waypoints
    const currentWaypoints = [...route.waypoints];

    mapServiceRef.current.calculateRoute(
      route.origin,
      route.destination,
      currentWaypoints,
      route.travelMode,
      (response:any) => {
        setIsLoading(false);
        setDirectionsResponse(response);
        
        // Generate route options for selection
        const options = response.routes.map((route:any, index:any) => {
          const distance = route.legs[0].distance.text;
          const duration = route.legs[0].duration.text;
          const summary = route.summary || `Route ${index + 1}`;
          
          return {
            index,
            summary,
            distance,
            duration,
          };
        });
        
        setRouteOptions(options);
        setSelectedRouteIndex(0);
        
        // Use our custom function that preserves waypoints
        processRouteDataWithCustomWaypoints(response, 0, currentWaypoints);
      },
      (status:any) => {
        setIsLoading(false);
        alert(`Directions request failed due to ${status}`);
      }
    );
  };

  const selectRoute = (index: number) => {
    if (!mapServiceRef.current || !directionsResponse) return;
    
    setSelectedRouteIndex(index);
    mapServiceRef.current.setRouteIndex(index);
    processRouteData(directionsResponse, index);
  };

  const processRouteData = (response: any, routeIndex = selectedRouteIndex) => {
    if (!mapServiceRef.current) return;
    
    try {
      const processedData = mapServiceRef.current.processRouteData(response, routeIndex);
      
      setRoute((prev) => ({
        ...prev,
        distance: { 
          value: processedData.totalDistance, 
          text: processedData.distanceText 
        },
        duration: { 
          value: processedData.totalDuration, 
          text: processedData.durationText 
        },
        origin: processedData.originLocation,
        destination: processedData.destinationLocation,
        waypoints: processedData.extractedWaypoints,
        path: processedData.pathCoords,
      }));
    } catch (error) {
      console.error("Error processing route data:", error);
    }
  };

  const processRouteDataWithCustomWaypoints = (
    response: any,
    routeIndex = selectedRouteIndex,
    customWaypoints: Location[] = []
  ) => {
    if (!mapServiceRef.current) return;
    
    try {
      const processedData = mapServiceRef.current.processRouteDataWithCustomWaypoints(
        response, 
        routeIndex, 
        customWaypoints
      );
      
      setRoute((prev) => ({
        ...prev,
        distance: { 
          value: processedData.totalDistance, 
          text: processedData.distanceText 
        },
        duration: { 
          value: processedData.totalDuration, 
          text: processedData.durationText 
        },
        origin: processedData.originLocation,
        destination: processedData.destinationLocation,
        waypoints: customWaypoints, // Use custom waypoints
        path: processedData.pathCoords,
      }));
    } catch (error) {
      console.error("Error processing route data with custom waypoints:", error);
    }
  };

  const handleSave = () => {
    // Make sure we have all required data
    if (!route.name.trim()) {
      alert("Please provide a name for the route");
      return;
    }
    
    if (!route.origin.name || !route.destination.name) {
      alert("Please provide both origin and destination");
      return;
    }
    
    onSave(route);
  };

  const addWaypoint = () => {
    setRoute((prev) => ({
      ...prev,
      waypoints: [...prev.waypoints, { name: "", lat: 0, lng: 0 }],
    }));
  };

  const removeWaypoint = (index: number) => {
    if (!mapServiceRef.current) return;
    
    // Create a new waypoints array without the waypoint to be removed
    const newWaypoints = [...route.waypoints];
    newWaypoints.splice(index, 1);

    // Update the route state with the new waypoints
    setRoute((prev) => ({ ...prev, waypoints: newWaypoints }));

    // Only recalculate if we have valid origin and destination
    if (route.origin.lat && route.destination.lat) {
      setIsLoading(true);
      
      mapServiceRef.current.calculateRoute(
        route.origin,
        route.destination,
        newWaypoints,
        route.travelMode,
        (response:any) => {
          setIsLoading(false);
          setDirectionsResponse(response);
          
          // Generate route options
          const options = response.routes.map((route:any, index:any) => {
            const distance = route.legs[0].distance.text;
            const duration = route.legs[0].duration.text;
            const summary = route.summary || `Route ${index + 1}`;
            
            return {
              index,
              summary,
              distance,
              duration,
            };
          });
          
          setRouteOptions(options);
          setSelectedRouteIndex(0);
          
          // Process with custom waypoints
          processRouteDataWithCustomWaypoints(response, 0, newWaypoints);
        },
        (status:any) => {
          setIsLoading(false);
          alert(`Directions request failed due to ${status}`);
        }
      );
    }
  };

  const downloadJson = () => {
    if (!route.origin.name || !route.destination.name) {
      alert("Please calculate a route first");
      return;
    }

    const jsonString = JSON.stringify(route, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${route.name || "route"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-white rounded-lg shadow-md p-5">
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="lg:w-1/3 bg-gray-50 rounded-md px-4 py-4">
            <h2 className="text-xl font-semibold mb-4">{initialRoute ? "Edit Route" : "Create Route"}</h2>

            <div className="mb-4">
              <label htmlFor="route-name" className="block mb-1 font-medium text-gray-700">Name *</label>
              <input
                id="route-name"
                type="text"
                value={route.name}
                onChange={(e) =>
                  setRoute((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter route name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-5 relative">
              {/* Source point with blue marker */}
              <div className="flex items-start mb-4 relative">
                {/* Vertical line connecting points */}
                <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-300 z-0"></div>
                
                <div className="w-6 h-6 rounded-full bg-blue-500 flex-shrink-0 mt-7 z-10"></div>
                <div className="ml-2 w-full">
                  <label htmlFor="origin-input" className="block mb-1 font-medium text-gray-700">Source *</label>
                  <div className="relative">
                    <input
                      id="origin-input"
                      type="text"
                      value={route.origin.name}
                      onChange={(e) =>
                        setRoute((prev) => ({
                          ...prev,
                          origin: { ...prev.origin, name: e.target.value },
                        }))
                      }
                      placeholder="Enter origin location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute right-2 top-2.5">
                      <input type="checkbox" id="origin-fence" className="hidden" />
                      <label 
                        htmlFor="origin-fence"
                        className="block w-6 h-6 bg-gray-200 rounded cursor-pointer relative"
                      ></label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Waypoints */}
              {route.waypoints.map((waypoint, index) => (
                <WaypointItem
                  key={`waypoint-${index}`}
                  index={index}
                  waypoint={waypoint}
                  moveWaypoint={moveWaypoint}
                  onChange={(value:any) => {
                    const newWaypoints = [...route.waypoints];
                    newWaypoints[index] = { ...waypoint, name: value };
                    setRoute((prev) => ({ ...prev, waypoints: newWaypoints }));
                  }}
                  onRemove={() => removeWaypoint(index)}
                />
              ))}
              
              {/* Destination point with green marker */}
              <div className="flex items-start mb-4 relative">
                <div className="w-6 h-6 rounded-full bg-green-500 flex-shrink-0 mt-7 z-10"></div>
                <div className="ml-2 w-full">
                  <label htmlFor="destination-input" className="block mb-1 font-medium text-gray-700">Destination *</label>
                  <div className="relative">
                    <input
                      id="destination-input"
                      type="text"
                      value={route.destination.name}
                      onChange={(e) =>
                        setRoute((prev) => ({
                          ...prev,
                          destination: {
                            ...prev.destination,
                            name: e.target.value,
                          },
                        }))
                      }
                      placeholder="Enter destination location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute right-2 top-2.5">
                      <input type="checkbox" id="destination-fence" className="hidden" />
                      <label 
                        htmlFor="destination-fence"
                        className="block w-6 h-6 bg-gray-200 rounded cursor-pointer relative"
                      ></label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Add waypoint button */}
              <div className="ml-8 mb-4">
                <button 
                  className="flex items-center gap-2 text-blue-500 border border-dashed border-blue-500 px-3 py-2 rounded hover:bg-blue-50"
                  onClick={addWaypoint}
                >
                  <FaPlus /> Add Via Destination
                </button>
              </div>
            </div>
            
            {/* Travel mode selection */}
            <div className="mb-4 w-1/2">
              <label htmlFor="travel-mode" className="block mb-1 font-medium text-gray-700">Travel Mode</label>
              <select
                id="travel-mode"
                value={route.travelMode}
                onChange={(e) =>
                  setRoute((prev) => ({ ...prev, travelMode: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TRAVEL_MODES.map((mode:any) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Route alternatives */}
            {routeOptions.length > 0 && (
              <div className="mb-5 border border-gray-300 rounded-lg p-4 bg-gray-50">
                <h3 className="text-base font-semibold mb-2 text-gray-700">Alternate Routes</h3>
                <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
                  {routeOptions.map((routeOpt, index) => (
                    <div
                      key={index}
                      className={`bg-white border p-3 rounded-md cursor-pointer hover:border-blue-500 transition-colors ${
                        index === selectedRouteIndex ? "border-blue-500 bg-blue-50" : "border-gray-300"
                      }`}
                      onClick={() => selectRoute(index)}
                    >
                      <div className="font-medium">
                        {routeOpt.summary}
                      </div>
                      <div className="text-sm text-gray-600">
                        {routeOpt.distance} • {routeOpt.duration}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-5">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={calculateRoute}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Calculate Route"}
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSave}
                disabled={isLoading || !route.path.length}
              >
                {initialRoute ? "Update" : "Create"}
              </button>
            </div>
          </div>

          {/* Map container */}
          <div className="lg:w-2/3">
            <div ref={mapRef} className="w-full h-[500px] rounded-lg border border-gray-300"></div>
          </div>
        </div>
      </div>
    </DndProvider>);};
    export default RouteEditor;