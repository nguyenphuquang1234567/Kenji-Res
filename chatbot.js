document.addEventListener('DOMContentLoaded', function() {
    const chatDisplay = document.getElementById('chat-display');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    const userSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" stroke="#fff" stroke-width="2"/><path d="M4 20c0-3.3137 3.134-6 7-6s7 2.6863 7 6" stroke="#fff" stroke-width="2"/></svg>`;
    const botSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="16" height="10" rx="5" stroke="#fff" stroke-width="2"/><circle cx="9" cy="13" r="1.5" fill="#fff"/><circle cx="15" cy="13" r="1.5" fill="#fff"/><rect x="10.5" y="2" width="3" height="4" rx="1.5" stroke="#fff" stroke-width="2"/></svg>`;

    // Welcome message
    setTimeout(() => {
        appendMessage('Hello! I\'m your AI assistant. How can I help you today? 😊', 'bot');
    }, 500);

    function appendMessage(content, sender) {
        const row = document.createElement('div');
        row.className = 'msg-row ' + sender;
        
        const icon = document.createElement('span');
        icon.className = 'msg-icon ' + sender;
        icon.innerHTML = sender === 'user' ? userSVG : botSVG;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ' + sender;
        msgDiv.textContent = content;
        
        row.appendChild(icon);
        row.appendChild(msgDiv);
        chatDisplay.appendChild(row);
        
        // Smooth scroll to bottom
        setTimeout(() => {
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }, 100);
    }

    function showTypingIndicator() {
        const typingRow = document.createElement('div');
        typingRow.className = 'msg-row bot typing-row';
        typingRow.id = 'typing-indicator';
        
        const icon = document.createElement('span');
        icon.className = 'msg-icon bot';
        icon.innerHTML = botSVG;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        
        typingRow.appendChild(icon);
        typingRow.appendChild(typingDiv);
        chatDisplay.appendChild(typingRow);
        
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    function getBotResponse(userMessage) {
        const responses = [
            "That's an interesting question! Let me think about that... 🤔",
            "I understand what you're asking. Here's what I can tell you... 💡",
            "Great question! Based on my knowledge, I'd say... 📚",
            "I'm here to help! Let me provide you with some information... ✨",
            "Thanks for reaching out! Here's what I know about that... 🌟",
            "I appreciate your question. Let me share some insights... 💭",
            "That's a thoughtful inquiry! Here's my perspective... 🎯",
            "I'm glad you asked! Let me break this down for you... 📖"
        ];
        
        // Simple keyword-based responses
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            return "Hello there! 👋 How can I assist you today?";
        } else if (lowerMessage.includes('how are you')) {
            return "I'm doing great, thank you for asking! 😊 How can I help you?";
        } else if (lowerMessage.includes('thank')) {
            return "You're very welcome! 😊 Is there anything else I can help you with?";
        } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
            return "Goodbye! 👋 It was nice chatting with you. Have a great day!";
        } else if (lowerMessage.includes('name')) {
            return "I'm your AI assistant! 🤖 Nice to meet you!";
        } else if (lowerMessage.includes('help')) {
            return "I'm here to help! 💪 Just ask me anything and I'll do my best to assist you.";
        } else if (lowerMessage.includes('weather')) {
            return "I'd love to help with weather info, but I don't have access to real-time data. 🌤️ Try checking a weather app!";
        } else if (lowerMessage.includes('time')) {
            return `The current time is ${new Date().toLocaleTimeString()}. ⏰`;
        } else if (lowerMessage.includes('date')) {
            return `Today is ${new Date().toLocaleDateString()}. 📅`;
        } else {
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }

    function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;
        
        // Add user message
        appendMessage(text, 'user');
        userInput.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Simulate bot thinking and responding
        setTimeout(() => {
            hideTypingIndicator();
            const botResponse = getBotResponse(text);
            appendMessage(botResponse, 'bot');
        }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
    }

    // Enhanced input handling
    sendBtn.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Add focus effects
    userInput.addEventListener('focus', function() {
        sendBtn.style.transform = 'scale(1.05)';
    });

    userInput.addEventListener('blur', function() {
        sendBtn.style.transform = 'scale(1)';
    });

    // Add button click animation
    sendBtn.addEventListener('mousedown', function() {
        this.style.transform = 'scale(0.95)';
    });

    sendBtn.addEventListener('mouseup', function() {
        this.style.transform = 'scale(1.05)';
    });

    // Auto-focus input on load
    setTimeout(() => {
        userInput.focus();
    }, 1000);
}); 