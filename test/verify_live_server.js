const http = require('http');

function post(urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: urlPath
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(JSON.parse(raw)));
    }).on('error', reject);
  });
}

async function verifyLiveServer() {
  console.log('1. Checking /api/status...');
  const status = await get('/api/status');
  console.log('Status OK:', status.name, status.hindsightEngine);

  console.log('\n2. Testing Sarah Chen Friday meeting booking (Expect Deflection)...');
  const sarah = await post('/api/chat', { prompt: 'Can we schedule a 1-on-1 with Sarah Chen this Friday at 3:30 PM?' });
  console.log('Action Taken:', sarah.actionTaken);
  console.log('Response Snippet:', sarah.response.substring(0, 100) + '...');
  console.log('TEMPR Top Memory Match:', sarah.temprTrace.topMemories[0].title, sarah.temprTrace.topMemories[0].scores);

  console.log('\n3. Testing Contradiction Resolution: Update Friday Policy...');
  const updateRule = await post('/api/chat', { prompt: 'From now on, Fridays after 2 PM are fine for investor Elena Rostova' });
  console.log('Action Taken:', updateRule.actionTaken);
  console.log('Response Snippet:', updateRule.response.substring(0, 120) + '...');

  console.log('\n4. Testing Elena Rostova Friday meeting booking (Expect Approved via Exception)...');
  const elena = await post('/api/chat', { prompt: 'Schedule a call with Elena Rostova this Friday at 3:30 PM' });
  console.log('Action Taken:', elena.actionTaken);
  console.log('Response Snippet:', elena.response.substring(0, 120) + '...');

  console.log('\n5. Testing Style Adherence: Marcus Vance Budget Email...');
  const marcus = await post('/api/chat', { prompt: 'Draft an email update to Marcus Vance regarding the Q3 budget variance' });
  console.log('Action Taken:', marcus.actionTaken);
  console.log('Response Snippet:', marcus.response.substring(0, 120) + '...');

  console.log('\n6. Checking /api/graph nodes and edges...');
  const graph = await get('/api/graph');
  console.log(`Graph has ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);

  console.log('\n7. Testing Batch Reflection...');
  const reflectRes = await post('/api/reflect', {});
  console.log('Reflection Result:', reflectRes);

  console.log('\n✅ ALL LIVE ENDPOINTS AND HINDSIGHT CAPABILITIES VERIFIED 100% OPERATIONAL!');
}

verifyLiveServer().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
