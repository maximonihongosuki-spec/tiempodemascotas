'use client';
import React, { useState, useEffect } from 'react';
import { supabase, ChatSession } from '../../../src/lib/supabase';
import ChatManagement from '../../../src/components/owner/ChatManagement';

export default function ChatsPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await supabase.from('chat_sessions').select('*').order('created_at', { ascending: false });
      setChatSessions(data || []);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  return <ChatManagement chatSessions={chatSessions} onUpdate={loadData} />;
}
