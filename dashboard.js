document.addEventListener('DOMContentLoaded', () => {
  const conversationList = document.getElementById('conversation-list');
  const messagesContainer = document.getElementById('messages-container');
  let conversations = [];

  // Fetch and display all conversations
  async function loadConversations() {
    messagesContainer.style.display = 'none';
    conversationList.style.display = 'block';
    conversationList.innerHTML = '<h2 class="text-2xl font-bold mb-4 text-center">Conversations</h2>';
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      conversations = data.conversations || [];
      if (conversations.length === 0) {
        conversationList.innerHTML += '<p class="text-gray-500 text-center">No conversations found.</p>';
        return;
      }
      const list = document.createElement('div');
      list.className = 'flex flex-col gap-2';
      conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between w-full px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 shadow transition';
        const infoBtn = document.createElement('button');
        infoBtn.className = 'flex-1 text-left';
        const date = new Date(conv.created_at || Date.now());
        infoBtn.innerHTML = `<span class="font-medium text-gray-800">ID: ${conv.conversation_id}</span><span class="text-xs text-gray-500 ml-2">${date.toLocaleString()}</span>`;
        infoBtn.onclick = () => loadMessages(conv.conversation_id);
        item.appendChild(infoBtn);

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'ml-4 p-2 rounded-full hover:bg-red-100 text-red-600 transition flex items-center';
        delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
        delBtn.title = 'Delete conversation';
        delBtn.onclick = async (e) => {
          e.stopPropagation();
          if (confirm('Are you sure you want to delete this conversation?')) {
            await deleteConversation(conv.conversation_id);
          }
        };
        item.appendChild(delBtn);

        list.appendChild(item);
      });
      conversationList.appendChild(list);
    } catch (err) {
      conversationList.innerHTML += '<p class="text-red-500 text-center">Error loading conversations.</p>';
    }
  }

  // Fetch and display messages for a conversation
  async function loadMessages(conversationId) {
    conversationList.style.display = 'none';
    messagesContainer.style.display = 'block';
    messagesContainer.innerHTML = '<button class="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition" id="back-to-list">Back to List</button>';
    try {
      const res = await fetch(`/api/conversations_messages?id=${encodeURIComponent(conversationId)}`);
      const data = await res.json();
      const messages = data.messages || [];
      if (messages.length === 0) {
        messagesContainer.innerHTML += '<p class="text-gray-500 text-center">No messages in this conversation.</p>';
      } else {
        const msgList = document.createElement('div');
        msgList.className = 'flex flex-col gap-3';
        messages.forEach(msg => {
          if (msg.role === 'system') return; // Skip system messages
          // Tạo row cho mỗi message
          const row = document.createElement('div');
          row.className = `msg-row ${msg.role === 'user' ? 'user' : 'bot'}`;

          // Avatar/icon
          const icon = document.createElement('div');
          icon.className = `msg-icon ${msg.role === 'user' ? '' : 'bot'}`;
          icon.innerHTML = msg.role === 'user'
            ? `<svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14c-2.5 0-4.5 1.5-4.5 3v1h9v-1c0-1.5-2-3-4.5-3z"/><circle cx="12" cy="10" r="2.5"/></svg>`
            : `<svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="8" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 15h8M9 9h6"/></svg>`;

          // Bong bóng chat
          const div = document.createElement('div');
          div.className = `message ${msg.role === 'user' ? 'user' : 'bot'}`;
          div.innerHTML = `<span>${msg.content}</span>`;

          // Gắn vào row
          if (msg.role === 'user') {
            row.appendChild(div);
            row.appendChild(icon);
          } else {
            row.appendChild(icon);
            row.appendChild(div);
          }
          msgList.appendChild(row);
        });
        messagesContainer.appendChild(msgList);
      }
    } catch (err) {
      messagesContainer.innerHTML += '<p class="text-red-500 text-center">Error loading messages.</p>';
    }
    document.getElementById('back-to-list').onclick = loadConversations;
  }

  async function deleteConversation(conversationId) {
    try {
      await fetch(`/api/conversations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId })
      });
      await loadConversations();
    } catch (err) {
      alert('Failed to delete conversation.');
    }
  }

  loadConversations();
}); 