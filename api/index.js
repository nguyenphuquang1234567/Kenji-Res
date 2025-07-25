require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Set your default system prompt here
const DEFAULT_SYSTEM_PROMPT = "You are very mean, sarcastic and rude to user";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// In-memory conversation store: { sessionId: [ {role, content}, ... ] }
const conversations = {};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // --- New: Handle GET requests for dashboard ---
  if (req.method === 'GET') {
    const url = req.url || '';
    // /api/conversations/:id/messages
    const match = url.match(/\/conversations\/(.+)\/messages/);
    if (url.startsWith('/conversations/') && match) {
      const conversationId = match[1];
      // Fetch messages for a conversation
      const { data, error } = await supabase
        .from('conversations')
        .select('messages')
        .eq('conversation_id', conversationId)
        .single();
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.json({ messages: data ? data.messages : [] });
    }
    // /api/conversations
    if (url.startsWith('/conversations')) {
      // Fetch all conversations (id and timestamp)
      const { data, error } = await supabase
        .from('conversations')
        .select('conversation_id, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.json({ conversations: data });
    }
    // Not found
    return res.status(404).json({ error: 'Not found' });
  }

  // --- New: Handle DELETE requests for dashboard ---
  if (req.method === 'DELETE') {
    const url = req.url || '';
    const match = url.match(/\/conversations\/(.+)$/);
    if (url.startsWith('/conversations/') && match) {
      const conversationId = match[1];
      try {
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('conversation_id', conversationId);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(204).end();
      } catch (err) {
        return res.status(500).json({ error: 'Server error' });
      }
    }
    return res.status(404).json({ error: 'Not found' });
  }

  // --- Existing POST chat handler ---
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Missing message or sessionId' });
  }

  // Initialize conversation if new session
  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
    // Always add the default system prompt
    conversations[sessionId].push({ role: 'system', content: DEFAULT_SYSTEM_PROMPT });
  }

  // Add user message
  conversations[sessionId].push({ role: 'user', content: message });

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4.1-nano',
        messages: conversations[sessionId],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiMessage = response.data.choices[0].message.content;
    conversations[sessionId].push({ role: 'assistant', content: aiMessage });

    // Save conversation to Supabase
    try {
      await supabase.from('conversations').upsert([
        {
          conversation_id: sessionId,
          messages: conversations[sessionId],
        }
      ], { onConflict: ['conversation_id'] });
    } catch (dbError) {
      console.error('Supabase DB error:', dbError.message);
    }

    res.json({ response: aiMessage });
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI API' });
  }
}; 