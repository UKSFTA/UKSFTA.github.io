// Institutional ORBAT - Canvas Controller v6.5 (Multi-Select & Box Select)

const canvas = document.getElementById('orbat-canvas');
const content = document.getElementById('canvas-content');
const zoomDisplay = document.getElementById('zoom-level');
const svgLayer = document.getElementById('orbat-connectors');
const tempLink = document.getElementById('temp-link');
const iconModal = document.getElementById('icon-modal');
const iconGrid = document.getElementById('icon-grid');

const SNAP_SIZE = 40;
const OFFSET = 5000;

let scale = 0.8;
let translateX = 0;
let translateY = 0;

// States
let isPanning = false;
let isDraggingNode = false;
let isResizingNode = false;
const isDrawingLink = false;
let isSelecting = false; // Box selection state

// Active Objects
let dragNode = null;
let resizeNode = null;
let resizeDirection = null;
const selectedNodes = new Set(); // Multi-select Set
const selectedLinks = new Set(); // Multi-select Set for links
const linkSourceId = null;
const linkSourceSide = null;
const activeNodeForIcon = null;
const clipboard = []; // Stores copied node data

// Coordinates
let startMouseX, startMouseY;
let startNodeX, startNodeY; // For primary drag node
let startWidth, startHeight;
let selectionBox = null; // Visual element for box selection
const initialNodePositions = new Map(); // Map<nodeId, {x, y}> for multi-drag

// --- 1. CORE RENDERING ---

function updateTransform() {
  content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  if (zoomDisplay) zoomDisplay.innerText = `ZOOM: ${Math.round(scale * 100)}%`;
  updateLinks();
  if (selectedNodes.size > 0 || selectedLinks.size > 0) showContextToolbar();
  else hideContextToolbar();
}

function updateLinks() {
  document.querySelectorAll('.orbat-link-group').forEach((group) => {
    const sourceId = group.getAttribute('data-source');
    const targetId = group.getAttribute('data-target');
    const sSide = group.getAttribute('data-from-side');
    const tSide = group.getAttribute('data-to-side');

    const p1 = getPointOnSide(sourceId, sSide);
    const p2 = getPointOnSide(targetId, tSide);

    const path = getBezierPath(p1, p2, sSide, tSide);
    group.querySelectorAll('path').forEach((p) => p.setAttribute('d', path));
  });
}

function getPointOnSide(nodeId, side) {
  const el = document.getElementById(`node-${nodeId}`);
  if (!el) return { x: 0, y: 0 };
  const x = parseFloat(el.getAttribute('data-x'));
  const y = parseFloat(el.getAttribute('data-y'));
  const w = parseFloat(el.getAttribute('data-w'));
  const h = parseFloat(el.getAttribute('data-h'));
  switch (side) {
    case 'top':
      return { x: OFFSET + x + w / 2, y: OFFSET + y };
    case 'bottom':
      return { x: OFFSET + x + w / 2, y: OFFSET + y + h };
    case 'left':
      return { x: OFFSET + x, y: OFFSET + y + h / 2 };
    case 'right':
      return { x: OFFSET + x + w, y: OFFSET + y + h / 2 };
    default:
      return { x: OFFSET + x + w / 2, y: OFFSET + y + h / 2 };
  }
}

