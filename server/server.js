/**
 * Vyora Chief of Staff - Production Server
 * REST API, Real-Time SSE Stream, and Static Asset Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const biomimeticStore = require('./hindsight/store');
const TEMPRRecallEngine = require('./hindsight/tempr');
const RetainPipeline = require('./hindsight/retain');
const ReflectEngine = require('./hindsight/reflect');
const ExecutiveAgent = require('./hindsight/executiveAgent');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Hindsight components
const reflectEngine = new ReflectEngine(biomimeticStore);
const temprRecall = new TEMPRRecallEngine(biomimeticStore);
const retainPipeline = new RetainPipeline(biomimeticStore, reflectEngine);
const executiveAgent = new ExecutiveAgent(biomimeticStore, temprRecall, retainPipeline, reflectEngine);

// Active SSE client connections
const sseClients = new Set();

biomimeticStore.subscribe((event) => {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch (err) {
      console.error('SSE send error:', err);
    }
  }
});

// SSE Endpoint for Live Real-Time Memory Stream
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// API: System Status & Statistics
app.get('/api/status', (req, res) => {
  const items = biomimeticStore.getAllMemoryItems();
  res.json({
    name: 'Vyora Adaptive Chief of Staff',
    version: '1.0.0',
    hindsightEngine: {
      status: 'active',
      worldFactsCount: biomimeticStore.worldFacts.length,
      experiencesCount: biomimeticStore.experiences.length,
      observationsCount: biomimeticStore.observations.length,
      mentalModelsCount: biomimeticStore.mentalModels.filter(m => m.status === 'active').length,
      graphNodesCount: biomimeticStore.knowledgeGraph.nodes.length,
      graphEdgesCount: biomimeticStore.knowledgeGraph.edges.length,
      totalMemoryUnits: items.length
    },
    uptime: process.uptime()
  });
});

// API: Get Full 4-Network Memory Bundle
app.get('/api/memory', (req, res) => {
  res.json({
    worldFacts: biomimeticStore.worldFacts,
    experiences: biomimeticStore.experiences,
    observations: biomimeticStore.observations,
    mentalModels: biomimeticStore.mentalModels,
    reflections: reflectEngine.getReflectionLogs()
  });
});

// API: Get Knowledge Graph (For Visualizer)
app.get('/api/graph', (req, res) => {
  res.json(biomimeticStore.knowledgeGraph);
});

// API: Live Chat with Executive Agent
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, dayOffset = 14 } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await executiveAgent.processMessage(prompt, { dayOffset });
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: Direct TEMPR Retrieval Query & Diagnostics
app.post('/api/tempr/search', (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const recall = temprRecall.query(query, { limit });
    res.json(recall);
  } catch (err) {
    console.error('TEMPR search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: Direct Retain Ingestion
app.post('/api/retain', async (req, res) => {
  try {
    const { userPrompt, agentAction, feedback, outcome, dayOffset } = req.body;
    const exp = await retainPipeline.ingest({
      userPrompt,
      agentAction: agentAction || 'Logged external feedback',
      feedback,
      outcome,
      dayOffset: dayOffset || 14
    });
    res.json({ success: true, experience: exp });
  } catch (err) {
    console.error('Retain error:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: Run Reflection Cycle
app.post('/api/reflect', async (req, res) => {
  try {
    const result = await reflectEngine.runFullReflection();
    res.json(result);
  } catch (err) {
    console.error('Reflection error:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: Add World Fact
app.post('/api/world-facts', (req, res) => {
  try {
    const { entity, relation, target, statement } = req.body;
    if (!entity || !statement) {
      return res.status(400).json({ error: 'Entity and statement are required' });
    }
    const fact = biomimeticStore.addWorldFact({ entity, relation, target, statement });
    res.json({ success: true, fact });
  } catch (err) {
    console.error('Add fact error:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: Reset to Default Baseline Seed State
app.post('/api/reset', (req, res) => {
  const result = biomimeticStore.resetToDefault();
  res.json(result);
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Vyora Hindsight Agent Server running at http://localhost:${PORT}`);
  console.log(`🧠 Biomimetic Memory Networks: Active`);
  console.log(`⚡ TEMPR Multi-Strategy Engine: Armed`);
  console.log(`🔄 SSE Real-Time Stream: Live at /api/events`);
  console.log(`=======================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => console.log('Server shut down cleanly.'));
});

module.exports = { app, server };
