'use client';
import React, { useState, useEffect } from 'react';
import { supabase, Message } from '../../../src/lib/supabase';
import MessageManagement from '../../../src/components/owner/MessageManagement';

export default function MensajesPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  return <MessageManagement messages={messages} onUpdate={loadData} />;
}