function getBezierPath(p1, p2, s1, s2) {
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const cpDist = Math.min(dist / 2, 150);
  const cp1 = { ...p1 };
  const cp2 = { ...p2 };
  if (s1 === 'top') cp1.y -= cpDist;
  else if (s1 === 'bottom') cp1.y += cpDist;
  else if (s1 === 'left') cp1.x -= cpDist;
  else if (s1 === 'right') cp1.x += cpDist;
  if (s2 === 'top') cp2.y -= cpDist;
  else if (s2 === 'bottom') cp2.y += cpDist;
  else if (s2 === 'left') cp2.x -= cpDist;
  else if (s2 === 'right') cp2.x += cpDist;
  return `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
}

// --- 2. CAMERA COMMANDS ---

window.centerView = () => {
  scale = 0.8;
  const vW = window.innerWidth;
  const vH = window.innerHeight;
  const target =
    document.getElementById('node-tfhq') ||
    document.querySelector('.orbat-node-wrapper');

  if (target) {
    const nX = parseFloat(target.getAttribute('data-x'));
    const nY = parseFloat(target.getAttribute('data-y'));
    translateX = vW / 2 - (OFFSET + nX + 110) * scale;
    translateY = vH / 2 - (OFFSET + nY + 90) * scale;
    updateTransform();
  } else {
    translateX = vW / 2 - OFFSET * scale;
    translateY = vH / 2 - OFFSET * scale;
    updateTransform();
  }
};

window.adjustZoom = (amount) => {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  zoomAt(cx, cy, amount > 0 ? 1.1 : 0.9);
};

function zoomAt(mouseX, mouseY, factor) {
  const x0 = (mouseX - translateX) / scale;
  const y0 = (mouseY - translateY) / scale;

  const newScale = Math.min(Math.max(0.1, scale * factor), 3);
  scale = newScale;

  translateX = mouseX - x0 * scale;
  translateY = mouseY - y0 * scale;
  updateTransform();
}

window.resetCanvas = () => window.centerView();

// --- 3. INPUT HANDLERS ---

function getCanvasCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - translateX) / scale,
    y: (clientY - rect.top - translateY) / scale,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  const underMouse = document.elementFromPoint(e.clientX, e.clientY);

  // 1. Exclude UI from canvas pointer handling
  if (underMouse?.closest('.canvas-overlay')) return;
  if (underMouse?.closest('#hq-admin-bar')) return;

  // 2. Editable field handling
  if (underMouse?.classList.contains('editable-field')) {
    if (
      document.getElementById('hq-admin-bar').classList.contains('edit-active')
    ) {
      underMouse.focus();
      return;
    }
  }

  const nodeWrapper = underMouse?.closest('.orbat-node-wrapper');
  const linkGroup = underMouse?.closest('.orbat-link-group');
  const isClickingUI =
    underMouse?.closest('#node-context-menu') ||
    underMouse?.classList.contains('c-point') ||
    underMouse?.classList.contains('c-dot') ||
    underMouse?.classList.contains('resize-handle');

  if (isClickingUI && !underMouse?.classList.contains('resize-handle')) return;

  // A. RESIZE
  if (underMouse?.classList.contains('resize-handle')) {
    const resizeTarget = underMouse.closest('.orbat-node-wrapper');
    if (
      resizeTarget &&
      document.getElementById('hq-admin-bar').classList.contains('edit-active')
    ) {
      isResizingNode = true;
      resizeNode = resizeTarget;

      if (underMouse.classList.contains('top')) resizeDirection = 'top';
      else if (underMouse.classList.contains('bottom'))
        resizeDirection = 'bottom';
      else if (underMouse.classList.contains('left')) resizeDirection = 'left';
      else if (underMouse.classList.contains('right'))
        resizeDirection = 'right';
      else if (underMouse.classList.contains('bottom-right'))
        resizeDirection = 'bottom-right';

      const coords = getCanvasCoords(e.clientX, e.clientY);
      startMouseX = coords.x;
      startMouseY = coords.y;
      startWidth = parseFloat(resizeNode.getAttribute('data-w'));
      startHeight = parseFloat(resizeNode.getAttribute('data-h'));
      startNodeX = parseFloat(resizeNode.getAttribute('data-x'));
      startNodeY = parseFloat(resizeNode.getAttribute('data-y'));

      e.stopPropagation();
      return;
    }
  }

  // B. NODE SELECTION / DRAG START
  if (nodeWrapper) {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      if (selectedNodes.has(nodeWrapper)) {
        selectedNodes.delete(nodeWrapper);
        nodeWrapper.classList.remove('selected');
      } else {
        selectedNodes.add(nodeWrapper);
        nodeWrapper.classList.add('selected');
      }
      updateSelectionUI();
    } else {
      if (!selectedNodes.has(nodeWrapper)) {
        clearSelection();
        selectedNodes.add(nodeWrapper);
        nodeWrapper.classList.add('selected');
        updateSelectionUI();
      }
    }

    if (
      document.getElementById('hq-admin-bar').classList.contains('edit-active')
    ) {
      isDraggingNode = true;
      dragNode = nodeWrapper;
      const coords = getCanvasCoords(e.clientX, e.clientY);
      startMouseX = coords.x;
      startMouseY = coords.y;

      initialNodePositions.clear();
      selectedNodes.forEach((node) => {
        initialNodePositions.set(node, {
          x: parseFloat(node.getAttribute('data-x')),
          y: parseFloat(node.getAttribute('data-y')),
        });
      });
      e.stopPropagation();
      return;
    }
  }

  // C. EMPTY SPACE
  else if (!isClickingUI) {
    if (e.shiftKey) {
      isSelecting = true;
      const rect = canvas.getBoundingClientRect();
      startMouseX = e.clientX - rect.left;
      startMouseY = e.clientY - rect.top;

      selectionBox = document.createElement('div');
      selectionBox.className = 'absolute z-[6000] pointer-events-none';
      selectionBox.style.border = '1px solid #532a45';
      selectionBox.style.backgroundColor = 'rgba(83, 42, 69, 0.1)';
      selectionBox.style.left = `${startMouseX}px`;
      selectionBox.style.top = `${startMouseY}px`;
      canvas.appendChild(selectionBox);
      if (!e.ctrlKey && !e.metaKey) clearSelection();
    } else if (e.button === 0 || e.button === 1) {
      clearSelection();
      isPanning = true;
      startMouseX = e.clientX;
      startMouseY = e.clientY;
    }
  }
});

window.addEventListener('pointermove', (e) => {
  if (isSelecting && selectionBox) {
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const width = Math.abs(currentX - startMouseX);
    const height = Math.abs(currentY - startMouseY);
    const left = Math.min(currentX, startMouseX);
    const top = Math.min(currentY, startMouseY);
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    return;
  }

  if (isResizingNode && resizeNode) {
    const m = getCanvasCoords(e.clientX, e.clientY);
    const dx = m.x - startMouseX;
    const dy = m.y - startMouseY;

    let newW = startWidth;
    let newH = startHeight;
    let newX = startNodeX;
    let newY = startNodeY;

    if (resizeDirection === 'right' || resizeDirection === 'bottom-right')
      newW = Math.max(
        160,
        Math.round((startWidth + dx) / SNAP_SIZE) * SNAP_SIZE,
      );
    if (resizeDirection === 'bottom' || resizeDirection === 'bottom-right')
      newH = Math.max(
        160,
        Math.round((startHeight + dy) / SNAP_SIZE) * SNAP_SIZE,
      );
    if (resizeDirection === 'left') {
      const potentialW = Math.max(
        160,
        Math.round((startWidth - dx) / SNAP_SIZE) * SNAP_SIZE,
      );
      if (potentialW !== startWidth) {
        newX = startNodeX + (startWidth - potentialW);
        newW = potentialW;
      }
    }
    if (resizeDirection === 'top') {
      const potentialH = Math.max(
        160,
        Math.round((startHeight - dy) / SNAP_SIZE) * SNAP_SIZE,
      );
      if (potentialH !== startHeight) {
        newY = startNodeY + (startHeight - potentialH);
        newH = potentialH;
      }
    }

    resizeNode.style.width = `${newW}px`;
    resizeNode.style.height = `${newH}px`;
    resizeNode.style.left = `${OFFSET + newX}px`;
    resizeNode.style.top = `${OFFSET + newY}px`;
    resizeNode.setAttribute('data-w', newW);
    resizeNode.setAttribute('data-h', newH);
    resizeNode.setAttribute('data-x', newX);
    resizeNode.setAttribute('data-y', newY);
    updateLinks();
    return;
  }

  if (isDraggingNode && selectedNodes.size > 0) {
    const m = getCanvasCoords(e.clientX, e.clientY);
    const dx = m.x - startMouseX;
    const dy = m.y - startMouseY;

    selectedNodes.forEach((node) => {
      const startPos = initialNodePositions.get(node);
      if (startPos) {
        const newX = Math.round((startPos.x + dx) / SNAP_SIZE) * SNAP_SIZE;
        const newY = Math.round((startPos.y + dy) / SNAP_SIZE) * SNAP_SIZE;
        node.style.left = `${OFFSET + newX}px`;
        node.style.top = `${OFFSET + newY}px`;
        node.setAttribute('data-x', newX);
        node.setAttribute('data-y', newY);
      }
    });
    updateLinks();
    return;
  }

  if (isPanning) {
    translateX += e.clientX - startMouseX;
    translateY += e.clientY - startMouseY;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    updateTransform();
  }
});

window.addEventListener('pointerup', () => {
  if (isSelecting && selectionBox) {
    const sbRect = selectionBox.getBoundingClientRect();
    selectionBox.remove();
    selectionBox = null;
    isSelecting = false;
    document.querySelectorAll('.orbat-node-wrapper').forEach((node) => {
      const nodeRect = node.getBoundingClientRect();
      if (
        !(
          sbRect.right < nodeRect.left ||
          sbRect.left > nodeRect.right ||
          sbRect.bottom < nodeRect.top ||
          sbRect.top > nodeRect.bottom
        )
      ) {
        selectedNodes.add(node);
        node.classList.add('selected');
      }
    });
    updateSelectionUI();
  }
  if (isDraggingNode) saveState('Move Units');
  if (isResizingNode) saveState('Resize Unit');
  isPanning = false;
  isDraggingNode = false;
  isResizingNode = false;
  dragNode = null;
  resizeNode = null;
});

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAt(
      e.clientX - rect.left,
      e.clientY - rect.top,
      e.deltaY > 0 ? 0.9 : 1.1,
    );
  },
  { passive: false },
);

// --- 4. CORE ADMIN ---

let history = [];
let historyIndex = -1;
function saveState(desc = 'Action') {
  const state = serializeCurrentState();
  if (
    historyIndex >= 0 &&
    JSON.stringify(state) === JSON.stringify(history[historyIndex])
  )
    return;
  history = history.slice(0, historyIndex + 1);
  history.push(state);
  historyIndex++;
}

function serializeCurrentState() {
  const nodes = Array.from(
    document.querySelectorAll('.orbat-node-wrapper'),
  ).map((el) => ({
    id: el.getAttribute('data-id'),
    name: el.querySelector('[data-key="name"]').innerText.trim(),
    role:
      el.querySelector('[data-key="role"]')?.innerText.trim() ||
      'Operational Support',
    callsign:
      el.querySelector('.orbat-node-card span')?.innerText.trim() || 'NODE',
    x: parseFloat(el.getAttribute('data-x')),
    y: parseFloat(el.getAttribute('data-y')),
    w: parseFloat(el.getAttribute('data-w')),
    h: parseFloat(el.getAttribute('data-h')),
  }));
  return { nodes, edges: [] };
}

function renderNode(n) {
  const newNode = document.createElement('div');
  newNode.className =
    'orbat-node-wrapper absolute shadow-sm transition-colors duration-300';
  newNode.id = `node-${n.id}`;
  newNode.setAttribute('data-id', n.id);
  newNode.setAttribute('data-x', n.x);
  newNode.setAttribute('data-y', n.y);
  newNode.setAttribute('data-w', n.w);
  newNode.setAttribute('data-h', n.h);
  newNode.style.left = `${OFFSET + n.x}px`;
  newNode.style.top = `${OFFSET + n.y}px`;
  newNode.style.width = `${n.w}px`;
  newNode.style.height = `${n.h}px`;
  const editMode = document
    .getElementById('hq-admin-bar')
    .classList.contains('edit-active');
  newNode.innerHTML = `
        <div class="orbat-node-card h-full flex flex-col bg-white dark:bg-[#1d2329] border border-[#bfc1c3] dark:border-[#323e48] relative group/card pointer-events-auto">
            <div class="px-4 py-2 bg-[#f3f2f1] dark:bg-white/5 border-b border-[#bfc1c3] dark:border-[#323e48] flex justify-between items-center shrink-0 relative z-10">
                <span class="text-[8px] font-mono text-[#6f777b] uppercase tracking-widest truncate editable-field relative z-20" data-key="callsign" contenteditable="${editMode}">${n.callsign || 'NODE'}</span>
                <div class="w-1.5 h-1.5 rounded-full bg-[#00703c]"></div>
            </div>
            <div class="p-4 flex-grow overflow-hidden relative">
                <div class="border-l-4 border-[var(--brand-tint)] pl-3 relative z-10">
                    <h5 class="text-sm font-bold text-[#0b0c0c] dark:text-white uppercase tracking-tight m-0 editable-field relative z-20" data-key="name" contenteditable="${editMode}">${n.name}</h5>
                    <p class="text-[8px] text-[#6f777b] font-bold uppercase mt-0.5 editable-field relative z-20" data-key="role" contenteditable="${editMode}">${n.role}</p>
                </div>
            </div>
            <div class="connection-points absolute inset-0 ${editMode ? '' : 'hidden'} pointer-events-none">
                <div class="resize-handle bottom-right pointer-events-auto" onmousedown="window.startResizing(event, 'bottom-right')"></div>
            </div>
        </div>
    `;
  document.getElementById('orbat-nodes-layer').appendChild(newNode);
}

function clearSelection() {
  selectedNodes.forEach((n) => n.classList.remove('selected'));
  selectedNodes.clear();
  hideContextToolbar();
}

function updateSelectionUI() {
  if (selectedNodes.size > 0) showContextToolbar();
  else hideContextToolbar();
}

function showContextToolbar() {
  if (
    !document.getElementById('hq-admin-bar').classList.contains('edit-active')
  )
    return;
  const targetEl = Array.from(selectedNodes).pop();
  if (!targetEl) return;
  let t = document.getElementById('node-context-menu');
  if (!t) {
    t = document.createElement('div');
    t.id = 'node-context-menu';
    t.className = 'node-context-menu pointer-events-auto';
    document.body.appendChild(t);
  }
  t.innerHTML = `<button onclick="window.deleteSelected()" class="toolbar-btn text-red-500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
  const r = targetEl.getBoundingClientRect();
  t.style.left = `${r.left + r.width / 2}px`;
  t.style.top = `${r.top - 60}px`;
  t.classList.remove('hidden');
}

