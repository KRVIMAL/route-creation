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
  onSearch?: (term: string) => void; // Add this prop
  searchTerm?: string;
}

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
  // const [searchTerm, setSearchTerm] = useState('');
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
              {filteredRoutes.map((route) => (
                <tr key={route._id}>
                  <td>{route.origin.name}</td>
                  <td>{route.destination.name}</td>
                  <td>
                    {route.waypoints.length > 0
                      ? route.waypoints.map((wp) => wp.name).join(", ")
                      : "-"}
                  </td>
                  <td>{route.distance.text}</td>
                  <td>{route.duration.text}</td>
                  <td>{route.name}</td>
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
