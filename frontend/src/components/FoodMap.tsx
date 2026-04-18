import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colors, radius } from '../styles/theme';

// Fix default marker icons broken by Vite bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored markers
const makeIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });

const ICONS: Record<string, L.DivIcon> = {
  available: makeIcon('#22c55e'),
  claimed:   makeIcon('#f59e0b'),
  delivered: makeIcon('#3b82f6'),
  ngo:       makeIcon('#a855f7'),
};

interface FoodListing {
  _id: string;
  foodName: string;
  quantity: number;
  foodType?: string;
  status: string;
  score?: number;
  distance?: number;
  expiryDatetime: string;
  location: { lat: number; lng: number };
}

interface Props {
  listings: FoodListing[];
  ngoLat?: number;
  ngoLng?: number;
}

// India bounds — restrict panning outside India
const INDIA_BOUNDS = L.latLngBounds(
  L.latLng(6.5, 68.0),   // SW corner
  L.latLng(37.5, 97.5)   // NE corner
);

// India center
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

function BoundsEnforcer() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(INDIA_BOUNDS);
    map.on('drag', () => map.panInsideBounds(INDIA_BOUNDS, { animate: false }));
  }, [map]);
  return null;
}

export default function FoodMap({ listings, ngoLat, ngoLng }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const hoursLeft = (dt: string) => (new Date(dt).getTime() - Date.now()) / 3600000;

  // Determine map center: NGO location if in India, else India center
  const hasNgoLocation = ngoLat && ngoLng && ngoLat !== 0 && ngoLng !== 0;
  const center: [number, number] = hasNgoLocation
    ? [ngoLat!, ngoLng!]
    : INDIA_CENTER;

  const zoom = hasNgoLocation ? 12 : 5;

  if (!ready) {
    return (
      <div style={{ height: '420px', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '13px' }}>
        Loading map…
      </div>
    );
  }

  return (
    <div style={{ borderRadius: radius.lg, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '420px', width: '100%' }}
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={4}
      >
        <BoundsEnforcer />

        {/* OpenStreetMap tiles — free, no API key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* NGO location marker */}
        {hasNgoLocation && (
          <Marker position={[ngoLat!, ngoLng!]} icon={ICONS.ngo}>
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: '13px' }}>
                <strong>📍 Your Location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Food listing markers */}
        {listings.map(listing => (
          <Marker
            key={listing._id}
            position={[listing.location.lat, listing.location.lng]}
            icon={ICONS[listing.status] || ICONS.available}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: '13px', minWidth: '160px' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '14px' }}>{listing.foodName}</div>
                <div style={{ color: '#555', marginBottom: '3px' }}>⚖️ {listing.quantity} kg</div>
                {listing.foodType && <div style={{ color: '#555', marginBottom: '3px' }}>🏷 {listing.foodType}</div>}
                {listing.distance != null && <div style={{ color: '#555', marginBottom: '3px' }}>📍 {listing.distance.toFixed(1)} km away</div>}
                <div style={{ color: hoursLeft(listing.expiryDatetime) < 2 ? '#ef4444' : hoursLeft(listing.expiryDatetime) < 6 ? '#f59e0b' : '#555', marginBottom: '6px' }}>
                  ⏱ {hoursLeft(listing.expiryDatetime) > 0 ? `${hoursLeft(listing.expiryDatetime).toFixed(1)}h left` : 'Expired'}
                </div>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: listing.status === 'available' ? '#dcfce7' : listing.status === 'claimed' ? '#fef3c7' : '#dbeafe', color: listing.status === 'available' ? '#16a34a' : listing.status === 'claimed' ? '#d97706' : '#2563eb', fontWeight: 600, textTransform: 'capitalize' }}>
                  {listing.status}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div style={{ background: colors.surface, padding: '10px 16px', display: 'flex', gap: '20px', flexWrap: 'wrap', borderTop: `1px solid ${colors.border}` }}>
        {[
          { color: '#22c55e', label: 'Available' },
          { color: '#f59e0b', label: 'Claimed' },
          { color: '#3b82f6', label: 'Delivered' },
          { color: '#a855f7', label: 'Your location' },
        ].map(({ color, label }) => (
          <span key={label} style={{ fontSize: '12px', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
