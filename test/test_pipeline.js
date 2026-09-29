/**
 * Vyora Hindsight Pipeline Verification Test
 * Tests Retain, TEMPR Recall, Reflection, and Contradiction Resolution
 */

const assert = require('assert');
const biomimeticStore = require('../server/hindsight/store');
const TEMPRRecallEngine = require('../server/hindsight/tempr');
const RetainPipeline = require('../server/hindsight/retain');
const ReflectEngine = require('../server/hindsight/reflect');
const ExecutiveAgent = require('../server/hindsight/executiveAgent');

async function runTests() {
  console.log('--- [Test 1] Verifying Biomimetic Store 4 Networks ---');
  biomimeticStore.resetToDefault();
  assert(biomimeticStore.worldFacts.length >= 4, 'World facts should be seeded');
  assert(biomimeticStore.experiences.length >= 3, 'Experiences should be seeded');
  assert(biomimeticStore.observations.length >= 2, 'Observations should be seeded');
  assert(biomimeticStore.mentalModels.length >= 3, 'Mental models should be seeded');
  assert(biomimeticStore.knowledgeGraph.nodes.length >= 10, 'Graph should have nodes');
  assert(biomimeticStore.knowledgeGraph.edges.length >= 8, 'Graph should have edges');
  console.log('✓ Store initialization passed.');

  console.log('\n--- [Test 2] Verifying TEMPR Multi-Strategy Recall ---');
  const tempr = new TEMPRRecallEngine(biomimeticStore);
  const queryResult = tempr.query('Schedule Friday meeting with Sarah Chen', { limit: 3 });
  assert(queryResult.topResults.length > 0, 'TEMPR should return results');
  const top = queryResult.topResults[0];
  console.log(`Top match: [${top.network}] "${top.title}"`);
  console.log('TEMPR Breakdown:', top.temprBreakdown);
  assert(top.temprBreakdown.temporal >= 0, 'Temporal score computed');
  assert(top.temprBreakdown.embedding >= 0, 'Embedding score computed');
  assert(top.temprBreakdown.matching >= 0, 'BM25 score computed');
  assert(top.temprBreakdown.path >= 0, 'Path score computed');
  assert(top.temprBreakdown.compositeScore > 0, 'Composite score should be > 0');
  console.log(`✓ TEMPR multi-strategy recall passed in ${queryResult.executionTimeMs}ms.`);

  console.log('\n--- [Test 3] Verifying Retain Pipeline ---');
  const reflect = new ReflectEngine(biomimeticStore);
  const retain = new RetainPipeline(biomimeticStore, reflect);
  const newExp = await retain.ingest({
    userPrompt: 'Draft an update to Elena on Series-A metrics',
    agentAction: 'Prepared 3-bullet summary with ARR and burn rate',
    feedback: 'Approved without edits',
    outcome: 'Metric delivered',
    dayOffset: 10
  });
  assert(newExp.id, 'Experience must have an ID');
  assert(biomimeticStore.experiences.some(e => e.id === newExp.id), 'Experience must be saved in store');
  console.log('✓ Retain pipeline passed. New experience recorded:', newExp.id);

  console.log('\n--- [Test 4] Verifying Contradiction Resolution & Reflection ---');
  const initialFridayModel = biomimeticStore.mentalModels.find(m => m.category === 'scheduling' && m.title.includes('Friday'));
  console.log('Initial Friday Belief:', initialFridayModel.belief);

  // Ingest contradictory instruction: Allow Friday afternoon meetings for Elena
  const contradictionExp = await retain.ingest({
    userPrompt: 'From now on, Fridays after 2 PM are fine for investor Elena Rostova',
    agentAction: 'Acknowledge investor exception',
    feedback: 'Fridays after 2 PM are fine for investor Elena Rostova',
    outcome: 'Exception registered',
    dayOffset: 14
  });

  // Check that reflection resolved the contradiction
  const updatedFridayModel = biomimeticStore.mentalModels.find(m => m.id === initialFridayModel.id);
  console.log('Updated Friday Belief:', updatedFridayModel.belief);
  console.log('Exceptions list:', updatedFridayModel.exceptions);
  assert(updatedFridayModel.belief.includes('Elena Rostova'), 'Mental model must be updated with Elena exception');
  assert(updatedFridayModel.exceptions.length > 0, 'Exceptions list must contain the investor rule');
  console.log('✓ Contradiction resolution passed.');

  console.log('\n--- [Test 5] Verifying Executive Agent Behavior With Settled Memory ---');
  const agent = new ExecutiveAgent(biomimeticStore, tempr, retain, reflect);
  
  // Test 5A: Internal meeting with Sarah Chen on Friday afternoon -> Deflected
  const sarahRes = await agent.processMessage('Can we schedule a 1-on-1 with Sarah Chen this Friday at 3:30 PM?');
  console.log('Sarah meeting decision:', sarahRes.actionTaken);
  assert(sarahRes.response.includes('DEFLECTED') || sarahRes.response.includes('Focus Protection Active'), 'Internal Friday meeting must be deflected');

  // Test 5B: Investor meeting with Elena Rostova on Friday afternoon -> Approved via exception!
  const elenaRes = await agent.processMessage('Schedule a call with Elena Rostova this Friday at 3:30 PM');
  console.log('Elena meeting decision:', elenaRes.actionTaken);
  assert(elenaRes.response.includes('APPROVED') || elenaRes.response.includes('Investor Priority Exception Applied'), 'Investor Friday meeting must be approved');
  console.log('✓ Executive Agent reasoning with biomimetic memory passed.');

  console.log('\n=============================================');
  console.log('🎉 ALL 5 PIPELINE INTEGRATION TESTS PASSED!');
  console.log('=============================================\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
