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
        
        // Left side with conversation info
        const leftSide = document.createElement('div');
        leftSide.className = 'flex-1';
        
        const infoBtn = document.createElement('button');
        infoBtn.className = 'text-left w-full';
        const date = new Date(conv.created_at || Date.now());
        infoBtn.innerHTML = `<span class="font-medium text-gray-800">ID: ${conv.conversation_id}</span><span class="text-xs text-gray-500 ml-2">${date.toLocaleString()}</span>`;
        infoBtn.onclick = () => loadMessages(conv.conversation_id);
        leftSide.appendChild(infoBtn);
        
        // Lead quality indicator
        if (conv.lead_quality) {
          const qualityBadge = document.createElement('span');
          const qualityColors = {
            'good': 'bg-green-100 text-green-800',
            'ok': 'bg-yellow-100 text-yellow-800',
            'spam': 'bg-red-100 text-red-800'
          };
          qualityBadge.className = `ml-2 px-2 py-1 text-xs rounded-full ${qualityColors[conv.lead_quality] || 'bg-gray-100 text-gray-800'}`;
          qualityBadge.textContent = conv.lead_quality.toUpperCase();
          leftSide.appendChild(qualityBadge);
        }
        
        item.appendChild(leftSide);

        // Right side with action buttons
        const rightSide = document.createElement('div');
        rightSide.className = 'flex items-center gap-2';
        
        // Analyze button
        const analyzeBtn = document.createElement('button');
        analyzeBtn.className = 'p-2 rounded-full hover:bg-blue-100 text-blue-600 transition flex items-center';
        analyzeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>`;
        analyzeBtn.title = conv.analyzed_at ? 'Re-analyze conversation' : 'Analyze conversation';
        analyzeBtn.onclick = async (e) => {
          e.stopPropagation();
          await analyzeConversation(conv.conversation_id);
        };
        rightSide.appendChild(analyzeBtn);
        
        // View analysis button (if already analyzed)
        if (conv.analyzed_at) {
          const viewAnalysisBtn = document.createElement('button');
          viewAnalysisBtn.className = 'p-2 rounded-full hover:bg-green-100 text-green-600 transition flex items-center';
          viewAnalysisBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.639 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.639 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;
          viewAnalysisBtn.title = 'View analysis';
          viewAnalysisBtn.onclick = async (e) => {
            e.stopPropagation();
            await showAnalysis(conv);
          };
          rightSide.appendChild(viewAnalysisBtn);
        }

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'p-2 rounded-full hover:bg-red-100 text-red-600 transition flex items-center';
        delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
        delBtn.title = 'Delete conversation';
        delBtn.onclick = async (e) => {
          e.stopPropagation();
          if (confirm('Are you sure you want to delete this conversation?')) {
            await deleteConversation(conv.conversation_id);
          }
        };
        rightSide.appendChild(delBtn);
        
        item.appendChild(rightSide);

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

  async function analyzeConversation(conversationId) {
    try {
      const response = await fetch('/api/analyze_conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadConversations(); // Refresh the list to show updated analysis
      } else {
        alert('Failed to analyze conversation: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to analyze conversation: ' + err.message);
    }
  }

  async function showAnalysis(conversation) {
    conversationList.style.display = 'none';
    messagesContainer.style.display = 'block';
    
    const backBtn = document.createElement('button');
    backBtn.className = 'mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition';
    backBtn.textContent = 'Back to List';
    backBtn.onclick = loadConversations;
    messagesContainer.appendChild(backBtn);

    const analysisContainer = document.createElement('div');
    analysisContainer.className = 'bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto';
    
    const title = document.createElement('h2');
    title.className = 'text-2xl font-bold mb-6 text-gray-800';
    title.textContent = 'Customer Analysis';
    analysisContainer.appendChild(title);

    // Lead quality badge
    const qualityBadge = document.createElement('div');
    qualityBadge.className = 'mb-4';
    const qualityColors = {
      'good': 'bg-green-100 text-green-800 border-green-200',
      'ok': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'spam': 'bg-red-100 text-red-800 border-red-200'
    };
    qualityBadge.innerHTML = `
      <span class="inline-block px-3 py-1 rounded-full text-sm font-medium border ${qualityColors[conversation.lead_quality] || 'bg-gray-100 text-gray-800 border-gray-200'}">
        Lead Quality: ${conversation.lead_quality?.toUpperCase() || 'NOT ANALYZED'}
      </span>
    `;
    analysisContainer.appendChild(qualityBadge);

    // Analysis grid
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';

    const analysisFields = [
      { key: 'customer_name', label: 'Customer Name', icon: '👤' },
      { key: 'customer_email', label: 'Email Address', icon: '📧' },
      { key: 'customer_phone', label: 'Phone Number', icon: '📞' },
      { key: 'customer_industry', label: 'Industry', icon: '🏢' },
      { key: 'customer_problem', label: 'Problems & Goals', icon: '🎯' },
      { key: 'customer_availability', label: 'Availability', icon: '📅' },
      { key: 'customer_consultation', label: 'Consultation Booked', icon: '✅' },
      { key: 'special_notes', label: 'Special Notes', icon: '📝' }
    ];

    analysisFields.forEach(field => {
      const fieldContainer = document.createElement('div');
      fieldContainer.className = 'bg-gray-50 rounded-lg p-4';
      
      const fieldLabel = document.createElement('div');
      fieldLabel.className = 'text-sm font-medium text-gray-600 mb-2';
      fieldLabel.innerHTML = `${field.icon} ${field.label}`;
      fieldContainer.appendChild(fieldLabel);
      
      const fieldValue = document.createElement('div');
      fieldValue.className = 'text-gray-800';
      
      if (field.key === 'customer_consultation') {
        fieldValue.innerHTML = conversation[field.key] ? 
          '<span class="text-green-600 font-medium">✓ Yes</span>' : 
          '<span class="text-red-600 font-medium">✗ No</span>';
      } else {
        fieldValue.textContent = conversation[field.key] || 'Not provided';
      }
      
      fieldContainer.appendChild(fieldValue);
      grid.appendChild(fieldContainer);
    });

    analysisContainer.appendChild(grid);

    // Analysis timestamp
    if (conversation.analyzed_at) {
      const timestamp = document.createElement('div');
      timestamp.className = 'mt-4 text-sm text-gray-500 text-center';
      timestamp.textContent = `Analyzed on: ${new Date(conversation.analyzed_at).toLocaleString()}`;
      analysisContainer.appendChild(timestamp);
    }

    messagesContainer.appendChild(analysisContainer);
  }

  loadConversations();
}); 