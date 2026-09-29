/**
 * Vyora Memory Graph Visualizer
 * Physics-based interactive canvas rendering with particle pulses and layer tiers
 */

class BiomimeticGraphVisualizer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onNodeSelect = options.onNodeSelect || (() => {});

    this.nodes = [];
    this.edges = [];
    this.particles = [];

    // Camera transform
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;

    // Interaction state
    this.isDragging = false;
    this.isPanning = false;
    this.draggedNode = null;
    this.hoveredNode = null;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Color definitions matching CSS light theme
    this.colors = {
      world_fact: '#3b82f6',
      experience: '#f59e0b',
      observation: '#10b981',
      mental_model: '#8b5cf6',
      entity: '#0ea5e9',
      edge: 'rgba(0, 0, 0, 0.12)',
      edgeHighlight: 'rgba(37, 99, 235, 0.8)',
      text: '#0f172a'
    };

    this.setupResize();
    this.setupEvents();
    this.animate();
  }

  setupResize() {
    const resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', resize);
    resize();
    // Default pan to center
    this.panX = this.width / 2;
    this.panY = this.height / 2;
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      const mouse = this.screenToWorld(e.offsetX, e.offsetY);
      const clicked = this.findNodeAt(mouse.x, mouse.y);
      if (clicked) {
        this.isDragging = true;
        this.draggedNode = clicked;
        this.onNodeSelect(clicked);
      } else {
        this.isPanning = true;
        this.dragStartX = e.clientX - this.panX;
        this.dragStartY = e.clientY - this.panY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (this.isDragging && this.draggedNode) {
        const world = this.screenToWorld(mouseX, mouseY);
        this.draggedNode.x = world.x;
        this.draggedNode.y = world.y;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
      } else if (this.isPanning) {
        this.panX = e.clientX - this.dragStartX;
        this.panY = e.clientY - this.dragStartY;
      } else {
        const world = this.screenToWorld(mouseX, mouseY);
        this.hoveredNode = this.findNodeAt(world.x, world.y);
        this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'grab';
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isPanning = false;
      this.draggedNode = null;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(0.4, Math.min(2.5, this.zoom * zoomFactor));

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;
    });
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom
    };
  }

  findNodeAt(x, y) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const r = n.radius || 18;
      const dist = Math.hypot(n.x - x, n.y - y);
      if (dist <= r + 4) return n;
    }
    return null;
  }

  setGraphData(graphData) {
    if (!graphData || !graphData.nodes) return;

    // Retain existing positions if matching IDs
    const posMap = new Map();
    for (const n of this.nodes) {
      posMap.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy });
    }

    this.nodes = graphData.nodes.map((n, i) => {
      const existing = posMap.get(n.id);
      let r = 18;
      if (n.type === 'mental_model') r = 24;
      else if (n.type === 'observation') r = 20;
      else if (n.type === 'entity') r = 15;

      const angle = (i / graphData.nodes.length) * Math.PI * 2;
      const layerDist = (n.layer !== undefined ? n.layer : 2) * 60 + 40;

      return {
        ...n,
        radius: r,
        x: existing ? existing.x : Math.cos(angle) * layerDist + (Math.random() - 0.5) * 40,
        y: existing ? existing.y : Math.sin(angle) * layerDist + (Math.random() - 0.5) * 40,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0
      };
    });

    this.edges = graphData.edges.map(e => ({ ...e }));

    // Spawn animated pulse particles along edges
    this.particles = [];
    for (let i = 0; i < Math.min(24, this.edges.length * 2); i++) {
      const edge = this.edges[i % this.edges.length];
      this.particles.push({
        sourceId: edge.source,
        targetId: edge.target,
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.005
      });
    }
  }

  // Physics Simulation Step
  updatePhysics() {
    const kRepel = 6500;
    const kSpring = 0.02;
    const centerGravity = 0.008;
    const damping = 0.86;

    // Node repulsion
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy) || 1;

        if (dist < 320) {
          const force = (kRepel / (dist * dist));
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (a !== this.draggedNode) { a.vx -= fx; a.vy -= fy; }
          if (b !== this.draggedNode) { b.vx += fx; b.vy += fy; }
        }
      }
    }

    // Edge spring forces
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    for (const edge of this.edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (a && b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const targetLen = 140;
        const force = (dist - targetLen) * kSpring;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (a !== this.draggedNode) { a.vx += fx; a.vy += fy; }
        if (b !== this.draggedNode) { b.vx -= fx; b.vy -= fy; }
      }
    }

    // Center gravity & update position
    for (const n of this.nodes) {
      if (n === this.draggedNode) continue;
      n.vx -= n.x * centerGravity;
      n.vy -= n.y * centerGravity;
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
    }

    // Update particles
    for (const p of this.particles) {
      p.progress += p.speed;
      if (p.progress >= 1.0) p.progress = 0;
    }
  }

  // Draw Frame
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.zoom, this.zoom);

    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    // 1. Draw Edges
    for (const edge of this.edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;

      const isConnectedToHover = this.hoveredNode && (edge.source === this.hoveredNode.id || edge.target === this.hoveredNode.id);

      this.ctx.beginPath();
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
      this.ctx.strokeStyle = isConnectedToHover ? this.colors.edgeHighlight : this.colors.edge;
      this.ctx.lineWidth = isConnectedToHover ? 2 : 1;
      this.ctx.stroke();

      // Draw relation label if connected to hover
      if (isConnectedToHover && edge.relation) {
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        this.ctx.font = '10px "JetBrains Mono"';
        this.ctx.fillStyle = '#64748b';
        this.ctx.fillText(edge.relation, midX + 4, midY - 4);
      }
    }

    // 2. Draw Moving Particle Pulses
    for (const p of this.particles) {
      const a = nodeMap.get(p.sourceId);
      const b = nodeMap.get(p.targetId);
      if (!a || !b) continue;

      const px = a.x + (b.x - a.x) * p.progress;
      const py = a.y + (b.y - a.y) * p.progress;

      this.ctx.beginPath();
      this.ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.shadowColor = '#0ea5e9';
      this.ctx.shadowBlur = 4;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    // 3. Draw Nodes
    for (const n of this.nodes) {
      const isHovered = n === this.hoveredNode;
      const color = this.colors[n.type] || '#3b82f6';

      // Halo on hover
      if (isHovered) {
        this.ctx.beginPath();
        this.ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fill();
      }

      // Main Node Circle
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = isHovered ? 3 : 2;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = isHovered ? 8 : 2;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;

      // Inner Core Accent
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.radius * 0.45, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();

      // Text Label
      this.ctx.font = '11px "Inter", sans-serif';
      this.ctx.fillStyle = '#0f172a';
      this.ctx.textAlign = 'center';
      const labelText = n.label || n.id;
      this.ctx.fillText(labelText, n.x, n.y + n.radius + 14);
    }

    this.ctx.restore();
  }

  animate() {
    this.updatePhysics();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  zoomIn() {
    this.zoom = Math.min(2.5, this.zoom * 1.25);
  }

  zoomOut() {
    this.zoom = Math.max(0.4, this.zoom / 1.25);
  }

  center() {
    this.zoom = 1.0;
    this.panX = this.width / 2;
    this.panY = this.height / 2;
  }
}

window.BiomimeticGraphVisualizer = BiomimeticGraphVisualizer;
