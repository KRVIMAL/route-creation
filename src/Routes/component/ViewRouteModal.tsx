// ViewRouteModal.tsx
import React, { useEffect, useRef } from 'react';
import { Route } from '../types';
import { Loader } from '@googlemaps/js-api-loader';
import '../../App.css';

interface ViewRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: Route;
}

const ViewRouteModal: React.FC<ViewRouteModalProps> = ({ isOpen, onClose, route }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen || !mapRef.current) return;
    
    const initializeMap = async () => {
      const loader = new Loader({
        apiKey: 'AIzaSyAaZ1M_ofwVoLohowruNhY0fyihH9NpcI0', // Replace with your actual Google Maps API key
        version: 'weekly',
        libraries: ['places']
      });

      try {
        const google = await loader.load();
        
        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: { lat: route.origin.lat, lng: route.origin.lng },
          zoom: 10
        });

        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map: mapInstance,
          suppressMarkers: false
        });
        
        // Prepare waypoints for DirectionsService
        const waypoints = route.waypoints.map(wp => ({
          location: { lat: wp.lat, lng: wp.lng },
          stopover: true
        }));
        
        const request: google.maps.DirectionsRequest = {
          origin: { lat: route.origin.lat, lng: route.origin.lng },
          destination: { lat: route.destination.lat, lng: route.destination.lng },
          waypoints: waypoints,
          travelMode: route.travelMode as unknown as google.maps.TravelMode
        };

        directionsService.route(request, (response, status) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(response);
          } else {
            console.error('Directions request failed due to', status);
          }
        });
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initializeMap();
  }, [isOpen, route]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="route-view-modal">
        <div className="modal-header">
          <h3>{route.name}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="route-info">
          <div className="info-item">
            <span className="info-label">From:</span>
            <span className="info-value">{route.origin.name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">To:</span>
            <span className="info-value">{route.destination.name}</span>
          </div>
          {route.waypoints.length > 0 && (
            <div className="info-item">
              <span className="info-label">Via:</span>
              <span className="info-value">
                {route.waypoints.map(wp => wp.name).join(', ')}
              </span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Distance:</span>
            <span className="info-value">{route.distance.text}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Duration:</span>
            <span className="info-value">{route.duration.text}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Travel Mode:</span>
            <span className="info-value">{route.travelMode}</span>
          </div>
        </div>
        <div ref={mapRef} className="route-map"></div>
      </div>
    </div>
  );
};

export default ViewRouteModal;