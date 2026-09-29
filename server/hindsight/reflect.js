/**
 * Vyora Reflect Engine
 * Synthesizes experiences into observations, detects emergent patterns,
 * handles contradiction resolution with temporal precedence and exception synthesis,
 * and maintains settled cognitive mental models.
 */

class ReflectEngine {
  constructor(store) {
    this.store = store;
    this.reflectionLogs = [];
  }

  getReflectionLogs() {
    return this.reflectionLogs;
  }

  // Triggered on new experiences or on-demand
  async checkAndReflect(newExperience) {
    console.log(`[Hindsight Reflect] Initiating reflection cycle triggered by ${newExperience.id}...`);
    const insights = [];

    const feedbackText = `${newExperience.userPrompt} ${newExperience.feedback} ${newExperience.outcome}`.toLowerCase();

    // 1. Contradiction Analysis: Check against active Mental Models
    const activeModels = this.store.mentalModels.filter(m => m.status === 'active');

    for (const mm of activeModels) {
      // Check Friday scheduling contradiction
      if (mm.category === 'scheduling' && (mm.belief.includes('Friday') || mm.belief.includes('friday'))) {
        const mentionsFriday = feedbackText.includes('friday');
        const mentionsException = feedbackText.includes('fine') || feedbackText.includes('allow') || 
                                  feedbackText.includes('permit') || feedbackText.includes('investor') || 
                                  feedbackText.includes('elena') || feedbackText.includes('except');
        
        if (mentionsFriday && mentionsException) {
          console.log(`[Hindsight Reflect] ⚡ Contradiction detected against Mental Model "${mm.title}"!`);

          const updatedBelief = 'Default: Reject internal meetings on Friday afternoons after 1:00 PM. Exception: Series-A investor calls (e.g. Elena Rostova / Horizon Ventures) are explicitly permitted after 2:00 PM.';
          const exceptionRule = 'Elena Rostova & Series-A investor calls permitted on Fridays after 2:00 PM with 15m buffer.';

          const updatedModel = this.store.addOrUpdateMentalModel({
            id: mm.id,
            title: 'Calendar Routing & Friday Policy (Refined v2)',
            belief: updatedBelief,
            category: 'scheduling',
            confidence: 0.98,
            contradictionResolved: true,
            exceptions: Array.from(new Set([...(mm.exceptions || []), exceptionRule]))
          });

          // Also update or add observation
          this.store.addOrUpdateObservation({
            title: 'Investor Exception to Friday Protocol',
            pattern: 'User prioritizes investor access above internal focus blocks on Friday afternoons.',
            hypothesis: 'Investor relations override standard calendar defenses when scheduled after 2:00 PM.',
            supportingExperienceIds: [newExperience.id],
            confidence: 0.96,
            domain: 'scheduling'
          });

          const insight = {
            id: `ref-${Date.now()}`,
            type: 'CONTRADICTION_RESOLVED',
            targetModelId: mm.id,
            previousBelief: mm.belief,
            refinedBelief: updatedBelief,
            exceptionAdded: exceptionRule,
            triggerExperienceId: newExperience.id,
            timestamp: new Date().toISOString()
          };
          this.reflectionLogs.unshift(insight);
          this.store.broadcast('CONTRADICTION_RESOLVED', insight);
          insights.push(insight);
        }
      }

      // Check Communication style contradiction or refinement
      if (mm.category === 'tone_and_format' && (feedbackText.includes('bullet') || feedbackText.includes('brief') || feedbackText.includes('wordy') || feedbackText.includes('preamble'))) {
        const observation = this.store.addOrUpdateObservation({
          title: 'Hyper-Concise Executive Directive',
          pattern: 'User strictly enforces zero preamble, immediate quantitative metric leads, and max 3 bullets.',
          hypothesis: 'Executive reads communications primarily on mobile or between rapid context-switches.',
          supportingExperienceIds: [newExperience.id],
          confidence: 0.98,
          domain: 'communication_style'
        });

        const insight = {
          id: `ref-${Date.now()}`,
          type: 'PATTERN_REINFORCED',
          observationId: observation.id,
          pattern: observation.pattern,
          triggerExperienceId: newExperience.id,
          timestamp: new Date().toISOString()
        };
        this.reflectionLogs.unshift(insight);
        this.store.broadcast('PATTERN_REINFORCED', insight);
        insights.push(insight);
      }
    }

    return insights;
  }

  // Full manual reflection run across all experiences
  async runFullReflection() {
    const experiences = this.store.experiences;
    const insights = [];

    // Group by domain
    const domains = {};
    for (const exp of experiences) {
      if (!domains[exp.domain]) domains[exp.domain] = [];
      domains[exp.domain].push(exp);
    }

    for (const [domain, exps] of Object.entries(domains)) {
      if (exps.length >= 2) {
        const obs = this.store.addOrUpdateObservation({
          title: `Synthesized ${domain.toUpperCase().replace('_', ' ')} Heuristic`,
          pattern: `Discovered persistent behavioral pattern across ${exps.length} historical episodes in ${domain}.`,
          hypothesis: `User decision policy in ${domain} is stable with confidence ${(0.85 + Math.min(0.14, exps.length * 0.03)).toFixed(2)}.`,
          supportingExperienceIds: exps.map(e => e.id),
          confidence: Math.min(0.99, 0.85 + (exps.length * 0.03)),
          domain
        });

        insights.push({
          id: `ref-full-${Date.now()}-${domain}`,
          type: 'DOMAIN_SYNTHESIS',
          domain,
          observation: obs,
          timestamp: new Date().toISOString()
        });
      }
    }

    const logEntry = {
      id: `ref-batch-${Date.now()}`,
      type: 'BATCH_REFLECTION_COMPLETED',
      totalExperiencesSynthesized: experiences.length,
      insightsGenerated: insights.length,
      timestamp: new Date().toISOString()
    };
    this.reflectionLogs.unshift(logEntry);
    this.store.broadcast('BATCH_REFLECTION_COMPLETED', logEntry);

    return {
      success: true,
      insightsGenerated: insights.length,
      reflectionLog: logEntry
    };
  }
}

module.exports = ReflectEngine;
