// LocationSelectionModal.tsx
import React from 'react';
import { Coordinates } from '../types';

interface LocationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseGeofence: () => void;
  onUseRegular: () => void;
  locationName: string;
  coordinates: Coordinates;
}

const LocationSelectionModal: React.FC<LocationSelectionModalProps> = ({
  isOpen,
  onClose,
  onUseGeofence,
  onUseRegular,
  locationName,
  coordinates
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className="bg-white rounded-lg p-6 w-96 relative z-10">
        <h3 className="text-xl font-semibold mb-4">Location Selected</h3>
        
        <div className="mb-4">
          <p className="text-gray-700">
            <strong>Location:</strong> {locationName}
          </p>
          <p className="text-gray-700 text-sm">
            <strong>Coordinates:</strong> {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
          </p>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-700 font-medium mb-2">Do you want to use this location as geofence?</p>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onUseRegular}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            No, use as regular location
          </button>
          <button
            onClick={onUseGeofence}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Yes, create geofence
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectionModal;