const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ANALYSIS_SYSTEM_PROMPT = `Extract the following customer details from the transcript:
- Name
- Email address
- Phone number
- Industry
- Problems, needs, and goals summary
- Availability
- Whether they have booked a consultation (true/false)
- Any special notes
- Lead quality (categorize as 'good', 'ok', or 'spam')
Format the response using this JSON schema:
{
  "type": "object",
  "properties": {
    "customerName": { "type": "string" },
    "customerEmail": { "type": "string" },
    "customerPhone": { "type": "string" },
    "customerIndustry": { "type": "string" },
    "customerProblem": { "type": "string" },
    "customerAvailability": { "type": "string" },
    "customerConsultation": { "type": "boolean" },
    "specialNotes": { "type": "string" },
    "leadQuality": { "type": "string", "enum": ["good", "ok", "spam"] }
  },
  "required": ["customerName", "customerEmail", "customerProblem", "leadQuality"]
}

If the user provided contact details, set lead quality to "good"; otherwise, "spam".`;

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
      .from('conversations')
      .select('messages')
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError || !conversationData) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = conversationData.messages || [];
    
    // Filter out system messages and create a transcript
    const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content);
    const assistantMessages = messages.filter(msg => msg.role === 'assistant').map(msg => msg.content);
    
    const transcript = `User messages: ${userMessages.join('\n')}\n\nAssistant responses: ${assistantMessages.join('\n')}`;

    // Call OpenAI API for analysis
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: `Please analyze this conversation transcript and extract customer information:\n\n${transcript}` }
        ],
        temperature: 0.1,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const analysisText = response.data.choices[0].message.content;
    
    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(analysisText);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return res.status(500).json({ error: 'Failed to parse analysis response' });
    }

    // Update the conversation record with the analysis
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        customer_name: analysis.customerName || '',
        customer_email: analysis.customerEmail || '',
        customer_phone: analysis.customerPhone || '',
        customer_industry: analysis.customerIndustry || '',
        customer_problem: analysis.customerProblem || '',
        customer_availability: analysis.customerAvailability || '',
        customer_consultation: analysis.customerConsultation || false,
        special_notes: analysis.specialNotes || '',
        lead_quality: analysis.leadQuality || 'spam',
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
    console.error('Analysis error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to analyze conversation' });
  }
}; 