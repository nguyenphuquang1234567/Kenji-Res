document.addEventListener('DOMContentLoaded', function() {
    const chatDisplay = document.getElementById('chat-display');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const resetBtn = document.getElementById('reset-btn');

    const userSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" stroke="#fff" stroke-width="2"/><path d="M4 20c0-3.3137 3.134-6 7-6s7 2.6863 7 6" stroke="#fff" stroke-width="2"/></svg>`;
    const botSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="16" height="10" rx="5" stroke="#fff" stroke-width="2"/><circle cx="9" cy="13" r="1.5" fill="#fff"/><circle cx="15" cy="13" r="1.5" fill="#fff"/><rect x="10.5" y="2" width="3" height="4" rx="1.5" stroke="#fff" stroke-width="2"/></svg>`;

    // Welcome message
    // setTimeout(() => {
    //     appendMessage('Hello! I\'m your AI assistant. How can I help you today? 😊', 'bot');
    // }, 500);

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

    // Add a function to generate or retrieve a sessionId
    function getSessionId() {
      let sessionId = localStorage.getItem('chatbot_session_id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chatbot_session_id', sessionId);
      }
      return sessionId;
    }

    let isNewConversation = true;

    // Add a function to generate a new sessionId
    function newSessionId() {
      const sessionId = Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem('chatbot_session_id', sessionId);
      return sessionId;
    }

    // Replace the function that sends messages to OpenAI with a call to the backend
    async function sendMessageToBackend(message) {
      const sessionId = getSessionId();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });
      if (!response.ok) {
        throw new Error('Failed to get response from backend');
      }
      const data = await response.json();
      return data.response;
    }

    // Modify sendMessage to auto-create a new sessionId if starting a new conversation
    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;
        
        // If this is a new conversation, generate a new sessionId
        if (isNewConversation) {
            newSessionId();
            isNewConversation = false;
        }

        // Add user message
        appendMessage(text, 'user');
        userInput.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Simulate bot thinking and responding
        try {
            const botResponse = await sendMessageToBackend(text);
            hideTypingIndicator();
            appendMessage(botResponse, 'bot');
        } catch (error) {
            hideTypingIndicator();
            appendMessage('Sorry, I encountered an error. Please try again later.', 'bot');
            console.error('Error sending message to backend:', error);
        }
    }

    // Reset conversation function
    function resetConversation() {
        // Clear the chat display
        chatDisplay.innerHTML = '';
        
        // Generate a new session ID
        newSessionId();
        
        // Reset the conversation state
        isNewConversation = true;
        
        // Focus back on the input
        userInput.focus();
        
        // Add a brief visual feedback
        resetBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            resetBtn.style.transform = 'scale(1)';
        }, 150);
    }

    // Enhanced input handling
    sendBtn.addEventListener('click', sendMessage);
    resetBtn.addEventListener('click', resetConversation);
    
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Add focus effects
    userInput.addEventListener('focus', function() {
        sendBtn.style.transform = 'scale(1.05)';
        resetBtn.style.transform = 'scale(1.05)';
    });

    userInput.addEventListener('blur', function() {
        sendBtn.style.transform = 'scale(1)';
        resetBtn.style.transform = 'scale(1)';
    });

    // Add button click animation
    sendBtn.addEventListener('mousedown', function() {
        this.style.transform = 'scale(0.95)';
    });

    sendBtn.addEventListener('mouseup', function() {
        this.style.transform = 'scale(1.05)';
    });

    resetBtn.addEventListener('mousedown', function() {
        this.style.transform = 'scale(0.95)';
    });

    resetBtn.addEventListener('mouseup', function() {
        this.style.transform = 'scale(1.05)';
    });

    // Auto-focus input on load
    setTimeout(() => {
        userInput.focus();
    }, 1000);
}); 