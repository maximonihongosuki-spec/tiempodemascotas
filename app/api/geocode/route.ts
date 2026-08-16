import { NextRequest, NextResponse } from 'next/server';

const HEADERS = { 'User-Agent': 'TiempoDeMascotas-Checkout/1.0 (contacto: tiempodemascotas.com.py)' };

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('mode');

  if (mode === 'reverse') {
    const lat = req.nextUrl.searchParams.get('lat');
    const lon = req.nextUrl.searchParams.get('lon');
    if (!lat || !lon) return NextResponse.json({ address: null });

    try {
      const params = new URLSearchParams({ lat, lon, format: 'json', 'accept-language': 'es' });
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: HEADERS });
      if (!res.ok) return NextResponse.json({ address: null });
      const data = await res.json();
      return NextResponse.json({ address: data?.display_name || null });
    } catch (error) {
      console.error('Error en reverse geocode:', error);
      return NextResponse.json({ address: null });
    }
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 5) return NextResponse.json({ results: [] });

  try {
    const params = new URLSearchParams({
      q, format: 'json', limit: '1', countrycodes: 'py',
      viewbox: '-57.75,-25.15,-57.50,-25.45', bounded: '0',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: HEADERS });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    const results = (data || []).map((r: any) => ({ lat: parseFloat(r.lat), lon: parseFloat(r.lon), display_name: r.display_name }));
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error en geocode:', error);
    return NextResponse.json({ results: [] });
  }
}
