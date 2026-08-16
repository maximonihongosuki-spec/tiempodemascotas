import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Phone, Clock, Save, X } from 'lucide-react';
import { supabase, Location } from '../../lib/supabase';

export default function LocationManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '', hours: '' });

  useEffect(() => { fetchLocations(); }, []);

  const fetchLocations = async () => {
    setLoading(true);
    const { data } = await supabase.from('locations').select('*').order('created_at', { ascending: true });
    if (data) setLocations(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address) { alert('Nombre y Dirección son obligatorios'); return; }
    if (editingId) { await supabase.from('locations').update(formData).eq('id', editingId); } 
    else { await supabase.from('locations').insert([formData]); }
    setFormData({ name: '', address: '', phone: '', hours: '' });
    setIsAdding(false); setEditingId(null); fetchLocations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este local?')) return;
    await supabase.from('locations').delete().eq('id', id);
    fetchLocations();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 font-sans text-gray-900">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sucursales</h2>
          <p className="text-gray-500 text-sm">Puntos de atención</p>
        </div>
        <button
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', address: '', phone: '', hours: '' }); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Plus size={16} /> Nueva Sucursal
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="mb-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">{editingId ? 'Editar' : 'Nueva'} Sucursal</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input type="text" placeholder="Nombre (Ej: Casa Central)" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="px-3 py-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 text-sm" />
            <input type="text" placeholder="Dirección" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="px-3 py-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 text-sm" />
            <input type="text" placeholder="Teléfono" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="px-3 py-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 text-sm" />
            <input type="text" placeholder="Horario" value={formData.hours} onChange={e => setFormData({ ...formData, hours: e.target.value })} className="px-3 py-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 text-sm" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium">Guardar</button>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-medium">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="grid gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900">{loc.name}</h4>
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {loc.address}</p>
                  {loc.phone && <p className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {loc.phone}</p>}
                  {loc.hours && <p className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /> {loc.hours}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3 md:mt-0">
                <button onClick={() => { setEditingId(loc.id); setFormData({ name: loc.name, address: loc.address, phone: loc.phone || '', hours: loc.hours || '' }); setIsAdding(false); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit size={18} /></button>
                <button onClick={() => handleDelete(loc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
          {locations.length === 0 && <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">No hay locales registrados</div>}
        </div>
      )}
    </div>
  );
}