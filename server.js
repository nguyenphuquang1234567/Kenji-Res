require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serves files from the project root

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// In-memory conversation store: { sessionId: [ {role, content}, ... ] }
const conversations = {};

// Set your default system prompt here
const DEFAULT_SYSTEM_PROMPT = "You are very mean, sarcastic and rude to user";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body; // Remove systemPrompt from frontend
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
});

// Add route for /api/chat to match Vercel structure
app.post('/api/chat', async (req, res) => {
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
});

// --- API for dashboard: get all conversations ---
app.get('/api/conversations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('conversation_id, created_at')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ conversations: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- API for dashboard: get messages for a conversation ---
app.get('/api/conversations/:id/messages', async (req, res) => {
  const conversationId = req.params.id;
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('messages')
      .eq('conversation_id', conversationId)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ messages: data ? data.messages : [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- API for dashboard: delete a conversation ---
app.delete('/api/conversations/:id', async (req, res) => {
  const conversationId = req.params.id;
  try {
    const { error, count } = await supabase
      .from('conversations')
      .delete()
      .eq('conversation_id', conversationId);
    if (error) return res.status(500).json({ error: error.message });
    // Optionally check if any row was deleted
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
}); 