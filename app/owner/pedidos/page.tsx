'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase, Order } from '../../../src/lib/supabase';
import OrderManagement from '../../../src/components/owner/OrderManagement';

const DeliveryRouteMap = dynamic(
  () => import('../../../src/components/owner/DeliveryRouteMap'),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" /> }
);

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'lista' | 'mapa'>('lista');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
  };

  // Solo deliveries de hoy con coordenadas
  const todayDeliveries = orders.filter(o => {
    const isToday = new Date(o.created_at).toDateString() === new Date().toDateString();
    return (o as any).delivery_type === 'delivery' &&
      (o as any).delivery_lat && (o as any).delivery_lng && isToday &&
      o.status !== 'cancelled';
  }).map(o => ({
    id: o.id,
    tracking_code: (o as any).tracking_code,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone || '',
    delivery_zone_name: (o as any).delivery_zone_name || '',
    delivery_lat: (o as any).delivery_lat,
    delivery_lng: (o as any).delivery_lng,
    total: o.total,
    payment_method: (o as any).payment_method || '',
  }));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'lista', label: '📋 Lista de pedidos' },
          { key: 'mapa', label: `🗺️ Mapa de rutas${todayDeliveries.length > 0 ? ` (${todayDeliveries.length})` : ''}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeTab === tab.key
                ? 'bg-[#166534] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'lista' && (
        <OrderManagement orders={orders} onUpdate={loadData} />
      )}

      {activeTab === 'mapa' && (
        <DeliveryRouteMap points={todayDeliveries} />
      )}
    </div>
  );
}
