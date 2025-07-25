require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const chatHandler = require('./handlers/chatHandler');
const conversationsHandler = require('./handlers/conversationsHandler');
const conversationsMessagesHandler = require('./handlers/conversationsMessagesHandler');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serves files from the project root

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat endpoint
app.post('/chat', chatHandler);
app.post('/api/chat', chatHandler);

// Conversations endpoints
app.get('/api/conversations', conversationsHandler);
app.delete('/api/conversations', conversationsHandler);

// Messages for a conversation
app.get('/api/conversations/messages', conversationsMessagesHandler);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
}); 