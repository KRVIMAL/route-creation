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
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Tooltip component for truncated text
const TruncatedCell: React.FC<{ content: string; maxLength?: number }> = ({
  content,
  maxLength = 20,
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
  maxLength = 20,
}) => {
  if (!items || items.length === 0) return <span>-</span>;

  const joinedText = items.join(", ");
  const isTruncated = joinedText.length > maxLength;
  const displayText = isTruncated
    ? truncateText(joinedText, maxLength)
    : joinedText;

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

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are fewer than maxPagesToShow
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // Calculate start and end of page range around current page
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        endPage = Math.min(totalPages - 1, 4);
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3);
      }

      // Add ellipsis before middle pages if needed
      if (startPage > 2) {
        pageNumbers.push("...");
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis after middle pages if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  return (
    <div className="w-full">
      {/* <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
        <div className="relative w-full md:w-auto">
          <input
            type="text"
            placeholder="Search routes..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch />
          </div>
        </div>
      </div> */}
      <div className="mb-4"></div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border-collapse rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 text-left font-medium text-gray-700 first:rounded-tl-lg">
                Name
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-700">
                Route ID
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-700">
                Source
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-700">
                Destination
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-700">
                Via
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-700">
                Distance
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-700">
                Duration
              </th>
              <th className="py-3 px-4 text-left font-medium text-gray-700 last:rounded-tr-lg">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : filteredRoutes.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-4 text-center">
                  No routes found.
                </td>
              </tr>
            ) : (
              filteredRoutes.map((route: any, index) => (
                <tr
                  key={route._id || index}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    <TruncatedCell content={route.name} maxLength={25} />
                  </td>
                  <td className="py-3 px-4">
                    <TruncatedCell content={route.routeId} maxLength={15} />
                  </td>
                  <td className="py-3 px-4">
                    <TruncatedCell
                      content={route.origin?.name}
                      maxLength={25}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <TruncatedCell
                      content={route.destination?.name}
                      maxLength={25}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <TruncatedList
                      items={route.waypoints?.map((wp: any) => wp.name) || []}
                      maxLength={30}
                    />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {route.distance?.text || "-"}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {route.duration?.text || "-"}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-500 hover:text-blue-700"
                        onClick={() => handleViewRoute(route)}
                        title="View Route"
                      >
                        <FaMapMarkedAlt />
                      </button>
                      <button
                        className="text-blue-500 hover:text-blue-700"
                        onClick={() => onEdit(route)}
                        title="Edit Route"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteClick(route._id || "")}
                        title="Delete Route"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="flex items-center">
            <span className="mr-2">Row Per Page</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              className="p-1 rounded border hover:bg-gray-100"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <FaChevronLeft
                className={
                  currentPage === 1 ? "text-gray-300" : "text-gray-600"
                }
              />
            </button>

            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span key={`ellipsis-${index}`} className="px-1">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${page}`}
                  className={`w-8 h-8 flex items-center justify-center rounded ${
                    currentPage === page
                      ? "bg-blue-500 text-white"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => typeof page === "number" && goToPage(page)}
                >
                  {page}
                </button>
              )
            )}

            <button
              className="p-1 rounded border hover:bg-gray-100"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <FaChevronRight
                className={
                  currentPage === totalPages ? "text-gray-300" : "text-gray-600"
                }
              />
            </button>
          </div>
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
