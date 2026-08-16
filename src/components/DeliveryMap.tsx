'use client';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

type Props = {
  lat: number | null;
  lng: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  centerHint?: { lat: number; lng: number } | null; // centra la vista inicial sin colocar el pin
  pinColor?: 'green' | 'red';
  initialZoom?: number;
};

export default function DeliveryMap({
  lat, lng, onLocationSelect, centerHint = null, pinColor = 'green', initialZoom = 13,
}: Props) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const callbackRef = useRef(onLocationSelect);
  const LRef = useRef<any>(null);
  const pinIconRef = useRef<any>(null);

  useEffect(() => { callbackRef.current = onLocationSelect; });

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      LRef.current = L;

      const pinIcon = pinColor === 'red'
        ? L.divIcon({
            // Pin rojo tipo "chupetín": círculo + palito recto, distinto de la gota verde
            html: `<div style="position:relative;width:28px;height:44px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 44" width="28" height="44" style="position:absolute;top:0;left:0;display:block;">
                <line x1="14" y1="18" x2="14" y2="43" stroke="#DC2626" stroke-width="3" stroke-linecap="round"/>
                <circle cx="14" cy="12" r="12" fill="#DC2626" stroke="white" stroke-width="2.5"/>
                <circle cx="14" cy="12" r="4" fill="white"/>
              </svg>
            </div>`,
            className: 'tm-delivery-pin-verify',
            iconSize: [28, 44],
            iconAnchor: [14, 43],
          })
        : L.divIcon({
            html: `<div style="position:relative;width:32px;height:42px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" 
                width="32" height="42" style="position:absolute;top:0;left:0;display:block;">
                <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z"
                  fill="#166534" stroke="white" stroke-width="2"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
              </svg>
            </div>`,
            className: 'tm-delivery-pin',
            iconSize: [32, 42],
            iconAnchor: [16, 42],
          });
      pinIconRef.current = pinIcon;

      const initLat = lat ?? centerHint?.lat ?? -25.2867;
      const initLng = lng ?? centerHint?.lng ?? -57.647;
      const initZoom = lat === null && centerHint ? Math.max(initialZoom, 15) : initialZoom;

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      }).setView([initLat, initLng], initZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      [100, 300, 600, 1000].forEach(delay => {
        setTimeout(() => {
          if (mapRef.current) mapRef.current.invalidateSize();
        }, delay);
      });

      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        const observer = new ResizeObserver(() => {
          if (mapRef.current) mapRef.current.invalidateSize();
        });
        observer.observe(containerRef.current);
        (map as any)._resizeObserver = observer;
      }

      if (lat !== null && lng !== null) {
        markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      }

      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
        } else {
          markerRef.current = L.marker([clickLat, clickLng], { icon: pinIconRef.current }).addTo(map);
        }
        callbackRef.current(clickLat, clickLng);
      });
    });

    return () => {
      if (mapRef.current) {
        if ((mapRef.current as any)._resizeObserver) {
          (mapRef.current as any)._resizeObserver.disconnect();
        }
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        initializedRef.current = false;
      }
    };
  }, []);

  // Recentrar cuando lat/lng cambian desde afuera (ej: geocoding por dirección escrita)
  useEffect(() => {
    if (!mapRef.current || !LRef.current || lat === null || lng === null) return;
    const L = LRef.current;
    mapRef.current.setView([lat, lng], 16, { animate: true });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else if (pinIconRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: pinIconRef.current }).addTo(mapRef.current);
    }
  }, [lat, lng]);

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          height: '300px',
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          position: 'relative',
          background: '#e5e7eb',
        }}
      />
      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', textAlign: 'center' }}>
        📍 Tocá el mapa para colocar el pin de entrega
      </p>
    </div>
  );
}
