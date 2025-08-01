const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Webhook URL for conversation analysis
const WEBHOOK_URL = process.env.CONVERSATION_WEBHOOK_URL;

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

  if (!WEBHOOK_URL) {
    return res.status(500).json({ error: 'Webhook URL not configured' });
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
    
    // Send complete conversation JSON to webhook (same as Supabase format)
    const webhookResponse = await axios.post(WEBHOOK_URL, {
      conversation_id: conversationId,
      messages: messages, // Complete conversation JSON array
      total_messages: messages.length,
      timestamp: new Date().toISOString(),
      manual_analysis: true // Flag to indicate this is a manual analysis request
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MindTek-Chatbot/1.0'
      },
      timeout: 15000 // 15 second timeout for manual analysis
    });

    if (!webhookResponse.data || webhookResponse.status !== 200) {
      return res.status(500).json({ error: 'Webhook analysis failed' });
    }

    const analysis = webhookResponse.data;
    
    // Update the conversation record with the analysis
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
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
      })
      .eq('conversation_id', conversationId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(500).json({ error: 'Failed to save analysis to database' });
    }

    res.json({ 
      success: true, 
      analysis: analysis,
      message: 'Conversation analyzed successfully via webhook'
    });

  } catch (error) {
    console.error('Webhook analysis error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to analyze conversation via webhook' });
  }
}; 