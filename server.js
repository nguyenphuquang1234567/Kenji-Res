require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// In-memory conversation store: { sessionId: [ {role, content}, ... ] }
const conversations = {};

// Set your default system prompt here
const DEFAULT_SYSTEM_PROMPT = "You are very rude and mean to the user";

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
        model: 'gpt-4.1-mini',
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
        model: 'gpt-4.1-mini',
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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
}); 