const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('conversations')
      .select('conversation_id, created_at, customer_name, customer_email, customer_phone, customer_industry, customer_problem, customer_availability, customer_consultation, special_notes, lead_quality, analyzed_at')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ conversations: data });
  }

  if (req.method === 'DELETE') {
    let conversationId = req.query && req.query.id;
    if (!conversationId && req.body) {
      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        conversationId = body.conversation_id;
      } catch {}
    }
    if (!conversationId) {
      return res.status(400).json({ error: 'Missing conversation_id' });
    }
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('conversation_id', conversationId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.status(405).json({ error: 'Method not allowed' });
}; 