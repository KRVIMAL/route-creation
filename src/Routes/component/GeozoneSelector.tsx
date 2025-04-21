// GeozoneSelector.tsx
import React, { useEffect, useState } from "react";
import { FaExchangeAlt } from "react-icons/fa";
import { Location } from "../types";
import LocationSelectorService, {
  GeozoneData,
} from "../services/LocationSelectorService";

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
  className = "",
}) => {
  const [isGeozoneMode, setIsGeozoneMode] = useState<boolean>(
    location.isGeofenceEnabled || false
  );
  const [geozones, setGeozones] = useState<GeozoneData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const locationService = LocationSelectorService.getInstance();

  // Debug: Log initial props
  console.log(`GeozoneSelector ${id} initial props:`, {
    name: location.name,
    isGeofenceEnabled: location.isGeofenceEnabled,
    geofenceId: location.geofenceId,
  });

  // Helper function to ensure correct geofence selection
  const ensureCorrectGeofenceSelection = async (forceRefresh = false) => {
    // Don't do anything if not in geozone mode or if no geofenceId
    if (!isGeozoneMode || !location.geofenceId) return;

    // First check if we can find the geofence in our current list
    const geofenceId = getGeofenceId();
    const existingGeozone = geozones.find((g) => g._id === geofenceId);

    // If we found it or we're currently loading, nothing more to do
    if (existingGeozone || loading) return;

    // Otherwise reload the geozones
    setLoading(true);
    await locationService.initialize(forceRefresh);
    const refreshedGeozones = locationService.getGeozones();
    setGeozones(refreshedGeozones);
    setLoading(false);

    // Log the result
    const found = refreshedGeozones.find((g) => g._id === geofenceId);
    console.log(
      `GeozoneSelector ${id}: After refresh, geozone found:`,
      !!found
    );
  };

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
      if (
        location.geofenceId &&
        typeof location.geofenceId === "object" &&
        location.isGeofenceEnabled
      ) {
        // @ts-ignore - We know it's an object in this case
        const geofenceObject: any = location.geofenceId;
        const actualId = geofenceObject._id;
        const actualName = geofenceObject.name;

        console.log("Extracted geofence info:", {
          id: actualId,
          name: actualName,
        });

        // Update the location with the correct geozone name and ID
        onChange({
          ...location,
          name: actualName, // Use the name from the geofence object
          geofenceId: actualId, // Use just the ID string
          isGeofenceEnabled: true,
        });
      }
      // If we have a location with geofenceId as string but no matching geozone name
      else if (
        location.geofenceId &&
        typeof location.geofenceId === "string" &&
        location.isGeofenceEnabled
      ) {
        const matchingGeozone: any = loadedGeozones.find(
          (g) => g._id === location.geofenceId
        );
        console.log("Matching geozone:", matchingGeozone);

        if (matchingGeozone) {
          // Update the location with the correct geozone name
          onChange({
            ...location,
            name: matchingGeozone.name,
            lat:
              matchingGeozone.geoCodeData.geometry.coordinates[0] ||
              location.lat,
            lng:
              matchingGeozone.geoCodeData.geometry.coordinates[1] ||
              location.lng,
            isGeofenceEnabled: true,
            geoCodeData: matchingGeozone.geoCodeData,
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
      console.log(
        `Setting geozone mode for ${id} with geofenceId:`,
        location.geofenceId
      );

      // Ensure the correct geofence is selected
      ensureCorrectGeofenceSelection();
    }
  }, [location.geofenceId, location.isGeofenceEnabled, id]);

  // Update the geofence-created event handler
  useEffect(() => {
    const handleGeofenceCreated = (event: CustomEvent) => {
      const { locationType, geofenceId, geofenceName } = event.detail;
      const selectorType = id.replace("-input", "");

      // Log all events to trace the flow
      console.log(
        `GeozoneSelector ${id} received geofence-created event for ${locationType}`
      );

      // Check if this event is for our location type with more precise matching
      const isSameWaypoint =
        locationType.startsWith("waypoint-") &&
        selectorType.startsWith("waypoint-") &&
        locationType.split("-")[1] === selectorType.split("-")[1];

      const isForThisSelector = selectorType === locationType || isSameWaypoint;

      // If this event is for us or if we need to refresh all selectors
      if (isForThisSelector) {
        console.log(
          `GeozoneSelector ${id}: Handling geofence created event, forcing refresh`
        );

        // Force immediate reload of geozones
        const updateGeozone = async () => {
          setLoading(true);

          // Force refresh the geozones list
          await locationService.initialize(true);
          const refreshedGeozones = locationService.getGeozones();
          setGeozones(refreshedGeozones);

          // Find the new geofence in the list
          const newGeozone = refreshedGeozones.find(
            (g) => g._id === geofenceId
          );
          if (newGeozone) {
            console.log(
              `GeozoneSelector ${id}: Found newly created geofence:`,
              newGeozone.name
            );
          } else {
            console.warn(
              `GeozoneSelector ${id}: Could not find newly created geofence with ID:`,
              geofenceId
            );
          }

          // Ensure we're in geozone mode if this event is for us
          if (isForThisSelector) {
            setIsGeozoneMode(true);
          }

          setLoading(false);
        };

        updateGeozone();
      }
    };

    // Add event listener
    document.addEventListener(
      "geofence-created",
      handleGeofenceCreated as EventListener
    );

    // Cleanup
    return () => {
      document.removeEventListener(
        "geofence-created",
        handleGeofenceCreated as EventListener
      );
    };
  }, [id]);

  // Watch for changes to location.geofenceId
  useEffect(() => {
    // Trigger whenever the geofenceId or isGeofenceEnabled changes
    if (location.geofenceId && location.isGeofenceEnabled) {
      console.log(
        `GeozoneSelector ${id}: geofenceId changed to:`,
        location.geofenceId
      );

      // Ensure we're in geozone mode
      setIsGeozoneMode(true);

      // Find the matching geozone in our current list
      const matchingGeozone = geozones.find((g) => g._id === getGeofenceId());

      // If we can't find it in our current list, reload the geozones
      if (!matchingGeozone && !loading) {
        const reloadGeozones = async () => {
          setLoading(true);
          await locationService.initialize(true);
          const refreshedGeozones = locationService.getGeozones();
          setGeozones(refreshedGeozones);
          setLoading(false);
        };

        reloadGeozones();
      }
    }
  }, [location.geofenceId, location.isGeofenceEnabled, id]);

  // Get the actual geofence ID value regardless of whether it's an object or string
  const getGeofenceId = () => {
    if (!location.geofenceId) return "";

    // If it's an object with _id
    if (
      typeof location.geofenceId === "object" &&
      location.geofenceId !== null
    ) {
      // @ts-ignore - We're handling the case where it might be an object
      const id = location.geofenceId._id || "";
      return id;
    }

    // If it's a string
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
        geoCodeData: undefined,
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
        name: "",
        lat: 0,
        lng: 0,
        isGeofenceEnabled: false,
      });
      return;
    }

    const geozone = locationService.getGeozoneById(geofenceId);
    console.log("Selected geozone:", geozone);

    if (geozone) {
      // Convert geozone to location - ensure we're using the geozone name
      const newLocation = locationService.createLocationFromGeozone(geozone);
      console.log("Created location from geozone:", newLocation);
      onChange(newLocation);

      // Dispatch a custom event for the geozone selection
      const geozoneSelectedEvent = new CustomEvent("geozone-selected", {
        detail: {
          locationType: id.replace("-input", ""),
          location: newLocation,
        },
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
      geoCodeData: undefined,
    });
  };

  // Get the current geofence ID to use in the select element
  const currentGeofenceId = getGeofenceId();

  // Log what we're trying to render
  console.log(`GeozoneSelector ${id} rendering:`, {
    isGeozoneMode,
    currentGeofenceId,
    locationName: location.name,
    isGeofenceEnabled: location.isGeofenceEnabled,
  });

  // Ensure we're in the right mode
  useEffect(() => {
    if (location.isGeofenceEnabled && !isGeozoneMode) {
      setIsGeozoneMode(true);
    }
  }, [location.isGeofenceEnabled]);

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
          {isGeozoneMode ? "Switch to Search" : "Switch to Geozone"}
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
            {geozones.map((geozone) => (
              <option key={geozone._id} value={geozone._id}>
                {geozone.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            type="text"
            value={location.name || ""}
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
