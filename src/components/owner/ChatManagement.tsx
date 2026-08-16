import { useState } from 'react';
import { ChatSession, supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Bot, Send, X, Trash2 } from 'lucide-react';

type ChatManagementProps = {
  chatSessions: ChatSession[];
  onUpdate: () => void;
};

export default function ChatManagement({ chatSessions, onUpdate }: ChatManagementProps) {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());

  const toggleAI = async (sessionId: string, currentStatus: boolean) => {
    await supabase.from('chat_sessions').update({ ai_enabled: !currentStatus, updated_at: new Date().toISOString() }).eq('session_id', sessionId);
    onUpdate();
  };

  const sendMessage = async (session: ChatSession) => {
    if (!messageText.trim()) return;
    const newMessage = { role: 'owner', content: messageText, timestamp: new Date().toISOString() };
    await supabase.from('chat_sessions').update({ messages: [...(session.messages || []), newMessage], updated_at: new Date().toISOString() }).eq('session_id', session.session_id);
    setMessageText(''); onUpdate();
  };

  const deleteSelected = async () => {
    if (selectedChats.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedChats.size} chats?`)) return;
    await supabase.from('chat_sessions').delete().in('session_id', Array.from(selectedChats));
    setSelectedChats(new Set()); setSelectedChat(null); onUpdate();
  };

  const selectedChatData = chatSessions.find(c => c.session_id === selectedChat);

  return (
    <div className="font-sans text-gray-900 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Chats en Vivo</h2>
        {selectedChats.size > 0 && <button onClick={deleteSelected} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">Eliminar ({selectedChats.size})</button>}
      </div>

      <div className="grid md:grid-cols-3 gap-4 flex-1 h-full overflow-hidden">
        {/* Chat List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-y-auto">
          {chatSessions.map((chat) => (
            <div key={chat.id} className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedChat === chat.session_id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`} onClick={() => setSelectedChat(chat.session_id)}>
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={selectedChats.has(chat.session_id)} onClick={(e) => e.stopPropagation()} onChange={() => { const ns = new Set(selectedChats); if(ns.has(chat.session_id)) ns.delete(chat.session_id); else ns.add(chat.session_id); setSelectedChats(ns); }} className="mt-1 rounded border-gray-300 text-blue-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm truncate">{chat.customer_name || 'Anónimo'}</span>
                    {chat.ai_enabled ? <Bot size={14} className="text-green-600" /> : <X size={14} className="text-gray-400" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content : 'Sin mensajes'}</p>
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{format(new Date(chat.updated_at), 'HH:mm')}</p>
                </div>
              </div>
            </div>
          ))}
          {chatSessions.length === 0 && <div className="p-4 text-center text-sm text-gray-400">No hay chats activos</div>}
        </div>

        {/* Chat Window */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-lg flex flex-col">
          {selectedChatData ? (
            <>
              <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-bold text-sm">{selectedChatData.customer_name || 'Cliente'}</h3>
                  <span className="text-xs text-gray-500">ID: {selectedChatData.session_id.substring(0,8)}</span>
                </div>
                <button onClick={() => toggleAI(selectedChatData.session_id, selectedChatData.ai_enabled)} className={`px-3 py-1 rounded text-xs font-medium border ${selectedChatData.ai_enabled ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                  {selectedChatData.ai_enabled ? 'IA Activa' : 'IA Pausada'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {(selectedChatData.messages || []).map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'owner' || msg.role === 'assistant' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${msg.role === 'owner' ? 'bg-blue-600 text-white' : msg.role === 'assistant' ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-white border border-gray-200 text-gray-800'}`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.role === 'owner' ? 'text-blue-200' : 'text-gray-400'}`}>{format(new Date(msg.timestamp), 'HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <input type="text" value={messageText} onChange={e => setMessageText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage(selectedChatData)} placeholder="Escribir mensaje..." className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none" disabled={selectedChatData.ai_enabled} />
                  <button onClick={() => sendMessage(selectedChatData)} disabled={selectedChatData.ai_enabled || !messageText.trim()} className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                    <Send size={18} />
                  </button>
                </div>
                {selectedChatData.ai_enabled && <p className="text-xs text-center text-orange-500 mt-2">Pausa la IA para escribir manualmente.</p>}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Selecciona un chat para ver la conversación</div>
          )}
        </div>
      </div>
    </div>
  );
}