document.addEventListener('DOMContentLoaded', function() {
    const chatDisplay = document.getElementById('chat-display');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    const userSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" stroke="#007bff" stroke-width="2"/><path d="M4 20c0-3.3137 3.134-6 7-6s7 2.6863 7 6" stroke="#007bff" stroke-width="2"/></svg>`;
    const botSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="16" height="10" rx="5" stroke="#e75480" stroke-width="2"/><circle cx="9" cy="13" r="1.5" fill="#e75480"/><circle cx="15" cy="13" r="1.5" fill="#e75480"/><rect x="10.5" y="2" width="3" height="4" rx="1.5" stroke="#e75480" stroke-width="2"/></svg>`;

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
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;
        appendMessage(text, 'user');
        userInput.value = '';
        setTimeout(() => {
            appendMessage('Hello! I am a fixed-response bot. How can I help you?', 'bot');
        }, 500);
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
}); 