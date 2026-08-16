import React, { useState, useEffect } from 'react';
import { Plus, Download, Eye, Trash2, Search } from 'lucide-react';
import { supabase, Sale, SaleItem, Product } from '../../lib/supabase';
import { format } from 'date-fns';
import { generateInvoicePDF } from '../../lib/invoiceGenerator';

type SalesManagementProps = {
  sales: Sale[];
  onUpdate: () => void;
};

type SaleWithItems = Sale & {
  items: SaleItem[];
};

export default function SalesManagement({ sales, onUpdate }: SalesManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState(7500);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_document: '',
    customer_address: '',
    customer_phone: '',
    sale_type: 'cash' as 'cash' | 'credit',
    notes: '',
    items: [] as {
      product_id: string;
      product_name: string;
      product_code: string;
      quantity: number;
      unit_price: number;
      tax_exempt: boolean;
    }[],
    installments: 1,
    first_payment_date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => { loadProducts(); loadSiteSettings(); }, []);

  const loadSiteSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*').single();
    if (data) {
      setSiteSettings(data);
      if (data.dollar_exchange_rate) setExchangeRate(data.dollar_exchange_rate);
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('active', true).order('name');
    if (data) setProducts(data);
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { product_id: '', product_name: '', product_code: '', quantity: 1, unit_price: 0, tax_exempt: false }] });
  };

  const removeItem = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = { ...newItems[index], product_id: value, product_name: product.name, product_code: product.product_code, unit_price: product.price };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotalUSD = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) { alert('Agregue productos'); return; }
    try {
      const { data: settings } = await supabase.from('site_settings').select('*').single();
      if (!settings) { alert('Configure facturación primero'); return; }
      const nextNumber = (settings.invoice_current_number || 0) + 1;
      const invoiceNumber = `${settings.invoice_establishment_code}-${settings.invoice_point_of_sale}-${nextNumber.toString().padStart(7, '0')}`;
      
      const rate = settings.dollar_exchange_rate || exchangeRate;
      const totalAmountPYG = calculateTotalUSD() * rate;

      const { data: sale, error: saleError } = await supabase.from('sales').insert({
        customer_name: formData.customer_name,
        customer_document: formData.customer_document,
        customer_address: formData.customer_address,
        customer_phone: formData.customer_phone,
        sale_type: formData.sale_type,
        total_amount: totalAmountPYG,
        invoice_number: invoiceNumber,
        status: 'completed'
      }).select().single();

      if (saleError || !sale) throw new Error('Error al crear venta');

      const saleItems = formData.items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        product_code: item.product_code,
        quantity: item.quantity,
        unit_price: item.unit_price * rate,
        subtotal: item.quantity * item.unit_price * rate
      }));

      await supabase.from('sale_items').insert(saleItems);
      await supabase.from('site_settings').update({ invoice_current_number: nextNumber }).eq('id', settings.id);
      alert('Venta registrada'); setShowAddForm(false); onUpdate();
    } catch (error: any) { alert(error.message); }
  };

  const viewSaleDetails = async (saleId: string) => {
    const { data: sale } = await supabase.from('sales').select('*').eq('id', saleId).single();
    const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', saleId);
    if (sale && items) setSelectedSale({ ...sale, items });
  };

  const deleteSelectedSales = async () => {
    if (selectedSales.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedSales.size} ventas?`)) return;
    const saleIds = Array.from(selectedSales);
    await supabase.from('sales').delete().in('id', saleIds);
    setSelectedSales(new Set());
    onUpdate();
  };

  const filteredSales = sales.filter(s => s.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.invoice_number.includes(searchTerm));

  return (
    <div className="font-sans text-gray-900">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ventas</h2>
          <p className="text-gray-500 text-sm">Historial de transacciones</p>
        </div>
        <div className="flex gap-2">
          {selectedSales.size > 0 && (
             <button onClick={deleteSelectedSales} className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium">Eliminar</button>
          )}
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
            <Plus size={16} /> Nueva Venta
          </button>
        </div>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar por cliente o factura..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left w-10"><input type="checkbox" onChange={() => { if(selectedSales.size === filteredSales.length) setSelectedSales(new Set()); else setSelectedSales(new Set(filteredSales.map(s => s.id))); }} className="rounded border-gray-300 text-blue-600" /></th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Factura</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4"><input type="checkbox" checked={selectedSales.has(sale.id)} onChange={() => { const ns = new Set(selectedSales); if(ns.has(sale.id)) ns.delete(sale.id); else ns.add(sale.id); setSelectedSales(ns); }} className="rounded border-gray-300 text-blue-600" /></td>
                <td className="px-6 py-4 font-mono text-sm text-gray-600">{sale.invoice_number}</td>
                <td className="px-6 py-4">
                   <p className="font-medium text-sm text-gray-900">{sale.customer_name}</p>
                   <p className="text-xs text-gray-500">{format(new Date(sale.invoice_date), 'dd/MM/yyyy')}</p>
                </td>
                <td className="px-6 py-4">
                   <p className="font-bold text-sm text-gray-900">₲ {sale.total_amount.toLocaleString('es-PY')}</p>
                   <p className="text-[10px] text-gray-500">USD {(sale.total_amount / exchangeRate).toFixed(2)}</p>
                </td>
                <td className="px-6 py-4 text-center">
                   <span className={`text-xs px-2 py-1 rounded-full font-medium ${sale.sale_type === 'cash' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {sale.sale_type === 'cash' ? 'Contado' : 'Crédito'}
                   </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => viewSaleDetails(sale.id)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Eye size={16} /></button>
                    <button onClick={() => { if (!siteSettings) return; generateInvoicePDF(sale, [], siteSettings as any); }} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                      <Download size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredSales.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No se encontraron ventas.</div>}
      </div>
    </div>
  );
}