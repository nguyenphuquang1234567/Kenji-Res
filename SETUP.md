# Setup Guide

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_KEY=your_supabase_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration (optional)
PORT=3000
```

## Database Setup

1. **Run the migration script** in your Supabase SQL editor:

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

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** (see above)

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Chat interface: http://localhost:3000
   - Dashboard: http://localhost:3000/dashboard

## Deployment to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set environment variables** in Vercel dashboard:
   - Go to your project settings
   - Add the environment variables listed above

## Testing

Run the test script to verify the analysis functionality:

```bash
npm test
```

## Troubleshooting

### Common Issues

1. **"Conversation not found" error**: Make sure the conversation exists in your database
2. **OpenAI API errors**: Check your API key and credits
3. **Database connection errors**: Verify your Supabase credentials
4. **CORS errors**: The API includes CORS headers, but check your browser console

### Debug Mode

To enable debug logging, add this to your `.env` file:

```env
DEBUG=true
```

## API Endpoints

- `POST /api/chat` - Handle chat interactions
- `GET /api/conversations` - List all conversations
- `DELETE /api/conversations` - Delete a conversation
- `GET /api/conversations_messages` - Get messages for a conversation
- `POST /api/analyze_conversation` - Analyze a conversation with AI
- `GET /health` - Health check endpoint 