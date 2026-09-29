# Vyora: Adaptive Cognitive Chief of Staff
### Built for the "AI Agents That Learn Using Hindsight" Hackathon (Vectorize.io)

> **Vyora** is an autonomous Executive Chief of Staff that learns from past interactions, dynamically resolves contradictions, and retains long-term behavioral heuristics across sessions using **Hindsight's Biomimetic Agent Memory Architecture**.

---

## 🌟 Key Innovations

1. **Biomimetic 4-Tier Memory Networks**:
   - **World Facts** (Blue): Objective organizational truths (core hours 9 AM - 6 PM PST, executive org chart, tools).
   - **Experiences** (Amber): Timestamped episodic memory capturing tasks, actions taken, and user critique/approval.
   - **Observations** (Emerald): Inductive patterns synthesized across multiple experiences (e.g., preference for metrics-first brevity).
   - **Mental Models** (Purple): High-level cognitive beliefs, behavioral guidelines, and decision boundaries with version tracking.

2. **TEMPR Multi-Strategy Retrieval Engine**:
   - Computes composite relevance in **< 10ms** by fusing:
     $$S_{\text{TEMPR}} = 0.20 \cdot S_T + 0.35 \cdot S_E + 0.25 \cdot S_M + 0.20 \cdot S_P$$
     * **T (Temporal)**: Exponential decay with tiered half-lives and recency boosting.
     * **E (Embedding)**: Subword n-gram cosine semantic similarity.
     * **M (Matching)**: Okapi BM25 lexical term-frequency scoring.
     * **P (Path)**: 1-to-2 hop BFS graph traversal and relation weighting.

3. **Autonomous Reflection & Contradiction Resolution**:
   - Automatically detects when new user directives clash with existing mental models.
   - Synthesizes exception rules (e.g. investor exceptions to focus blocks) without corrupting previous history.

4. **Zero-Latency Settled Memory Reads**:
   - Operational directives and behavioral models are pre-resolved, eliminating expensive multi-turn RAG retrieval loops.

---

## 🖥️ Live Executive Cockpit Features

- **Interactive 2D Biomimetic Canvas Graph**: Physics-based force simulation with glowing nodes, particle flow on active pathways, drag, zoom, and click-to-inspect drawer.
- **Real-Time TEMPR Inspector**: Live bar charts showing the exact mathematical breakdown of Temporal, Embedding, BM25, and Graph Path scores for every interaction.
- **Continuous Synthesis Stream**: Real-time Server-Sent Events (SSE) broadcasting memory retention, observation induction, and contradiction resolution.
- **Quick Scenario Ribbon**: One-click test scenarios engineered specifically for hackathon demonstrations.

---

## 🚀 Getting Started

### 1. Launch Server
The server is already running daemonized on port 3000! If restarting:
```bash
node server/server.js
```
Open **`http://localhost:3000`** in your browser.

### 2. Run Verification Suite
To execute the automated 5-step pipeline integration test:
```bash
node test/test_pipeline.js
```

To run the live server diagnostic script:
```bash
node test/verify_live_server.js
```

---

## 🏆 4 Golden Demo Scenarios for Judges

| Step | Scenario | User Input | Agent Action & Hindsight Mechanism |
| :--- | :--- | :--- | :--- |
| **1** | **Focus Protection Deflection** | *"Can we schedule a 1-on-1 with Sarah Chen this Friday at 3:30 PM?"* | **Deflected**: Mentions Sarah Chen (Internal VP). Settled Mental Model `mm-2` blocks Friday afternoon syncs. Proactively offers Monday 10:00 AM. |
| **2** | **Contradiction Resolution** | *"From now on, Fridays after 2 PM are fine for investor Elena Rostova"* | **Contradiction Resolved**: Detects clash with `mm-2`. Upgrades mental model to v2, synthesizes investor exception rule, updates graph. |
| **3** | **Investor Priority Exception** | *"Schedule a call with Elena Rostova this Friday at 3:30 PM"* | **Approved & Reserved**: Re-evaluates against `mm-2 (Refined v2)`. Recognizes Elena as Series-A investor exception and reserves slot with 15m buffer. |
| **4** | **Communication Style Adherence** | *"Draft an email update to Marcus Vance regarding the Q3 budget variance"* | **Metrics-First Briefing**: Follows `mm-1` style model—leads immediately with the $45K variance, 0 filler greetings, strictly 3 bullet items. |

---

## 📁 Project Structure

```
vyora/
├── PROJECT_INFO.md           # Complete architectural specification & theory
├── README.md                 # System overview and demo script
├── package.json              # Project dependencies (Express, CORS)
├── data/
│   └── hindsight_db.json     # Persistent Biomimetic Store on disk
├── server/
│   ├── server.js             # Express API & Server-Sent Events (SSE) stream
│   └── hindsight/
│       ├── store.js          # 4 Biomimetic Networks & Knowledge Graph
│       ├── tempr.js          # TEMPR Multi-Strategy Retrieval Engine
│       ├── retain.js         # Entity extraction & episodic ingestion pipeline
│       ├── reflect.js        # Background reflection & contradiction resolver
│       └── executiveAgent.js # Chief of Staff reasoning and execution brain
├── public/
│   ├── index.html            # Executive Cockpit UI
│   ├── style.css             # Glassmorphic dark theme & design system
│   ├── graphVisualizer.js    # Interactive canvas 2D force-directed graph
│   └── app.js                # Live SSE stream, chat orchestration, TEMPR UI
└── test/
    ├── test_pipeline.js      # Unit/integration test for Hindsight memory
    └── verify_live_server.js # Live server endpoint verification script
```
