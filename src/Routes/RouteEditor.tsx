// RouteEditor.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Route, Location, Coordinates } from './types';
import { FaPlus, FaTimes, FaGripVertical } from 'react-icons/fa';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import '../App.css';

// Define the item type as a string constant
const WAYPOINT_TYPE = 'waypoint';

// Draggable waypoint component
interface WaypointItemProps {
  waypoint: Location;
  index: number;
  moveWaypoint: (dragIndex: number, hoverIndex: number) => void;
  onChange: (value: string) => void;
  onRemove: () => void;
}

const WaypointItem = ({ waypoint, index, moveWaypoint, onChange, onRemove }: WaypointItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  
  // Configure drag
  const [{ isDragging }, drag] = useDrag({
    type: WAYPOINT_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  
  // Configure drop
  const [, drop] = useDrop({
    accept: WAYPOINT_TYPE,
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return;
      }
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      
      // Time to actually perform the action - move the waypoint
      moveWaypoint(dragIndex, hoverIndex);
      
      // Note: we're mutating the monitor item here!
      // This is crucial to make the drag work properly
      item.index = hoverIndex;
    },
  });
  
  // Connect the drag and drop refs (order matters)
  drag(drop(ref));
  
  return (
    <div 
      ref={ref} 
      className={`location-point waypoint ${isDragging ? 'is-dragging' : ''}`}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        position: 'relative'  // Important for drop targeting
      }}
    >
      <div className="drag-handle">
        <FaGripVertical />
      </div>
      <div className="point-marker"></div>
      <div className="form-group">
        <label htmlFor={`waypoint-input-${index}`}>Via Destination</label>
        <div className="input-with-icon">
          <input
            id={`waypoint-input-${index}`}
            type="text"
            value={waypoint.name}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter waypoint location"
            className="form-control"
          />
          <button 
            className="remove-waypoint-btn"
            onClick={onRemove}
          >
            <FaTimes />
          </button>
          <div className="toggle-fence">
            <input type="checkbox" id={`waypoint-fence-${index}`} />
            <label htmlFor={`waypoint-fence-${index}`}></label>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main RouteEditor component
interface RouteEditorProps {
  initialRoute?: Route | null;
  onSave: (route: Route) => void;
  onCancel: () => void;
}

const TRAVEL_MODES = [
  { value: "DRIVING", label: "Driving" },
  { value: "WALKING", label: "Walking" },
  { value: "BICYCLING", label: "Bicycling" },
  { value: "TRANSIT", label: "Transit" }
];

const DEFAULT_ROUTE: Route = {
  name: '',
  travelMode: 'DRIVING',
  distance: { value: 0, text: '' },
  duration: { value: 0, text: '' },
  origin: { name: '', lat: 0, lng: 0 },
  destination: { name: '', lat: 0, lng: 0 },
  waypoints: [],
  path: []
};

