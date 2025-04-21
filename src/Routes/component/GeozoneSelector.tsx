// GeozoneSelector.tsx
import React, { useEffect, useState } from 'react';
import { FaExchangeAlt } from 'react-icons/fa';
import { Location } from '../types';
import LocationSelectorService, { GeozoneData } from '../services/LocationSelectorService';

interface GeozoneSelectorProps {
  id: string;
  label: string;
  location: Location;
  onChange: (location: Location) => void;
  placeholder: string;
  isRequired?: boolean;
  className?: string;
}

const GeozoneSelector: React.FC<GeozoneSelectorProps> = ({
  id,
  label,
  location,
  onChange,
  placeholder,
  isRequired = false,
  className = '',
}) => {
  const [isGeozoneMode, setIsGeozoneMode] = useState<boolean>(location.isGeofenceEnabled || false);
  const [geozones, setGeozones] = useState<GeozoneData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const locationService = LocationSelectorService.getInstance();

  // Debug: Log initial props
  console.log(`GeozoneSelector ${id} initial props:`, {
    name: location.name,
    isGeofenceEnabled: location.isGeofenceEnabled,
    geofenceId: location.geofenceId
  });

  // Initialize and load geozones
  useEffect(() => {
    const loadGeozones = async () => {
      setLoading(true);
      await locationService.initialize();
      const loadedGeozones = locationService.getGeozones();
      setGeozones(loadedGeozones);
      
      // Debug loaded geozones
      console.log(`Loaded ${loadedGeozones.length} geozones`);
      
      // Check if geofenceId is an object and extract the actual ID and name
      if (location.geofenceId && typeof location.geofenceId === 'object' && location.isGeofenceEnabled) {
        // @ts-ignore - We know it's an object in this case
        const geofenceObject:any = location.geofenceId;
        const actualId = geofenceObject._id;
        const actualName = geofenceObject.name;
        
        console.log('Extracted geofence info:', { id: actualId, name: actualName });
        
        // Update the location with the correct geozone name and ID
        onChange({
          ...location,
          name: actualName, // Use the name from the geofence object
          geofenceId: actualId, // Use just the ID string
          isGeofenceEnabled: true
        });
      }
      // If we have a location with geofenceId as string but no matching geozone name
      else if (location.geofenceId && typeof location.geofenceId === 'string' && location.isGeofenceEnabled) {
        const matchingGeozone:any = loadedGeozones.find(g => g._id === location.geofenceId);
        console.log('Matching geozone:', matchingGeozone);
        
        if (matchingGeozone) {
          // Update the location with the correct geozone name
          onChange({
            ...location,
            name: matchingGeozone.name,
            lat: matchingGeozone.geoCodeData.geometry.coordinates[0] || location.lat,
            lng: matchingGeozone.geoCodeData.geometry.coordinates[1] || location.lng,
            isGeofenceEnabled: true,
            geoCodeData: matchingGeozone.geoCodeData
          });
        }
      }
      
      setLoading(false);
    };
    
    loadGeozones();
  }, []);

  // Set geozone mode if the location has a geofenceId
  useEffect(() => {
    if (location.geofenceId || location.isGeofenceEnabled) {
      setIsGeozoneMode(true);
      console.log(`Setting geozone mode for ${id} with geofenceId:`, location.geofenceId);
    }
  }, [location.geofenceId, location.isGeofenceEnabled, id]);

  // Listen for newly created geofences that should be selected
  useEffect(() => {
    const handleGeofenceCreated = (event: CustomEvent) => {
      const { locationType, geofenceId } = event.detail;
      const selectorType = id.replace("-input", "");
      
      // Check if this event is for our location type
      if (selectorType === locationType || 
          (locationType.startsWith('waypoint-') && selectorType.startsWith('waypoint-'))) {
        console.log(`Geofence created event received for ${locationType}, this selector is ${selectorType}`);
        
        // Reload the geozones list
        const updateGeozones = async () => {
          setLoading(true);
          await locationService.initialize(true); // Force refresh
          const refreshedGeozones = locationService.getGeozones();
          setGeozones(refreshedGeozones);
          
          // Find the newly created geofence
          const newGeozone = refreshedGeozones.find(g => g._id === geofenceId);
          if (newGeozone) {
            console.log('Found newly created geozone:', newGeozone);
            // Switch to geozone mode
            setIsGeozoneMode(true);
          }
          
          setLoading(false);
        };
        
        updateGeozones();
      }
    };
    
    // Add event listener
    document.addEventListener('geofence-created', handleGeofenceCreated as EventListener);
    
    // Cleanup
    return () => {
      document.removeEventListener('geofence-created', handleGeofenceCreated as EventListener);
    };
  }, [id]);

  // Get the actual geofence ID value regardless of whether it's an object or string
  const getGeofenceId = () => {
    if (!location.geofenceId) return '';
    if (typeof location.geofenceId === 'object') {
      // @ts-ignore - We're handling the case where it might be an object
      return location.geofenceId._id || '';
    }
    return location.geofenceId as string;
  };

  // Toggle between geozone and search input
  const toggleMode = () => {
    const newMode = !isGeozoneMode;
    setIsGeozoneMode(newMode);
    
    // Reset location data if turning off geozone mode
    if (!newMode && location.isGeofenceEnabled) {
      onChange({
        ...location,
        isGeofenceEnabled: false,
        geofenceId: undefined,
        geoCodeData: undefined
      });
    }
  };

  // Handle geozone selection
  const handleGeozoneSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const geofenceId = e.target.value;
    console.log(`Selected geofenceId: ${geofenceId}`);
    
    if (!geofenceId) {
      // Reset if no geozone selected
      onChange({
        name: '',
        lat: 0,
        lng: 0,
        isGeofenceEnabled: false
      });
      return;
    }
    
    const geozone = locationService.getGeozoneById(geofenceId);
    console.log('Selected geozone:', geozone);
    
    if (geozone) {
      // Convert geozone to location - ensure we're using the geozone name
      const newLocation = locationService.createLocationFromGeozone(geozone);
      console.log('Created location from geozone:', newLocation);
      onChange(newLocation);
      
      // Dispatch a custom event for the geozone selection
      const geozoneSelectedEvent = new CustomEvent("geozone-selected", {
        detail: {
          locationType: id.replace("-input", ""),
          location: newLocation
        }
      });
      document.dispatchEvent(geozoneSelectedEvent);
    }
  };

  // Handle regular input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...location,
      name: e.target.value,
      isGeofenceEnabled: false,
      geofenceId: undefined,
      geoCodeData: undefined
    });
  };

  // Get the current geofence ID to use in the select element
  const currentGeofenceId = getGeofenceId();

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={id} className="block font-medium text-gray-700">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
        
        <button 
          type="button"
          onClick={toggleMode}
          className="text-xs flex items-center text-blue-500 hover:text-blue-700"
        >
          <FaExchangeAlt className="mr-1" /> 
          {isGeozoneMode ? 'Switch to Search' : 'Switch to Geozone'}
        </button>
      </div>
      
      <div className="relative">
        {isGeozoneMode ? (
          <select
            id={id}
            value={currentGeofenceId}
            onChange={handleGeozoneSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">Select a geozone</option>
            {geozones.map(geozone => (
              <option 
                key={geozone._id} 
                value={geozone._id}
              >
                {geozone.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            type="text"
            value={location.name || ''}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>
    </div>
  );
};

export default GeozoneSelector;