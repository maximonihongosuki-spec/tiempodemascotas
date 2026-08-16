'use client';
import React, { useState, useEffect } from 'react';
import { supabase, Sale } from '../../../src/lib/supabase';
import SalesManagement from '../../../src/components/owner/SalesManagement';

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
      setSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  return <SalesManagement sales={sales} onUpdate={loadData} />;
}