const RouteEditor: React.FC<RouteEditorProps> = ({ initialRoute, onSave, onCancel }) => {
  const [route, setRoute] = useState<Route>(initialRoute || DEFAULT_ROUTE);
  const [coordinates, setCoordinates] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [routeOptions, setRouteOptions] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [directionsResponse, setDirectionsResponse] = useState<any>(null);
  const [googleLoaded, setGoogleLoaded] = useState<boolean>(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      const loader = new Loader({
        apiKey: 'AIzaSyAaZ1M_ofwVoLohowruNhY0fyihH9NpcI0', // Replace with your actual Google Maps API key
        version: 'weekly',
        libraries: ['places']
      });

      try {
        const google = await loader.load();
        setGoogleLoaded(true);
        
        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: { lat: 28.6139, lng: 77.2090 }, // Default to New Delhi
          zoom: 10
        });

        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: mapInstance,
          draggable: true,
          hideRouteList: false
        });

        directionsRenderer.addListener('directions_changed', () => {
          const updatedDirections = directionsRenderer.getDirections();
          if (updatedDirections) {
            processRouteData(updatedDirections);
          }
        });

        mapInstanceRef.current = mapInstance;
        directionsServiceRef.current = directionsService;
        directionsRendererRef.current = directionsRenderer;

        setupAutocomplete('origin-input');
        setupAutocomplete('destination-input');
        
        // Initialize waypoint autocomplete
        if (route.waypoints.length > 0) {
          route.waypoints.forEach((_, idx) => {
            setupAutocomplete(`waypoint-input-${idx}`);
          });
        }

        // If editing existing route, calculate and display it
        if (initialRoute && initialRoute.origin.lat && initialRoute.destination.lat) {
          calculateRoute();
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initializeMap();
  }, []);

  useEffect(() => {
    // Initialize autocomplete for dynamically added waypoints
    if (googleLoaded && window.google && window.google.maps && window.google.maps.places) {
      route.waypoints.forEach((_, idx) => {
        setupAutocomplete(`waypoint-input-${idx}`);
      });
    }
  }, [route.waypoints.length, googleLoaded]);

  const setupAutocomplete = (elementId: string) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    
    const input = document.getElementById(elementId) as HTMLInputElement;
    if (!input) return;
    
    const autocomplete = new window.google.maps.places.Autocomplete(input);
    if (mapInstanceRef.current) {
      autocomplete.bindTo('bounds', mapInstanceRef.current);
    }

    // Handle place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;

      if (elementId === 'origin-input') {
        setRoute(prev => ({
          ...prev,
          origin: {
            name: place.formatted_address || place.name || '',
            lat: place.geometry!.location!.lat(),
            lng: place.geometry!.location!.lng()
          }
        }));
      } else if (elementId === 'destination-input') {
        setRoute(prev => ({
          ...prev,
          destination: {
            name: place.formatted_address || place.name || '',
            lat: place.geometry!.location!.lat(),
            lng: place.geometry!.location!.lng()
          }
        }));
      } else if (elementId.startsWith('waypoint-input-')) {
        const waypointIndex = parseInt(elementId.split('-').pop() || '0', 10);
        const newWaypoints = [...route.waypoints];
        newWaypoints[waypointIndex] = {
          name: place.formatted_address || place.name || '',
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng()
        };
        setRoute(prev => ({ ...prev, waypoints: newWaypoints }));
      }
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
    setRoute(prev => ({
      ...prev,
      waypoints: updatedWaypoints
    }));
  };

  const calculateRoute = () => {
    if (!route.origin.name || !route.destination.name) {
      alert('Please enter both origin and destination');
      return;
    }

    setIsLoading(true);
    
    // Prepare waypoints for DirectionsService
    const validWaypoints = route.waypoints
      .filter(wp => wp.name.trim() !== '')
      .map(wp => ({
        location: { lat: wp.lat, lng: wp.lng },
        stopover: true
      }));
    
    const request: google.maps.DirectionsRequest = {
      origin: { lat: route.origin.lat, lng: route.origin.lng },
      destination: { lat: route.destination.lat, lng: route.destination.lng },
      waypoints: validWaypoints,
      optimizeWaypoints: false,
      travelMode: route.travelMode as unknown as google.maps.TravelMode,
      provideRouteAlternatives: validWaypoints.length === 0
    };

    directionsServiceRef.current!.route(request, (response:any, status) => {
      setIsLoading(false);
      
      if (status === 'OK') {
        setDirectionsResponse(response);
        directionsRendererRef.current!.setDirections(response);
        directionsRendererRef.current!.setRouteIndex(0);
        
        // Generate route options for selection
        const options:any = response.routes.map((route:any, index:any) => {
          const distance = route.legs[0].distance.text;
          const duration = route.legs[0].duration.text;
          const summary = route.summary || `Route ${index + 1}`;
          
          return {
            index,
            summary,
            distance,
            duration
          };
        });
        
        setRouteOptions(options);
        setSelectedRouteIndex(0);
        processRouteData(response, 0);
      } else {
        alert(`Directions request failed due to ${status}`);
      }
    });
  };

  const selectRoute = (index: number) => {
    if (directionsResponse) {
      setSelectedRouteIndex(index);
      directionsRendererRef.current!.setRouteIndex(index);
      processRouteData(directionsResponse, index);
    }
  };

  const processRouteData = (response: any, routeIndex = selectedRouteIndex) => {
    if (!response || !response.routes || response.routes.length === 0) {
      return;
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
    const durationText = `${hours > 0 ? `${hours} hr ` : ''}${minutes} min`;
    
    // Origin with name
    const originName = legs[0].start_address;
    const originLocation = {
      name: originName,
      lat: legs[0].start_location.lat(),
      lng: legs[0].start_location.lng()
    };
    
    // Extract waypoints
    const extractedWaypoints: Location[] = [];
    if (legs.length > 1) {
      for (let i = 0; i < legs.length - 1; i++) {
        extractedWaypoints.push({
          name: legs[i].end_address,
          lat: legs[i].end_location.lat(),
          lng: legs[i].end_location.lng()
        });
      }
    }
    
    // Destination with name
    const lastLeg = legs[legs.length - 1];
    const destinationName = lastLeg.end_address;
    const destinationLocation = {
      name: destinationName,
      lat: lastLeg.end_location.lat(),
      lng: lastLeg.end_location.lng()
    };
    
    // Path coordinates
    const pathCoords: Coordinates[] = path.map((point: any) => ({
      lat: point.lat(),
      lng: point.lng()
    }));
    
    // Update route data
    setRoute(prev => ({
      ...prev,
      distance: { value: totalDistance, text: distanceText },
      duration: { value: totalDuration, text: durationText },
      origin: originLocation,
      destination: destinationLocation,
      waypoints: extractedWaypoints,
      path: pathCoords
    }));
  };

  const handleSave = () => {
    // Make sure we have all required data
    if (!route.name.trim()) {
      alert('Please provide a name for the route');
      return;
    }
    
    if (!route.origin.name || !route.destination.name) {
      alert('Please provide both origin and destination');
      return;
    }
    
    onSave(route);
  };

  const addWaypoint = () => {
    setRoute(prev => ({
      ...prev,
      waypoints: [...prev.waypoints, { name: '', lat: 0, lng: 0 }]
    }));
  };

  const removeWaypoint = (index: number) => {
    const newWaypoints = [...route.waypoints];
    newWaypoints.splice(index, 1);
    setRoute(prev => ({ ...prev, waypoints: newWaypoints }));
    
    // Recalculate route if there are still valid waypoints and origin/destination
    if (route.origin.lat && route.destination.lat) {
      setTimeout(() => calculateRoute(), 100);
    }
  };

  const downloadJson = () => {
    if (!route.origin.name || !route.destination.name) {
      alert('Please calculate a route first');
      return;
    }

    const jsonString = JSON.stringify(route, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${route.name || 'route'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="route-editor">
        <div className="editor-container">
          <div className="left-panel rounded-md px-4 py-4">
            <h2>{initialRoute ? 'Edit Route' : 'Create Geo Zone with Route'}</h2>
            
            <div className="form-group">
              <label htmlFor="route-name">Name *</label>
              <input
                id="route-name"
                type="text"
                value={route.name}
                onChange={(e) => setRoute(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter route name"
                className="form-control"
              />
            </div>
            
            <div className="location-inputs">
              <div className="location-point source">
                <div className="point-marker"></div>
                <div className="form-group">
                  <label htmlFor="origin-input">Source *</label>
                  <div className="input-with-icon">
                    <input
                      id="origin-input"
                      type="text"
                      value={route.origin.name}
                      onChange={(e) => setRoute(prev => ({ 
                        ...prev, 
                        origin: { ...prev.origin, name: e.target.value } 
                      }))}
                      placeholder="Enter origin location"
                      className="form-control"
                    />
                    <div className="toggle-fence">
                      <input type="checkbox" id="origin-fence" />
                      <label htmlFor="origin-fence"></label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Waypoints - using the simpler implementation */}
              {route.waypoints.map((waypoint, index) => (
                <WaypointItem
                  key={`waypoint-${index}`} // Unique key that includes the index
                  index={index}
                  waypoint={waypoint}
                  moveWaypoint={moveWaypoint}
                  onChange={(value) => {
                    const newWaypoints = [...route.waypoints];
                    newWaypoints[index] = { ...waypoint, name: value };
                    setRoute(prev => ({ ...prev, waypoints: newWaypoints }));
                  }}
                  onRemove={() => removeWaypoint(index)}
                />
              ))}
              
              <div className="location-point destination">
                <div className="point-marker"></div>
                <div className="form-group">
                  <label htmlFor="destination-input">Destination *</label>
                  <div className="input-with-icon">
                    <input
                      id="destination-input"
                      type="text"
                      value={route.destination.name}
                      onChange={(e) => setRoute(prev => ({ 
                        ...prev, 
                        destination: { ...prev.destination, name: e.target.value } 
                      }))}
                      placeholder="Enter destination location"
                      className="form-control"
                    />
                    <div className="toggle-fence">
                      <input type="checkbox" id="destination-fence" />
                      <label htmlFor="destination-fence"></label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="add-waypoint">
                <button 
                  className="add-waypoint-btn"
                  onClick={addWaypoint}
                >
                  <FaPlus /> Add Via Destination
                </button>
              </div>
            </div>
            
            <div className="form-group travel-mode">
              <label htmlFor="travel-mode">Travel Mode</label>
              <select 
                id="travel-mode" 
  value={route.travelMode} 
  onChange={(e) => setRoute(prev => ({ ...prev, travelMode: e.target.value }))}
  className="form-control"
>
  {TRAVEL_MODES.map(mode => (
    <option key={mode.value} value={mode.value}>{mode.label}</option>
  ))}
</select>
</div>

{routeOptions.length > 0 && (
  <div className="route-options">
    <h3>Alternate Routes</h3>
    <div className="route-options-list">
      {routeOptions.map((routeOpt, index) => (
        <div 
          key={index}
          className={`route-option ${index === selectedRouteIndex ? 'selected' : ''}`}
          onClick={() => selectRoute(index)}
        >
          <div className="route-name">
            <strong>{routeOpt.summary}</strong>
          </div>
          <div className="route-details">
            {routeOpt.distance} • {routeOpt.duration}
          </div>
        </div>
      ))}
    </div>
  </div>
)}

<div className="download-json">
  <button className="download-json-btn" onClick={downloadJson}>
    Download as JSON
  </button>
</div>

<div className="form-actions">
  <button 
    className="cancel-btn"
    onClick={onCancel}
    disabled={isLoading}
  >
    Cancel
  </button>
  <button 
    className="calculate-btn"
    onClick={calculateRoute}
    disabled={isLoading}
  >
    {isLoading ? 'Loading...' : 'Calculate Route'}
  </button>
  <button 
    className="save-btn"
    onClick={handleSave}
    disabled={isLoading || !route.path.length}
  >
    {initialRoute ? 'Update' : 'Create'}
  </button>
</div>
</div>

<div className="right-panel">
  <div ref={mapRef} className="map-container"></div>
</div>
</div>
</div>
</DndProvider>
);
};

export default RouteEditor;