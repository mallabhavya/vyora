/**
 * Vyora Hindsight Store
 * Implements the 4 Biomimetic Networks:
 * 1. World Facts (Objective truths)
 * 2. Experiences (Episodic interactions, feedback, outcomes)
 * 3. Observations (Synthesized patterns across experiences)
 * 4. Mental Models (Evolving beliefs, behavioral preferences, contradiction handling)
 * + Entity-Relation Knowledge Graph
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'hindsight_db.json');

class BiomimeticStore {
  constructor() {
    this.worldFacts = [];
    this.experiences = [];
    this.observations = [];
    this.mentalModels = [];
    this.knowledgeGraph = {
      nodes: [],
      edges: []
    };
    this.subscribers = new Set();
    this.ensureDataDir();
    this.load();
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  broadcast(eventType, payload) {
    const event = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    };
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch (err) {
        console.error('Subscriber broadcast error:', err);
      }
    }
  }

  load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.worldFacts = data.worldFacts || [];
        this.experiences = data.experiences || [];
        this.observations = data.observations || [];
        this.mentalModels = data.mentalModels || [];
        this.knowledgeGraph = data.knowledgeGraph || { nodes: [], edges: [] };
        console.log(`[Hindsight] Loaded persistent store: ${this.worldFacts.length} facts, ${this.experiences.length} experiences, ${this.observations.length} observations, ${this.mentalModels.length} mental models.`);
        return;
      } catch (e) {
        console.error('[Hindsight] Error reading DB file, reinitializing default seed:', e);
      }
    }
    this.seedDefaultState();
    this.save();
  }

  save() {
    try {
      const data = {
        worldFacts: this.worldFacts,
        experiences: this.experiences,
        observations: this.observations,
        mentalModels: this.mentalModels,
        knowledgeGraph: this.knowledgeGraph,
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Hindsight] Failed to persist database:', err);
    }
  }

  seedDefaultState() {
    console.log('[Hindsight] Seeding initial Chief of Staff baseline...');
    const now = Date.now();
    const dayMs = 86400000;

    // 1. World Facts
    this.worldFacts = [
      {
        id: 'wf-1',
        entity: 'Organization',
        relation: 'core_working_hours',
        target: '09:00 AM - 06:00 PM PST',
        statement: 'Company core working hours are 9:00 AM to 6:00 PM Pacific Time.',
        confidence: 1.0,
        timestamp: new Date(now - 14 * dayMs).toISOString(),
        verified: true
      },
      {
        id: 'wf-2',
        entity: 'Elena Rostova',
        relation: 'role',
        target: 'Lead Investor, Horizon Ventures',
        statement: 'Elena Rostova is the Lead Investor from Horizon Ventures (Series-A Board Director).',
        confidence: 1.0,
        timestamp: new Date(now - 14 * dayMs).toISOString(),
        verified: true
      },
      {
        id: 'wf-3',
        entity: 'Sarah Chen',
        relation: 'role',
        target: 'VP of Product Engineering',
        statement: 'Sarah Chen leads Product Engineering and conducts bi-weekly sprint reviews.',
        confidence: 1.0,
        timestamp: new Date(now - 14 * dayMs).toISOString(),
        verified: true
      },
      {
        id: 'wf-4',
        entity: 'Marcus Vance',
        relation: 'role',
        target: 'Chief Marketing Officer',
        statement: 'Marcus Vance oversees Growth, Brand, and PR communications.',
        confidence: 1.0,
        timestamp: new Date(now - 14 * dayMs).toISOString(),
        verified: true
      },
      {
        id: 'wf-5',
        entity: 'Executive Calendar',
        relation: 'standard_tool',
        target: 'Google Workspace',
        statement: 'Executive scheduling is integrated via Google Calendar with default 10-minute buffers.',
        confidence: 0.95,
        timestamp: new Date(now - 14 * dayMs).toISOString(),
        verified: true
      }
    ];

    // 2. Initial Seed Experiences (Showing evolution across Day 1 to Day 5)
    this.experiences = [
      {
        id: 'exp-1',
        timestamp: new Date(now - 12 * dayMs).toISOString(),
        dayOffset: 1,
        userPrompt: 'Draft an email update to Marcus about the Q3 budget overrun.',
        agentAction: 'Generated 4-paragraph formal email with comprehensive narrative explanations.',
        outcome: 'User rejected draft and instructed: "Too long and wordy. Cut the filler. Lead with the $45K variance number, followed by 3 concrete bullet points."',
        feedback: 'Too long and wordy. Cut the filler. Lead with the $45K variance number, followed by 3 concrete bullet points.',
        sentiment: 'critical',
        domain: 'communication_style',
        tags: ['email', 'budget', 'brevity', 'marcus'],
        entityLinks: ['Marcus Vance']
      },
      {
        id: 'exp-2',
        timestamp: new Date(now - 10 * dayMs).toISOString(),
        dayOffset: 3,
        userPrompt: 'Can we schedule a 1-on-1 catchup with Sarah this Friday at 3:30 PM?',
        agentAction: 'Attempted to book Friday 3:30 PM slot.',
        outcome: 'User cancelled and stated: "Never schedule internal meetings on Friday afternoons. Fridays after 1:00 PM are strictly dedicated to deep focus work."',
        feedback: 'Never schedule internal meetings on Friday afternoons. Fridays after 1:00 PM are strictly dedicated to deep focus work.',
        sentiment: 'directive',
        domain: 'scheduling',
        tags: ['calendar', 'friday', 'focus-block', 'sarah'],
        entityLinks: ['Sarah Chen', 'Executive Calendar']
      },
      {
        id: 'exp-3',
        timestamp: new Date(now - 8 * dayMs).toISOString(),
        dayOffset: 5,
        userPrompt: 'Prepare an executive briefing for the upcoming Product Roadmap sync.',
        agentAction: 'Drafted 120-word briefing with key metrics upfront, timeline delta, and 3 actionable decisions.',
        outcome: 'User approved without edits: "Perfect format. This is exactly how every briefing should look."',
        feedback: 'Perfect format. This is exactly how every briefing should look.',
        sentiment: 'positive',
        domain: 'communication_style',
        tags: ['briefing', 'concise', 'metrics-first'],
        entityLinks: ['Sarah Chen']
      }
    ];

    // 3. Observations synthesized from early experiences
    this.observations = [
      {
        id: 'obs-1',
        title: 'Communication Density Preference',
        pattern: 'User consistently rejects conversational fluff and demands metrics-first briefings capped under 150 words with max 3 bullets.',
        hypothesis: 'Executive prioritizes cognitive bandwidth over politeness filler.',
        supportingExperienceIds: ['exp-1', 'exp-3'],
        confidence: 0.94,
        domain: 'communication_style',
        timestamp: new Date(now - 7 * dayMs).toISOString(),
        updatedAt: new Date(now - 7 * dayMs).toISOString()
      },
      {
        id: 'obs-2',
        title: 'Friday Afternoon Deep Work Sanctity',
        pattern: 'User strictly protects Friday afternoons starting at 1:00 PM for uninterrupted focus, declining all internal syncs.',
        hypothesis: 'Internal operational meetings must be re-routed to Mon-Thu windows.',
        supportingExperienceIds: ['exp-2'],
        confidence: 0.91,
        domain: 'scheduling',
        timestamp: new Date(now - 9 * dayMs).toISOString(),
        updatedAt: new Date(now - 9 * dayMs).toISOString()
      }
    ];

    // 4. Mental Models (Evolving beliefs)
    this.mentalModels = [
      {
        id: 'mm-1',
        title: 'Executive Communication Standard',
        belief: 'Always lead communications with quantitative findings/variance. Omit preamble and warmups. Limit briefings to 3 actionable bullet items.',
        status: 'active',
        category: 'tone_and_format',
        confidence: 0.96,
        exceptions: [],
        supersededBy: null,
        formedAt: new Date(now - 7 * dayMs).toISOString(),
        updatedAt: new Date(now - 7 * dayMs).toISOString(),
        version: 1
      },
      {
        id: 'mm-2',
        title: 'Calendar Routing & Friday Policy',
        belief: 'Strict calendar prohibition: Reject or deflect all internal meetings requested on Fridays after 1:00 PM.',
        status: 'active',
        category: 'scheduling',
        confidence: 0.92,
        exceptions: [],
        supersededBy: null,
        formedAt: new Date(now - 9 * dayMs).toISOString(),
        updatedAt: new Date(now - 9 * dayMs).toISOString(),
        version: 1
      },
      {
        id: 'mm-3',
        title: 'Stakeholder Hierarchy & VIP Routing',
        belief: 'Elena Rostova (Horizon Ventures) is P0 tier. Investor requests bypass standard calendar queue and require immediate notification.',
        status: 'active',
        category: 'priorities',
        confidence: 0.98,
        exceptions: [],
        supersededBy: null,
        formedAt: new Date(now - 14 * dayMs).toISOString(),
        updatedAt: new Date(now - 14 * dayMs).toISOString(),
        version: 1
      }
    ];

    this.rebuildKnowledgeGraph();
  }

  rebuildKnowledgeGraph() {
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    const addNode = (node) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
        nodes.push(node);
      }
    };

    // Add entities and world facts
    for (const fact of this.worldFacts) {
      addNode({
        id: fact.id,
        label: fact.statement.length > 36 ? fact.statement.substring(0, 36) + '...' : fact.statement,
        type: 'world_fact',
        layer: 1,
        fullText: fact.statement,
        entity: fact.entity,
        target: fact.target,
        confidence: fact.confidence,
        timestamp: fact.timestamp
      });

      // Entity node
      const entId = 'ent-' + fact.entity.toLowerCase().replace(/[^a-z0-9]/g, '-');
      addNode({
        id: entId,
        label: fact.entity,
        type: 'entity',
        layer: 0,
        fullText: `Entity: ${fact.entity}`,
        entity: fact.entity
      });

      edges.push({
        id: `e-${entId}-${fact.id}`,
        source: entId,
        target: fact.id,
        relation: fact.relation,
        weight: 1.0
      });
    }

    // Add experiences
    for (const exp of this.experiences) {
      addNode({
        id: exp.id,
        label: `Exp: ${exp.userPrompt.substring(0, 32)}...`,
        type: 'experience',
        layer: 2,
        fullText: `Prompt: ${exp.userPrompt} | Action: ${exp.agentAction} | Feedback: ${exp.feedback}`,
        domain: exp.domain,
        sentiment: exp.sentiment,
        timestamp: exp.timestamp,
        tags: exp.tags
      });

      if (exp.entityLinks && Array.isArray(exp.entityLinks)) {
        for (const ent of exp.entityLinks) {
          const entId = 'ent-' + ent.toLowerCase().replace(/[^a-z0-9]/g, '-');
          if (nodeMap.has(entId)) {
            edges.push({
              id: `e-${exp.id}-${entId}`,
              source: exp.id,
              target: entId,
              relation: 'involves',
              weight: 0.8
            });
          }
        }
      }
    }

    // Add observations
    for (const obs of this.observations) {
      addNode({
        id: obs.id,
        label: obs.title,
        type: 'observation',
        layer: 3,
        fullText: obs.pattern,
        hypothesis: obs.hypothesis,
        confidence: obs.confidence,
        domain: obs.domain,
        timestamp: obs.timestamp
      });

      if (obs.supportingExperienceIds) {
        for (const expId of obs.supportingExperienceIds) {
          if (nodeMap.has(expId)) {
            edges.push({
              id: `e-${expId}-${obs.id}`,
              source: expId,
              target: obs.id,
              relation: 'crystallizes_into',
              weight: 0.9
            });
          }
        }
      }
    }

    // Add Mental Models
    for (const mm of this.mentalModels) {
      addNode({
        id: mm.id,
        label: mm.title,
        type: 'mental_model',
        layer: 4,
        fullText: mm.belief,
        status: mm.status,
        category: mm.category,
        confidence: mm.confidence,
        exceptions: mm.exceptions,
        supersededBy: mm.supersededBy,
        timestamp: mm.updatedAt || mm.formedAt
      });

      // Link observations to mental models
      for (const obs of this.observations) {
        if (obs.domain === mm.category || (obs.title && mm.title && obs.title.includes(mm.category))) {
          edges.push({
            id: `e-${obs.id}-${mm.id}`,
            source: obs.id,
            target: mm.id,
            relation: 'informs_belief',
            weight: 0.95
          });
        }
      }
    }

    this.knowledgeGraph = { nodes, edges };
  }

  // Operation 1: Retain
  retainExperience(experienceData) {
    const now = new Date();
    const id = `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newExp = {
      id,
      timestamp: now.toISOString(),
      dayOffset: experienceData.dayOffset || 14,
      userPrompt: experienceData.userPrompt,
      agentAction: experienceData.agentAction,
      outcome: experienceData.outcome || '',
      feedback: experienceData.feedback || '',
      sentiment: experienceData.sentiment || 'neutral',
      domain: experienceData.domain || 'general',
      tags: experienceData.tags || [],
      entityLinks: experienceData.entityLinks || []
    };

    this.experiences.unshift(newExp);
    this.rebuildKnowledgeGraph();
    this.save();
    this.broadcast('EXPERIENCE_RETAINED', newExp);
    return newExp;
  }

  // Operation 2: World Fact Add
  addWorldFact(factData) {
    const id = `wf-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fact = {
      id,
      entity: factData.entity,
      relation: factData.relation || 'property',
      target: factData.target || '',
      statement: factData.statement,
      confidence: factData.confidence || 1.0,
      timestamp: new Date().toISOString(),
      verified: factData.verified !== false
    };
    this.worldFacts.unshift(fact);
    this.rebuildKnowledgeGraph();
    this.save();
    this.broadcast('WORLD_FACT_ADDED', fact);
    return fact;
  }

  // Operation 3: Add or Update Observation
  addOrUpdateObservation(obsData) {
    let obs = this.observations.find(o => o.title === obsData.title || o.id === obsData.id);
    const now = new Date().toISOString();
    if (obs) {
      obs.pattern = obsData.pattern || obs.pattern;
      obs.hypothesis = obsData.hypothesis || obs.hypothesis;
      obs.confidence = obsData.confidence || obs.confidence;
      obs.supportingExperienceIds = Array.from(new Set([...(obs.supportingExperienceIds || []), ...(obsData.supportingExperienceIds || [])]));
      obs.updatedAt = now;
    } else {
      obs = {
        id: `obs-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: obsData.title,
        pattern: obsData.pattern,
        hypothesis: obsData.hypothesis || '',
        supportingExperienceIds: obsData.supportingExperienceIds || [],
        confidence: obsData.confidence || 0.85,
        domain: obsData.domain || 'general',
        timestamp: now,
        updatedAt: now
      };
      this.observations.unshift(obs);
    }
    this.rebuildKnowledgeGraph();
    this.save();
    this.broadcast('OBSERVATION_UPDATED', obs);
    return obs;
  }

  // Operation 4: Add or Update Mental Model (With Contradiction Resolution)
  addOrUpdateMentalModel(modelData) {
    const now = new Date().toISOString();
    let model = this.mentalModels.find(m => m.id === modelData.id || m.title === modelData.title);

    if (model) {
      // If replacing or refining
      if (modelData.contradictionResolved) {
        model.version = (model.version || 1) + 1;
        model.belief = modelData.belief;
        model.exceptions = modelData.exceptions || model.exceptions;
        model.status = 'active';
        model.confidence = modelData.confidence || 0.95;
        model.updatedAt = now;
      } else {
        model.belief = modelData.belief || model.belief;
        model.updatedAt = now;
      }
    } else {
      model = {
        id: `mm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: modelData.title,
        belief: modelData.belief,
        status: modelData.status || 'active',
        category: modelData.category || 'general',
        confidence: modelData.confidence || 0.9,
        exceptions: modelData.exceptions || [],
        supersededBy: null,
        formedAt: now,
        updatedAt: now,
        version: 1
      };
      this.mentalModels.unshift(model);
    }
    this.rebuildKnowledgeGraph();
    this.save();
    this.broadcast('MENTAL_MODEL_UPDATED', model);
    return model;
  }

  // Get all items in a unified memory bundle
  getAllMemoryItems() {
    const items = [];
    for (const f of this.worldFacts) {
      items.push({
        id: f.id,
        network: 'world_facts',
        title: `${f.entity} (${f.relation})`,
        content: f.statement,
        confidence: f.confidence,
        timestamp: f.timestamp,
        metadata: { entity: f.entity, target: f.target, verified: f.verified }
      });
    }
    for (const e of this.experiences) {
      items.push({
        id: e.id,
        network: 'experiences',
        title: `Task: ${e.userPrompt}`,
        content: `Action: ${e.agentAction}. Outcome/Feedback: ${e.feedback || e.outcome}`,
        confidence: e.sentiment === 'positive' ? 0.95 : e.sentiment === 'critical' ? 0.99 : 0.8,
        timestamp: e.timestamp,
        metadata: { domain: e.domain, tags: e.tags, entityLinks: e.entityLinks, sentiment: e.sentiment }
      });
    }
    for (const o of this.observations) {
      items.push({
        id: o.id,
        network: 'observations',
        title: o.title,
        content: `${o.pattern} Hypothesis: ${o.hypothesis}`,
        confidence: o.confidence,
        timestamp: o.updatedAt || o.timestamp,
        metadata: { domain: o.domain, supportingCount: o.supportingExperienceIds?.length || 0 }
      });
    }
    for (const m of this.mentalModels) {
      if (m.status === 'active') {
        items.push({
          id: m.id,
          network: 'mental_models',
          title: m.title,
          content: `${m.belief} ${m.exceptions && m.exceptions.length ? 'Exceptions: ' + m.exceptions.join('; ') : ''}`,
          confidence: m.confidence,
          timestamp: m.updatedAt || m.formedAt,
          metadata: { category: m.category, version: m.version, exceptions: m.exceptions }
        });
      }
    }
    return items;
  }

  resetToDefault() {
    this.seedDefaultState();
    this.save();
    this.broadcast('STATE_RESET', { reset: true });
    return { success: true, message: 'Reset to default seed state' };
  }
}

// Singleton
const biomimeticStore = new BiomimeticStore();
module.exports = biomimeticStore;
