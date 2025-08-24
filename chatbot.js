document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('chat-toggle-btn');
    const closeBtn = document.getElementById('chat-close-btn');
    const panel = document.getElementById('chatbot-panel');
    const chatDisplay = document.getElementById('chat-display');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const resetBtn = document.getElementById('reset-btn');

    const userSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" stroke="#fff" stroke-width="2"/><path d="M4 20c0-3.3137 3.134-6 7-6s7 2.6863 7 6" stroke="#fff" stroke-width="2"/></svg>`;
    const botSVG = `<img src="images/logo.png" alt="Kenji Assistant" class="msg-avatar" />`;

    // Food image mapping function
    function getFoodImage(dishName) {
        const foodImages = {
            'wagyu': 'images/wagyu_steak.png',
            'wagyu steak': 'images/wagyu_steak.png',
            'salmon': 'images/salmon_teriyaki.png',
            'salmon teriyaki': 'images/salmon_teriyaki.png',
            'udon': 'images/udon.png',
            'uni truffle udon': 'images/udon.png',
            'seaweed': 'images/seaweed_salad.png',
            'seaweed salad': 'images/seaweed_salad.png',
            'matcha': 'images/matcha.png',
            'matcha tiramisu': 'images/matcha.png',
            'ramen': 'images/tonkotsu_ramen.png',
            'tonkotsu': 'images/tonkotsu_ramen.png',
            'tonkotsu ramen': 'images/tonkotsu_ramen.png',
            'chicken': 'images/chicken.png',
            'karaage': 'images/chicken.png',
            'chicken karaage': 'images/chicken.png',
            'mochi': 'images/mochi_ice_cream.png',
            'mochi ice cream': 'images/mochi_ice_cream.png'
        };
        
        const lowerDishName = dishName.toLowerCase();
        for (const [key, imagePath] of Object.entries(foodImages)) {
            if (lowerDishName.includes(key)) {
                return imagePath;
            }
        }
        return null;
    }

    // Function to check if message contains food recommendations
    function containsFoodRecommendation(message) {
        const foodKeywords = [
            'wagyu', 'salmon', 'udon', 'seaweed', 'matcha', 'ramen', 
            'chicken', 'karaage', 'mochi', 'steak', 'teriyaki', 'tiramisu'
        ];
        const lowerMessage = message.toLowerCase();
        return foodKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    // Function to extract dish names from message
    function extractDishNames(message) {
        const dishes = [];
        const foodKeywords = [
            'wagyu steak', 'salmon teriyaki', 'uni truffle udon', 'seaweed salad',
            'matcha tiramisu', 'tonkotsu ramen', 'chicken karaage', 'mochi ice cream'
        ];
        
        const lowerMessage = message.toLowerCase();
        foodKeywords.forEach(dish => {
            if (lowerMessage.includes(dish)) {
                dishes.push(dish);
            }
        });
        
        return dishes;
    }

    // Toggle handlers
    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', function() {
            const isHidden = panel.style.display === 'none' || panel.style.display === '';
            if (isHidden) {
                panel.style.display = 'flex';
                setTimeout(() => userInput && userInput.focus(), 50);
            } else {
                panel.style.display = 'none';
            }
        });
    }
    if (closeBtn && panel) {
        closeBtn.addEventListener('click', function() {
            panel.style.display = 'none';
        });
    }

    function appendMessage(content, sender) {
        const row = document.createElement('div');
        row.className = 'msg-row ' + sender;
        
        const icon = document.createElement('span');
        icon.className = 'msg-icon ' + sender;
        icon.innerHTML = sender === 'user' ? userSVG : botSVG;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ' + sender;
        
        // Check if this is a bot message with food recommendations
        if (sender === 'bot' && containsFoodRecommendation(content)) {
            const dishNames = extractDishNames(content);
            
            // Add the text content first
            msgDiv.appendChild(document.createTextNode(content));
            
            // Add images for each dish mentioned
            dishNames.forEach(dishName => {
                const imagePath = getFoodImage(dishName);
                if (imagePath) {
                    const imgElement = document.createElement('img');
                    imgElement.src = imagePath;
                    imgElement.alt = dishName;
                    imgElement.className = 'food-image';
                    
                    // Add line break before image
                    msgDiv.appendChild(document.createElement('br'));
                    msgDiv.appendChild(imgElement);
                }
            });
        } else {
            msgDiv.textContent = content;
        }
        
        row.appendChild(icon);
        row.appendChild(msgDiv);
        chatDisplay.appendChild(row);
        
        // Enhanced scroll animation
        setTimeout(() => {
            chatDisplay.scrollTo({
                top: chatDisplay.scrollHeight,
                behavior: 'smooth'
            });
        }, 150);
        
        // Add subtle entrance animation
        row.style.opacity = '0';
        row.style.transform = 'translateY(20px)';
        setTimeout(() => {
            row.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, 50);
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
        // Add enhanced visual feedback
        resetBtn.style.transform = 'scale(0.85) rotate(180deg)';
        resetBtn.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        
        setTimeout(() => {
            // Clear the chat display with fade effect
            const messages = chatDisplay.querySelectorAll('.msg-row');
            messages.forEach((msg, index) => {
                setTimeout(() => {
                    msg.style.transition = 'all 0.3s ease';
                    msg.style.opacity = '0';
                    msg.style.transform = 'translateX(-20px)';
                }, index * 50);
            });
            
            setTimeout(() => {
                chatDisplay.innerHTML = '';
                
                // Generate a new session ID
                newSessionId();
                
                // Reset the conversation state
                isNewConversation = true;
                
                // Focus back on the input
                userInput.focus();
                
                // Reset button animation
                resetBtn.style.transform = 'scale(1) rotate(0deg)';
            }, messages.length * 50 + 300);
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