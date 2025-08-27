const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Direct analysis system prompt for extracting customer info
const ANALYSIS_SYSTEM_PROMPT = `Extract the following customer details from the transcript.
Also classify user's intent precisely as one of: 'order', 'ask_info', 'other'.
Only set orderItem when the intent is 'order'. The user might ask to learn more about a dish; do not infer an order in that case.
Return strictly valid JSON per the schema below.
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
    "leadQuality": { "type": "string", "enum": ["good", "ok", "spam"] },
    "userIntent": { "type": "string", "enum": ["order", "ask_info", "other"] }
  },
  "required": ["customerName", "customerEmail", "orderTime", "leadQuality", "userIntent"]
}
Return only a valid JSON object, with no extra commentary.`;

const DEFAULT_SYSTEM_PROMPT = `You are Kenji Assistant — the friendly, concise virtual host of Kenji Shop, a contemporary Japanese restaurant.

GOAL
- prefer 1–3 short sentences. Use the same language as the user. Ask only one question at a time.

KNOWLEDGE
- When the user asks about house details (brand, address, hotline, currency), call the tool get_house_info.
- When the user asks about menu items or prices, call the tool get_menu_reference.

Conversation flow:
- 1. First, ask if the user wants to order something from the menu. If they mention a dish, proceed to step 4; else go to step 2.
- 2. If they want menu details, use get_menu_reference. List ONLY dish names (no price/description) unless explicitly asked.
- 3. If they want to here more about a specific dish, use show_food_image.
- 4. If the user confirms dishes, do not call show_food_image. Confirm items, then ask for customer's name → email → phone → address (one by one).
- 5. Ask for date, time, and timezone, then confirm delivery time.
- 6. Ask if they have any notes or questions. For inquiries, they can email: kenji.shop@gmail.com.

TONE
- Use bullets sparingly when listing options.`;

const conversations = {};

// Remove invalid/empty tool_calls from messages to satisfy OpenAI schema
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((msg) => {
    if (!msg || typeof msg !== 'object') return msg;
    // Only assistant messages can have tool_calls; remove empty/invalid arrays
    if (msg.role === 'assistant') {
      if (!Array.isArray(msg.tool_calls) || (Array.isArray(msg.tool_calls) && msg.tool_calls.length === 0)) {
        const { tool_calls, ...rest } = msg;
        return rest;
      }
    } else if (msg.tool_calls !== undefined) {
      // Strip tool_calls from non-assistant roles just in case
      const { tool_calls, ...rest } = msg;
      return rest;
    }
    return msg;
  });
}

// Function to get food image URL and description based on dish name
function getFoodImageUrl(dishName) {
  const foodData = {
    'wagyu steak': {
      image: 'images/wagyu_steak.png',
      description: 'A5 Wagyu, yuzu kosho butter, black garlic glaze'
    },
    'salmon teriyaki': {
      image: 'images/salmon_teriyaki.png',
      description: 'Pan-seared salmon, house teriyaki, shiso greens'
    },
    'uni truffle udon': {
      image: 'images/udon.png',
      description: 'Fresh udon, uni cream, truffle aroma'
    },
    'seaweed salad': {
      image: 'images/seaweed_salad.png',
      description: 'Wakame, sesame dressing, toasted nori'
    },
    'matcha tiramisu': {
      image: 'images/matcha.png',
      description: 'Mascarpone, sponge, ceremonial matcha'
    },
    'tonkotsu ramen': {
      image: 'images/tonkotsu_ramen.png',
      description: 'Rich pork broth, chashu, ajitama, nori'
    },
    'chicken karaage': {
      image: 'images/chicken.png',
      description: 'Crispy marinated chicken, lemon, yuzu mayo'
    },
    'mochi ice cream': {
      image: 'images/mochi_ice_cream.png',
      description: 'Soft mochi, vanilla gelato, kinako dust'
    }
  };
  
  const normalizedName = dishName.toLowerCase().trim();
  return foodData[normalizedName] || null;
}



