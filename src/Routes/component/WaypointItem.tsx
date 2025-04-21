// WaypointItem.tsx - Updated for marker display
import React, { useEffect, useRef } from "react";
import { FaTimes, FaGripVertical } from "react-icons/fa";
import { useDrag, useDrop } from "react-dnd";
import { Location } from "../types";
import GeozoneSelector from "./GeozoneSelector";

// Define the item type as a string constant
export const WAYPOINT_TYPE = "waypoint";

// Draggable waypoint component
interface WaypointItemProps {
  waypoint: Location;
  index: number;
  moveWaypoint: (dragIndex: number, hoverIndex: number) => void;
  onChange: (location: Location) => void;
  onRemove: () => void;
}

const WaypointItem = ({
  waypoint,
  index,
  moveWaypoint,
  onChange,
  onRemove,
}: WaypointItemProps) => {
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
  
  // Handle waypoint changes
  const handleWaypointChange = (location: Location) => {
    onChange(location);
    
    // Dispatch a custom event when location selected manually (not via autocomplete)
    if (location.lat && location.lng) {
      const locationType = `waypoint-${index}`;
      
      const waypointChangedEvent = new CustomEvent("location-selected", {
        detail: {
          locationType,
          location
        }
      });
      
      document.dispatchEvent(waypointChangedEvent);
    }
  };
  
  return (
    <div
      ref={ref}
      className={`flex items-start mb-4 relative ${isDragging ? "opacity-50 border border-dashed border-blue-500 bg-blue-50" : "opacity-100"}`}
      style={{
        cursor: "move",
      }}
    >
      <div className="flex items-center p-2 text-gray-500">
        <FaGripVertical />
      </div>
      <div className="w-6 h-6 rounded-full bg-yellow-500 flex-shrink-0 mt-7 z-10"></div>
      <div className="ml-2 w-full">
        <GeozoneSelector
          id={`waypoint-input-${index}`}
          label="Via Destination"
          location={waypoint}
          onChange={handleWaypointChange}
          placeholder="Enter waypoint location"
        />
        <button
          className="absolute right-2 top-12 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600"
          onClick={onRemove}
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

export default WaypointItem;