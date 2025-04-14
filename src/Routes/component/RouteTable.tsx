import React, { useState } from "react";
import { Route } from "../types";
import {
  FaEdit,
  FaTrashAlt,
  FaMapMarkedAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import ViewRouteModal from "./ViewRouteModal";
import "../../App.css";
interface RouteTableProps {
  routes: Route[];
  onEdit: (route: Route) => void;
  onDelete: (id: string) => void;
  totalCount?: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limit: number;
  loading?: boolean;
  onSearch?: (term: string) => void;
  searchTerm?: string;
}

// Function to truncate text and add ellipsis
const truncateText = (text: string, maxLength: number = 20): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Tooltip component for truncated text
const TruncatedCell: React.FC<{ content: string; maxLength?: number }> = ({ 
  content, 
  maxLength = 20 
}) => {
  if (!content) return <span>-</span>;
  
  const isTruncated = content.length > maxLength;
  const displayText = isTruncated ? truncateText(content, maxLength) : content;
  
  return (
    <span className="truncated-cell" title={isTruncated ? content : ""}>
      {displayText}
    </span>
  );
};

// Component for displaying a list of items with truncation
const TruncatedList: React.FC<{ items: string[]; maxLength?: number }> = ({ 
  items, 
  maxLength = 20 
}) => {
  if (!items || items.length === 0) return <span>-</span>;
  
  const joinedText = items.join(", ");
  const isTruncated = joinedText.length > maxLength;
  const displayText = isTruncated ? truncateText(joinedText, maxLength) : joinedText;
  
  return (
    <span className="truncated-cell" title={isTruncated ? joinedText : ""}>
      {displayText}
    </span>
  );
};

const RouteTable: React.FC<RouteTableProps> = ({
  routes,
  onEdit,
  onDelete,
  totalCount = 0,
  currentPage = 1,
  onPageChange,
  onLimitChange,
  limit = 10,
  loading = false,
  onSearch,
  searchTerm = "",
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [routeToView, setRouteToView] = useState<Route | null>(null);

  const handleDeleteClick = (id: string) => {
    setRouteToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (routeToDelete) {
      onDelete(routeToDelete);
      setShowDeleteModal(false);
      setRouteToDelete(null);
    }
  };

  const handleViewRoute = (route: Route) => {
    setRouteToView(route);
    setShowViewModal(true);
  };

  // Filter routes based on search term (only if not using API pagination)
  const filteredRoutes = routes.filter(
    (route) =>
      searchTerm === "" ||
      route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.origin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.destination.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / limit);

  // Handle pagination
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className="route-table-container">
      <div className="table-header">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search routes..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <div className="table-controls">
          <div className="limit-selector">
            <label htmlFor="limit-select">Show:</label>
            <select
              id="limit-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        {loading ? (
          <div className="loading-indicator">Loading...</div>
        ) : (
          <table className="routes-table">
            <thead>
              <tr>
                <th>Route ID</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Via</th>
                <th>Distance</th>
                <th>Duration</th>
                <th>Summary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route:any) => (
                <tr key={route._id}>
                  <td><TruncatedCell content={route.routeId} maxLength={15} /></td>
                  <td><TruncatedCell content={route.origin.name} maxLength={25} /></td>
                  <td><TruncatedCell content={route.destination.name} maxLength={25} /></td>
                  <td>
                    <TruncatedList 
                      items={route.waypoints.map((wp:any) => wp.name)} 
                      maxLength={30} 
                    />
                  </td>
                  <td>{route.distance.text}</td>
                  <td>{route.duration.text}</td>
                  <td><TruncatedCell content={route.name} maxLength={25} /></td>
                  <td className="action-buttons">
                    <button
                      className="view-btn"
                      onClick={() => handleViewRoute(route)}
                      title="View Route"
                    >
                      <FaMapMarkedAlt />
                    </button>
                    <button
                      className="edit-btn"
                      onClick={() => onEdit(route)}
                      title="Edit Route"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteClick(route._id || "")}
                      title="Delete Route"
                    >
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filteredRoutes.length === 0 && (
        <div className="no-routes">
          <p>No routes found.</p>
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 0 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FaChevronLeft />
          </button>

          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>

          <button
            className="pagination-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <FaChevronRight />
          </button>
        </div>
      )}

      {showDeleteModal && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
        />
      )}

      {showViewModal && routeToView && (
        <ViewRouteModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          route={routeToView}
        />
      )}
    </div>
  );
};

export default RouteTable;
