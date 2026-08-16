'use client';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

type DeliveryPoint = {
  id: string;
  tracking_code: string;
  customer_name: string;
  customer_phone: string;
  delivery_zone_name: string;
  delivery_lat: number;
  delivery_lng: number;
  total: number;
  payment_method: string;
};

type Props = {
  points: DeliveryPoint[];
};

// ── Haversine distance (km) ──────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Nearest-neighbor TSP ─────────────────────────────────
function nearestNeighborTSP(pts: DeliveryPoint[]): DeliveryPoint[] {
  if (pts.length <= 1) return pts;
  const visited = new Set<number>();
  const result: DeliveryPoint[] = [];
  let current = 0;
  visited.add(0);
  result.push(pts[0]);
  while (visited.size < pts.length) {
    let nearest = -1, minDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      if (visited.has(i)) continue;
      const d = haversine(pts[current].delivery_lat, pts[current].delivery_lng,
        pts[i].delivery_lat, pts[i].delivery_lng);
      if (d < minDist) { minDist = d; nearest = i; }
    }
    if (nearest !== -1) { visited.add(nearest); result.push(pts[nearest]); current = nearest; }
  }
  return result;
}

// ── Total route distance ─────────────────────────────────
function totalDistance(pts: DeliveryPoint[]): number {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    total += haversine(pts[i].delivery_lat, pts[i].delivery_lng,
      pts[i + 1].delivery_lat, pts[i + 1].delivery_lng);
  }
  return total;
}

const PAYMENT_LABELS: Record<string, string> = {
  transferencia: '🏦 Transferencia', tarjeta: '💳 Tarjeta',
  pos_delivery: '📱 POS', efectivo: '💵 Efectivo',
};

export default function DeliveryRouteMap({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [sortedPoints, setSortedPoints] = useState<DeliveryPoint[]>([]);
  const [selected, setSelected] = useState<DeliveryPoint | null>(null);

  useEffect(() => {
    if (points.length === 0) return;
    const sorted = nearestNeighborTSP([...points]);
    setSortedPoints(sorted);
  }, [points]);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current || sortedPoints.length === 0) return;
    initializedRef.current = true;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(containerRef.current!, { zoomControl: true })
        .setView([-25.2867, -57.647], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // invalidateSize múltiple para garantizar render correcto
      [100, 300, 600, 1000].forEach(delay => {
        setTimeout(() => {
          if (mapRef.current) mapRef.current.invalidateSize();
        }, delay);
      });

      // ResizeObserver para cambios dinámicos del container
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        const observer = new ResizeObserver(() => {
          if (mapRef.current) mapRef.current.invalidateSize();
        });
        observer.observe(containerRef.current);
        (map as any)._resizeObserver = observer;
      }

      // Numbered markers
      sortedPoints.forEach((pt, i) => {
        const icon = L.divIcon({
          html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
            <circle cx="18" cy="18" r="17" fill="#166534" stroke="white" stroke-width="2.5"/>
            <text x="18" y="23" text-anchor="middle" fill="white" 
              font-family="Arial, sans-serif" font-size="14" font-weight="900">${i + 1}</text>
          </svg>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -20],
        });

        L.marker([pt.delivery_lat, pt.delivery_lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:180px;">
              <p style="font-weight:900;font-size:13px;margin:0 0 4px;">#${i + 1} — ${pt.customer_name}</p>
              <p style="font-size:11px;color:#555;margin:0 0 2px;">📍 ${pt.delivery_zone_name || 'Sin zona'}</p>
              <p style="font-size:11px;color:#555;margin:0 0 2px;">📞 ${pt.customer_phone}</p>
              <p style="font-size:11px;color:#555;margin:0 0 2px;">${PAYMENT_LABELS[pt.payment_method] || pt.payment_method}</p>
              <p style="font-size:12px;font-weight:900;color:#166534;margin:4px 0 0;">
                Gs. ${pt.total.toLocaleString('es-PY')}
              </p>
              <a href="/seguimiento/${pt.tracking_code}" target="_blank"
                style="font-size:10px;color:#166534;">
                Ver pedido →
              </a>
            </div>
          `);
      });

      // Route polyline
      if (sortedPoints.length > 1) {
        const latlngs = sortedPoints.map(p => [p.delivery_lat, p.delivery_lng] as [number, number]);
        L.polyline(latlngs, { color: '#166534', weight: 2.5, opacity: 0.7, dashArray: '8 4' }).addTo(map);
      }

      // Fit bounds
      const bounds = L.latLngBounds(sortedPoints.map(p => [p.delivery_lat, p.delivery_lng] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30] });
    });

    return () => {
      if (mapRef.current) {
        if ((mapRef.current as any)._resizeObserver) {
          (mapRef.current as any)._resizeObserver.disconnect();
        }
        mapRef.current.remove();
        mapRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [sortedPoints]);

  if (points.length === 0) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-4xl mb-3">🗺️</p>
        <p className="font-bold text-gray-500">No hay deliveries con coordenadas para hoy</p>
        <p className="text-xs text-gray-400 mt-1">Los pedidos con delivery y ubicación marcada aparecerán aquí.</p>
      </div>
    );
  }

  const dist = totalDistance(sortedPoints);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Deliveries', value: points.length },
          { label: 'Distancia aprox.', value: `${dist.toFixed(1)} km` },
          { label: 'Recorrido', value: 'Optimizado' },
        ].map(s => (
          <div key={s.label} className="bg-[#166534]/5 border border-[#166534]/20 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-[#166534]">{s.value}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      <div ref={containerRef} style={{
        height: '450px',
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        background: '#e5e7eb',
      }} />

      {/* Ordered list */}
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Orden sugerido de visita</p>
        <div className="space-y-2">
          {sortedPoints.map((pt, i) => (
            <div key={pt.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#166534]/30 transition-colors cursor-pointer"
              onClick={() => setSelected(selected?.id === pt.id ? null : pt)}>
              <div className="w-7 h-7 bg-[#166534] text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{pt.customer_name}</p>
                <p className="text-xs text-gray-500">{pt.delivery_zone_name} · {pt.customer_phone}</p>
                <p className="text-xs font-black text-[#166534]">Gs. {pt.total.toLocaleString('es-PY')} · {PAYMENT_LABELS[pt.payment_method] || pt.payment_method}</p>
              </div>
              <a href={`/seguimiento/${pt.tracking_code}`} target="_blank"
                className="text-xs text-[#166534] font-bold hover:underline whitespace-nowrap"
                onClick={e => e.stopPropagation()}>
                {pt.tracking_code}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
