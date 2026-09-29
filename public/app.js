/**
 * Vyora Executive Cockpit - Client Application
 * Handles Real-Time Chat, SSE Event Sync, TEMPR Diagnostics, and Graph Interaction
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const chatViewport = document.getElementById('chatViewport');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const sessionDaySelect = document.getElementById('sessionDaySelect');

  // Stats
  const statWorldFacts = document.getElementById('statWorldFacts').querySelector('.stat-num');
  const statExperiences = document.getElementById('statExperiences').querySelector('.stat-num');
  const statObservations = document.getElementById('statObservations').querySelector('.stat-num');
  const statMentalModels = document.getElementById('statMentalModels').querySelector('.stat-num');

  // TEMPR Tab
  const temprLatencyBadge = document.getElementById('temprLatencyBadge');
  const temprResultsList = document.getElementById('temprResultsList');

  // Memory Tab
  const memoryItemsList = document.getElementById('memoryItemsList');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // Audit Tab
  const auditTimeline = document.getElementById('auditTimeline');
  const btnTriggerReflect = document.getElementById('btnTriggerReflect');
  const btnManualReflect = document.getElementById('btnManualReflect');

  // Drawer
  const nodeDrawer = document.getElementById('nodeDrawer');
  const drawerBadge = document.getElementById('drawerBadge');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerBody = document.getElementById('drawerBody');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');

  // Fact Modal
  const factModal = document.getElementById('factModal');
  const btnAddFactModalBtn = document.getElementById('btnAddFactModalBtn');
  const factModalClose = document.getElementById('factModalClose');
  const factModalCancel = document.getElementById('factModalCancel');
  const factForm = document.getElementById('factForm');

  // Reset
  const btnResetState = document.getElementById('btnResetState');

  // Graph Controls
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnCenterGraph = document.getElementById('btnCenterGraph');

  // Cache
  let currentMemoryData = null;
  let activeMemoryFilter = 'all';

  // 1. Initialize Graph Visualizer
  const graph = new BiomimeticGraphVisualizer('networkCanvas', {
    onNodeSelect: (node) => showNodeDrawer(node)
  });

  btnZoomIn.addEventListener('click', () => graph.zoomIn());
  btnZoomOut.addEventListener('click', () => graph.zoomOut());
  btnCenterGraph.addEventListener('click', () => graph.center());

  // 2. Fetch Initial State & Graph Data
  async function loadInitialData() {
    try {
      const [statusRes, graphRes, memRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/graph').then(r => r.json()),
        fetch('/api/memory').then(r => r.json())
      ]);

      updateStats(statusRes.hindsightEngine);
      graph.setGraphData(graphRes);
      currentMemoryData = memRes;
      renderMemoryList();
      renderAuditTimeline(memRes.reflections || []);

      // Initial TEMPR search for immediate breakdown display
      fetch('/api/tempr/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Executive calendar and communication policy' })
      })
      .then(r => r.json())
      .then(res => {
        if (res && res.topResults) {
          renderTEMPRBreakdown({
            executionTimeMs: res.executionTimeMs,
            query: res.query,
            topMemories: res.topResults.map(m => ({
              id: m.id,
              title: m.title,
              network: m.network,
              compositeScore: m.temprBreakdown.compositeScore,
              scores: m.temprBreakdown
            }))
          });
        }
      })
      .catch(console.error);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }

  function updateStats(stats) {
    if (!stats) return;
    statWorldFacts.textContent = stats.worldFactsCount || 0;
    statExperiences.textContent = stats.experiencesCount || 0;
    statObservations.textContent = stats.observationsCount || 0;
    statMentalModels.textContent = stats.mentalModelsCount || 0;
  }

  // 3. Server-Sent Events (SSE) Stream
  function initSSE() {
    const evtSource = new EventSource('/api/events');

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE Event]', data.type, data.payload);

        if (data.type === 'CONNECTED') return;

        // Auto-refresh graph and memory lists on any memory change
        refreshGraphAndMemory();

        if (data.type === 'CONTRADICTION_RESOLVED') {
          addAuditEntry({
            type: 'CONTRADICTION_RESOLVED',
            title: `⚡ Contradiction Resolved: ${data.payload.targetModelId}`,
            detail: `Refined belief: "${data.payload.refinedBelief}". Exception added: ${data.payload.exceptionAdded}`,
            timestamp: data.timestamp
          });
        } else if (data.type === 'EXPERIENCE_RETAINED') {
          addAuditEntry({
            type: 'EXPERIENCE_RETAINED',
            title: `Episodic Experience #${data.payload.id.substring(0, 10)}`,
            detail: `Prompt: "${data.payload.userPrompt}" → ${data.payload.feedback || data.payload.outcome}`,
            timestamp: data.timestamp
          });
        } else if (data.type === 'OBSERVATION_UPDATED') {
          addAuditEntry({
            type: 'OBSERVATION_UPDATED',
            title: `Observation Synthesized: ${data.payload.title}`,
            detail: data.payload.pattern,
            timestamp: data.timestamp
          });
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    evtSource.onerror = (err) => {
      console.warn('SSE stream reconnecting...', err);
    };
  }

  async function refreshGraphAndMemory() {
    try {
      const [statusRes, graphRes, memRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/graph').then(r => r.json()),
        fetch('/api/memory').then(r => r.json())
      ]);
      updateStats(statusRes.hindsightEngine);
      graph.setGraphData(graphRes);
      currentMemoryData = memRes;
      renderMemoryList();
    } catch (e) {
      console.error('Refresh error:', e);
    }
  }

  // 4. Chat Submission Handler
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = chatInput.value.trim();
    if (!prompt) return;

    chatInput.value = '';
    const dayOffset = parseInt(sessionDaySelect.value, 10) || 14;

    // Append user message to chat
    appendChatMessage('user', prompt);

    // Show typing placeholder
    const typingId = appendTypingIndicator();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, dayOffset })
      });
      const data = await res.json();
      removeTypingIndicator(typingId);

      if (data.error) {
        appendChatMessage('agent', `⚠️ Error: ${data.error}`);
        return;
      }

      // Append agent message with action tag
      appendChatMessage('agent', data.response, data.actionTaken);

      // Render TEMPR breakdown
      if (data.temprTrace) {
        renderTEMPRBreakdown(data.temprTrace);
      }
    } catch (err) {
      removeTypingIndicator(typingId);
      appendChatMessage('agent', `⚠️ Network error: ${err.message}`);
    }
  });

  // Scenario chips click handler
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) {
        chatInput.value = prompt;
        chatForm.dispatchEvent(new Event('submit'));
      }
    });
  });

  function appendChatMessage(sender, text, actionTag = null) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${sender}`;

    const formattedText = formatMarkdown(text);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgEl.innerHTML = `
      <div class="msg-avatar">
        ${sender === 'agent' ? '<div class="avatar-halo"></div><span>V</span>' : '<span>U</span>'}
      </div>
      <div class="msg-body">
        <div class="msg-header">
          <span class="msg-sender">${sender === 'agent' ? 'Vyora' : 'Executive'}</span>
          <span class="msg-time">${timeStr}</span>
        </div>
        <div class="msg-content">
          ${formattedText}
          ${actionTag ? `<div class="msg-action-tag"><strong>Action Executed:</strong> ${actionTag}</div>` : ''}
        </div>
      </div>
    `;

    chatViewport.appendChild(msgEl);
    chatViewport.scrollTop = chatViewport.scrollHeight;
  }

  function appendTypingIndicator() {
    const id = `typing-${Date.now()}`;
    const el = document.createElement('div');
    el.id = id;
    el.className = 'chat-message agent';
    el.innerHTML = `
      <div class="msg-avatar"><span>V</span></div>
      <div class="msg-body">
        <div class="msg-content" style="color: #64748b; font-style: italic;">
          Retrieving context...
        </div>
      </div>
    `;
    chatViewport.appendChild(el);
    chatViewport.scrollTop = chatViewport.scrollHeight;
    return id;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function formatMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 3px; font-family: monospace;">$1</code>');

    // Simple bullet points
    if (html.includes('* ')) {
      const lines = html.split('\n');
      let inList = false;
      let out = '';
      for (const line of lines) {
        if (line.trim().startsWith('* ')) {
          if (!inList) { out += '<ul>'; inList = true; }
          out += `<li>${line.trim().substring(2)}</li>`;
        } else {
          if (inList) { out += '</ul>'; inList = false; }
          out += line ? `<p>${line}</p>` : '';
        }
      }
      if (inList) out += '</ul>';
      return out;
    }

    return html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  }

  // 5. Render TEMPR Inspector Breakdown
  function renderTEMPRBreakdown(trace) {
    temprLatencyBadge.textContent = `${trace.executionTimeMs} ms`;
    temprResultsList.innerHTML = '';

    if (!trace.topMemories || trace.topMemories.length === 0) {
      temprResultsList.innerHTML = '<div class="empty-state">No relevant memories scored above threshold.</div>';
      return;
    }

    for (const mem of trace.topMemories) {
      const s = mem.scores || {};
      const card = document.createElement('div');
      card.className = 'tempr-result-card';

      card.innerHTML = `
        <div class="result-card-top">
          <span class="result-badge badge-${mem.network}">${mem.network.replace('_', ' ')}</span>
          <span class="result-score">Score: ${mem.compositeScore}</span>
        </div>
        <div class="result-title">${mem.title}</div>
        <div class="tempr-bars-grid">
          <div class="bar-col">
            <span class="bar-label"><span>T (Temp)</span><span>${Math.round(s.temporal * 100)}%</span></span>
            <div class="bar-track"><div class="bar-fill fill-t" style="width: ${Math.round(s.temporal * 100)}%"></div></div>
          </div>
          <div class="bar-col">
            <span class="bar-label"><span>E (Embed)</span><span>${Math.round(s.embedding * 100)}%</span></span>
            <div class="bar-track"><div class="bar-fill fill-e" style="width: ${Math.round(s.embedding * 100)}%"></div></div>
          </div>
          <div class="bar-col">
            <span class="bar-label"><span>M (BM25)</span><span>${Math.round(s.matching * 100)}%</span></span>
            <div class="bar-track"><div class="bar-fill fill-m" style="width: ${Math.round(s.matching * 100)}%"></div></div>
          </div>
          <div class="bar-col">
            <span class="bar-label"><span>P (Path)</span><span>${Math.round(s.path * 100)}%</span></span>
            <div class="bar-track"><div class="bar-fill fill-p" style="width: ${Math.round(s.path * 100)}%"></div></div>
          </div>
        </div>
        ${s.graphTrace ? `<div class="graph-path-text" title="${s.graphTrace}">🔗 Graph Path: ${s.graphTrace}</div>` : ''}
      `;

      temprResultsList.appendChild(card);
    }
  }

  // 6. Memory List Rendering & Filtering
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeMemoryFilter = btn.getAttribute('data-filter');
      renderMemoryList();
    });
  });

  function renderMemoryList() {
    if (!currentMemoryData) return;
    memoryItemsList.innerHTML = '';

    const items = [];
    if (activeMemoryFilter === 'all' || activeMemoryFilter === 'world_facts') {
      (currentMemoryData.worldFacts || []).forEach(f => items.push({ type: 'world_facts', title: f.entity, desc: f.statement, id: f.id }));
    }
    if (activeMemoryFilter === 'all' || activeMemoryFilter === 'experiences') {
      (currentMemoryData.experiences || []).forEach(e => items.push({ type: 'experiences', title: e.userPrompt, desc: e.feedback || e.agentAction, id: e.id }));
    }
    if (activeMemoryFilter === 'all' || activeMemoryFilter === 'observations') {
      (currentMemoryData.observations || []).forEach(o => items.push({ type: 'observations', title: o.title, desc: o.pattern, id: o.id }));
    }
    if (activeMemoryFilter === 'all' || activeMemoryFilter === 'mental_models') {
      (currentMemoryData.mentalModels || []).forEach(m => items.push({ type: 'mental_models', title: m.title, desc: m.belief, id: m.id, version: m.version, exceptions: m.exceptions }));
    }

    if (items.length === 0) {
      memoryItemsList.innerHTML = '<div class="empty-state">No memory items found in this tier.</div>';
      return;
    }

    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'memory-item-card';
      card.innerHTML = `
        <div class="item-top">
          <span class="result-badge badge-${item.type}">${item.type.replace('_', ' ')}</span>
          ${item.version ? `<span style="font-size: 0.65rem; color: #a5b4fc; font-family: monospace;">v${item.version}</span>` : ''}
        </div>
        <div class="item-title">${item.title}</div>
        <div class="item-desc">${item.desc}</div>
        ${item.exceptions && item.exceptions.length ? `<div style="font-size: 0.68rem; color: #fbbf24; margin-top: 2px;">⚡ Exception: ${item.exceptions[0]}</div>` : ''}
      `;
      memoryItemsList.appendChild(card);
    }
  }

  // 7. Audit Timeline Rendering
  function renderAuditTimeline(logs) {
    auditTimeline.innerHTML = '';
    if (!logs || logs.length === 0) {
      auditTimeline.innerHTML = '<div class="empty-state">No reflection events logged yet.</div>';
      return;
    }
    for (const log of logs) {
      const el = document.createElement('div');
      el.className = `audit-entry ${log.type.toLowerCase().includes('contradiction') ? 'contradiction' : 'pattern'}`;
      el.innerHTML = `
        <span class="audit-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
        <div class="audit-title">${log.type.replace(/_/g, ' ')}</div>
        <div class="audit-detail">${log.refinedBelief || log.pattern || log.detail || JSON.stringify(log)}</div>
      `;
      auditTimeline.appendChild(el);
    }
  }

  function addAuditEntry({ type, title, detail, timestamp }) {
    const el = document.createElement('div');
    el.className = `audit-entry ${type.toLowerCase().includes('contradiction') ? 'contradiction' : 'pattern'}`;
    el.innerHTML = `
      <span class="audit-time">${new Date(timestamp).toLocaleTimeString()}</span>
      <div class="audit-title">${title}</div>
      <div class="audit-detail">${detail}</div>
    `;
    auditTimeline.insertBefore(el, auditTimeline.firstChild);
  }

  // 8. Manual Reflection Run
  async function triggerReflection() {
    try {
      const res = await fetch('/api/reflect', { method: 'POST' });
      const data = await res.json();
      alert(`Data Processing Complete!\nGenerated ${data.insightsGenerated} new patterns from recent logs.`);
      refreshGraphAndMemory();
    } catch (e) {
      alert('Processing failed: ' + e.message);
    }
  }
  btnTriggerReflect.addEventListener('click', triggerReflection);
  btnManualReflect.addEventListener('click', triggerReflection);

  // 9. Node Detail Drawer
  function showNodeDrawer(node) {
    drawerBadge.textContent = (node.type || 'Node').replace('_', ' ');
    drawerBadge.className = `drawer-badge badge-${node.type}`;
    drawerTitle.textContent = node.label || node.id;

    drawerBody.innerHTML = `
      <p><strong>Details:</strong></p>
      <p style="margin-top: 4px; color: var(--text-main);">${node.fullText || node.label}</p>
      <div class="drawer-meta-grid">
        <div class="drawer-meta-item">
          <div class="drawer-meta-label">Node ID</div>
          <div>${node.id}</div>
        </div>
        <div class="drawer-meta-item">
          <div class="drawer-meta-label">Tier / Layer</div>
          <div>Layer ${node.layer !== undefined ? node.layer : 1} (${node.type})</div>
        </div>
        <div class="drawer-meta-item">
          <div class="drawer-meta-label">Confidence</div>
          <div>${node.confidence ? (node.confidence * 100).toFixed(0) + '%' : '100%'}</div>
        </div>
        <div class="drawer-meta-item">
          <div class="drawer-meta-label">Status</div>
          <div>${node.status || 'Active'}</div>
        </div>
      </div>
    `;
    nodeDrawer.classList.add('open');
  }

  drawerCloseBtn.addEventListener('click', () => {
    nodeDrawer.classList.remove('open');
  });

  // 10. Fact Modal Handlers
  btnAddFactModalBtn.addEventListener('click', () => factModal.classList.add('open'));
  factModalClose.addEventListener('click', () => factModal.classList.remove('open'));
  factModalCancel.addEventListener('click', () => factModal.classList.remove('open'));

  factForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const entity = document.getElementById('factEntity').value.trim();
    const relation = document.getElementById('factRelation').value.trim();
    const statement = document.getElementById('factStatement').value.trim();

    try {
      const res = await fetch('/api/world-facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, relation, statement })
      });
      const data = await res.json();
      if (data.success) {
        factModal.classList.remove('open');
        factForm.reset();
        refreshGraphAndMemory();
      }
    } catch (err) {
      alert('Failed to add fact: ' + err.message);
    }
  });

  // 11. Reset State
  btnResetState.addEventListener('click', async () => {
    if (confirm('Reset assistant memory to default settings?')) {
      try {
        await fetch('/api/reset', { method: 'POST' });
        refreshGraphAndMemory();
        alert('Memory reset to default.');
      } catch (err) {
        alert('Reset failed: ' + err.message);
      }
    }
  });

  // 12. Panel Tabs Switcher
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.classList.add('active');
    });
  });

  // Initial load
  loadInitialData();
  initSSE();
});
