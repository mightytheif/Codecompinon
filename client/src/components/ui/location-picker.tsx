import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker icon to fix the missing icon in React Leaflet
const markerIcon = new Icon({
  iconUrl: '/assets/marker-icon.png',
  iconRetinaUrl: '/assets/marker-icon-2x.png',
  shadowUrl: '/assets/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component that handles map click events
function LocationMarker({ 
  position, 
  setPosition 
}: { 
  position: [number, number] | null; 
  setPosition: (position: [number, number]) => void;
}) {
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? (
    <Marker 
      position={position} 
      icon={markerIcon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          setPosition([position.lat, position.lng]);
        },
      }}
    />
  ) : null;
}

interface LocationPickerProps {
  value?: { lat: number; lng: number };
  onChange: (coordinates: { lat: number; lng: number }) => void;
  height?: string;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

export function LocationPicker({
  value,
  onChange,
  height = '300px',
  defaultCenter = [24.7136, 46.6753], // Default center (Riyadh)
  defaultZoom = 10
}: LocationPickerProps) {
  // Initialize position from value or default
  const initialPosition = value ? [value.lat, value.lng] as [number, number] : null;
  const [position, setPosition] = useState<[number, number] | null>(initialPosition);
  
  // Update parent component when position changes
  useEffect(() => {
    if (position) {
      onChange({ lat: position[0], lng: position[1] });
    }
  }, [position, onChange]);

  // Update local position when value changes from parent
  useEffect(() => {
    if (value && (!position || value.lat !== position[0] || value.lng !== position[1])) {
      setPosition([value.lat, value.lng]);
    }
  }, [value]);

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={position || defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
      {position && (
        <div className="text-xs text-muted-foreground mt-1">
          Selected coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </div>
      )}
    </div>
  );
}