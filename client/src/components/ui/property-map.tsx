import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { Icon, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Property } from '@/types/property';
import { useLocation } from 'wouter';
import { formatPrice } from '@/lib/format';

// We need to fix leaflet marker icon issues in React
// This is a common issue with react-leaflet
const markerIcon = new Icon({
  iconUrl: '/assets/marker-icon.svg',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Component to change map view when properties change
function ChangeMapView({ properties }: { properties: Property[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (!properties.length) return;
    
    // Try to find properties with real coordinates
    const propertiesWithRealCoords = properties.filter(p => 
      p.coordinates && 
      typeof p.coordinates.lat === 'number' && 
      typeof p.coordinates.lng === 'number'
    );
    
    if (propertiesWithRealCoords.length > 0) {
      console.log(`Found ${propertiesWithRealCoords.length} real properties with coordinates for map centering`);
      
      if (propertiesWithRealCoords.length === 1) {
        // If only one property with coordinates, center and zoom to it
        const property = propertiesWithRealCoords[0];
        const lat = property.coordinates!.lat;
        const lng = property.coordinates!.lng;
        console.log(`Centering map on single property at [${lat}, ${lng}]`);
        map.setView([lat, lng], 14);
      } else {
        try {
          // With multiple properties, create bounds for all and fit view
          const bounds = L.latLngBounds([]);
          
          // Add each coordinate to the bounds
          propertiesWithRealCoords.forEach(property => {
            const latLng = L.latLng(property.coordinates!.lat, property.coordinates!.lng);
            bounds.extend(latLng);
            console.log(`Added property coordinates to bounds: [${latLng.lat}, ${latLng.lng}]`);
          });
          
          // Fit the map to the bounds with some padding
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
            console.log("Map view adjusted to fit all properties");
          }
        } catch (error) {
          console.error("Error adjusting map view:", error);
        }
      }
    }
  }, [properties, map]);
  
  return null;
};

interface PropertyMapProps {
  properties: Property[];
  height?: string;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

export function PropertyMap({
  properties,
  height = '500px',
  defaultCenter = [24.7136, 46.6753], // Default center (Riyadh)
  defaultZoom = 10
}: PropertyMapProps) {
  const [, navigate] = useLocation();
  const [mapProperties, setMapProperties] = useState<Property[]>([]);
  
  useEffect(() => {
    // Avoid processing if properties array is empty
    if (!properties.length) {
      setMapProperties([]);
      return;
    }
    
    // First, log all properties and their coordinates for debugging
    properties.forEach(property => {
      if (property.coordinates) {
        console.log(`Property ${property.title} has coordinates: lat=${property.coordinates.lat}, lng=${property.coordinates.lng}`);
      } else {
        console.log(`Property ${property.title} has NO coordinates`);
      }
    });
    
    // Filter properties that have coordinates
    const propertiesWithCoordinates = properties.filter(property => {
      // Check if property has valid coordinates
      return property.coordinates && 
             typeof property.coordinates.lat === 'number' && 
             typeof property.coordinates.lng === 'number';
    });
    
    console.log(`Found ${propertiesWithCoordinates.length} properties with coordinates out of ${properties.length} total`);
    
    // Create a final array with all properties
    const finalProperties = properties.map((property, index) => {
      // If property already has coordinates, use them
      if (property.coordinates && 
          typeof property.coordinates.lat === 'number' && 
          typeof property.coordinates.lng === 'number') {
        return property;
      }
      
      // Otherwise generate placeholder coordinates (for properties missing coordinates)
      // Use property id or index to create stable coordinates
      const idHash = property.id ? 
        String(property.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000 : 
        index * 100;
      
      // Generate a coordinate that's stable for this property, but clearly different from default center
      const lat = defaultCenter[0] + (Math.sin(idHash) * 0.05);
      const lng = defaultCenter[1] + (Math.cos(idHash) * 0.05);
      
      return {
        ...property,
        coordinates: { 
          lat, 
          lng 
        }
      };
    });
    
    setMapProperties(finalProperties);
  }, [properties, defaultCenter[0], defaultCenter[1]]);

  return (
    <div style={{ height, width: '100%' }}>
      {mapProperties.length > 0 && (
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Use ChangeMapView component to automatically center the map */}
          <ChangeMapView properties={mapProperties} />
          
          {mapProperties.map(property => (
            <Marker
              key={property.id}
              position={[
                property.coordinates?.lat || defaultCenter[0],
                property.coordinates?.lng || defaultCenter[1]
              ]}
              icon={markerIcon}
            >
              <Popup>
                <div className="w-48">
                  <div className="text-sm font-semibold">{property.title}</div>
                  <div className="text-xs text-gray-600">{property.location}</div>
                  <div className="text-sm font-bold mt-1">{formatPrice(property.price)}</div>
                  <div className="flex gap-1 text-xs mt-1">
                    <span>{property.bedrooms} bd</span>
                    <span>•</span>
                    <span>{property.bathrooms} ba</span>
                    <span>•</span>
                    <span>{property.area} sqm</span>
                  </div>
                  <button
                    className="mt-2 px-2 py-1 text-xs bg-primary text-white rounded-md w-full"
                    onClick={() => navigate(`/property/${property.id}`)}
                  >
                    View Property
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}