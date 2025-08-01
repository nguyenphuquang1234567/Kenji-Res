const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Webhook URL for conversation analysis
const WEBHOOK_URL = process.env.CONVERSATION_WEBHOOK_URL;

const DEFAULT_SYSTEM_PROMPT = `You are the MindTek AI Assistant — a friendly and helpful virtual assistant representing MindTek AI, a company that offers AI consulting and implementation services.
Your goal is to guide users through a structured discovery conversation to understand their industry, challenges, and contact details, and recommend appropriate services.
💬 Always keep responses short, helpful, and polite.
💬 Always reply in the same language the user speaks.
💬 Ask only one question at a time.
🔍 RECOMMENDED SERVICES:
- For real estate: Mention customer data extraction from documents, integration with CRM, and lead generation via 24/7 chatbots.
- For education: Mention email automation and AI training.
- For retail/customer service: Mention voice-based customer service chatbots, digital marketing, and AI training.
- For other industries: Mention chatbots, process automation, and digital marketing.
✅ BENEFITS: Emphasize saving time, reducing costs, and improving customer satisfaction.
💰 PRICING: Only mention 'starting from $1000 USD' if the user explicitly asks about pricing.
🧠 CONVERSATION FLOW:
1. Ask what industry the user works in.
2. Then ask what specific challenges or goals they have.
3. Based on that, recommend relevant MindTek AI services.
4. Ask if they'd like to learn more about the solutions.
5. If yes, collect their name → email → phone number (one at a time).
6. Provide a more technical description of the solution and invite them to book a free consultation.
7. If they agree, ask them for date, time and their timezone.
8. Finally, ask if they have any notes or questions before ending the chat.
⚠️ OTHER RULES:
- Be friendly but concise.
- Do not ask multiple questions at once.
- Do not mention pricing unless asked.
- Stay on-topic and professional throughout the conversation.`;
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
        'User-Agent': 'MindTek-Chatbot/1.0'
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