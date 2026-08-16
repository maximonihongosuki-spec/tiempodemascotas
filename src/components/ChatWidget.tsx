'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

function parseMessageWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-700 break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string; timestamp: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState('Tiempo de Mascotas');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatSettings();
    loadBusinessName();
    loadWebhookUrl();

    const adminChannel = supabase
      .channel('admin_settings_chat_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_settings' },
        () => {
          loadChatSettings();
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel('settings_webhook_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        () => {
          loadWebhookUrl();
        }
      )
      .subscribe();

    const savedSessionId = localStorage.getItem('chat_session_id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      loadChatSession(savedSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('chat_session_id', newSessionId);
    }

    return () => {
      supabase.removeChannel(adminChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatSettings = async () => {
    try {
      const { data } = await supabase.from('admin_settings').select('chat_enabled').single();
      if (data) setChatEnabled(data.chat_enabled);
    } catch (error) {
      console.error('Error loading chat settings:', error);
    }
  };

  const loadWebhookUrl = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'chat_webhook_url')
        .maybeSingle();
      
      if (data?.value) {
        setWebhookUrl(data.value);
      }
    } catch (error) {
      console.error('Error loading webhook URL:', error);
    }
  };

  const loadBusinessName = async () => {
    try {
      const { data } = await supabase.from('site_settings').select('business_name').single();
      if (data?.business_name) setBusinessName(data.business_name);
    } catch (error) {
      console.error('Error loading business name:', error);
    }
  };

  const loadChatSession = async (sid: string) => {
    try {
      const { data } = await supabase.from('chat_sessions').select('*').eq('session_id', sid).maybeSingle();
      if (data) {
        setMessages(data.messages || []);
        if (data.customer_name) setCustomerName(data.customer_name);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const saveChatSession = async (updatedMessages: any[]) => {
    try {
      const { data: existing } = await supabase.from('chat_sessions').select('id').eq('session_id', sessionId).maybeSingle();
      if (existing) {
        await supabase.from('chat_sessions').update({
          messages: updatedMessages,
          customer_name: customerName,
          updated_at: new Date().toISOString()
        }).eq('session_id', sessionId);
      } else {
        await supabase.from('chat_sessions').insert({
          session_id: sessionId,
          customer_name: customerName,
          messages: updatedMessages,
          ai_enabled: true
        });
      }
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  };

  const sendMessageToAI = async (userMessage: string) => {
    try {
      if (!webhookUrl) {
        throw new Error('Webhook de chat no configurado');
      }

      const payload = {
        chatInput: userMessage,
        sessionId: sessionId
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.text();
        console.error('Server error response:', errData);
        throw new Error('Error en el servidor de chat');
      }

      const data = await response.json();
      const assistantMessage = data.output || data.response || data.message || data.text || 'Lo siento, no pude procesar tu solicitud.';

      return {
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Error sending message to AI:', error);
      return {
        role: 'assistant',
        content: 'Hubo un inconveniente al conectar con mi cerebro artificial. ¿Podrías intentar de nuevo en unos segundos?',
        timestamp: new Date().toISOString()
      };
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const messageToSend = inputMessage;
    setInputMessage('');
    setLoading(true);

    await saveChatSession(updatedMessages);

    const aiResponse = await sendMessageToAI(messageToSend);
    const finalMessages = [...updatedMessages, aiResponse];
    setMessages(finalMessages);
    await saveChatSession(finalMessages);

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!chatEnabled) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-14 h-14 md:w-16 md:h-16 bg-[#eeee22] text-[#1A8A00] rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center z-50 border border-white/10"
        >
          <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />
        </button>
      )}

      {isOpen && (
        <div className="fixed md:bottom-6 md:right-6 md:w-[400px] md:h-[600px] inset-0 md:inset-auto w-full h-full md:rounded-3xl bg-white shadow-2xl flex flex-col z-50 overflow-hidden border border-slate-100">
          <div className="bg-[#1A8A00] text-white p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#eeee22] text-[#1A8A00] rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tighter text-sm">{businessName}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asistente IA Online</p>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 max-w-[85%]">
                <p className="text-sm text-slate-700 font-medium">
                  ¡Hola! Soy el asistente virtual de {businessName}. ¿En qué puedo ayudarte hoy?
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[#eeee22] text-[#1A8A00] font-medium'
                    : 'bg-white text-slate-800 border border-slate-100 font-medium'
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {parseMessageWithLinks(msg.content)}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-slate-100">
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder='Escribe tu consulta...'
                className="flex-1 bg-transparent px-4 py-2 text-sm outline-none font-medium placeholder:text-slate-400"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || loading}
                className="w-10 h-10 bg-[#1A8A00] text-white rounded-xl flex items-center justify-center hover:bg-[#228B22] transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}