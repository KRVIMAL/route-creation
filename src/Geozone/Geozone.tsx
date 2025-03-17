import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader/dist/index.mjs";

import {
  createGeozone,
  fetchGeozoneHandler,
  updateGeozone,
  deleteGeozone,
  getAddressDetailsByPincode,
  searchUsers,
} from "./services/geozone.service";

import { geoZoneInsertField } from "./Geozone.helper";
import { MapIcon, PencilIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon, CircleIcon, SquareIcon, LineChartIcon as LineIcon, PinIcon } from 'lucide-react';
import CreateGeoZoneModal from "./component/CreateGeoZone.Modal";

// Define types
interface GeoZone {
  _id: string;
  name: string;
  userId: string; // Changed from client to userId
  userEmail: string; // Added userEmail
  mobileNumber: string;
  address: {
    zipCode: string;
    country: string;
    state: string;
    area: string;
    city: string;
    district: string;
  };
  finalAddress: string;
  geoCodeData: {
    type: string;
    geometry: {
      type: string;
      coordinates: number[];
      radius?: number;
    };
  };
  createdBy: string;
  locationId?: string;
}

interface User {
  _id: string;
  fullName: string;
  email: string;
  roleType: string;
}

interface FormField {
  value: string;
  error: string;
}

interface FormFields {
  [key: string]: FormField;
}

