import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type InvoiceSettings = {
  ruc: string;
  timbrado: string;
  business_address: string;
  business_email: string;
  business_phones: string;
  invoice_establishment_code: string;
  invoice_point_of_sale: string;
  invoice_current_number: number;
  timbrado_start_date: string;
  invoice_control_code: string;
  dollar_exchange_rate: number;
};

export default function InvoiceConfiguration() {
  const [settings, setSettings] = useState<InvoiceSettings>({
    ruc: '', timbrado: '', business_address: '', business_email: '', business_phones: '',
    invoice_establishment_code: '001', invoice_point_of_sale: '001', invoice_current_number: 0,
    timbrado_start_date: '', invoice_control_code: '', dollar_exchange_rate: 7500
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*').single();
    if (data) {
      setSettings({
        ruc: data.ruc || '', timbrado: data.timbrado || '', business_address: data.business_address || '',
        business_email: data.business_email || '', business_phones: data.business_phones || '',
        invoice_establishment_code: data.invoice_establishment_code || '001',
        invoice_point_of_sale: data.invoice_point_of_sale || '001', invoice_current_number: data.invoice_current_number || 0,
        timbrado_start_date: data.timbrado_start_date || '', invoice_control_code: data.invoice_control_code || '',
        dollar_exchange_rate: data.dollar_exchange_rate || 7500
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('site_settings').update(settings).eq('id', '00000000-0000-0000-0000-000000000001');
      if (!error) alert('Configuración guardada'); else alert('Error al guardar');
    } catch (error) { alert('Error al guardar'); } finally { setLoading(false); }
  };

  const generateInvoicePreview = () => `${settings.invoice_establishment_code}-${settings.invoice_point_of_sale}-${(settings.invoice_current_number + 1).toString().padStart(7, '0')}`;

  return (
    <div className="font-sans text-gray-900 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Facturación Electrónica / Impresa</h2>
        <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
          <Save size={16} /> {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6 grid md:grid-cols-2 gap-4 items-center">
        <div>
          <p className="text-xs text-blue-600 font-bold uppercase mb-1">Próxima Factura</p>
          <p className="text-2xl font-mono font-bold text-blue-900">{generateInvoicePreview()}</p>
        </div>
        <div className="border-l border-blue-200 pl-4">
          <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Cotización del Día (1 USD = ₲)</label>
          <input 
            type="number" 
            value={settings.dollar_exchange_rate} 
            onChange={e => setSettings({...settings, dollar_exchange_rate: parseInt(e.target.value) || 0})} 
            className="w-full bg-white px-3 py-2 border border-blue-300 rounded font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2 text-sm uppercase">Datos Fiscales (SET)</h3>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">RUC</label><input type="text" value={settings.ruc} onChange={e => setSettings({...settings, ruc: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Timbrado</label><input type="text" value={settings.timbrado} onChange={e => setSettings({...settings, timbrado: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Inicio Vigencia</label><input type="date" value={settings.timbrado_start_date} onChange={e => setSettings({...settings, timbrado_start_date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" /></div>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2 text-sm uppercase">Datos del Emisor</h3>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección Fiscal</label><input type="text" value={settings.business_address} onChange={e => setSettings({...settings, business_address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfonos</label><input type="text" value={settings.business_phones} onChange={e => setSettings({...settings, business_phones: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" /></div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase">Numeración</h3>
        <div className="flex gap-4">
          <div className="flex-1"><label className="block text-xs font-medium text-gray-500 mb-1">Establecimiento</label><input type="text" value={settings.invoice_establishment_code} onChange={e => setSettings({...settings, invoice_establishment_code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-center font-mono" maxLength={3} /></div>
          <div className="flex-1"><label className="block text-xs font-medium text-gray-500 mb-1">Punto Emisión</label><input type="text" value={settings.invoice_point_of_sale} onChange={e => setSettings({...settings, invoice_point_of_sale: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-center font-mono" maxLength={3} /></div>
          <div className="flex-1"><label className="block text-xs font-medium text-gray-500 mb-1">Último Número</label><input type="number" value={settings.invoice_current_number} onChange={e => setSettings({...settings, invoice_current_number: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-center font-mono" /></div>
        </div>
      </div>
    </div>
  );
}