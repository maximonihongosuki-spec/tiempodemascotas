import { useState } from 'react';
import { Message, supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Mail, MailOpen, Trash2 } from 'lucide-react';

type MessageManagementProps = {
  messages: Message[];
  onUpdate: () => void;
};

export default function MessageManagement({ messages, onUpdate }: MessageManagementProps) {
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  const toggleRead = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('messages').update({ read: !currentStatus }).eq('id', id);
      onUpdate();
    } catch (error) { alert('Error al actualizar'); }
  };

  const toggleSelectAll = () => {
    if (selectedMessages.size === messages.length) setSelectedMessages(new Set());
    else setSelectedMessages(new Set(messages.map(m => m.id)));
  };

  const deleteSelectedMessages = async () => {
    if (selectedMessages.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedMessages.size} mensajes?`)) return;
    await supabase.from('messages').delete().in('id', Array.from(selectedMessages));
    setSelectedMessages(new Set()); onUpdate();
  };

  return (
    <div className="font-sans text-gray-900">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Bandeja de Entrada</h2>
        {selectedMessages.size > 0 && (
          <button onClick={deleteSelectedMessages} className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium flex items-center gap-2">
            <Trash2 size={16} /> Eliminar
          </button>
        )}
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={selectedMessages.size === messages.length && messages.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" />
          Seleccionar Todo
        </label>
      </div>

      <div className="space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`p-4 border rounded-lg transition-colors ${msg.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-start gap-4">
              <input type="checkbox" checked={selectedMessages.has(msg.id)} onChange={() => { const ns = new Set(selectedMessages); if (ns.has(msg.id)) ns.delete(msg.id); else ns.add(msg.id); setSelectedMessages(ns); }} className="mt-1 rounded border-gray-300 text-blue-600" />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`text-sm ${msg.read ? 'font-medium text-gray-900' : 'font-bold text-blue-900'}`}>{msg.subject}</h3>
                  <span className="text-xs text-gray-500">{format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">De: {msg.customer_name} &lt;{msg.customer_email}&gt;</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
              </div>
              <button onClick={() => toggleRead(msg.id, msg.read)} className="text-gray-400 hover:text-blue-600 transition-colors" title={msg.read ? 'Marcar como no leído' : 'Marcar como leído'}>
                {msg.read ? <MailOpen size={20} /> : <Mail size={20} className="fill-blue-100 text-blue-600" />}
              </button>
            </div>
          </div>
        ))}
        {messages.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Bandeja vacía.</div>}
      </div>
    </div>
  );
}