const Geozone = () => {
  // State variables
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawingManager, setDrawingManager] =
    useState<google.maps.drawing.DrawingManager | null>(null);
  const [selectedShape, setSelectedShape] = useState<any>(null);
  const [selectedRowData, setSelectedRowData] = useState<GeoZone | null>(null);
  const [isOpen, setOpenModal] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number>(0);
  const [geozoneData, setGeozoneData] = useState<GeoZone[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]); // Changed from client to users
  const [edit, setEdit] = useState<boolean>(false);
  const [formField, setFormField] = useState<FormFields>(geoZoneInsertField());
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(
    null
  );
  const [shapes, setShapes] = useState<any[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const autocompleteInstance = useRef<any>(null);
  const [google, setGoogle] = useState<any>(null);

  useEffect(() => {
    const loadGoogleMaps = async () => {
      const loader = new Loader({
        apiKey: "AIzaSyAaZ1M_ofwVoLohowruNhY0fyihH9NpcI0",
        version: "weekly",
        libraries: ["places", "drawing", "geometry"],
      });

      try {
        const googleMaps = await loader.load();
        setGoogle(googleMaps); // Store Google Maps instance in state
        console.log("Google Maps loaded successfully");
      } catch (err) {
        console.error("Error loading Google Maps:", err);
      }
    };

    loadGoogleMaps();
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!google) return; 
      if (mapRef?.current) {
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: 28.7041, lng: 77.1025 }, // Default to Delhi, India
          zoom: 12,
          mapTypeId: google.maps?.MapTypeId?.ROADMAP,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });

        setMap(mapInstance);

        // Initialize Drawing Manager with all options
        const drawingManagerInstance = new google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: true,
          drawingControlOptions: {
            position: google.maps.ControlPosition?.TOP_CENTER,
            drawingModes: [
              google?.maps?.drawing?.OverlayType?.MARKER,
              google?.maps?.drawing?.OverlayType?.CIRCLE,
              google?.maps?.drawing?.OverlayType?.POLYGON,
              google?.maps?.drawing?.OverlayType?.POLYLINE,
              google?.maps?.drawing?.OverlayType?.RECTANGLE,
            ],
          },
          markerOptions: { draggable: true },
          circleOptions: {
            fillColor: "#4285F4",
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: "#4285F4",
            clickable: true,
            editable: true,
            draggable: true,
            zIndex: 1,
          },
          polygonOptions: {
            fillColor: "#4285F4",
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: "#4285F4",
            clickable: true,
            editable: true,
            draggable: true,
            zIndex: 1,
          },
          polylineOptions: {
            strokeColor: "#4285F4",
            strokeWeight: 2,
            clickable: true,
            editable: true,
            draggable: true,
            zIndex: 1,
          },
        });

        drawingManagerInstance?.setMap(mapInstance);
        setDrawingManager(drawingManagerInstance);

        // Setup autocomplete for location search
        if (autocompleteRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(
            autocompleteRef?.current,
            {
              types: ["geocode"],
              componentRestrictions: { country: "in" },
            }
          );

          autocomplete?.addListener("place_changed", () => {
            const place = autocomplete?.getPlace();
            if (place?.geometry && place?.geometry?.location) {
              mapInstance?.setCenter(place?.geometry?.location);
              mapInstance?.setZoom(15);

              // Create a marker for the selected place
              const marker = new google.maps.marker({
                position: place?.geometry?.location,
                map: mapInstance,
                title: place?.name,
              });
              console.log({marker})
              // Open the create geozone modal with the selected place data
              handlePlaceSelection(place, marker);
            }
          });

          autocompleteInstance.current = autocomplete;
        }

        // Setup event listeners for drawing completion
        if (google.maps.event) {
          google.maps.event.addListener(
            drawingManagerInstance,
            "overlaycomplete",
            (event: any) => {
              // Switch off drawing mode
              drawingManagerInstance.setDrawingMode(null);
              setActiveDrawingTool(null);

              const newShape = event.overlay;
              newShape.type = event.type;

              // Add event listeners to the shape
              google.maps.event.addListener(newShape, "click", () => {
                setSelectedShape(newShape);
              });

              setSelectedShape(newShape);
              setShapes([...shapes, newShape]);

              // Open modal with shape data
              handleShapeCreated(newShape, event.type);
            }
          );
        }
      }
    };

    if (google) {
      initMap();
    }
  }, [google]); // Depend on google state

  // Fetch geozones and users on component mount
  useEffect(() => {
    fetchGeozone();
    fetchUsers();
  }, [page, limit]);

  // Display geozones on map when data changes
  useEffect(() => {
    if (map && geozoneData?.length > 0) {
      console.log("map");
      displayGeozonesOnMap();
    }
  }, [map, geozoneData]);

  // Add this useEffect after the other useEffects
  useEffect(() => {
    // Ensure the map container has proper dimensions
    if (mapRef.current) {
      mapRef.current.style.height = "100%";
      mapRef.current.style.width = "100%";
    }

    // Trigger resize event to force map redraw if it exists
    if (map) {
      window.google?.maps.event.trigger(map, "resize");
    }
  }, [map]);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await searchUsers();
      if (res && res.data) {
        setUsers(res.data);
      }
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      setUsers([]);
      setLoading(false);
    }
  };

  // Handle shape creation and open modal with shape data
  const handleShapeCreated = (shape: any, type: string) => {
    if (!google) return;
    console.log({ shape: shape, type: type });
  
    let coordinates: number[] = [];
    let radius = 0;
    let shapeType = "";
  
    if (type === google.maps.drawing.OverlayType.MARKER) {
      console.log({ types: type });
      const position = shape.getPosition();
      if (!position) return;
  
      console.log({ position });
      console.log(position.lat(), "lat");
      
      coordinates = [position.lat(), position.lng()];
      shapeType = "Point";
      radius = 0;
    } else if (type === google.maps.drawing.OverlayType.CIRCLE) {
      console.log({ cicletype: type });
      const center = shape.getCenter();
      if (!center) return;
  
      console.log({ center });
      coordinates = [center.lat(), center.lng()];
      radius = shape.getRadius();
      shapeType = "Circle";
    } else if (type === google.maps.drawing.OverlayType.POLYGON) {
      const path = shape.getPath();
      coordinates = path.getArray().map((latLng: any) => [latLng.lat(), latLng.lng()]);
      shapeType = "Polygon";
      radius = 0;
    } else if (type === google.maps.drawing.OverlayType.POLYLINE) {
      const path = shape.getPath();
      coordinates = path.getArray().map((latLng: any) => [latLng.lat(), latLng.lng()]);
      shapeType = "Polyline";
      radius = 0;
    } else if (type === google.maps.drawing.OverlayType.RECTANGLE) {
      const bounds = shape?.getBounds();
      if (!bounds) return;
  
      const ne: any = bounds.getNorthEast();
      const sw: any = bounds.getSouthWest();
      coordinates = [
        [ne.lat(), ne.lng()],
        [sw.lat(), sw.lng()],
      ];
      shapeType = "Rectangle";
      radius = 0;
    }
  
    if (coordinates.length > 0) {
      console.log(coordinates[0], "latitude");
      console.log(coordinates[1], "longitude");
  
      // Ensure the coordinates update the formField state
      setFormField((prevState) => ({
        ...prevState,
        type: { value: shapeType, error: "" },
        lat: { value: coordinates[0].toString(), error: "" },
        long: { value: coordinates[1]?.toString() || "", error: "" },
        radius: { value: radius.toString(), error: "" },
      }));
    }
  
    // Reverse geocode to get address
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { location: { lat: coordinates[0], lng: coordinates[1] } },
      (results: any, status: any) => {
        if (status === "OK" && results && results[0]) {
          const addressComponents = results[0].address_components;
          let zipCode = "";
          let country = "";
          let state = "";
          let city = "";
          let district = "";
          let area = "";
  
          for (const component of addressComponents) {
            const types = component.types;
            if (types.includes("al_code")) {
              zipCode = component.long_name;
            } else if (types.includes("country")) {
              country = component.long_name;
            } else if (types.includes("administrative_area_level_1")) {
              state = component.long_name;
            } else if (types.includes("locality")) {
              city = component.long_name;
            } else if (types.includes("sublocality_level_1")) {
              district = component.long_name;
            } else if (types.includes("sublocality_level_2")) {
              area = component.long_name;
            }
          }
  
          const address = results[0].formatted_address;
          console.log({formFieldreverse:formField})
          setFormField((prevState) => ({
            ...prevState,
            zipCode: { value: zipCode, error: "" },
            country: { value: country, error: "" },
            state: { value: state, error: "" },
            city: { value: city, error: "" },
            district: { value: district, error: "" },
            area: { value: area, error: "" },
            address: { value: address, error: "" },
          }));
  
          // If we have a zip code, fetch additional details
          // if (zipCode) {
          //   fetchZipCodeDetails(zipCode);
          // }
        }
      }
    );
  
    setSelectedShape(shape);
    setOpenModal(true);
  };
  
  console.log({ formField });
  // Fetch zip code details
  const fetchZipCodeDetails = async (zipCode: string) => {
    try {
      const data = await getAddressDetailsByPincode(zipCode);
      if (data && data.length > 0) {
        const item = data[0];
        console.log({formFieldsss:formField})
        setFormField({
          ...formField,
          country: { ...formField.country, value: item.Country, error: "" },
          state: { ...formField.state, value: item.State, error: "" },
          area: { ...formField.area, value: item.Name, error: "" },
          district: { ...formField.district, value: item.District, error: "" },
          city: { ...formField.city, value: item.Block, error: "" },
          address: {
            ...formField.address,
            value: `${item.Country} - ${item.State} - ${item.Name} - ${item.District} - ${item.Block}`,
            error: "",
          },
        });
      }
    } catch (error) {
      console.error("Error fetching zip code details:", error);
    }
  };

  // Display geozones on map
  const displayGeozonesOnMap = () => {
    if (!map || !google) return;

    // Clear existing shapes
    shapes?.forEach((shape: any) => {
      shape?.setMap(null);
    });
    setShapes([]);

    // Add geozones to map
    const newShapes = geozoneData
      ?.map((geozone: any) => {
        const { geoCodeData } = geozone;
        const { geometry } = geoCodeData;
        const { type, coordinates, radius } = geometry;
        console.log({ type }, { coordinates }, { radius }, { geometry });
        let shape: any;

        switch (type) {
          // case "Point":
          //   shape = new google.maps.marker({
          //     position: { lat: coordinates[0], lng: coordinates[1] },
          //     map,
          //     title: geozone?.name,
          //   });
          //   console.log({shape},"shapeshape")
          //   break;
          case "Circle":
            shape = new google.maps.Circle({
              center: { lat: coordinates[0], lng: coordinates[1] },
              radius: radius || 100,
              map,
              fillColor: "#4285F4",
              fillOpacity: 0.3,
              strokeWeight: 2,
              strokeColor: "#4285F4",
            });
            break;
          case "Polygon":
            shape = new google.maps.Polygon({
              paths: coordinates?.map((coord: number[]) => ({
                lat: coord[0],
                lng: coord[1],
              })),
              map,
              fillColor: "#4285F4",
              fillOpacity: 0.3,
              strokeWeight: 2,
              strokeColor: "#4285F4",
            });
            break;
          case "Polyline":
            shape = new google.maps.Polyline({
              path: coordinates?.map((coord: number[]) => ({
                lat: coord[0],
                lng: coord[1],
              })),
              map,
              strokeColor: "#4285F4",
              strokeWeight: 2,
            });
            break;
        }

        if (shape) {
          // Add info window
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div>
                <h3>${geozone?.name}</h3>
                <p>${geozone?.finalAddress}</p>
                ${type === "Circle" ? `<p>Radius: ${radius} meters</p>` : ""}
              </div>
            `,
          });

          shape?.addListener("click", (e: any) => {
            infoWindow?.setPosition(
              type === "Point" ? shape?.getPosition() : e?.latLng
            );
            infoWindow?.open(map);
          });

          shape.geozoneData = geozone;
        }

        return shape;
      })
      ?.filter(Boolean);

    setShapes(newShapes);
  };

  // Fetch geozones
  const fetchGeozone = async () => {
    try {
      setLoading(true);
      // CHANGED: pass page and limit
      const res = await fetchGeozoneHandler({
        input: {
          page,
          limit,
        },
      });
      setGeozoneData(res?.data?.data);
      console.log({geozoneData:geozoneData})
      setTotal(res?.data?.total || 0); // CHANGED: store total
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching geozones:", error);
      setGeozoneData([]); // Set empty array on error
      setLoading(false);
    }
  };
  
  // Validate form fields
  const validateFields = () => {
    let isValid = true;
    const newFormField = { ...formField };
    console.log({ formField });
    Object.keys(formField).forEach((field) => {
      if (field === "radius" && formField.type.value !== "Circle") {
        return;
      }
      if (!formField[field]?.value && field !== "description") {
        newFormField[field].error = `Please enter ${field}.`;
        isValid = false;
      }
    });
    console.log({ isValid });

    setFormField(newFormField);
    return isValid;
  };

  // Add or update geozone
  const addGeozoneHandler = async () => {
    // if (!validateFields()) {
    //   return;
    // }

    try {
      setLoading(true);

      const shapeType = formField.type.value;
      let coordinates: number[] | number[][] = [];
      let radius: number | undefined;

      if (selectedShape) {
        if (shapeType === "Point") {
          console.log("point");
          console.log({ lat: formField.lat.value });
          console.log({ lng: formField.long.value });
          coordinates = [
            Number.parseFloat(formField.lat.value),
            Number.parseFloat(formField.long.value),
          ];
        } else if (shapeType === "Circle") {
          console.log("circle");
          console.log({ lat: formField.lat.value });
          console.log({ lng: formField.long.value });
          coordinates = [
            Number.parseFloat(formField.lat.value),
            Number.parseFloat(formField.long.value),
          ];
          radius = Number.parseFloat(formField.radius.value);
        } else if (shapeType === "Polygon" || shapeType === "Polyline") {
          const path = selectedShape.getPath();
          coordinates = path
            .getArray()
            .map((latLng: any) => [latLng.lat(), latLng.lng()]);
        } else if (shapeType === "Rectangle") {
          const bounds = selectedShape.getBounds();
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          coordinates = [
            [ne.lat(), ne.lng()],
            [sw.lat(), sw.lng()],
          ];
        }
      }

      const payload = {
        userId: formField.user?.value, // Changed from clientId to userId
        userEmail: formField.userEmail?.value, // Added userEmail
        name: formField.name?.value,
        mobileNumber: formField.mobileNumber?.value,
        address: {
          zipCode: formField.zipCode?.value,
          country: formField.country?.value,
          state: formField.state?.value,
          area: formField.area?.value,
          city: formField.city?.value,
          district: formField.district?.value,
        },
        finalAddress: formField.address?.value,
        geoCodeData: {
          type: "Feature",
          geometry: {
            type: shapeType,
            coordinates: coordinates,
            ...(radius !== undefined && { radius }),
          },
        },
        createdBy: "admin", // Replace with actual user
      };

      if (edit && selectedRowData) {
        const res = await updateGeozone({
          input: {
            _id: selectedRowData._id,
            ...payload,
          },
        });
        console.log("Geozone updated successfully:", res);
        setEdit(false);
      } else {
        const res = await createGeozone({
          input: payload,
        });
        console.log("Geozone created successfully:", res);
      }

      handleCloseDialog();

      // Clear selected shape
      if (selectedShape) {
        selectedShape.setMap(null);
        setSelectedShape(null);
      }

      // Reset form
      setFormField(geoZoneInsertField());

      // Refresh geozones
      await fetchGeozone();

      setLoading(false);
    } catch (error: any) {
      console.error("Error saving geozone:", error);
      setLoading(false);
    }
  };

  // Close modal
  const handleCloseDialog = () => {
    setOpenModal(false);
    if (!edit) {
      setFormField(geoZoneInsertField());
    }
  };

  // Handle drawing tool selection
  const handleDrawingToolClick = (tool: string) => {
    if (!drawingManager || !map || !google) return;

    if (activeDrawingTool === tool) {
      // Turn off drawing mode
      drawingManager.setDrawingMode(null);
      setActiveDrawingTool(null);
    } else {
      // Set drawing mode
      let drawingMode = null;

      switch (tool) {
        case "marker":
          drawingMode = google.maps.drawing.OverlayType.MARKER;
          break;
        case "circle":
          drawingMode = google.maps.drawing.OverlayType.CIRCLE;
          break;
        case "polygon":
          drawingMode = google.maps.drawing.OverlayType.POLYGON;
          break;
        case "polyline":
          drawingMode = google.maps.drawing.OverlayType.POLYLINE;
          break;
        case "rectangle":
          drawingMode = google.maps.drawing.OverlayType.RECTANGLE;
          break;
      }

      drawingManager.setDrawingMode(drawingMode);
      setActiveDrawingTool(tool);
    }
  };

  // Handle edit geozone
  const handleEditGeozone = (geozone: GeoZone) => {
    setSelectedRowData(geozone);
    console.log({users})
    console.log({geozone:geozone.userId})
    // Find the user by userId to populate the user field
    const user = users.find(u => u._id === geozone.userId);
    console.log({users:user})
    // Create a modified geozone object with user information for the form
    const geozoneWithUser = {
      ...geozone,
      user: user?.fullName || "", // Set the user's name for display
      userEmail: geozone.userEmail || (user?.email || ""), // Use the stored email or get from user object
    };
    console.log({geozoneWithUser:geozoneWithUser})
    setFormField(geoZoneInsertField(geozoneWithUser));
    setEdit(true);
    setOpenModal(true);

    // Center map on the geozone
    if (map) {
      const { coordinates } = geozone.geoCodeData.geometry;
      map.setCenter({ lat: coordinates[0], lng: coordinates[1] });
      map.setZoom(15);
    }
  };

  // Handle delete geozone
  const handleDeleteGeozone = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this geozone?")) {
      try {
        setLoading(true);
        await deleteGeozone(id);
        await fetchGeozone();
        setLoading(false);
      } catch (error) {
        console.error("Error deleting geozone:", error);
        setLoading(false);
      }
    }
  };

  // Toggle sidebar
  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  // Add this function to handle place selection
  const handlePlaceSelection = (
    place: google.maps.places.PlaceResult,
    marker: google.maps.marker.AdvancedMarkerElement
  ) => {
    const lat = place.geometry?.location?.lat();
    const lng = place.geometry?.location?.lng();

    if (lat && lng) {
      setFormField({
        ...formField,
        type: { value: "Point", error: "" },
        lat: { value: lat.toString(), error: "" },
        long: { value: lng.toString(), error: "" },
        radius: { value: "0", error: "" },
        address: { value: place.formatted_address || "", error: "" },
        name: { value: place.name || "", error: "" },
      });
      setSelectedShape(marker);
      setOpenModal(true);
    }
  };

  // Handle user selection for the form
  const handleUserChange = (userId: string) => {
    const user = users.find(u => u._id === userId);
    if (user) {
      setFormField({
        ...formField,
        user: { ...formField.user, value: userId, error: "" },
        userEmail: { ...formField.userEmail, value: user.email, error: "" }
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${
          collapsed ? "w-0" : "w-80"
        } transition-all duration-300 ease-in-out overflow-hidden bg-white dark:bg-gray-800 shadow-md`}
      >
        <div className={`p-4 ${collapsed ? "hidden" : "block"}`}>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-l-4 border-indigo-600 pl-2">
              Create Geozone
            </h2>

            <div className="relative mb-4">
              <input
                ref={autocompleteRef}
                type="text"
                placeholder="Search location..."
                className="w-full p-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
              />
              <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => handleDrawingToolClick("marker")}
                className={`p-2 rounded-md ${
                  activeDrawingTool === "marker"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
                title="Add Point"
              >
                <PinIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDrawingToolClick("circle")}
                className={`p-2 rounded-md ${
                  activeDrawingTool === "circle"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
                title="Add Circle"
              >
                <CircleIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDrawingToolClick("polygon")}
                className={`p-2 rounded-md ${
                  activeDrawingTool === "polygon"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
                title="Add Polygon"
              >
                <SquareIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDrawingToolClick("polyline")}
                className={`p-2 rounded-md ${
                  activeDrawingTool === "polyline"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
                title="Add Polyline"
              >
                <LineIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDrawingToolClick("rectangle")}
                className={`p-2 rounded-md ${
                  activeDrawingTool === "rectangle"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
                title="Add Rectangle"
              >
                <SquareIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-l-4 border-indigo-600 pl-2">
              Geozone List
            </h2>

            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search geozone..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full p-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
              />
              <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            {/* list starts */}

            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {geozoneData.map((item:any) => (
                    <li
                      key={item._id}
                      className="p-3 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <MapIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.finalAddress}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditGeozone(item)}
                            className="p-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGeozone(item._id)}
                            className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {/* Replace the existing pagination block with this snippet */}
              <div className="flex justify-between items-center mt-4">
                {/* Limit Selection (unchanged) */}
                <div className="flex items-center">
                  <label
                    htmlFor="limit"
                    className="mr-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Limit:
                  </label>
                  <select
                    id="limit"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="p-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                {/* Page Navigation with numbered buttons + first/last */}
                <div className="flex items-center space-x-1">
                  {/* First Page */}
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  >
                    First
                  </button>

                  {/* Previous Page */}
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>

                  {/* Numbered Page Buttons */}
                  {Array.from(
                    { length: Math.ceil(total / limit) },
                    (_, index) => index + 1
                  ).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md 
            ${
              page === pageNum
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-gray-700 dark:text-white"
            }
          `}
                    >
                      {pageNum}
                    </button>
                  ))}

                  {/* Next Page */}
                  <button
                    disabled={page === Math.ceil(total / limit)}
                    onClick={() => setPage((prev) => prev + 1)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>

                  {/* Last Page */}
                  <button
                    disabled={page === Math.ceil(total / limit)}
                    onClick={() => setPage(Math.ceil(total / limit))}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className="absolute top-4 left-80 z-10 bg-white dark:bg-gray-800 shadow-md rounded-full p-2 transform -translate-x-1/2"
      >
        {collapsed ? (
          <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        ) : (
          <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        )}
      </button>

      {/* Map */}
      <div className="flex-1 relative">
        <div
          ref={mapRef}
          className="absolute inset-0 w-full h-full"
          id="map"
        ></div>
      </div>

      {/* Modal */}
      <CreateGeoZoneModal
        isOpenModal={isOpen}
        handleUpdateDialogClose={handleCloseDialog}
        setFormField={setFormField}
        formField={formField}
        addGeozoneHandler={addGeozoneHandler}
        users={users} // Changed from client to users
        edit={edit}
        handleUserChange={handleUserChange} // Add this prop
      />

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
};

export default Geozone;