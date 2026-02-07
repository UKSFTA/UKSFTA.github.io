/**
 * UKSF ORBAT Engine (Tactical Visualizer)
 * Uses HTML5 Canvas and Milsymbol.js to render force hierarchy.
 */

const canvas = document.getElementById('orbatCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('orbat-viewport');

// Resize canvas to fit container
function resizeCanvas() {
  canvas.width = viewport.clientWidth;
  canvas.height = viewport.clientHeight;
  renderTree(); // Redraw on resize
}
window.addEventListener('resize', resizeCanvas);

// Configuration
const CONFIG = {
  levelHeight: 120,
  nodeWidth: 60,
  nodeHeight: 60,
  lineColor: '#00ce7d',
  textColor: '#ffffff',
};

// State
let nodes = []; // Flat list of nodes with calculated positions

/**
 * Recursive function to calculate node positions (Simple Tree Layout)
 * @param {Object} node - Current data node
 * @param {Number} level - Depth level (0 = root)
 * @param {Number} minX - Minimum X bound
 * @param {Number} maxX - Maximum X bound
 */
function calculatePositions(node, level, minX, maxX) {
  const x = (minX + maxX) / 2;
  const y = 50 + level * CONFIG.levelHeight;

  // Store node with position
  const renderNode = {
    data: node,
    x: x,
    y: y,
    level: level,
    children: [],
  };
  nodes.push(renderNode);

  if (node.children && node.children.length > 0) {
    const span = (maxX - minX) / node.children.length;

    node.children.forEach((child, index) => {
      const childMin = minX + index * span;
      const childMax = childMin + span;
      const childNode = calculatePositions(
        child,
        level + 1,
        childMin,
        childMax,
      );
      renderNode.children.push(childNode);
    });
  }

  return renderNode;
}

/**
 * Draw a tactical connector line
 */
function drawLine(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.strokeStyle = CONFIG.lineColor;
  ctx.lineWidth = 2;

  // Elbow connector style
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1, y1 + CONFIG.levelHeight / 2); // Down
  ctx.lineTo(x2, y1 + CONFIG.levelHeight / 2); // Across
  ctx.lineTo(x2, y2); // Down to child

  ctx.stroke();
}

/**
 * Draw a single node
 */
function drawNode(node) {
  // Selection Highlight
  /*
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(node.x - CONFIG.nodeWidth/2, node.y - CONFIG.nodeHeight/2, CONFIG.nodeWidth, CONFIG.nodeHeight);
    ctx.strokeRect(node.x - CONFIG.nodeWidth/2, node.y - CONFIG.nodeHeight/2, CONFIG.nodeWidth, CONFIG.nodeHeight);
    */

  // Draw Milsymbol
  if (typeof ms !== 'undefined') {
    const symbol = new ms.Symbol(node.data.sidc || 'SFGPU------', {
      size: 25,
      colorMode: 'Light', // Use light mode for dark background contrast
      uniqueDesignation: node.data.name,
    });

    const symCanvas = symbol.asCanvas();
    // Center the image
    ctx.drawImage(
      symCanvas,
      node.x - symCanvas.width / 2,
      node.y - symCanvas.height / 2,
    );
  } else {
    // Fallback
    ctx.fillStyle = CONFIG.lineColor;
    ctx.fillText(node.data.name, node.x - 20, node.y);
  }
}

/**
 * Main Render Loop
 */
function renderTree() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  nodes = []; // Reset state
  if (!window.ORBAT_DATA) return;

  // 1. Calculate Geometry
  const _root = calculatePositions(window.ORBAT_DATA, 0, 0, canvas.width);

  // 2. Draw Connections first (so they are behind nodes)
  nodes.forEach((node) => {
    if (node.children) {
      node.children.forEach((child) => {
        drawLine(node.x, node.y, child.x, child.y);
      });
    }
  });

  // 3. Draw Nodes
  nodes.forEach((node) => {
    drawNode(node);
  });
}

// Interaction: Click Handling
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // Find clicked node
  const clicked = nodes.find(
    (n) =>
      clickX >= n.x - 40 &&
      clickX <= n.x + 40 &&
      clickY >= n.y - 40 &&
      clickY <= n.y + 40,
  );

  if (clicked) {
    updateSidebar(clicked.data);
  }
});

function updateSidebar(data) {
  document.getElementById('detail-name').innerText = data.name;
  document.getElementById('detail-role').innerText =
    data.description || 'Classified';
  document.getElementById('detail-sidc').innerText = data.sidc;

  // Draw large symbol in sidebar
  const container = document.getElementById('detail-symbol');
  container.innerHTML = ''; // Clear previous

  if (typeof ms !== 'undefined') {
    const symbol = new ms.Symbol(data.sidc, {
      size: 50,
      colorMode: 'Light',
      uniqueDesignation: data.name,
    });
    container.appendChild(symbol.asCanvas());
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  // Force milsymbol to load if async
  setTimeout(renderTree, 500);
});
