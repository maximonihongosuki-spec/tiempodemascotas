import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type AIInstruction = {
  id: string;
  instruction_key: string;
  instruction_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function AIInstructionsManagement() {
  const [instructions, setInstructions] = useState<AIInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ instruction_key: '', instruction_text: '', is_active: true });

  useEffect(() => {
    fetchInstructions();
    const channel = supabase.channel('ai_instructions_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'ai_instructions' }, () => fetchInstructions()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchInstructions = async () => {
    const { data } = await supabase.from('ai_instructions').select('*').order('created_at', { ascending: false });
    if (data) setInstructions(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (editingId) { await supabase.from('ai_instructions').update({ ...formData, updated_at: new Date().toISOString() }).eq('id', editingId); } 
    else { await supabase.from('ai_instructions').insert([formData]); }
    setFormData({ instruction_key: '', instruction_text: '', is_active: true });
    setEditingId(null); await fetchInstructions(); setLoading(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await supabase.from('ai_instructions').update({ is_active: !currentStatus, updated_at: new Date().toISOString() }).eq('id', id);
    fetchInstructions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar?')) return;
    await supabase.from('ai_instructions').delete().eq('id', id);
    fetchInstructions();
  };

  return (
    <div className="font-sans text-gray-900 space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar Instrucción' : 'Nueva Instrucción de Sistema'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Clave (ID único)</label>
              <input type="text" required value={formData.instruction_key} onChange={e => setFormData({ ...formData, instruction_key: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-sm" placeholder="ej: personalidad_asistente" disabled={!!editingId} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="rounded text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Activo</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt / Instrucción</label>
            <textarea required value={formData.instruction_text} onChange={e => setFormData({ ...formData, instruction_text: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-sm font-mono text-gray-600" placeholder="Instrucciones para el modelo..." />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">{editingId ? 'Actualizar' : 'Guardar'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({ instruction_key: '', instruction_text: '', is_active: true }); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium">Cancelar</button>}
          </div>
        </form>
      </div>

      <div className="grid gap-4">
        {instructions.map((inst) => (
          <div key={inst.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${inst.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                <h3 className="font-bold text-gray-900 text-sm">{inst.instruction_key}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleActive(inst.id, inst.is_active)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors" title={inst.is_active ? 'Desactivar' : 'Activar'}>
                  {inst.is_active ? <ToggleRight size={20} className="text-green-600" /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => { setEditingId(inst.id); setFormData({ instruction_key: inst.instruction_key, instruction_text: inst.instruction_text, is_active: inst.is_active }); }} className="p-1.5 text-gray-400 hover:text-gray-900 rounded transition-colors"><Plus size={18} /></button>
                <button onClick={() => handleDelete(inst.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
            <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 whitespace-pre-wrap font-sans">{inst.instruction_text}</pre>
          </div>
        ))}
        {instructions.length === 0 && !loading && <p className="text-center text-gray-400 text-sm py-8">No hay instrucciones definidas.</p>}
      </div>
    </div>
  );
}