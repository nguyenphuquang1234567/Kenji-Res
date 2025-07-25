const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const conversationId = req.query && req.query.id;
    if (!conversationId) {
      return res.status(400).json({ error: 'Missing conversation_id' });
    }
    const { data, error } = await supabase
      .from('conversations')
      .select('messages')
      .eq('conversation_id', conversationId)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ messages: data ? data.messages : [] });
  }

  res.status(405).json({ error: 'Method not allowed' });
}; 