const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Direct analysis system prompt for extracting customer info
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

const DEFAULT_SYSTEM_PROMPT = `You are Kenji Assistant — the friendly, concise virtual host of Kenji Shop, a contemporary Japanese restaurant.

GOAL
- Help guests quickly with menu questions, dish recommendations, dietary/allergen info, opening directions, and contact details.
- Keep replies warm, respectful, and to-the-point (prefer 1–3 short sentences). Use the same language as the user. Ask only one question at a time.

HOUSE INFO
- Brand: Kenji Shop (Contemporary Japanese dining)
- Address: 123 Nguyen Hue, District 1, Ho Chi Minh City
- Hotline: 1900 1234
- Reservations: Not handled via chat right now. If asked, say we currently don’t take reservations online and kindly direct to the hotline, or suggest walk-in.
- Currency: Show prices in USD with a leading $ (e.g., $12.90)

MENU REFERENCE (use exactly when asked about items/prices)
- Wagyu Steak — $68.90 — A5 Wagyu, yuzu kosho butter, black garlic glaze
- Salmon Teriyaki — $32.90 — Pan-seared salmon, house teriyaki, shiso greens
- Uni Truffle Udon — $34.90 — Fresh udon, uni cream, truffle aroma
- Seaweed Salad — $14.90 — Wakame, sesame dressing, toasted nori
- Matcha Tiramisu — $12.90 — Mascarpone, sponge, ceremonial matcha
- Tonkotsu Ramen — $21.90 — Rich pork broth, chashu, ajitama, nori
- Chicken Karaage — $17.90 — Crispy marinated chicken, lemon, yuzu mayo
- Mochi Ice Cream — $11.90 — Soft mochi, vanilla gelato, kinako dust
- Featured/Omakase: If asked, explain it’s the chef’s curated selection.

BEHAVIOR
- When recommending dishes, ask about preferences first (spice level, hot/cold, noodles/rice, vegetarian, no-pork, gluten-free, seafood allergies, portion size).
- If you don’t know something (e.g., operating hours unavailable), be transparent and offer the hotline for confirmation.
- Never discuss unrelated services or other companies. Do not invent prices beyond the menu above. If an item isn’t listed, offer similar options or invite the guest to check the in-page menu.
- Be helpful and proactive: suggest pairings (e.g., salad with ramen, dessert after mains) without being pushy.

Conversation flow:
- First, if the user asks about the dishes, recommend them from the MENU REFERENCE
- After the user has confirmed the dishes, ask them for their name -> email -> phone number -> address to save their order, ask them one by one.
- Next, ask them for date, time and their timezone,  and confirmed the delivery time
- Finally, ask if they have any notes or questions before ending the chat.

TONE
- Courteous, concise, and welcoming — like a great host. Avoid long paragraphs; use bullets sparingly when listing options.`;
const conversations = {};

// Directly analyze the conversation with OpenAI and save to Supabase
async function analyzeConversationDirect(sessionId, messages) {
  try {
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
        }
      }
    );

    let raw = completion.data?.choices?.[0]?.message?.content || '{}';
    let extracted;
    try {
      extracted = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      extracted = match ? JSON.parse(match[0]) : {};
    }

    // Lead quality rule override
    const hasContacts = (extracted.customerEmail && extracted.customerEmail.trim()) || (extracted.customerPhone && extracted.customerPhone.trim());
    const leadQuality = hasContacts ? 'good' : 'spam';

    // Format order time to "YYYY-MM-DD HH:MM:SS GMT+HH:MM"
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

    const updateData = {
      customer_name: extracted.customerName || '',
      customer_email: extracted.customerEmail || '',
      customer_phone: extracted.customerPhone || '',
      order_time: formatOrderTime(extracted.orderTime || extracted.order_time || ''),
      customer_address: extracted.customerAddress || extracted.customer_address || '',
      order_item: extracted.orderItem || extracted.order_item || '',
      special_notes: extracted.specialNotes || extracted.special_notes || '',
      lead_quality: leadQuality,
      analyzed_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('restaurant')
      .update(updateData)
      .eq('conversation_id', sessionId);

    if (updateError) {
      console.error('Failed to update conversation analysis:', updateError);
    }
  } catch (error) {
    console.error('Direct analysis error:', error.response?.data || error.message);
  }
}

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

  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: 'Missing message or sessionId' });
  }

  // SỬA: Lấy lịch sử từ Supabase nếu conversations[sessionId] chưa có
  if (!conversations[sessionId]) {
    try {
      const { data, error } = await supabase
        .from('restaurant')
        .select('messages')
        .eq('conversation_id', sessionId)
        .single();
      if (data && data.messages) {
        conversations[sessionId] = data.messages;
      } else {
        conversations[sessionId] = [];
        conversations[sessionId].push({ role: 'system', content: DEFAULT_SYSTEM_PROMPT });
      }
    } catch (err) {
      conversations[sessionId] = [];
      conversations[sessionId].push({ role: 'system', content: DEFAULT_SYSTEM_PROMPT });
    }
  }
  conversations[sessionId].push({ role: 'user', content: message });

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-5-nano',
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
    
    try {
      await supabase.from('restaurant').upsert([
        {
          conversation_id: sessionId,
          messages: conversations[sessionId],
        }
      ], { onConflict: ['conversation_id'] });
    } catch (dbError) {
      console.error('Supabase DB error:', dbError.message);
    }

    // Analyze conversation directly and wait for completion before responding
    await analyzeConversationDirect(sessionId, conversations[sessionId]);

    res.json({ response: aiMessage });
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI API' });
  }
}; 
