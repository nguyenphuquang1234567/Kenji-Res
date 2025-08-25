const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables');
}

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
- Keep replies warm, respectful, and to-the-point (prefer 1–3 short sentences). Use the same language as the user. Ask only one question at a time.

HOUSE INFO
- Brand: Kenji Shop (Contemporary Japanese dining)
- Address: 123 Nguyen Hue, District 1, Ho Chi Minh City
- Hotline: 1900 1234
- Reservations: Not handled via chat right now. If asked, say we currently don't take reservations online and kindly direct to the hotline, or suggest walk-in.
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
- Featured/Omakase: If asked, explain it's the chef's curated selection.

Conversation flow:
- 1. First, ask if the user want to order something from the menu. If they mention a dish from the menu, go to step 4. If not, go to step 2.
- 2. Then, list all the dishes from the MENU REFERENCE, just include the dish name, and ask if the user like to know more about the dish or order it.
- 3. After that, if user want to know more about a specific dish, use the tool show_food_image.
- 4. If the user confirm the dishes, do not use the tool show_food_image, just confirm the user's dishes. Next, ask for the customer's name -> email -> phone number -> address. Ask the user one by one.
- 5. Next, ask them for date, time and their timezone,  and confirmed the delivery time.
- 6. Finally, ask if they have any notes or questions before ending the chat.
- 7. If the user has any notes or questions, ask them to send it to the email address: kenji.shop@gmail.com.

TONE
- Avoid long paragraphs; use bullets sparingly when listing options.`;
const conversations = {};

// Function to get food image URL based on dish name
function getFoodImageUrl(dishName) {
  const foodImages = {
    'wagyu steak': 'images/wagyu_steak.png',
    'salmon teriyaki': 'images/salmon_teriyaki.png',
    'uni truffle udon': 'images/udon.png',
    'seaweed salad': 'images/seaweed_salad.png',
    'matcha tiramisu': 'images/matcha.png',
    'tonkotsu ramen': 'images/tonkotsu_ramen.png',
    'chicken karaage': 'images/chicken.png',
    'mochi ice cream': 'images/mochi_ice_cream.png'
  };
  
  const normalizedName = dishName.toLowerCase().trim();
  return foodImages[normalizedName] || null;
}

// Function to check if user is requesting to see a dish image
function checkForDishImageRequest(message) {
  const lowerMessage = message.toLowerCase();
  
  // Keywords that indicate user wants to see an image
  const imageKeywords = [
    'show me', 'show', 'see', 'look at', 'picture', 'image', 'photo', 'view', 'know',
    'what does', 'how does', 'tell me about', 'more about', 'details about', 'detail on',
    'detail', 'about', 'tell me', 'describe', 'explain', 'more'
  ];
  
  // Menu items with descriptions
  const menuItems = {
    'wagyu steak': 'A5 Wagyu, yuzu kosho butter, black garlic glaze',
    'salmon teriyaki': 'Pan-seared salmon, house teriyaki, shiso greens',
    'uni truffle udon': 'Fresh udon, uni cream, truffle aroma',
    'seaweed salad': 'Wakame, sesame dressing, toasted nori',
    'matcha tiramisu': 'Mascarpone, sponge, ceremonial matcha',
    'tonkotsu ramen': 'Rich pork broth, chashu, ajitama, nori',
    'chicken karaage': 'Crispy marinated chicken, lemon, yuzu mayo',
    'mochi ice cream': 'Soft mochi, vanilla gelato, kinako dust'
  };
  
  // Check if message contains image keywords and a dish name
  for (const [dishName, description] of Object.entries(menuItems)) {
    if (lowerMessage.includes(dishName.toLowerCase()) && 
        imageKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        dish_name: dishName,
        description: description
      };
    }
  }
  
  return null;
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
    // Check if user is asking to see a specific dish image
    const dishImageRequest = checkForDishImageRequest(message);
    
    if (dishImageRequest) {
      // Handle dish image request directly without calling model
      const imageUrl = getFoodImageUrl(dishImageRequest.dish_name);
      if (!imageUrl) {
        return res.status(400).json({ error: 'Image not found for this dish' });
      }
      
      const toolResultsForResponse = [{
        dish_name: dishImageRequest.dish_name,
        description: dishImageRequest.description,
        image_url: imageUrl
      }];
      
      const aiMessage = `Here's the ${dishImageRequest.dish_name}: ${dishImageRequest.description}`;
      
      // Add to conversation history
      conversations[sessionId].push({ 
        role: 'assistant', 
        content: aiMessage,
        tool_calls: [{
          id: 'direct_call',
          type: 'function',
          function: {
            name: 'show_food_image',
            arguments: JSON.stringify({
              dish_name: dishImageRequest.dish_name,
              description: dishImageRequest.description
            })
          }
        }]
      });
      
      // Add tool response message
      conversations[sessionId].push({
        role: 'tool',
        tool_call_id: 'direct_call',
        name: 'show_food_image',
        content: JSON.stringify({
          dish_name: dishImageRequest.dish_name,
          description: dishImageRequest.description,
          image_url: getFoodImageUrl(dishImageRequest.dish_name)
        })
      });
      
      // Save to database and analyze
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
      
      await analyzeConversationDirect(sessionId, conversations[sessionId]);
      
      return res.json({ 
        response: aiMessage,
        tool_results: toolResultsForResponse
      });
    }
    
    // Normal conversation - call model
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
    
    const aiMessage = response.data.choices[0]?.message?.content || 'Sorry, I encountered an error. Please try again.';
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

    res.json({ 
      response: aiMessage,
      tool_results: null
    });
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get response from OpenAI API' });
  }
}; 
