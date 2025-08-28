document.addEventListener('DOMContentLoaded', () => {
  const conversationList = document.getElementById('conversation-list');
  const messagesContainer = document.getElementById('messages-container');
  let conversations = [];
  let currentFilter = 'all'; // 'all' | 'good' | 'ok' | 'spam'
  const BOT_ICON_PATH = 'images/logo.png';
  
  // Dashboard is always live - no refresh needed

  // Add refresh controls to the page
  function addRefreshControls() {
    // No refresh controls needed - dashboard is always live
  }

  // Render conversion rate statistics
  function renderConversionRateStats(parentEl, items) {
    const container = document.createElement('div');
    container.className = 'mb-6';

    const total = items.length;
    const withOrders = items.filter(c => c.order_item && String(c.order_item).trim() !== '').length;
    const conversionRate = total > 0 ? Math.round((withOrders / total) * 1000) / 10 : 0; // one decimal place

    // Calculate additional metrics
    const analyzed = items.filter(c => Boolean(c?.analyzed_at) || typeof c?.lead_quality === 'string').length;
    const unanalyzed = total - analyzed;
    const goodLeads = items.filter(c => (c.lead_quality || '').toLowerCase() === 'good').length;
    const potentialConversion = goodLeads + items.filter(c => (c.lead_quality || '').toLowerCase() === 'ok').length;

    container.innerHTML = `
      <div class="stats-card">
        <div class="text-xl font-semibold mb-6 text-gray-800 text-center">Conversion Analytics</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <!-- Conversion Rate -->
          <div class="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div class="text-3xl font-bold text-blue-700 mb-2">${conversionRate}%</div>
            <div class="text-sm text-blue-600 font-medium">Conversion Rate</div>
            <div class="text-xs text-blue-500 mt-1">${withOrders}/${total} conversations</div>
          </div>
          
          <!-- Total Conversations -->
          <div class="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            <div class="text-3xl font-bold text-gray-700 mb-2">${total}</div>
            <div class="text-sm text-gray-600 font-medium">Total Conversations</div>
            <div class="text-xs text-gray-500 mt-1">All time</div>
          </div>
          
          <!-- Analyzed Conversations -->
          <div class="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
            <div class="text-3xl font-bold text-green-700 mb-2">${analyzed}</div>
            <div class="text-sm text-green-600 font-medium">Analyzed</div>
            <div class="text-xs text-green-500 mt-1">${unanalyzed} pending</div>
          </div>
          
          <!-- Potential Conversions -->
          <div class="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div class="text-3xl font-bold text-purple-700 mb-2">${potentialConversion}</div>
            <div class="text-sm text-purple-600 font-medium">High Potential</div>
            <div class="text-xs text-purple-500 mt-1">Good + OK leads</div>
          </div>
        </div>
        
        <!-- Conversion Progress Bar -->
        <div class="mt-6">
          <div class="flex justify-between text-sm text-gray-600 mb-3">
            <span class="font-medium">Conversion Progress</span>
            <span class="font-medium">${withOrders}/${total} (${conversionRate}%)</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div class="trend-bar h-full transition-all duration-1000 ease-out" 
                 style="width: ${conversionRate}%"></div>
          </div>
          <div class="conv-progress-labels mt-2">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
      </div>`;

    parentEl.appendChild(container);
  }

  // Helper: render lead quality summary cards
  function renderLeadQualitySummary(parentEl, items) {
    // Consider a conversation analyzed if it has analyzed_at or lead_quality present
    const analyzed = items.filter(c => Boolean(c?.analyzed_at) || typeof c?.lead_quality === 'string');
    const total = analyzed.length;

    const counts = { good: 0, ok: 0, spam: 0 };
    analyzed.forEach(c => {
      const key = (c.lead_quality || '').toLowerCase();
      if (key === 'good' || key === 'ok' || key === 'spam') counts[key] += 1;
    });

    const pct = (n) => total > 0 ? Math.round((n / total) * 1000) / 10 : 0; // one decimal place

    const card = (label, count, percent, color) => `
      <div class="flex-1 min-w-[200px] stats-card ${color.border}">
        <div class="text-sm text-gray-600 font-medium">${label}</div>
        <div class="mt-3 flex items-baseline gap-2">
          <div class="text-3xl font-bold ${color.text}">${percent}%</div>
          <div class="text-sm text-gray-500">(${count}/${total || 0})</div>
        </div>
        <div class="mt-3 h-3 rounded-full bg-gray-100 overflow-hidden">
          <div class="h-full ${color.bg}" style="width:${percent}%;"></div>
        </div>
      </div>`;

    const summary = document.createElement('div');
    summary.className = 'mb-6';

    if (total === 0) {
      summary.innerHTML = `
        <div class="rounded-xl border p-4 bg-white text-sm text-gray-600 text-center">
          No analyzed conversations yet. Analyze a conversation to see lead quality breakdown.
        </div>`;
      parentEl.appendChild(summary);
      return;
    }

    const goodPct = Math.round((counts.good / total) * 100);
    const okPct = Math.round((counts.ok / total) * 100);
    const spamPct = Math.round((counts.spam / total) * 100);
    summary.innerHTML = `
      <div class="stats-card">
        <div class="text-xl font-semibold mb-4 text-gray-800 text-center">Lead Quality Distribution</div>
        <div id="lq-bars" class="flex flex-col gap-3 mb-4">
          <div class="flex items-center gap-2 sm:gap-4">
            <div class="w-12 sm:w-20 text-xs sm:text-sm font-medium text-green-700">Good</div>
            <div class="flex-1 h-4 sm:h-5 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
              <div data-quality="good" class="h-full bg-green-500 cursor-pointer transition-all duration-300" style="width:${goodPct}%"></div>
            </div>
            <div class="w-12 sm:w-20 text-right text-xs sm:text-sm text-gray-600 font-medium">${goodPct}% (${counts.good})</div>
          </div>
          <div class="flex items-center gap-2 sm:gap-4">
            <div class="w-12 sm:w-20 text-xs sm:text-sm font-medium text-yellow-700">OK</div>
            <div class="flex-1 h-4 sm:h-5 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
              <div data-quality="ok" class="h-full bg-yellow-400 cursor-pointer transition-all duration-300" style="width:${okPct}%"></div>
            </div>
            <div class="w-12 sm:w-20 text-right text-xs sm:text-sm text-gray-600 font-medium">${okPct}% (${counts.ok})</div>
          </div>
          <div class="flex items-center gap-2 sm:gap-4">
            <div class="w-12 sm:w-20 text-xs sm:text-sm font-medium text-red-700">Spam</div>
            <div class="flex-1 h-4 sm:h-5 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
              <div data-quality="spam" class="h-full bg-red-500 cursor-pointer transition-all duration-300" style="width:${spamPct}%"></div>
            </div>
            <div class="w-12 sm:w-20 text-right text-xs sm:text-sm text-gray-600 font-medium">${spamPct}% (${counts.spam})</div>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-3" id="lq-cards">
          <button data-quality="good" class="px-3 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200 transition hover:-translate-y-0.5 active:scale-95 hover:bg-green-200">Good ${goodPct}% (${counts.good})</button>
          <button data-quality="ok" class="px-3 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 transition hover:-translate-y-0.5 active:scale-95 hover:bg-yellow-200">OK ${okPct}% (${counts.ok})</button>
          <button data-quality="spam" class="px-3 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200 transition hover:-translate-y-0.5 active:scale-95 hover:bg-red-200">Spam ${spamPct}% (${counts.spam})</button>
          <button id="lq-all" class="px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 transition">Show all</button>
        </div>
        <div class="mt-4 flex justify-center">
          <span id="lq-badge" class="hidden px-4 py-2 rounded-full text-sm font-medium border"></span>
        </div>
      </div>`;

    parentEl.appendChild(summary);
    // Filter interactions
    const setBadge = () => {
      const badge = summary.querySelector('#lq-badge');
      if (!badge) return;
      if (currentFilter === 'all') {
        badge.className = 'hidden px-3 py-1 rounded-full text-xs font-medium border';
        badge.textContent = '';
        return;
      }
      const styles = {
        good: 'bg-green-100 text-green-800 border-green-200',
        ok: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        spam: 'bg-red-100 text-red-800 border-red-200'
      };
      badge.className = `px-3 py-1 rounded-full text-xs font-medium border ${styles[currentFilter] || 'bg-gray-100 text-gray-800 border-gray-200'}`;
      badge.textContent = `Filter: ${currentFilter.toUpperCase()}`;
    };

    const highlight = () => {
      summary.querySelectorAll('#lq-cards [data-quality]').forEach(el => {
        el.classList.remove('ring-2','ring-offset-2');
      });
      if (currentFilter !== 'all') {
        const active = summary.querySelector(`#lq-cards [data-quality="${currentFilter}"]`);
        if (active) active.classList.add('ring-2','ring-offset-2');
      }
    };
    const applyFilterAndRender = () => {
      const listContainer = document.getElementById('conv-list');
      if (!listContainer) return;
      listContainer.innerHTML = '';
      const source = currentFilter === 'all' ? items : items.filter(c => (c.lead_quality || '').toLowerCase() === currentFilter);
      renderConversationItems(listContainer, source);
      highlight();
      setBadge();
    };
    // Click on chips or any bar segment
    summary.querySelectorAll('#lq-cards [data-quality], #lq-bars [data-quality]').forEach(el => {
      el.addEventListener('click', () => {
        const q = el.getAttribute('data-quality');
        currentFilter = (currentFilter === q) ? 'all' : q;
        applyFilterAndRender();
        el.classList.add('scale-95');
        setTimeout(() => el.classList.remove('scale-95'), 150);
      });
    });
    const btnAll = summary.querySelector('#lq-all');
    if (btnAll) btnAll.addEventListener('click', () => { currentFilter = 'all'; applyFilterAndRender(); });
    highlight();
    setBadge();
  }

  // Render Top 5 ordered dishes bar chart
  function renderTopDishesChart(parentEl, items) {
    const container = document.createElement('div');
    container.className = 'mb-6';

    // Aggregate order_item counts (case-insensitive, trimmed)
    const countsMap = new Map();
    items.forEach(c => {
      const raw = (c.order_item || '').toString().trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      const normalized = (
        // Wagyu variations
        key.includes('wagyu') || key.includes('waygu') || key.includes('wagy') ? 'Wagyu Steak' :
        // Salmon variations  
        key.includes('salmon') || key.includes('salom') || key.includes('teriyaki') ? 'Salmon Teriyaki' :
        // Udon variations
        key.includes('udon') || key.includes('uni') || key.includes('truffle') ? 'Uni Truffle Udon' :
        // Seaweed variations
        key.includes('seaweed') || key.includes('seawead') || key.includes('wakame') ? 'Seaweed Salad' :
        // Matcha variations
        key.includes('matcha') || key.includes('tiramisu') || key.includes('match') ? 'Matcha Tiramisu' :
        // Ramen variations
        key.includes('ramen') || key.includes('tonkotsu') || key.includes('tonkatsu') ? 'Tonkotsu Ramen' :
        // Chicken variations
        key.includes('karaage') || key.includes('chicken') || key.includes('kara') ? 'Chicken Karaage' :
        // Mochi variations
        key.includes('mochi') || key.includes('ice cream') || key.includes('icecream') ? 'Mochi Ice Cream' :
        c.order_item // fallback original
      );
      countsMap.set(normalized, (countsMap.get(normalized) || 0) + 1);
    });

    const counts = Array.from(countsMap.entries())
      .sort((a,b) => b[1]-a[1])
      .slice(0,5);

    if (counts.length === 0) {
      container.innerHTML = '<div class="rounded-xl border p-4 bg-white text-sm text-gray-600 text-center">No order data yet.</div>';
      parentEl.appendChild(container);
      return;
    }

    const max = Math.max(...counts.map(([_,n]) => n));
    const pctOfMax = (n) => Math.round((n / max) * 100);

    // Gradient color per dish + image path (from images/)
    const styleMap = {
      'Wagyu Steak': { grad: 'from-rose-500 to-red-600', img: 'images/wagyu_steak.png' },
      'Salmon Teriyaki': { grad: 'from-orange-400 to-amber-500', img: 'images/salmon_teriyaki.png' },
      'Uni Truffle Udon': { grad: 'from-yellow-400 to-amber-400', img: 'images/udon.png' },
      'Seaweed Salad': { grad: 'from-emerald-400 to-green-500', img: 'images/seaweed_salad.png' },
      'Matcha Tiramisu': { grad: 'from-lime-400 to-emerald-500', img: 'images/matcha.png' },
      'Tonkotsu Ramen': { grad: 'from-pink-400 to-rose-500', img: 'images/tonkotsu_ramen.png' },
      'Chicken Karaage': { grad: 'from-amber-400 to-orange-500', img: 'images/chicken.png' },
      'Mochi Ice Cream': { grad: 'from-fuchsia-400 to-pink-500', img: 'images/mochi_ice_cream.png' }
    };

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="rounded-xl border bg-white p-4 flex flex-col gap-4">
        <div class="text-lg font-semibold mb-1 text-gray-800 text-center">Top 5 Ordered Dishes</div>
        <div id="top-dishes-rows" class="flex flex-col gap-4"></div>
      </div>`;
    container.appendChild(wrapper);
    parentEl.appendChild(container);

    const rowsEl = wrapper.querySelector('#top-dishes-rows');

    counts.forEach(([name, n]) => {
      const { grad, img } = styleMap[name] || { grad: 'from-red-400 to-red-500', img: 'images/logo.png' };
      const row = document.createElement('div');
      row.className = 'flex items-center gap-4';

      const label = document.createElement('div');
      label.className = 'w-32 sm:w-40 md:w-56 shrink-0 text-sm text-gray-800 flex items-center gap-2';
      label.innerHTML = `<img src="${img}" alt="${name}" class="w-6 h-6 rounded object-cover border border-gray-200" /><span>${name}</span>`;

      const barTrack = document.createElement('div');
      barTrack.className = 'relative flex-1 h-5 rounded-full bg-gray-100 overflow-hidden border border-gray-200';

      const bar = document.createElement('div');
      bar.className = `absolute left-0 top-0 h-full bg-gradient-to-r ${grad}`;
      bar.style.width = '0%';
      bar.style.transition = 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)';

      const badge = document.createElement('span');
      badge.className = 'ml-2 w-14 text-right text-sm text-gray-700 tabular-nums';
      badge.textContent = `${n}`;

      barTrack.appendChild(bar);
      row.appendChild(label);
      row.appendChild(barTrack);
      row.appendChild(badge);
      rowsEl.appendChild(row);

      // Animate in next frame
      requestAnimationFrame(() => {
        bar.style.width = pctOfMax(n) + '%';
      });
    });
  }

  // Render time-based trend chart
  function renderTimeTrendChart(parentEl, items) {
    const container = document.createElement('div');
    container.className = 'mb-6';

    // Group data by date (last 7 days)
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const dailyData = last7Days.map(date => {
      const dayItems = items.filter(item => {
        const itemDate = new Date(item.created_at).toISOString().split('T')[0];
        return itemDate === date;
      });

      const totalConversations = dayItems.length;
      const orders = dayItems.filter(c => c.order_item && String(c.order_item).trim() !== '').length;
      const conversionRate = totalConversations > 0 ? Math.round((orders / totalConversations) * 100) : 0;

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        conversations: totalConversations,
        orders: orders,
        conversionRate: conversionRate
      };
    });

    const maxConversations = Math.max(0, ...dailyData.map(d => d.conversations));
    const maxOrders = Math.max(0, ...dailyData.map(d => d.orders));
    const maxConversion = Math.max(0, ...dailyData.map(d => d.conversionRate));

    const clampPct = (n) => Math.max(0, Math.min(100, n));

    container.innerHTML = `
      <div class="rounded-xl border bg-white p-4">
        <div class="text-lg font-semibold mb-4 text-gray-800 text-center">7-Day Trend</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <!-- Conversations Trend -->
          <div class="bg-blue-50 rounded-lg p-3 overflow-hidden">
            <div class="text-sm text-blue-600 font-medium mb-2">Conversations</div>
            <div class="trend-scroll">
              <div class="trend-bars-row trend-track-width flex items-end gap-1 h-24">
                ${dailyData.map(day => {
                  const height = clampPct(maxConversations > 0 ? (day.conversations / maxConversations) * 100 : 0);
                  return `<div class=\"flex-1 bg-blue-500 rounded-t transition-all duration-300\" style=\"height: ${height}%\"></div>`;
                }).join('')}
              </div>
              <div class="trend-labels trend-track-width">
                ${dailyData.map(day => `<span class=\"truncate\">${day.date}</span>`).join('')}
              </div>
            </div>
          </div>

          <!-- Orders Trend -->
          <div class="bg-green-50 rounded-lg p-3 overflow-hidden">
            <div class="text-sm text-green-600 font-medium mb-2">Orders</div>
            <div class="trend-scroll">
              <div class="trend-bars-row trend-track-width flex items-end gap-1 h-24">
                ${dailyData.map(day => {
                  const height = clampPct(maxOrders > 0 ? (day.orders / maxOrders) * 100 : 0);
                  return `<div class=\"flex-1 bg-green-500 rounded-t transition-all duration-300\" style=\"height: ${height}%\"></div>`;
                }).join('')}
              </div>
              <div class="trend-labels trend-track-width">
                ${dailyData.map(day => `<span class=\"truncate\">${day.date}</span>`).join('')}
              </div>
            </div>
          </div>

          <!-- Conversion Rate Trend -->
          <div class="bg-purple-50 rounded-lg p-3 overflow-hidden">
            <div class="text-sm text-purple-600 font-medium mb-2">Conversion %</div>
            <div class="trend-scroll">
              <div class="trend-bars-row trend-track-width flex items-end gap-1 h-24">
                ${dailyData.map(day => {
                  const height = clampPct(maxConversion > 0 ? (day.conversionRate / maxConversion) * 100 : 0);
                  return `<div class=\"flex-1 bg-purple-500 rounded-t transition-all duration-300\" style=\"height: ${height}%\"></div>`;
                }).join('')}
              </div>
              <div class="trend-labels trend-track-width">
                ${dailyData.map(day => `<span class=\"truncate\">${day.date}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>`;

    // Show fallback when no values at all
    const totalValues = dailyData.reduce((sum, d) => sum + d.conversations + d.orders + d.conversionRate, 0);
    if (totalValues === 0) {
      container.querySelectorAll('.bg-blue-50, .bg-green-50, .bg-purple-50').forEach(box => {
        if (!box) return;
        const msg = document.createElement('div');
        msg.className = 'text-center text-sm text-gray-600 py-6';
        msg.textContent = 'No data for the past 7 days.';
        box.appendChild(msg);
      });
    }

    parentEl.appendChild(container);
  }

  // Render performance comparison (this week vs last week)
  function renderPerformanceComparison(parentEl, items) {
    const container = document.createElement('div');
    container.className = 'mb-6';

    // Calculate this week and last week data
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 7);

    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 7);

    const thisWeekItems = items.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= thisWeekStart && itemDate < thisWeekEnd;
    });

    const lastWeekItems = items.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate >= lastWeekStart && itemDate < lastWeekEnd;
    });

    // Calculate metrics
    const thisWeekConversations = thisWeekItems.length;
    const thisWeekOrders = thisWeekItems.filter(c => c.order_item && String(c.order_item).trim() !== '').length;
    const thisWeekConversion = thisWeekConversations > 0 ? Math.round((thisWeekOrders / thisWeekConversations) * 100) : 0;

    const lastWeekConversations = lastWeekItems.length;
    const lastWeekOrders = lastWeekItems.filter(c => c.order_item && String(c.order_item).trim() !== '').length;
    const lastWeekConversion = lastWeekConversations > 0 ? Math.round((lastWeekOrders / lastWeekConversations) * 100) : 0;

    // Calculate percentage changes
    const convChange = lastWeekConversations > 0 ? Math.round(((thisWeekConversations - lastWeekConversations) / lastWeekConversations) * 100) : 0;
    const orderChange = lastWeekOrders > 0 ? Math.round(((thisWeekOrders - lastWeekOrders) / lastWeekOrders) * 100) : 0;
    const conversionChange = lastWeekConversion > 0 ? Math.round(((thisWeekConversion - lastWeekConversion) / lastWeekConversion) * 100) : 0;

    const getChangeColor = (change) => {
      if (change > 0) return 'text-green-600';
      if (change < 0) return 'text-red-600';
      return 'text-gray-600';
    };

    const getChangeIcon = (change) => {
      if (change > 0) return '↗️';
      if (change < 0) return '↘️';
      return '→';
    };

    container.innerHTML = `
      <div class="rounded-xl border bg-white p-4">
        <div class="text-lg font-semibold mb-4 text-gray-800 text-center">This Week vs Last Week</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Conversations -->
          <div class="bg-blue-50 rounded-lg p-4 text-center">
            <div class="text-sm text-blue-600 font-medium mb-2">Conversations</div>
            <div class="text-2xl font-bold text-blue-700 mb-1">${thisWeekConversations}</div>
            <div class="text-xs ${getChangeColor(convChange)}">
              ${getChangeIcon(convChange)} ${convChange > 0 ? '+' : ''}${convChange}% vs last week
            </div>
            <div class="text-xs text-gray-500 mt-1">Last week: ${lastWeekConversations}</div>
          </div>

          <!-- Orders -->
          <div class="bg-green-50 rounded-lg p-4 text-center">
            <div class="text-sm text-green-600 font-medium mb-2">Orders</div>
            <div class="text-2xl font-bold text-green-700 mb-1">${thisWeekOrders}</div>
            <div class="text-xs ${getChangeColor(orderChange)}">
              ${getChangeIcon(orderChange)} ${orderChange > 0 ? '+' : ''}${orderChange}% vs last week
            </div>
            <div class="text-xs text-gray-500 mt-1">Last week: ${lastWeekOrders}</div>
          </div>

          <!-- Conversion Rate -->
          <div class="bg-purple-50 rounded-lg p-4 text-center">
            <div class="text-sm text-purple-600 font-medium mb-2">Conversion Rate</div>
            <div class="text-2xl font-bold text-purple-700 mb-1">${thisWeekConversion}%</div>
            <div class="text-xs ${getChangeColor(conversionChange)}">
              ${getChangeIcon(conversionChange)} ${conversionChange > 0 ? '+' : ''}${conversionChange}% vs last week
            </div>
            <div class="text-xs text-gray-500 mt-1">Last week: ${lastWeekConversion}%</div>
          </div>
        </div>
      </div>`;

    parentEl.appendChild(container);
  }

  // Render conversation items into a target container
  function renderConversationItems(containerEl, items) {
    const list = document.createElement('div');
    list.className = 'flex flex-col gap-2';
    items.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'conversation-item flex items-center justify-between w-full flex-wrap';
      
      // Left side with conversation info
      const leftSide = document.createElement('div');
      leftSide.className = 'flex-1 min-w-0';
      
      const infoBtn = document.createElement('button');
      infoBtn.className = 'text-left w-full';
      const date = new Date(conv.created_at || Date.now());
      const custName = (conv.customer_name && String(conv.customer_name).trim()) ? conv.customer_name : 'N/A';
      const custPhone = (conv.customer_phone && String(conv.customer_phone).trim()) ? conv.customer_phone : 'N/A';
      infoBtn.innerHTML = `
        <span class="font-medium text-gray-800">${custName}</span>
        <span class="text-sm text-gray-600 ml-2">• ${custPhone}</span>
        <span class="text-xs text-gray-500 ml-2">${date.toLocaleString()}</span>
      `;
      infoBtn.onclick = () => loadMessages(conv.conversation_id);
      leftSide.appendChild(infoBtn);
      
      // Lead quality indicator
      if (conv.lead_quality) {
        const qualityBadge = document.createElement('span');
        const qualityColors = {
          'good': 'quality-good',
          'ok': 'quality-ok',
          'spam': 'quality-spam'
        };
        qualityBadge.className = `ml-3 quality-badge ${qualityColors[conv.lead_quality] || 'bg-gray-100 text-gray-800'}`;
        qualityBadge.textContent = conv.lead_quality.toUpperCase();
        leftSide.appendChild(qualityBadge);
      }
      
      item.appendChild(leftSide);

      // Right side with action buttons
      const rightSide = document.createElement('div');
      rightSide.className = 'flex items-center gap-2 flex-shrink-0';
      
      // Analyze button
      const analyzeBtn = document.createElement('button');
      analyzeBtn.className = 'action-button p-2 rounded-full hover:bg-blue-100 text-blue-600 flex items-center';
      analyzeBtn.innerHTML = `<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke-width=\"1.5\" stroke=\"currentColor\" class=\"w-4 h-4\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z\" /></svg>`;
      analyzeBtn.title = 'Analyze conversation';
      analyzeBtn.onclick = async (e) => {
        e.stopPropagation();
        await analyzeConversation(conv.conversation_id);
      };
      rightSide.appendChild(analyzeBtn);
      
              // View analysis button (if already analyzed)
        if (conv.analyzed_at) {
          const viewAnalysisBtn = document.createElement('button');
          viewAnalysisBtn.className = 'action-button p-2 rounded-full hover:bg-green-100 text-green-600 flex items-center';
        viewAnalysisBtn.innerHTML = `<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke-width=\"1.5\" stroke=\"currentColor\" class=\"w-4 h-4\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.639 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.639 0-8.573-3.007-9.963-7.178z\" /><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M15 12a3 3 0 11-6 0 3 3 0 016 0z\" /></svg>`;
        viewAnalysisBtn.title = 'View analysis';
        viewAnalysisBtn.onclick = async (e) => {
          e.stopPropagation();
          await showAnalysis(conv);
        };
        rightSide.appendChild(viewAnalysisBtn);
      }

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'action-button p-2 rounded-full hover:bg-red-100 text-red-600 flex items-center';
      delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
      delBtn.title = 'Delete conversation';
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        await deleteConversation(conv.conversation_id);
      };
      rightSide.appendChild(delBtn);
      
      item.appendChild(rightSide);

      list.appendChild(item);
    });
    containerEl.appendChild(list);
  }

  // Fetch and display all conversations
  async function loadConversations(silent = false) {
    if (!silent) {
      messagesContainer.style.display = 'none';
      conversationList.style.display = 'block';
      conversationList.innerHTML = '';
      addRefreshControls(); // Add refresh controls only on initial load
    }
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      conversations = data.conversations || [];
      if (conversations.length === 0) {
        conversationList.innerHTML += '<p class="text-gray-500 text-center">No conversations found.</p>';
        return;
      }

      // Lead quality summary & Conversion stats & Top dishes at the top
      renderLeadQualitySummary(conversationList, conversations);
      renderConversionRateStats(conversationList, conversations);
      renderTopDishesChart(conversationList, conversations);
      renderTimeTrendChart(conversationList, conversations);
      renderPerformanceComparison(conversationList, conversations);

      const listContainer = document.createElement('div');
      listContainer.id = 'conv-list';
      conversationList.appendChild(listContainer);
      const initial = currentFilter === 'all' ? conversations : conversations.filter(c => (c.lead_quality || '').toLowerCase() === currentFilter);
      renderConversationItems(listContainer, initial);
    } catch (err) {
      conversationList.innerHTML += '<p class="text-red-500 text-center">Error loading conversations.</p>';
    }
  }

  // Fetch and display messages for a conversation
  async function loadMessages(conversationId) {
    conversationList.style.display = 'none';
    messagesContainer.style.display = 'block';
    messagesContainer.innerHTML = '';
    
    // Create back button properly
    const backBtn = document.createElement('button');
    backBtn.className = 'mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition';
    backBtn.textContent = 'Back to List';
    backBtn.onclick = () => {
      console.log('Back to List button clicked!');
      loadConversations(false);
    };
    messagesContainer.appendChild(backBtn);
    
    try {
      const res = await fetch(`/api/conversations_messages?id=${encodeURIComponent(conversationId)}`);
      const data = await res.json();
      const messages = data.messages || [];
      if (messages.length === 0) {
        const noMsg = document.createElement('p');
        noMsg.className = 'text-gray-500 text-center';
        noMsg.textContent = 'No messages in this conversation.';
        messagesContainer.appendChild(noMsg);
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
            : `<img src="${BOT_ICON_PATH}" alt="Bot" class="msg-avatar" />`;

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
      const errorMsg = document.createElement('p');
      errorMsg.className = 'text-red-500 text-center';
      errorMsg.textContent = 'Error loading messages.';
      messagesContainer.appendChild(errorMsg);
    }
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
    // Clear any previous analysis/messages content before rendering new one
    messagesContainer.innerHTML = '';

    const backBtn = document.createElement('button');
    backBtn.className = 'mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition';
    backBtn.textContent = 'Back to List';
    backBtn.onclick = () => {
      console.log('Back to List button clicked!');
      loadConversations(false);
    };
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
    grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6';

    const analysisFields = [
      { key: 'customer_name', label: 'Customer Name', icon: '👤' },
      { key: 'customer_email', label: 'Email Address', icon: '📧' },
      { key: 'customer_phone', label: 'Phone Number', icon: '📞' },
      { key: 'customer_address', label: 'Address', icon: '📍' },
      { key: 'order_time', label: 'Order Time', icon: '⏰' },
      { key: 'order_item', label: 'Order Item', icon: '🍽️' },
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
      
      fieldValue.textContent = conversation[field.key] || 'Not provided';
      
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

    // Render full conversation thread under the analysis
    const threadWrap = document.createElement('div');
    threadWrap.className = 'mt-8 bg-white rounded-lg shadow p-6 max-w-4xl mx-auto';
    const threadTitle = document.createElement('h3');
    threadTitle.className = 'text-xl font-semibold mb-4 text-gray-800';
    threadTitle.textContent = 'Conversation';
    threadWrap.appendChild(threadTitle);

    const threadList = document.createElement('div');
    threadList.className = 'flex flex-col gap-3';
    threadWrap.appendChild(threadList);
    messagesContainer.appendChild(threadWrap);

    try {
      const res = await fetch(`/api/conversations_messages?id=${encodeURIComponent(conversation.conversation_id)}`);
      const data = await res.json();
      const messages = data.messages || [];
      if (messages.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-gray-500';
        empty.textContent = 'No messages in this conversation.';
        threadWrap.appendChild(empty);
      } else {
        messages.forEach(msg => {
          if (msg.role === 'system') return; // Skip system messages
          const row = document.createElement('div');
          row.className = `msg-row ${msg.role === 'user' ? 'user' : 'bot'}`;

          const icon = document.createElement('div');
          icon.className = `msg-icon ${msg.role === 'user' ? '' : 'bot'}`;
          icon.innerHTML = msg.role === 'user'
            ? `<svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14c-2.5 0-4.5 1.5-4.5 3v1h9v-1c0-1.5-2-3-4.5-3z"/><circle cx="12" cy="10" r="2.5"/></svg>`
            : `<img src="${BOT_ICON_PATH}" alt="Bot" class="msg-avatar" />`;

          const div = document.createElement('div');
          div.className = `message ${msg.role === 'user' ? 'user' : 'bot'}`;
          div.innerHTML = `<span>${msg.content}</span>`;

          if (msg.role === 'user') {
            row.appendChild(div);
            row.appendChild(icon);
          } else {
            row.appendChild(icon);
            row.appendChild(div);
          }
          threadList.appendChild(row);
        });
      }
    } catch (err) {
      const errEl = document.createElement('p');
      errEl.className = 'text-red-500';
      errEl.textContent = 'Error loading conversation messages.';
      threadWrap.appendChild(errEl);
    }
  }

  loadConversations();
}); 