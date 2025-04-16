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

  // Initialize and load geozones
  useEffect(() => {
    const loadGeozones = async () => {
      setLoading(true);
      await locationService.initialize();
      setGeozones(locationService.getGeozones());
      setLoading(false);
    };
    
    loadGeozones();
  }, []);

  // Toggle between geozone and search input
  const toggleMode = () => {
    const newMode = !isGeozoneMode;
    setIsGeozoneMode(newMode);
    
    // Reset location data if turning off geozone mode
    if (!newMode && location.isGeofenceEnabled) {
      onChange({
        ...location,
        isGeofenceEnabled: false,
        geozoneId: undefined,
        geoCodeData: undefined
      });
    }
  };

  // Handle geozone selection
  const handleGeozoneSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const geozoneId = e.target.value;
    
    if (!geozoneId) {
      // Reset if no geozone selected
      onChange({
        name: '',
        lat: 0,
        lng: 0,
        isGeofenceEnabled: false
      });
      return;
    }
    
    const geozone = locationService.getGeozoneById(geozoneId);
    if (geozone) {
      // Convert geozone to location
      const newLocation = locationService.createLocationFromGeozone(geozone);
      onChange(newLocation);
    }
  };

  // Handle regular input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...location,
      name: e.target.value,
      isGeofenceEnabled: false,
      geozoneId: undefined,
      geoCodeData: undefined
    });
  };

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
            value={location.geozoneId || ''}
            onChange={handleGeozoneSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">Select a geozone</option>
            {geozones.map(geozone => (
              <option key={geozone._id} value={geozone._id}>
                {geozone.name} {geozone.finalAddress && `(${geozone.finalAddress})`}
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