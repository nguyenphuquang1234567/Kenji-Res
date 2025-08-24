# Kenji Shop - AI Restaurant Assistant

A modern Japanese restaurant website with an intelligent AI chatbot that automatically analyzes customer conversations and extracts order information. Built with vanilla JavaScript, Supabase, and OpenAI.

## 🍜 Features

- **Interactive Restaurant Website**: Beautiful, responsive design showcasing Kenji Shop's menu
- **AI Chatbot with Food Images**: Intelligent assistant that displays food images when recommending dishes
- **Auto-Analysis**: Every customer message triggers automatic conversation analysis
- **Order Management**: Extracts customer details, order items, and special requests
- **Dashboard**: Admin panel to view conversations and manage orders
- **Real-time Chat**: Seamless chat experience with conversation history
- **Mobile Responsive**: Optimized for all devices with touch-friendly interface
- **Modern UI/UX**: Japanese-inspired design with smooth animations and micro-interactions

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-5 Nano
- **Styling**: Custom CSS with modern design system and responsive breakpoints

## 📁 Project Structure

```
Kenji-Res/
├── api/
│   ├── chat.js                   # Main chat endpoint with auto-analysis
│   ├── analyze_conversation.js   # Manual conversation analysis
│   ├── conversations.js          # List and delete conversations
│   └── conversations_messages.js # Fetch conversation messages
├── images/                       # Restaurant food images
│   ├── background.png
│   ├── chicken.png
│   ├── logo.png
│   ├── matcha.png
│   ├── mochi_ice_cream.png
│   ├── salmon_teriyaki.png
│   ├── seaweed_salad.png
│   ├── tonkotsu_ramen.png
│   ├── udon.png
│   └── wagyu_steak.png
├── index.html                    # Main restaurant website
├── chatbot.js                    # Chat frontend logic with food image display
├── chatbot.css                   # Chat styling with responsive design
├── dashboard.html                # Admin dashboard
├── dashboard.js                  # Dashboard logic
├── database_migration.sql        # Supabase schema
├── vercel.json                   # Vercel configuration
└── package.json
```

## 🍽️ Menu Items

The restaurant features these signature dishes with beautiful food images:
- **Wagyu Steak** — $68.90 — A5 Wagyu, yuzu kosho butter, black garlic glaze
- **Salmon Teriyaki** — $32.90 — Pan-seared salmon, house teriyaki, shiso greens
- **Uni Truffle Udon** — $34.90 — Fresh udon, uni cream, truffle aroma
- **Seaweed Salad** — $14.90 — Wakame, sesame dressing, toasted nori
- **Matcha Tiramisu** — $12.90 — Mascarpone, sponge, ceremonial matcha
- **Tonkotsu Ramen** — $21.90 — Rich pork broth, chashu, ajitama, nori
- **Chicken Karaage** — $17.90 — Crispy marinated chicken, lemon, yuzu mayo
- **Mochi Ice Cream** — $11.90 — Soft mochi, vanilla gelato, kinako dust

## 🔧 Environment Variables

Set these in your Vercel project settings:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

## 🗄️ Database Setup

Run the `database_migration.sql` file in your Supabase SQL editor to create the required schema:

```sql
-- Creates restaurant table with analysis fields
-- Includes: customer_name, customer_email, customer_phone, order_time, 
-- customer_address, order_item, special_notes, lead_quality, analyzed_at
```

## 🤖 How the AI Chatbot Works

1. **Customer Interaction**: Users chat with Kenji Assistant through the website
2. **Menu Assistance**: AI helps with menu questions, recommendations, and dietary info
3. **Food Image Display**: When recommending dishes, chatbot automatically shows beautiful food images
4. **Order Collection**: System collects customer details step by step:
   - Name → Email → Phone → Address
   - Order items and preferences
   - Delivery time and timezone
   - Special notes and questions
5. **Auto-Analysis**: After each message, the system automatically analyzes the conversation
6. **Data Extraction**: Extracts structured customer and order information
7. **Database Storage**: Saves conversation history and analysis results