// Format order time to "YYYY-MM-DD HH:MM:SS GMT+HH:MM"
function formatOrderTime(orderTimeRaw) {
  if (!orderTimeRaw || typeof orderTimeRaw !== 'string') return '';
  try {
    const parsed = new Date(orderTimeRaw);
    if (isNaN(parsed.getTime())) return orderTimeRaw;
    
    // Force the year to be current year
    const currentYear = new Date().getFullYear();
    parsed.setFullYear(currentYear);
    
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

    const intent = (extracted.userIntent || extracted.user_intent || '').toLowerCase();
    const updateData = {
      customer_name: extracted.customerName || '',
      customer_email: extracted.customerEmail || '',
      customer_phone: extracted.customerPhone || '',
      order_time: formatOrderTime(extracted.orderTime || extracted.order_time || ''),
      customer_address: extracted.customerAddress || extracted.customer_address || '',
      order_item: intent === 'order' ? (extracted.orderItem || extracted.order_item || '') : '',
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

  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OpenAI API key');
    return res.status(500).json({ error: 'Server configuration error' });
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
        conversations[sessionId] = sanitizeMessages(data.messages);
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
    // Call model with tools available
    const sanitizedMessages = sanitizeMessages(conversations[sessionId] || []);

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-5-nano',
        messages: sanitizedMessages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'show_food_image',
              description: 'Show an image of a specific food dish when the user asks to see it or learn more about it or want to hear more about it',
              parameters: {
                type: 'object',
                properties: {
                  dish_name: {
                    type: 'string',
                    description: 'The name of the dish to show'
                  }
                },
                required: ['dish_name']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'get_house_info',
              description: 'Fetch brand, address, hotline, and currency from the database',
              parameters: { type: 'object', properties: {}, additionalProperties: false }
            }
          },
          {
            type: 'function',
            function: {
              name: 'get_menu_reference',
              description: 'Fetch current menu items with descriptions, prices (USD), and images from the database',
              parameters: { type: 'object', properties: {}, additionalProperties: false }
            }
          }
        ],
        tool_choice: 'auto'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    let aiMessage = response.data.choices[0]?.message?.content || '';
    const toolCalls = response.data.choices[0]?.message?.tool_calls || [];
    
    // If tool was called but content is empty or error-y, synthesize a friendly message
    if (toolCalls.length > 0 && (!aiMessage || /^sorry, i encountered/i.test(aiMessage))) {
      const firstTool = toolCalls.find(t => t?.function?.name === 'show_food_image');
      try {
        if (firstTool) {
          const args = JSON.parse(firstTool.function.arguments || '{}');
          const foodData = getFoodImageUrl(args.dish_name || '');
          if (foodData) {
            aiMessage = `Here\'s the ${args.dish_name}: ${foodData.description}`;
          }
        }
      } catch {}
    }

    // Add assistant message to conversation (only include tool_calls when present)
    if (toolCalls.length > 0) {
      conversations[sessionId].push({ role: 'assistant', content: aiMessage, tool_calls: toolCalls });
    } else {
      // Ensure there is always a non-empty assistant content
      conversations[sessionId].push({ role: 'assistant', content: aiMessage || 'Got it.' });
    }
    
    // Handle tool calls if any
    let toolResultsForResponse = null;
    if (toolCalls.length > 0) {
      toolResultsForResponse = [];
      
      for (const toolCall of toolCalls) {
        if (toolCall.function.name === 'show_food_image') {
          const args = JSON.parse(toolCall.function.arguments);
          const foodData = getFoodImageUrl(args.dish_name);
          
          if (foodData) {
            toolResultsForResponse.push({
              dish_name: args.dish_name,
              description: foodData.description,
              image_url: foodData.image
            });
            
            // Add tool response to conversation
            conversations[sessionId].push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: 'show_food_image',
              content: JSON.stringify({
                dish_name: args.dish_name,
                description: foodData.description,
                image_url: foodData.image
              })
            });
          }
        } else if (toolCall.function.name === 'get_house_info') {
          // Load house info from Supabase
          const { data, error } = await supabase
            .from('house_info_json')
            .select('info')
            .single();
          const info = (data && data.info) || {};
          toolResultsForResponse.push({ type: 'house_info', info });
          conversations[sessionId].push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'get_house_info',
            content: JSON.stringify(info)
          });
        } else if (toolCall.function.name === 'get_menu_reference') {
          // Load menu items from Supabase
          const { data, error } = await supabase
            .from('menu_items')
            .select('name, description, price_usd, image_path')
            .order('name', { ascending: true });
          const items = Array.isArray(data) ? data : [];
          toolResultsForResponse.push({ type: 'menu_reference', items });
          conversations[sessionId].push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'get_menu_reference',
            content: JSON.stringify(items)
          });
        }
      }
    }
    
    try {
      // Sanitize before saving to DB to avoid persisting empty tool_calls arrays
      const messagesToSave = sanitizeMessages(conversations[sessionId] || []);
      await supabase.from('restaurant').upsert([
        {
          conversation_id: sessionId,
          messages: messagesToSave,
        }
      ], { onConflict: ['conversation_id'] });
    } catch (dbError) {
      console.error('Supabase DB error:', dbError.message);
    }

    // If there were any tool calls, let the model do a brief second turn to compose the final reply
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const secondTurnMessages = sanitizeMessages(conversations[sessionId]);
      try {
        const second = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-5-nano',
            messages: secondTurnMessages
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const composed = second.data.choices[0]?.message?.content;
        if (composed && composed.trim()) {
          aiMessage = composed;
          conversations[sessionId].push({ role: 'assistant', content: aiMessage });
        }
      } catch (e) {
        // fall back silently
      }
    }

    // Optionally analyze in background every 2 exchanged messages (user/assistant)
    try {
      const turnCount = (conversations[sessionId] || []).filter(
        (m) => m && (m.role === 'user' || m.role === 'assistant')
      ).length;
      if (turnCount % 2 === 0) {
        // Ensure analysis completes so dashboard updates reliably
        await analyzeConversationDirect(sessionId, conversations[sessionId]);
      }
    } catch {}

    res.json({ 
      response: aiMessage,
      tool_results: toolResultsForResponse
    });
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI API' });
  }
}; 
