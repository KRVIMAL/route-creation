// App.tsx
import React, { useState, useEffect } from "react";

import {
  fetchRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
} from "./Routes/services/routes.service";
import "./App.css";
import { Route } from "./Routes/types";
import RouteEditor from "./Routes/RouteEditor";
import RouteTable from "./Routes/component/RouteTable";

const App: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  useEffect(() => {
    loadRoutes(currentPage, limit);
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset to first page when changing limit
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
      if (currentRoute && currentRoute._id) {
        // Update existing route
        // In a real app, you would use this:
        const updated = await updateRoute(currentRoute._id, routeData);
        console.log({ updated });
        // For now, just update state:
        setRoutes((prevRoutes) =>
          prevRoutes.map((route) =>
            route._id === currentRoute._id
              ? { ...routeData, _id: currentRoute._id }
              : route
          )
        );
      } else {
        // Create new route
        // In a real app, you would use this:
        const created = await createRoute(routeData);

        // For now, just update state:
        // const newRoute = {
        //   ...routeData,
        //   // _id: `temp-${Date.now()}`,
        //   // routeId: `route-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        //   // createdAt: new Date().toISOString(),
        //   // updatedAt: new Date().toISOString()
        // };
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
          <RouteEditor
            initialRoute={currentRoute}
            onSave={handleSaveRoute}
            onCancel={handleCancelEdit}
          />
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
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
