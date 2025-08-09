# AI Chatbot with Supabase + Webhook Auto-Analysis

A modern, lightweight chatbot that stores conversations in Supabase and automatically analyzes them via a webhook after each user message. Includes a dashboard to view conversations and trigger manual re-analysis.

## Features

- Auto-analysis: every user message triggers a webhook for analysis (non-blocking)
- Manual analysis: re-run analysis from the dashboard
- Supabase persistence: full conversation history saved as JSON
- Clean UI: animated chatbot UI and a simple conversations dashboard
- Vercel-ready serverless API endpoints under `api/`

## Tech Stack

- Frontend: Vanilla JS, HTML, CSS
- Backend: Vercel serverless functions (Node.js)
- Database: Supabase (PostgreSQL)
- AI: Your webhook (you control the model) + OpenAI (optional in webhook example)

## Structure

```
chatbot/
├── api/
│   ├── chat.js                   # Chat endpoint (calls OpenAI, saves to Supabase, triggers webhook)
│   ├── analyze_conversation.js   # Manual analyze endpoint (sends full JSON to webhook)
│   ├── conversations.js          # List + delete conversations
│   └── conversations_messages.js # Fetch messages for a conversation
├── index.html                    # Chat UI
├── chatbot.js                    # Chat frontend logic
├── chatbot.css                   # Styling
├── dashboard.html                # Dashboard UI
├── dashboard.js                  # Dashboard logic
├── database_migration.sql        # Supabase schema changes for analysis fields
├── vercel.json                   # Vercel config (version 2)
└── package.json
```

## Environment Variables

Set these in your environment (e.g., Vercel Project Settings → Environment Variables):

- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_KEY` — Supabase service role key
- `OPENAI_API_KEY` — OpenAI API key (used by `api/chat.js` to generate replies)
- `CONVERSATION_WEBHOOK_URL` — your webhook endpoint that analyzes a conversation

## Database

Run `database_migration.sql` in Supabase SQL editor to add fields for analysis results:

- `customer_name`, `customer_email`, `customer_phone`
- `customer_industry`, `customer_problem`, `customer_availability`
- `customer_consultation` (boolean), `special_notes`
- `lead_quality` (enum: `good|ok|spam`), `analyzed_at`

## How It Works

1. User sends a message from the chat UI (`index.html` → `chatbot.js`).
2. `POST /api/chat` builds the message array and calls OpenAI to get the assistant reply.
3. The full conversation JSON is saved to Supabase (`conversations` table).
4. In the background, `api/chat.js` posts the full conversation JSON to your webhook.
5. Your webhook returns structured customer info; backend updates Supabase with the results.
6. On the dashboard, you can view conversations or click Analyze to re-run analysis via `POST /api/analyze_conversation`.

### Auto vs Manual Analysis

- Auto: Triggered after each user message (non-blocking; chat response is not delayed).
- Manual: Triggered from the dashboard (re-analysis).

## API Endpoints

- `POST /api/chat`
  - Body: `{ message: string, sessionId: string }`
  - Returns: `{ response: string }`
  - Side effects:
    - Upserts full conversation to Supabase
    - Sends the full JSON to `CONVERSATION_WEBHOOK_URL` for auto-analysis

- `POST /api/analyze_conversation`
  - Body: `{ conversationId: string }`
  - Sends the stored conversation JSON to `CONVERSATION_WEBHOOK_URL` and updates Supabase with returned fields

- `GET /api/conversations`
  - Returns conversation list with analysis fields

- `DELETE /api/conversations?id=...` or body `{ conversation_id: ... }`
  - Deletes a conversation

- `GET /api/conversations_messages?id=...`
  - Returns the `messages` array for a conversation

## Webhook Contract

Your webhook receives a POST like this (identical to how we store in Supabase):

```json
{
  "conversation_id": "abc123",
  "messages": [
    { "role": "system", "content": "You are the MindTek AI Assistant..." },
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help you?" }
  ],
  "total_messages": 3,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "manual_analysis": false
}
```

Your webhook should return JSON with these fields (camelCase or snake_case supported):

```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+1234567890",
  "customerIndustry": "Real Estate",
  "customerProblem": "Need help with lead generation and CRM integration",
  "customerAvailability": "Weekdays 2-5 PM",
  "customerConsultation": true,
  "specialNotes": "Interested in chatbot solutions",
  "leadQuality": "good"
}
```

These fields are persisted back into the `conversations` row along with `analyzed_at`.

## Frontend

- `index.html` — chat UI
  - The assistant prompt guides: industry → challenges/goals → tailored services → collect name/email/phone → suggest booking → ask for date/time/timezone → final notes/questions.
- `dashboard.html` — conversation list, view messages, analyze, delete

## Running Locally

This project is organized for Vercel serverless functions. Recommended:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Use Vercel CLI for local dev (recommended):
   ```bash
   npm i -g vercel
   vercel dev
   ```
   - Static files served at `http://localhost:3000`
   - API routes under `http://localhost:3000/api/*`

Alternatively, deploy directly to Vercel and configure environment variables in the dashboard.

## Notes & Tips

- The webhook is optional for chat to work, but required for analysis fields to be populated.
- Auto-analysis is fire-and-forget; failures are logged and do not block chat responses.
- Ensure your webhook endpoint is public and fast (set reasonable timeouts your side).
- Supabase upsert key: `conversation_id`.

## License

MIT
