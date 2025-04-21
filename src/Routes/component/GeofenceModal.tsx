// GeofenceModal.tsx
import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { Coordinates } from "../types";

interface GeofenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (geofenceData: any) => void;
  onShapeTypeChange?: (shapeType: string) => void;
  onRadiusChange?: (radius: number) => void
  initialCoordinates: Coordinates;
  currentAddress?: string;
}

const GeofenceModal: React.FC<GeofenceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onShapeTypeChange = () => {},
  initialCoordinates,
  currentAddress = "",
  onRadiusChange,
}) => {
  const [geofenceData, setGeofenceData] = useState({
    name: "",
    isPublic: true,
    isPrivate: false,
    mobileNumber: "",
    radius: 100,
    shapeType: "Circle",
    coordinates: [initialCoordinates.lat, initialCoordinates.lng],
  });

  const [addressData, setAddressData] = useState({
    zipCode: "",
    country: "",
    state: "",
    area: "",
    city: "",
    district: "",
  });

  const [finalAddress, setFinalAddress] = useState(currentAddress);

  // Reset form when modal opens with new coordinates
  useEffect(() => {
    if (isOpen) {
      setGeofenceData((prev) => ({
        ...prev,
        coordinates: [initialCoordinates.lat, initialCoordinates.lng],
      }));

      // If we have an address, try to extract components
      if (currentAddress) {
        setFinalAddress(currentAddress);
        extractAddressComponents(currentAddress);
      }
    }
  }, [isOpen, initialCoordinates, currentAddress]);

  // Extract address components from formatted address
  const extractAddressComponents = (address: string) => {
    const parts = address.split(",").map((part) => part.trim());
    const addressObj = { ...addressData };

    // Example logic - will need to be adjusted based on actual address format
    if (parts.length > 0) {
      // Try to extract zip code from the last part (which often contains postal code)
      const zipMatch = parts[parts.length - 1].match(/\d{5,6}/);
      if (zipMatch) {
        addressObj.zipCode = zipMatch[0];
      }

      // The country is often the last meaningful part
      if (parts.length > 1) {
        addressObj.country = parts[parts.length - 1].replace(/\d+/, "").trim();
      }

      // The state/province is often the second-to-last part
      if (parts.length > 2) {
        addressObj.state = parts[parts.length - 2];
      }

      // The city is often the third-to-last part
      if (parts.length > 3) {
        addressObj.city = parts[parts.length - 3];
      }

      // Area and district might be earlier parts
      if (parts.length > 4) {
        addressObj.district = parts[parts.length - 4];
      }

      if (parts.length > 5) {
        addressObj.area = parts[parts.length - 5];
      }
    }

    setAddressData(addressObj);
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRadius = parseFloat(e.target.value);

    // Update local state
    setGeofenceData((prev) => ({
      ...prev,
      radius: newRadius,
    }));

    // Directly notify the parent component about the radius change
    // This is critical - we need to pass the updated radius immediately
    if (onRadiusChange) {
      onRadiusChange(newRadius);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "radio") {
      if (name === "visibility") {
        setGeofenceData({
          ...geofenceData,
          isPublic: value === "public",
          isPrivate: value === "private",
        });
      }
    } else {
      setGeofenceData({
        ...geofenceData,
        [name]: type === "number" ? parseFloat(value) : value,
      });

      // If shape type changed, notify parent
      if (name === "shapeType") {
        onShapeTypeChange(value);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Get user ID from local storage
    const userId = localStorage.getItem("userId") || "";
    const userEmail = localStorage.getItem("userEmail") || "";

    // Prepare payload
    const payload = {
      userId: "67cea10c4858dd0fc1e444e2",
      userEmail,
      name: geofenceData.name,
      mobileNumber: geofenceData.mobileNumber,
      address: addressData,
      finalAddress,
      geoCodeData: {
        type: "Feature",
        geometry: {
          type: geofenceData.shapeType,
          coordinates: geofenceData.coordinates,
          radius: geofenceData.radius,
        },
      },
      isPublic: geofenceData.isPublic,
      isPrivate: geofenceData.isPrivate,
      createdBy: localStorage.getItem("userName") || "admin",
    };

    onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg z-50 overflow-y-auto">
      <div className="p-5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Create Geofence</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={geofenceData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Shape Type */}
          <div className="mb-4">
            <label
              htmlFor="shapeType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Shape Type *
            </label>
            <select
              id="shapeType"
              name="shapeType"
              value={geofenceData.shapeType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Circle">Circle</option>
              <option value="Polygon">Polygon</option>
            </select>
          </div>

          {/* Visibility Settings */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visibility Settings *
            </label>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  id="visibility-public"
                  name="visibility"
                  type="radio"
                  value="public"
                  checked={geofenceData.isPublic}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="visibility-public"
                  className="ml-2 text-sm text-gray-700"
                >
                  Public
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="visibility-private"
                  name="visibility"
                  type="radio"
                  value="private"
                  checked={geofenceData.isPrivate}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="visibility-private"
                  className="ml-2 text-sm text-gray-700"
                >
                  Private
                </label>
              </div>
            </div>
          </div>

          {/* Mobile Number */}
          <div className="mb-4">
            <label
              htmlFor="mobileNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Mobile Number
            </label>
            <input
              id="mobileNumber"
              name="mobileNumber"
              type="text"
              value={geofenceData.mobileNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Radius (Only for Circle) */}
          {geofenceData.shapeType === "Circle" && (
            <div className="mb-4">
              <label
                htmlFor="radius"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Radius (meters) *
              </label>
              <input
                id="radius"
                name="radius"
                type="number"
                min="10"
                max="10000"
                value={geofenceData.radius}
                onChange={handleRadiusChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          {/* Coordinates */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coordinates
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="lat" className="block text-xs text-gray-500">
                  Latitude
                </label>
                <input
                  id="lat"
                  type="text"
                  value={geofenceData.coordinates[0]}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="lng" className="block text-xs text-gray-500">
                  Longitude
                </label>
                <input
                  id="lng"
                  type="text"
                  value={geofenceData.coordinates[1]}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={finalAddress}
              readOnly
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md h-20 resize-none"
            />
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Create Geofence
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeofenceModal;
