const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Webhook URL for conversation analysis
const WEBHOOK_URL = process.env.CONVERSATION_WEBHOOK_URL;

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
- When the user has ordered, ask them for their name, email, and phone number and address to save their order.

TONE
- Courteous, concise, and welcoming — like a great host. Avoid long paragraphs; use bullets sparingly when listing options.`;
const conversations = {};

// Function to send conversation to webhook for analysis
async function analyzeConversationWithWebhook(sessionId, messages) {
  if (!WEBHOOK_URL) {
    console.log('No webhook URL configured, skipping analysis');
    return;
  }

  try {
    // Send complete conversation JSON to webhook (same as Supabase format)
    const webhookResponse = await axios.post(WEBHOOK_URL, {
      conversation_id: sessionId,
      messages: messages, // Complete conversation JSON array
      total_messages: messages.length,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KenjiShop-Chatbot/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    // Process webhook response and update Supabase
    if (webhookResponse.data && webhookResponse.status === 200) {
      const analysis = webhookResponse.data;
      
      // Update conversation with analysis data
      const updateData = {
        customer_name: analysis.customerName || analysis.customer_name || '',
        customer_email: analysis.customerEmail || analysis.customer_email || '',
        customer_phone: analysis.customerPhone || analysis.customer_phone || '',
        customer_industry: analysis.customerIndustry || analysis.customer_industry || '',
        customer_problem: analysis.customerProblem || analysis.customer_problem || '',
        customer_availability: analysis.customerAvailability || analysis.customer_availability || '',
        customer_consultation: analysis.customerConsultation || analysis.customer_consultation || false,
        special_notes: analysis.specialNotes || analysis.special_notes || '',
        lead_quality: analysis.leadQuality || analysis.lead_quality || 'spam',
        analyzed_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('conversation_id', sessionId);

      if (updateError) {
        console.error('Failed to update conversation analysis:', updateError);
      } else {
        console.log(`Conversation ${sessionId} analyzed and updated successfully`);
      }
    }

  } catch (error) {
    console.error('Webhook analysis error:', error.response?.data || error.message);
    // Don't fail the chat if webhook analysis fails
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
        .from('conversations')
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

    // Automatically analyze conversation with webhook (non-blocking)
    analyzeConversationWithWebhook(sessionId, conversations[sessionId])
      .catch(error => {
        console.error('Background analysis failed:', error);
      });

    res.json({ response: aiMessage });
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI API' });
  }
}; 
