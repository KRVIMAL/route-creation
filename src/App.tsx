
import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import './App.css';

const App = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState([{ location: '', stopover: true }]);
  const [coordinates, setCoordinates] = useState('');
  const [coordinatesJson, setCoordinatesJson] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeOptions, setRouteOptions] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [travelMode, setTravelMode] = useState('DRIVING');
  
  const mapRef:any = useRef(null);
  const mapInstanceRef:any = useRef(null);
  const directionsServiceRef:any = useRef(null);
  const directionsRendererRef:any = useRef(null);

  useEffect(() => {
    const initializeMap = async () => {
      const loader = new Loader({
        apiKey: 'AIzaSyAaZ1M_ofwVoLohowruNhY0fyihH9NpcI0',
        version: 'weekly',
        libraries: ['places']
      });

      try {
        // Load the Google Maps API
        const google = await loader.load();
        
        // Initialize the map
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: 28.7041, lng: 77.1025  }, // Default to New Delhi
          zoom: 10
        });

        // Initialize directions service and renderer
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: mapInstance,
          draggable: true, // Allow users to modify route by dragging
          hideRouteList: false // Show the routes panel
        });

        // Add route change listener
        directionsRenderer.addListener('directions_changed', () => {
          const updatedDirections = directionsRenderer.getDirections();
          if (updatedDirections) {
            displayRouteCoordinates(updatedDirections);
          }
        });

        // Save references
        mapInstanceRef.current = mapInstance;
        directionsServiceRef.current = directionsService;
        directionsRendererRef.current = directionsRenderer;
        
        // Initialize autocomplete for origin and destination
        setupAutocomplete(google, 'origin-input');
        setupAutocomplete(google, 'destination-input');
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    const setupAutocomplete = (google:any, elementId:any) => {
      const input = document.getElementById(elementId);
      if (!input) return;
      
      const autocomplete = new google.maps.places.Autocomplete(input);
      autocomplete.bindTo('bounds', mapInstanceRef.current);
    };

    initializeMap();
  }, []);

  const calculateRoute = () => {
    if (!origin || !destination) {
      alert('Please enter both origin and destination');
      return;
    }

    setIsLoading(true);
    
    // Filter out empty waypoints
    const validWaypoints = waypoints
      .filter(wp => wp.location.trim() !== '')
      .map(wp => ({
        location: wp.location,
        stopover: wp.stopover
      }));
    
    const request = {
      origin: origin,
      destination: destination,
      waypoints: validWaypoints,
      optimizeWaypoints: false, // Set to true if you want Google to optimize the waypoint order
      travelMode: travelMode,
      provideRouteAlternatives: validWaypoints.length === 0 // Only provide alternatives if no waypoints
    };

    directionsServiceRef.current.route(request, (response:any, status:any) => {
      setIsLoading(false);
      
      if (status === 'OK') {
        setDirectionsResponse(response);
        directionsRendererRef.current.setDirections(response);
        directionsRendererRef.current.setRouteIndex(0); // Display first route by default
        
        // Generate route options for selection
        const options = response.routes.map((route:any, index:any) => {
          const distance = route.legs[0].distance.text;
          const duration = route.legs[0].duration.text;
          let summary = route.summary;
          
          // If there's no summary, create one based on the first and last step
          if (!summary && route.legs[0].steps.length > 0) {
            const firstStep = route.legs[0].steps[0];
            const lastStep = route.legs[0].steps[route.legs[0].steps.length - 1];
            summary = `via ${firstStep.instructions.replace(/<[^>]*>/g, '')} and ${lastStep.instructions.replace(/<[^>]*>/g, '')}`;
          }
          
          return {
            index,
            summary: summary || `Route ${index + 1}`,
            distance,
            duration
          };
        });
        
        setRouteOptions(options);
        setSelectedRouteIndex(0);
        displayRouteCoordinates(response, 0);
      } else {
        alert(`Directions request failed due to ${status}`);
      }
    });
  };

  const selectRoute = (index:any) => {
    if (directionsResponse) {
      setSelectedRouteIndex(index);
      directionsRendererRef.current.setRouteIndex(index);
      displayRouteCoordinates(directionsResponse, index);
    }
  };

  const displayRouteCoordinates = (response:any, routeIndex = selectedRouteIndex) => {
    if (!response || !response.routes || response.routes.length === 0) {
      return;
    }
    
    const route:any = response.routes[routeIndex];
    const path:any = route.overview_path;
    const legs:any = route.legs;
    
    let coordinateText = `Route: ${route.summary || `Route ${routeIndex + 1}`}\n`;
    
    // Calculate total distance and duration
    let totalDistance = 0;
    let totalDuration = 0;
    legs.forEach((leg:any) => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
    });
    
    // Convert to appropriate units
    const distanceInKm = (totalDistance / 1000).toFixed(2);
    const distanceInMiles = (totalDistance / 1609.344).toFixed(2);
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    
    coordinateText += `Total Distance: ${distanceInKm} km (${distanceInMiles} miles)\n`;
    coordinateText += `Total Duration: ${hours > 0 ? `${hours} hr ` : ''}${minutes} min\n\n`;
    
    // Origin
    coordinateText += `Origin: ${legs[0].start_location.lat()}, ${legs[0].start_location.lng()}\n`;
    
    // Waypoints (if any)
    if (legs.length > 1) {
      coordinateText += 'Waypoints:\n';
      for (let i = 0; i < legs.length - 1; i++) {
        const waypoint = legs[i].end_location;
        coordinateText += `  ${i + 1}. ${waypoint.lat()}, ${waypoint.lng()}\n`;
      }
    }
    
    // Destination
    const lastLeg = legs[legs.length - 1];
    coordinateText += `Destination: ${lastLeg.end_location.lat()}, ${lastLeg.end_location.lng()}\n\n`;
    
    coordinateText += 'Complete Path Points:\n';
    path.forEach((point:any, index:any) => {
      coordinateText += `${index + 1}. ${point.lat()}, ${point.lng()}\n`;
    });
    
    // Prepare JSON data structure
    const jsonData:any = {
      summary: route.summary || `Route ${routeIndex + 1}`,
      distance: {
        value: totalDistance,
        text: `${distanceInKm} km (${distanceInMiles} miles)`
      },
      duration: {
        value: totalDuration,
        text: `${hours > 0 ? `${hours} hr ` : ''}${minutes} min`
      },
      origin: {
        lat: legs[0].start_location.lat(),
        lng: legs[0].start_location.lng()
      },
      destination: {
        lat: lastLeg.end_location.lat(),
        lng: lastLeg.end_location.lng()
      },
      waypoints: legs.length > 1 ? 
        legs.slice(0, -1).map((leg:any, i:any) => ({
          lat: leg.end_location.lat(),
          lng: leg.end_location.lng()
        })) : [],
      path: path.map((point:any) => ({
        lat: point.lat(),
        lng: point.lng()
      }))
    };
    
    setCoordinates(coordinateText);
    setCoordinatesJson(jsonData);
  };

  const downloadCoordinates = (format = 'text') => {
    if (format === 'text' && coordinates) {
      const blob = new Blob([coordinates], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'route_coordinates.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'json' && coordinatesJson) {
      const jsonString = JSON.stringify(coordinatesJson, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'route_coordinates.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="app-container">
      <h1>Get Route Coordinates</h1>
      
      <div className="input-container">
        <div className="input-group">
          <label htmlFor="origin-input">Origin:</label>
          <input
            id="origin-input"
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Enter origin location"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="destination-input">Destination:</label>
          <input
            id="destination-input"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Enter destination location"
          />
        </div>
        
        <div className="input-group travel-mode">
          <label htmlFor="travel-mode">Travel Mode:</label>
          <select 
            id="travel-mode" 
            value={travelMode} 
            onChange={(e) => setTravelMode(e.target.value)}
          >
            <option value="DRIVING">Driving</option>
            <option value="WALKING">Walking</option>
            <option value="BICYCLING">Bicycling</option>
            <option value="TRANSIT">Transit</option>
          </select>
        </div>
        
        <button 
          onClick={calculateRoute}
          disabled={isLoading}
          className="calculate-btn"
        >
          {isLoading ? 'Loading...' : 'Get Route Coordinates'}
        </button>
      </div>
      
      <div className="waypoints-container">
        <div className="waypoints-header">
          <h3>Waypoints (Via Points)</h3>
          <button 
            className="add-waypoint-btn"
            onClick={() => setWaypoints([...waypoints, { location: '', stopover: true }])}
          >
            Add Waypoint
          </button>
        </div>
        
        {waypoints.map((waypoint, index) => (
          <div key={index} className="waypoint-row">
            <div className="waypoint-number">{index + 1}</div>
            <input
              type="text"
              value={waypoint.location}
              onChange={(e) => {
                const newWaypoints = [...waypoints];
                newWaypoints[index].location = e.target.value;
                setWaypoints(newWaypoints);
              }}
              placeholder="Enter waypoint location"
              className="waypoint-input"
            />
            <button
              className="remove-waypoint-btn"
              onClick={() => {
                const newWaypoints = waypoints.filter((_, i) => i !== index);
                setWaypoints(newWaypoints.length ? newWaypoints : [{ location: '', stopover: true }]);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      
      <div className="map-section">
        <div ref={mapRef} className="map-container"></div>
        
        {routeOptions.length > 0 && (
          <div className="route-options">
            <h3>Alternate Routes</h3>
            <div className="route-options-list">
              {routeOptions.map((route:any, index:any) => (
                <div 
                  key={index}
                  className={`route-option ${index === selectedRouteIndex ? 'selected' : ''}`}
                  onClick={() => selectRoute(index)}
                >
                  <div className="route-name">
                    <strong>{route.summary}</strong>
                  </div>
                  <div className="route-details">
                    {route.distance} • {route.duration}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {coordinates && (
        <div className="coordinates-container">
          <div className="coordinates-header">
            <h3>Route Coordinates</h3>
            <div className="download-buttons">
              <button onClick={() => downloadCoordinates('json')} className="download-btn download-json">
                Download JSON
              </button>
              <button onClick={() => downloadCoordinates('text')} className="download-btn">
                Download Text
              </button>
            </div>
          </div>
          <pre>{coordinates}</pre>
        </div>
      )}
    </div>
  );
};

export default App;