## 🖼️ Food Image Feature

The chatbot intelligently displays food images when discussing menu items:
- **Automatic Detection**: Recognizes dish names in conversations
- **Visual Enhancement**: Shows high-quality food images alongside text descriptions
- **Responsive Images**: Optimized for all screen sizes
- **Smooth Animations**: Elegant image transitions and hover effects

## 📊 Auto-Analysis Features

The system automatically extracts:
- **Customer Information**: Name, email, phone, address
- **Order Details**: Items ordered, special requests
- **Timing**: Order time and delivery preferences
- **Quality Assessment**: Lead quality (good/ok/spam)
- **Notes**: Special instructions or dietary requirements

## 🎛️ API Endpoints

### Chat Endpoint
```http
POST /api/chat
Content-Type: application/json

{
  "message": "string",
  "sessionId": "string"
}
```

### Conversations Management
```http
GET /api/conversations                    # List all conversations
DELETE /api/conversations?id=sessionId    # Delete conversation
GET /api/conversations_messages?id=sessionId  # Get conversation messages
```

### Manual Analysis
```http
POST /api/analyze_conversation
Content-Type: application/json

{
  "conversationId": "string"
}
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Local Development
```bash
# Install dependencies
npm install

# Install Vercel CLI
npm i -g vercel

# Run locally
vercel dev
```

## 🎨 Design Features

- **Modern UI**: Dark theme with Japanese-inspired design
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: CSS transitions and micro-interactions
- **Accessibility**: ARIA labels and keyboard navigation
- **Performance**: Optimized images and lazy loading
- **Touch-Friendly**: Mobile-optimized interface with proper touch targets

## 📱 Responsive Design

The website is fully responsive with breakpoints for:
- **Desktop**: 1200px+ with full layout
- **Tablet**: 768px-1024px with adapted grid
- **Mobile**: <768px with single-column layout and mobile menu
- **Small Mobile**: <480px with optimized spacing

## 🤖 Chatbot Features

- **Floating Chat**: Non-intrusive chat button with smooth animations
- **Real-time Responses**: Instant AI-powered replies
- **Food Image Display**: Automatic food images when discussing menu items
- **Conversation History**: Persistent chat sessions
- **Smart Recommendations**: Contextual menu suggestions
- **Multi-language Support**: Responds in user's language
- **Mobile Optimized**: Touch-friendly interface with proper button sizing

## 🔍 Dashboard Features

- **Conversation Overview**: List all customer interactions
- **Order Management**: View extracted order details
- **Quality Filtering**: Filter by lead quality
- **Manual Analysis**: Re-analyze conversations
- **Data Export**: View full conversation transcripts

## 🛡️ Security & Privacy

- **CORS Protection**: Proper CORS headers for API endpoints
- **Input Validation**: Sanitized user inputs
- **Error Handling**: Graceful error responses
- **Rate Limiting**: Built-in protection against abuse

## 📈 Performance

- **Serverless**: Scalable Vercel functions
- **CDN**: Global content delivery
- **Optimized Images**: Compressed food images with lazy loading
- **Responsive Images**: Different sizes for different devices
- **Efficient CSS**: Optimized stylesheets with minimal reflows

## 🎯 Key Improvements

### Latest Updates:
- ✅ **Food Image Display**: Chatbot shows food images when recommending dishes
- ✅ **Mobile Responsive**: Fully optimized for mobile devices
- ✅ **Improved UI**: Better button layout and spacing
- ✅ **Touch Optimization**: Proper touch targets for mobile users
- ✅ **Performance**: Optimized loading and animations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on multiple devices
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for your own restaurant or business.

## 🆘 Support

For issues or questions:
1. Check the existing issues
2. Create a new issue with detailed description
3. Include error logs and steps to reproduce
4. Specify device and browser information for responsive issues

---

**Kenji Shop** - Where tradition meets innovation in Japanese dining. 🍣✨