function hideContextToolbar() {
  const t = document.getElementById('node-context-menu');
  if (t) t.classList.add('hidden');
}

window.toggleEditMode = () => {
  const adminBar = document.getElementById('hq-admin-bar');
  if (!adminBar) return;
  const isActive = adminBar.classList.toggle('edit-active');
  document
    .querySelectorAll('.connection-points')
    .forEach((el) => el.classList.toggle('hidden', !isActive));
  document
    .querySelectorAll('.editable-field')
    .forEach((el) =>
      el.setAttribute('contenteditable', isActive ? 'true' : 'false'),
    );
  if (window.showToast)
    window.showToast(isActive ? 'EDIT_ENABLED' : 'EDIT_DISABLED');
};

// Direct event listener for stability in tests
const editBtn = document.getElementById('edit-mode-btn');
if (editBtn) {
  editBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.toggleEditMode();
  });
}

window.deleteSelected = () => {
  if (confirm(`Decommission ${selectedNodes.size} units?`)) {
    selectedNodes.forEach((n) => n.remove());
    clearSelection();
    saveState('Purge');
  }
};

window.saveToLocalStorage = () => {
  localStorage.setItem(
    'orbat_canvas_data',
    JSON.stringify(serializeCurrentState()),
  );
  showToast('SYNC_COMPLETE');
};

// Bootstrap
window.addEventListener('load', () => {
  const saved = localStorage.getItem('orbat_canvas_data');
  if (saved) {
    const state = JSON.parse(saved);
    document.getElementById('orbat-nodes-layer').innerHTML = '';
    state.nodes.forEach((n) => renderNode(n));
  }
  setTimeout(() => {
    window.centerView();
    saveState();
  }, 100);
});
