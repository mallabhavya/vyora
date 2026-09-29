/**
 * Vyora Retain Pipeline
 * Normalizes incoming interactions, extracts entities and relationships,
 * assesses sentiment/feedback, logs episodic experience, and anchors into the knowledge graph.
 */

class RetainPipeline {
  constructor(store, reflectEngine) {
    this.store = store;
    this.reflectEngine = reflectEngine;
  }

  // Extract entities from text based on known patterns and capitalized tokens
  extractEntities(text) {
    const knownEntities = [
      'Sarah Chen', 'Elena Rostova', 'Marcus Vance', 'Horizon Ventures',
      'Google Meet', 'Google Calendar', 'Slack', 'Q3 Budget', 'Executive Calendar'
    ];
    const found = new Set();
    const lower = text.toLowerCase();

    for (const ent of knownEntities) {
      if (lower.includes(ent.toLowerCase())) {
        found.add(ent);
      }
    }

    // Capitalized 2-word names like "John Doe"
    const nameMatches = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g);
    if (nameMatches) {
      for (const m of nameMatches) {
        if (!m.startsWith('Day ') && !m.startsWith('Q3 ')) {
          found.add(m);
        }
      }
    }

    return Array.from(found);
  }

  // Infer domain of interaction
  inferDomain(text) {
    const lower = text.toLowerCase();
    if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('meet') || lower.includes('friday') || lower.includes('morning') || lower.includes('time') || lower.includes('hour')) {
      return 'scheduling';
    }
    if (lower.includes('draft') || lower.includes('email') || lower.includes('word') || lower.includes('brief') || lower.includes('bullet') || lower.includes('tone') || lower.includes('concise')) {
      return 'communication_style';
    }
    if (lower.includes('investor') || lower.includes('elena') || lower.includes('board') || lower.includes('priority') || lower.includes('urgent') || lower.includes('p0')) {
      return 'priorities';
    }
    if (lower.includes('budget') || lower.includes('dollar') || lower.includes('cost') || lower.includes('spend') || lower.includes('$')) {
      return 'budget_finance';
    }
    return 'general';
  }

  // Infer sentiment
  inferSentiment(feedback, outcome) {
    const combined = `${feedback} ${outcome}`.toLowerCase();
    if (combined.includes('perfect') || combined.includes('great') || combined.includes('good') || combined.includes('approved') || combined.includes('exactly')) {
      return 'positive';
    }
    if (combined.includes('too long') || combined.includes('wordy') || combined.includes('rejected') || combined.includes('wrong') || combined.includes('bad') || combined.includes('cut the')) {
      return 'critical';
    }
    if (combined.includes('never') || combined.includes('don\'t') || combined.includes('always') || combined.includes('strictly') || combined.includes('from now on') || combined.includes('must be')) {
      return 'directive';
    }
    return 'neutral';
  }

  // Ingest interaction into Hindsight
  async ingest({ userPrompt, agentAction, outcome = '', feedback = '', dayOffset = 14 }) {
    const entities = this.extractEntities(`${userPrompt} ${agentAction} ${feedback} ${outcome}`);
    const domain = this.inferDomain(`${userPrompt} ${feedback}`);
    const sentiment = this.inferSentiment(feedback, outcome);

    // Extract tags
    const tags = [domain];
    const lower = `${userPrompt} ${feedback}`.toLowerCase();
    ['friday', 'morning', 'briefing', 'investor', 'budget', 'urgent', 'calendar', 'email'].forEach(w => {
      if (lower.includes(w)) tags.push(w);
    });

    const experience = this.store.retainExperience({
      userPrompt,
      agentAction,
      outcome: outcome || (feedback ? `User feedback: ${feedback}` : 'Task completed'),
      feedback,
      sentiment,
      domain,
      tags,
      entityLinks: entities,
      dayOffset
    });

    console.log(`[Hindsight Retain] Retained experience #${experience.id} (${domain}, sentiment: ${sentiment})`);

    // Check if background reflection should trigger
    if (this.reflectEngine) {
      try {
        await this.reflectEngine.checkAndReflect(experience);
      } catch (err) {
        console.error('[Hindsight Retain] Auto-reflection error:', err);
      }
    }

    return experience;
  }
}

module.exports = RetainPipeline;
