// WaypointItem.tsx
import React, { useRef } from "react";
import { FaTimes, FaGripVertical } from "react-icons/fa";
import { useDrag, useDrop } from "react-dnd";
import { Location } from "../types";

// Define the item type as a string constant
export const WAYPOINT_TYPE = "waypoint";

// Draggable waypoint component
interface WaypointItemProps {
  waypoint: Location;
  index: number;
  moveWaypoint: (dragIndex: number, hoverIndex: number) => void;
  onChange: (value: string) => void;
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
        <label htmlFor={`waypoint-input-${index}`} className="block mb-1 font-medium text-gray-700">
          Via Destination
        </label>
        <div className="relative">
          <input
            id={`waypoint-input-${index}`}
            type="text"
            value={waypoint.name}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter waypoint location"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            className="absolute right-10 top-2.5 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600"
            onClick={onRemove}
          >
            <FaTimes />
          </button>
          <div className="absolute right-2 top-2.5">
            <input type="checkbox" id={`waypoint-fence-${index}`} className="hidden" />
            <label 
              htmlFor={`waypoint-fence-${index}`}
              className="block w-6 h-6 bg-gray-200 rounded cursor-pointer relative checked:bg-green-500"
            ></label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaypointItem;