const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Direct analysis system prompt
const ANALYSIS_SYSTEM_PROMPT = `Extract the following customer details from the transcript:
- Name
- Email address
- Phone number
- Order time
- Address
- Order item
- Special notes
- Lead quality (categorize as 'good', 'ok', or 'spam')
Format the response using this JSON schema:
{
  "type": "object",
  "properties": {
    "customerName": { "type": "string" },
    "customerEmail": { "type": "string" },
    "customerPhone": { "type": "string" },
    "orderTime": { "type": "string" },
    "customerAddress": { "type": "string" },
    "orderItem": { "type": "string" },
    "specialNotes": { "type": "string" },
    "leadQuality": { "type": "string", "enum": ["good", "ok", "spam"] }
  },
  "required": ["customerName", "customerEmail", "orderTime", "leadQuality"]
}
Return only a valid JSON object, with no extra commentary.`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationId } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'Missing conversationId' });
  }

  try {
    // Fetch conversation messages from database
    const { data: conversationData, error: fetchError } = await supabase
      .from('restaurant')
      .select('messages')
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError || !conversationData) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = conversationData.messages || [];
    
    // Build transcript and call OpenAI directly
    const transcript = (messages || [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const completion = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-5-nano',
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: `Transcript:\n${transcript}\n\nReturn only JSON.` }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    let raw = completion.data?.choices?.[0]?.message?.content || '{}';
    let analysis;
    try {
      analysis = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      analysis = match ? JSON.parse(match[0]) : {};
    }

    // Lead quality rule: contacts => good, else spam
    const hasContacts = (analysis.customerEmail && analysis.customerEmail.trim()) || (analysis.customerPhone && analysis.customerPhone.trim());
    analysis.leadQuality = hasContacts ? 'good' : 'spam';

    // Normalize orderTime format to "YYYY-MM-DD HH:MM:SS GMT+HH:MM"
    function formatOrderTime(orderTimeRaw) {
      if (!orderTimeRaw || typeof orderTimeRaw !== 'string') return '';
      try {
        const parsed = new Date(orderTimeRaw);
        if (isNaN(parsed.getTime())) return orderTimeRaw;
        let m = orderTimeRaw.match(/GMT([+-])(\d{2}):?(\d{2})/i) || orderTimeRaw.match(/UTC([+-])(\d{2}):?(\d{2})/i) || orderTimeRaw.match(/([+-])(\d{2}):?(\d{2})/);
        let displayOffsetMin;
        if (m) {
          const sign = m[1] === '-' ? -1 : 1;
          const oh = parseInt(m[2], 10) || 0;
          const om = parseInt(m[3], 10) || 0;
          displayOffsetMin = sign * (oh * 60 + om);
        } else {
          displayOffsetMin = -parsed.getTimezoneOffset();
        }
        const utcMs = parsed.getTime() + parsed.getTimezoneOffset() * 60000;
        const targetMs = utcMs + displayOffsetMin * 60000;
        const d = new Date(targetMs);
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = d.getUTCFullYear();
        const mm = pad(d.getUTCMonth() + 1);
        const dd = pad(d.getUTCDate());
        const HH = pad(d.getUTCHours());
        const MM = pad(d.getUTCMinutes());
        const SS = pad(d.getUTCSeconds());
        const s = displayOffsetMin >= 0 ? '+' : '-';
        const a = Math.abs(displayOffsetMin);
        const oh = pad(Math.floor(a / 60));
        const om = pad(a % 60);
        return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS} GMT${s}${oh}:${om}`;
      } catch {
        return orderTimeRaw;
      }
    }
    
    // Update the conversation record with the analysis
    const { error: updateError } = await supabase
      .from('restaurant')
      .update({
        customer_name: analysis.customerName || analysis.customer_name || '',
        customer_email: analysis.customerEmail || analysis.customer_email || '',
        customer_phone: analysis.customerPhone || analysis.customer_phone || '',
        order_time: formatOrderTime(analysis.orderTime || analysis.order_time || ''),
        customer_address: analysis.customerAddress || analysis.customer_address || '',
        order_item: analysis.orderItem || analysis.order_item || '',
        special_notes: analysis.specialNotes || analysis.special_notes || '',
        lead_quality: analysis.leadQuality || analysis.lead_quality || 'spam',
        analyzed_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(500).json({ error: 'Failed to save analysis to database' });
    }

    res.json({ 
      success: true, 
      analysis: analysis,
      message: 'Conversation analyzed successfully'
    });

  } catch (error) {
    console.error('Direct analysis error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to analyze conversation' });
  }
}; 