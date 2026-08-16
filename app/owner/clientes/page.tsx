'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../src/lib/supabase';
import { supabaseAuth } from '../../../src/lib/supabase-auth';
import { Plus, Search, Edit, Check, X, RefreshCw, User, Mail, Phone, Star } from 'lucide-react';

type Client = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  document?: string;
  document_type?: string;
  role: string;
  active: boolean;
  pending_approval: boolean;
  points: number;
  created_at: string;
  professional_type?: string | null;
  professional_document_url?: string;
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Client>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newClient, setNewClient] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['mayorista', 'cliente'])
      .order('pending_approval', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setClients(data);
    setLoading(false);
  };

  const handleApprove = async (client: Client) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        active: true, 
        pending_approval: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', client.id);
    
    if (!error) {
      // Notificar via n8n (fire and forget)
      fetch('/api/auth/notify-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: client.email, name: client.full_name }),
      }).catch(console.error);
      
      setClients(prev => prev.map(c => 
        c.id === client.id ? { ...c, active: true, pending_approval: false } : c
      ));
    }
  };

  const handleToggleActive = async (client: Client) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ active: !client.active, updated_at: new Date().toISOString() })
      .eq('id', client.id);
    if (!error) setClients(prev => prev.map(c => c.id === client.id ? { ...c, active: !c.active } : c));
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setEditData({
      full_name: client.full_name,
      phone: client.phone,
      points: client.points,
      role: client.role,
      professional_type: client.professional_type || null,
    });
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ ...editData, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...editData } : c));
      setEditingId(null);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.email || !newClient.password || !newClient.full_name) {
      setError('Email, contraseña y nombre son obligatorios');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/admin/create-mayorista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al crear cliente');
      setNewClient({ email: '', password: '', full_name: '', phone: '' });
      setShowNewForm(false);
      loadClients();
    } catch (err: any) {
      setError(err.message || 'Error al crear cliente');
    } finally {
      setCreating(false);
    }
  };

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Gestión de Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clients.length} usuarios en el sistema</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadClients} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-500">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Formulario nuevo cliente */}
      {showNewForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <h3 className="font-black text-blue-800 uppercase text-sm">Crear nuevo cliente veterinario</h3>
          {error && <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Nombre completo *</label>
              <input type="text" value={newClient.full_name} onChange={e => setNewClient(p => ({ ...p, full_name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Email *</label>
              <input type="email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="cliente@email.com" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Contraseña *</label>
              <input type="password" value={newClient.password} onChange={e => setNewClient(p => ({ ...p, password: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Teléfono</label>
              <input type="tel" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0981 000 000" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreateClient} disabled={creating}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {creating ? 'Creando...' : 'Crear Cliente'}
            </button>
            <button onClick={() => { setShowNewForm(false); setError(''); }}
              className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      {/* Sección: Pendientes de aprobación */}
      {clients.filter(c => c.pending_approval).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h2 className="text-sm font-black text-yellow-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Veterinarios pendientes de aprobación ({clients.filter(c => c.pending_approval).length})
          </h2>
          <div className="space-y-2">
            {clients.filter(c => c.pending_approval).map(client => (
              <div key={client.id} className="bg-white border border-yellow-100 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {client.full_name}{' '}
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase">
                      {client.professional_type === 'estudiante_veterinario' ? 'Estudiante' : 'Veterinario'}
                    </span>
                  </p>
                  <p className="text-gray-500 text-xs">{client.email} · {client.phone}</p>
                  {client.document && (
                    <p className="text-gray-400 text-xs">{(client.document_type || 'CI').toUpperCase()}: {client.document}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {client.professional_document_url && (
                    <a
                      href={client.professional_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      📄 Ver {client.professional_type === 'estudiante_veterinario' ? 'carnet' : 'licencia'}
                    </a>
                  )}
                  <button
                    onClick={() => handleApprove(client)}
                    className="px-4 py-2 bg-[#166534] text-white rounded-lg text-xs font-black hover:bg-[#064E3B] transition-colors whitespace-nowrap"
                  >
                    ✅ Aprobar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
          <p className="text-sm">Cargando clientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold text-sm">No hay clientes registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider hidden md:table-cell">Contacto</th>
                <th className="text-center px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Puntos</th>
                <th className="text-center px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-center px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(client => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {editingId === client.id ? (
                      <input type="text" value={editData.full_name || ''} onChange={e => setEditData(p => ({ ...p, full_name: e.target.value }))}
                        className="w-full px-2 py-1 border border-blue-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-gray-800">{client.full_name || '—'}</p>
                          {editingId === client.id ? (
                            <select
                              value={
                                editData.role === 'cliente'
                                  ? 'cliente'
                                  : (editData.professional_type || 'veterinario')
                              }
                              onChange={e => {
                                const val = e.target.value;
                                if (val === 'cliente') {
                                  setEditData(p => ({ ...p, role: 'cliente', professional_type: null }));
                                } else {
                                  setEditData(p => ({ ...p, role: 'mayorista', professional_type: val }));
                                }
                              }}
                              className="text-[9px] font-black px-1.5 py-0.5 rounded-full border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                              <option value="cliente">CLIENTE</option>
                              <option value="veterinario">VETERINARIO</option>
                              <option value="estudiante_veterinario">ESTUDIANTE</option>
                            </select>
                          ) : (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                              client.role === 'mayorista' ?
                              'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {client.role === 'mayorista'
                                ? (client.professional_type === 'estudiante_veterinario' ? 'ESTUDIANTE' : 'VETERINARIO')
                                : 'CLIENTE'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />{client.email}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {editingId === client.id ? (
                      <input type="tel" value={editData.phone || ''} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-2 py-1 border border-blue-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="text-gray-600 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />{client.phone || '—'}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === client.id ? (
                      <input type="number" value={editData.points || 0} onChange={e => setEditData(p => ({ ...p, points: parseInt(e.target.value) }))}
                        className="w-20 px-2 py-1 border border-blue-300 rounded-lg text-sm text-center focus:ring-1 focus:ring-blue-500 outline-none" />
                    ) : (
                      <span className="flex items-center justify-center gap-1 text-sm font-bold text-[#166534]">
                        <Star className="w-3.5 h-3.5 fill-current text-[#eeee22]" />{client.points || 0}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggleActive(client)}
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase ${client.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {client.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === client.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleSaveEdit(client.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleEdit(client)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
