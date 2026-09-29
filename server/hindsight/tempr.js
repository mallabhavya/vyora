/**
 * Vyora TEMPR Recall Engine
 * Implements Hindsight's 4-strategy retrieval fusion:
 * - T: Temporal Decay & Recency
 * - E: Embedding Semantic Cosine Similarity
 * - M: Matching (BM25 Lexical Retrieval)
 * - P/R: Path & Graph Traversal Reasoning
 */

class TEMPRRecallEngine {
  constructor(store) {
    this.store = store;
    this.weights = {
      temporal: 0.20,
      embedding: 0.35,
      matching: 0.25,
      path: 0.20
    };
  }

  // Tokenizer and normalizer
  tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !this.isStopword(w));
  }

  isStopword(word) {
    const stops = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'for',
      'to', 'with', 'about', 'from', 'by', 'as', 'into', 'that', 'this', 'it',
      'be', 'are', 'was', 'were', 'will', 'would', 'could', 'should', 'can'
    ]);
    return stops.has(word);
  }

  // 1. T: Temporal Score Calculation
  computeTemporalScore(item, queryTokens) {
    const now = Date.now();
    const itemTime = item.timestamp ? new Date(item.timestamp).getTime() : now;
    const deltaMs = Math.max(0, now - itemTime);
    const deltaDays = deltaMs / (1000 * 60 * 60 * 24);

    // Half-lives depending on network tier
    let halfLifeDays = 21;
    if (item.network === 'mental_models') halfLifeDays = 90;
    else if (item.network === 'world_facts') halfLifeDays = 180;
    else if (item.network === 'observations') halfLifeDays = 45;
    else if (item.network === 'experiences') halfLifeDays = 14;

    // Exponential decay
    let score = Math.exp((-Math.LN2 * deltaDays) / halfLifeDays);

    // Query temporal sensitivity bonus
    const temporalKeywords = ['today', 'yesterday', 'recently', 'last', 'friday', 'sprint', 'q3', 'now', 'earlier'];
    const queryHasTemporal = queryTokens.some(t => temporalKeywords.includes(t));
    if (queryHasTemporal && deltaDays <= 7) {
      score = Math.min(1.0, score * 1.35);
    }

    return Math.max(0.05, Math.min(1.0, score));
  }

  // 2. E: Semantic Embedding Cosine Similarity
  createVector(tokens, vocabulary) {
    const vec = new Float64Array(vocabulary.size);
    const tf = new Map();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }

    let i = 0;
    let normSq = 0;
    for (const [term, id] of vocabulary.entries()) {
      const count = tf.get(term) || 0;
      if (count > 0) {
        // Sublinear TF scaling
        const val = 1 + Math.log(count);
        vec[id] = val;
        normSq += val * val;
      }
      i++;
    }

    // Normalize
    const norm = Math.sqrt(normSq);
    if (norm > 0) {
      for (let j = 0; j < vec.length; j++) {
        vec[j] /= norm;
      }
    }
    return vec;
  }

  computeEmbeddingScore(queryTokens, itemTokens, vocabulary) {
    if (queryTokens.length === 0 || itemTokens.length === 0) return 0;
    const qVec = this.createVector(queryTokens, vocabulary);
    const dVec = this.createVector(itemTokens, vocabulary);

    let dot = 0;
    for (let i = 0; i < qVec.length; i++) {
      dot += qVec[i] * dVec[i];
    }

    // Subword character trigram bonus for semantic fuzziness
    const qTrigrams = this.getCharNgrams(queryTokens.join(' '), 3);
    const dTrigrams = this.getCharNgrams(itemTokens.join(' '), 3);
    const trigramOverlap = this.jaccardSimilarity(qTrigrams, dTrigrams);

    const hybridScore = (dot * 0.7) + (trigramOverlap * 0.3);
    return Math.max(0, Math.min(1.0, hybridScore));
  }

  getCharNgrams(text, n) {
    const set = new Set();
    const clean = text.toLowerCase().replace(/\s+/g, ' ');
    for (let i = 0; i <= clean.length - n; i++) {
      set.add(clean.substring(i, i + n));
    }
    return set;
  }

  jaccardSimilarity(setA, setB) {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const elem of setA) {
      if (setB.has(elem)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  // 3. M: Okapi BM25 Lexical Retrieval
  computeBM25Scores(queryTokens, corpus) {
    const k1 = 1.5;
    const b = 0.75;
    const N = corpus.length;

    // Document lengths and avg length
    let totalLen = 0;
    const docLens = [];
    const docTermFreqs = [];
    const docFreq = new Map();

    for (let i = 0; i < N; i++) {
      const tokens = corpus[i].tokens;
      docLens.push(tokens.length);
      totalLen += tokens.length;

      const tf = new Map();
      const unique = new Set(tokens);
      for (const t of tokens) {
        tf.set(t, (tf.get(t) || 0) + 1);
      }
      docTermFreqs.push(tf);

      for (const u of unique) {
        docFreq.set(u, (docFreq.get(u) || 0) + 1);
      }
    }

    const avgdl = totalLen / Math.max(1, N);

    const scores = [];
    let maxScore = 0.0001;

    for (let i = 0; i < N; i++) {
      let score = 0;
      const tf = docTermFreqs[i];
      const docLen = docLens[i];

      for (const qTerm of queryTokens) {
        const count = tf.get(qTerm) || 0;
        if (count > 0) {
          const df = docFreq.get(qTerm) || 0;
          const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
          const num = count * (k1 + 1);
          const denom = count + k1 * (1 - b + b * (docLen / avgdl));
          score += idf * (num / denom);
        }
      }
      scores.push(score);
      if (score > maxScore) maxScore = score;
    }

    // Normalize to 0..1
    return scores.map(s => Math.min(1.0, s / maxScore));
  }

  // 4. P: Path & Graph Traversal Reasoning
  computePathScores(queryText, items, graph) {
    const qLower = queryText.toLowerCase();
    const scores = new Map();
    const paths = new Map();

    // Identify seed entities in query from graph nodes
    const seedNodes = [];
    for (const node of graph.nodes) {
      if (node.entity && qLower.includes(node.entity.toLowerCase())) {
        seedNodes.push(node.id);
      } else if (node.type === 'entity' && qLower.includes(node.label.toLowerCase())) {
        seedNodes.push(node.id);
      } else if (node.tags && node.tags.some(tag => qLower.includes(tag.toLowerCase()))) {
        seedNodes.push(node.id);
      }
    }

    // Build adjacency list
    const adj = new Map();
    for (const edge of graph.edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      if (!adj.has(edge.target)) adj.set(edge.target, []);
      adj.get(edge.source).push({ neighbor: edge.target, relation: edge.relation, weight: edge.weight || 0.8 });
      adj.get(edge.target).push({ neighbor: edge.source, relation: edge.relation, weight: edge.weight || 0.8 });
    }

    // BFS 1-hop and 2-hop traversal with decay
    const visited = new Map(); // nodeId -> { score, path }
    for (const seedId of seedNodes) {
      visited.set(seedId, { score: 1.0, path: [seedId] });
      const neighbors = adj.get(seedId) || [];
      for (const n of neighbors) {
        const hop1Score = 0.85 * n.weight;
        if (!visited.has(n.neighbor) || visited.get(n.neighbor).score < hop1Score) {
          visited.set(n.neighbor, { score: hop1Score, path: [seedId, `-[${n.relation}]->`, n.neighbor] });
        }

        // 2-hop
        const hop2Neighbors = adj.get(n.neighbor) || [];
        for (const n2 of hop2Neighbors) {
          if (n2.neighbor === seedId) continue;
          const hop2Score = 0.65 * n.weight * n2.weight;
          if (!visited.has(n2.neighbor) || visited.get(n2.neighbor).score < hop2Score) {
            visited.set(n2.neighbor, {
              score: hop2Score,
              path: [seedId, `-[${n.relation}]->`, n.neighbor, `-[${n2.relation}]->`, n2.neighbor]
            });
          }
        }
      }
    }

    // Map graph scores to items
    for (const item of items) {
      if (visited.has(item.id)) {
        const v = visited.get(item.id);
        scores.set(item.id, v.score);
        paths.set(item.id, v.path.join(' '));
      } else {
        // Fallback: check if item content mentions any seed entities
        let indirectScore = 0.1;
        for (const seedId of seedNodes) {
          const node = graph.nodes.find(n => n.id === seedId);
          if (node && item.content.toLowerCase().includes(node.label.toLowerCase())) {
            indirectScore = 0.5;
            paths.set(item.id, `Entity match: ${node.label}`);
            break;
          }
        }
        scores.set(item.id, indirectScore);
      }
    }

    return { scores, paths };
  }

  // Master TEMPR Query
  query(queryText, options = {}) {
    const startTime = Date.now();
    const limit = options.limit || 5;
    const items = this.store.getAllMemoryItems();
    const graph = this.store.knowledgeGraph;

    if (items.length === 0) {
      return {
        query: queryText,
        executionTimeMs: 0,
        results: []
      };
    }

    const queryTokens = this.tokenize(queryText);

    // Build vocabulary across query and items
    const vocabulary = new Map();
    let vocabId = 0;
    const addTokens = (tokens) => {
      for (const t of tokens) {
        if (!vocabulary.has(t)) {
          vocabulary.set(t, vocabId++);
        }
      }
    };
    addTokens(queryTokens);

    const corpus = items.map(item => {
      const tokens = this.tokenize(`${item.title} ${item.content}`);
      addTokens(tokens);
      return { item, tokens };
    });

    // 1. Temporal Scores
    const temporalScores = items.map(item => this.computeTemporalScore(item, queryTokens));

    // 2. Embedding Semantic Scores
    const embeddingScores = corpus.map(doc => this.computeEmbeddingScore(queryTokens, doc.tokens, vocabulary));

    // 3. BM25 Matching Scores
    const bm25Scores = this.computeBM25Scores(queryTokens, corpus);

    // 4. Path & Graph Reasoning Scores
    const { scores: pathScoreMap, paths: pathTraceMap } = this.computePathScores(queryText, items, graph);
    const pathScores = items.map(item => pathScoreMap.get(item.id) || 0.1);

    // Composite Calculation & Diagnostics
    const results = items.map((item, i) => {
      const sT = temporalScores[i];
      const sE = embeddingScores[i];
      const sM = bm25Scores[i];
      const sP = pathScores[i];

      const composite = (
        this.weights.temporal * sT +
        this.weights.embedding * sE +
        this.weights.matching * sM +
        this.weights.path * sP
      );

      return {
        id: item.id,
        network: item.network,
        title: item.title,
        content: item.content,
        confidence: item.confidence,
        timestamp: item.timestamp,
        metadata: item.metadata,
        temprBreakdown: {
          temporal: Math.round(sT * 100) / 100,
          embedding: Math.round(sE * 100) / 100,
          matching: Math.round(sM * 100) / 100,
          path: Math.round(sP * 100) / 100,
          compositeScore: Math.round(composite * 1000) / 1000,
          graphTrace: pathTraceMap.get(item.id) || 'Direct connection'
        }
      };
    });

    // Sort by composite score descending
    results.sort((a, b) => b.temprBreakdown.compositeScore - a.temprBreakdown.compositeScore);

    const executionTimeMs = Date.now() - startTime;
    return {
      query: queryText,
      executionTimeMs,
      totalCandidates: items.length,
      topResults: results.slice(0, limit),
      allResults: results
    };
  }
}

module.exports = TEMPRRecallEngine;
