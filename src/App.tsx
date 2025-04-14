// App.tsx
import React, { useState, useEffect } from "react";

import {
  fetchRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  searchRoutes,
} from "./Routes/services/routes.service";
import "./App.css";
import { Route } from "./Routes/types";
import RouteEditor from "./Routes/RouteEditor";
import RouteTable from "./Routes/component/RouteTable";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';


const App: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchTimeout, setSearchTimeout] = useState<any>(null);
  const userId='67cea10c4858dd0fc1e444e2';
  useEffect(() => {
    if (searchTerm.trim() === '') {
      loadRoutes(currentPage, limit);
    } else {
      handleSearch(searchTerm);
    }
  }, [currentPage, limit]);

  const loadRoutes = async (page: number, limit: number) => {
    setLoading(true);
    try {
      const response: any = await fetchRoutes(page, limit);
      setRoutes(response.routes || []);
      setTotalCount(response.total || 0);
    } catch (error) {
      console.error("Error loading routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set a new timeout to debounce the search
    const timeout = setTimeout(() => {
      if (term.trim() === '') {
        // If search term is empty, load regular routes
        loadRoutes(currentPage, limit);
      } else {
        // Execute search
        searchRoutesData(term, currentPage, limit);
      }
    }, 500); // Debounce by 500ms
    
    setSearchTimeout(timeout as unknown as any);
  };

  const searchRoutesData = async (term: string, page: number, itemLimit: number) => {
    setLoading(true);
    try {
      const result = await searchRoutes(term, page, itemLimit);
      setRoutes(result.routes || []);
      setTotalCount(result.total || 0);
    } catch (error) {
      console.error('Error searching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const handleCreateRoute = () => {
    setCurrentRoute(null);
    setShowEditor(true);
  };

  const handleEditRoute = (route: Route) => {
    setCurrentRoute(route);
    setShowEditor(true);
  };

  const handleDeleteRoute = async (id: string) => {
    try {
      // In a real app, you would use this:
      await deleteRoute(id);

      // For now, just update state:
      setRoutes((prevRoutes) => prevRoutes.filter((route) => route._id !== id));
    } catch (error) {
      console.error("Error deleting route:", error);
    }
  };

  const handleSaveRoute = async (routeData: Route) => {
    try {
      const routeWithUserId = {
        ...routeData,
        userId: userId
      };
  
      if (currentRoute && currentRoute._id) {
        const updated = await updateRoute(currentRoute._id, routeWithUserId);
        console.log({ updated });
        setRoutes((prevRoutes) =>
          prevRoutes.map((route) =>
            route._id === currentRoute._id
              ? { ...routeWithUserId, _id: currentRoute._id }
              : route
          )
        );
      } else {
        const created = await createRoute(routeWithUserId);
        setRoutes((prevRoutes) => [...prevRoutes]);
        console.log({ created: created });
      }
      setShowEditor(false);
      setCurrentRoute(null);
    } catch (error) {
      console.error("Error saving route:", error);
    }
  };
  const handleCancelEdit = () => {
    setShowEditor(false);
    setCurrentRoute(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Route Management System</h1>
      </header>

      <main className="app-main">
        {showEditor ? (
          //  <DndProvider backend={HTML5Backend}>
          <RouteEditor
            initialRoute={currentRoute}
            onSave={handleSaveRoute}
            onCancel={handleCancelEdit}
          />
          // </DndProvider>
        ) : (
          <div className="routes-list-container">
            <div className="routes-header">
              <h2>Routes</h2>
              <button className="create-btn" onClick={handleCreateRoute}>
                Create Route
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading routes...</div>
            ) : (
              <RouteTable
                routes={routes}
                onEdit={handleEditRoute}
                onDelete={handleDeleteRoute}
                totalCount={totalCount}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                limit={limit}
                onLimitChange={handleLimitChange}
                loading={loading}
                onSearch={handleSearch}
                searchTerm={searchTerm}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
