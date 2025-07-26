# Chatbot with Conversation Analysis

This chatbot application includes an AI-powered conversation analysis feature that extracts customer information and assesses lead quality using OpenAI's GPT-4 model.

## Features

- **Chat Interface**: Interactive chatbot for customer conversations
- **Conversation Management**: View and manage all conversations
- **AI Analysis**: Automatically extract customer information from conversations
- **Lead Quality Assessment**: Categorize leads as 'good', 'ok', or 'spam'
- **Dashboard**: Beautiful interface to view analysis results

## Setup Instructions

### 1. Database Migration

Run the following SQL in your Supabase SQL editor to add the required columns:

```sql
-- Add new columns to conversations table for customer analysis
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_industry TEXT,
ADD COLUMN IF NOT EXISTS customer_problem TEXT,
ADD COLUMN IF NOT EXISTS customer_availability TEXT,
ADD COLUMN IF NOT EXISTS customer_consultation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS special_notes TEXT,
ADD COLUMN IF NOT EXISTS lead_quality TEXT CHECK (lead_quality IN ('good', 'ok', 'spam')),
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_lead_quality ON conversations(lead_quality);
CREATE INDEX IF NOT EXISTS idx_conversations_analyzed_at ON conversations(analyzed_at);
```

### 2. Environment Variables

Make sure you have the following environment variables set in your Vercel deployment:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase service role key
- `OPENAI_API_KEY`: Your OpenAI API key

### 3. Deploy to Vercel

The application is configured for Vercel deployment with the following API endpoints:

- `/api/chat` - Handle chat interactions
- `/api/conversations` - Manage conversations (GET/DELETE)
- `/api/conversations_messages` - Get conversation messages
- `/api/analyze_conversation` - Analyze conversations with AI

## Usage

### Analyzing Conversations

1. **Access the Dashboard**: Navigate to `/dashboard.html`
2. **View Conversations**: See all conversations with lead quality indicators
3. **Analyze Conversation**: Click the magic wand icon (✨) next to any conversation
4. **View Results**: Click the eye icon (👁️) to view detailed analysis

### Analysis Results

The AI extracts the following information from each conversation:

- **Customer Name**: Extracted name from the conversation
- **Email Address**: Customer's email if provided
- **Phone Number**: Customer's phone if provided
- **Industry**: Customer's industry/business type
- **Problems & Goals**: Summary of customer needs and challenges
- **Availability**: Customer's availability for consultation
- **Consultation Booked**: Whether they've scheduled a consultation
- **Special Notes**: Any additional notes from the conversation
- **Lead Quality**: Categorized as 'good', 'ok', or 'spam'

### Lead Quality Logic

- **Good**: Customer provided contact details (email/phone)
- **Spam**: No contact details provided
- **OK**: Partial information or unclear intent

## API Endpoints

### POST /api/analyze_conversation

Analyzes a conversation using OpenAI GPT-4 to extract customer information.

**Request Body:**
```json
{
  "conversationId": "conversation_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "+1234567890",
    "customerIndustry": "Real Estate",
    "customerProblem": "Need help with lead generation",
    "customerAvailability": "Weekdays 9-5",
    "customerConsultation": true,
    "specialNotes": "Interested in chatbot solutions",
    "leadQuality": "good"
  },
  "message": "Conversation analyzed successfully"
}
```

## Technical Details

### System Prompt

The analysis uses a carefully crafted system prompt that instructs the AI to:

1. Extract specific customer information fields
2. Format responses as JSON
3. Assess lead quality based on contact information provided
4. Handle edge cases and missing information gracefully

### Database Schema

The conversations table includes these new columns:

- `customer_name` (TEXT)
- `customer_email` (TEXT)
- `customer_phone` (TEXT)
- `customer_industry` (TEXT)
- `customer_problem` (TEXT)
- `customer_availability` (TEXT)
- `customer_consultation` (BOOLEAN)
- `special_notes` (TEXT)
- `lead_quality` (TEXT - 'good', 'ok', 'spam')
- `analyzed_at` (TIMESTAMP)

## Troubleshooting

### Common Issues

1. **Analysis fails**: Check that your OpenAI API key is valid and has sufficient credits
2. **Database errors**: Ensure the migration script has been run in Supabase
3. **Missing analysis button**: Refresh the dashboard after running the migration

### Error Handling

The application includes comprehensive error handling for:
- OpenAI API failures
- Database connection issues
- Invalid conversation IDs
- JSON parsing errors

## Security Considerations

- All API endpoints include CORS headers for cross-origin requests
- Environment variables are used for sensitive configuration
- Input validation is performed on all API endpoints
- Database queries use parameterized statements to prevent SQL injection 