// Institutional ORBAT - Canvas Controller v6.4 (Multi-Select & Box Select)

const canvas = document.getElementById('orbat-canvas');
const content = document.getElementById('canvas-content');
const zoomDisplay = document.getElementById('zoom-level');
const svgLayer = document.getElementById('orbat-connectors');
const tempLink = document.getElementById('temp-link');
const toastContainer = document.getElementById('toast-container');
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
let isDrawingLink = false;
let isSelecting = false; // Box selection state

// Active Objects
let dragNode = null;
let resizeNode = null;
let resizeDirection = null; // New: 'top', 'bottom', 'left', 'right', 'bottom-right'
let selectedNodes = new Set(); // Multi-select Set
let selectedLink = null; // New: Selected edge
let linkSourceId = null;
let linkSourceSide = null;
let activeNodeForIcon = null;

// Coordinates
let startMouseX, startMouseY;
let startNodeX, startNodeY; // For primary drag node
let startWidth, startHeight;
let selectionBox = null; // Visual element for box selection
let initialNodePositions = new Map(); // Map<nodeId, {x, y}> for multi-drag

// --- 1. CORE RENDERING ---

function updateTransform() {
    content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomDisplay.innerText = `Zoom: ${Math.round(scale * 100)}%`;
    updateLinks();
    if (selectedNodes.size > 0 || selectedLink) showContextToolbar(); else hideContextToolbar();
}

function updateLinks() {
    document.querySelectorAll('.orbat-link').forEach(link => {
        const p1 = getPointOnSide(link.getAttribute('data-source'), link.getAttribute('data-from-side'));
        const p2 = getPointOnSide(link.getAttribute('data-target'), link.getAttribute('data-to-side'));
        link.setAttribute('d', getBezierPath(p1, p2, link.getAttribute('data-from-side'), link.getAttribute('data-to-side')));
    });
}

function getPointOnSide(nodeId, side) {
    const el = document.getElementById(`node-${nodeId}`);
    if (!el) return { x: 0, y: 0 };
    const x = parseFloat(el.getAttribute('data-x')); const y = parseFloat(el.getAttribute('data-y'));
    const w = parseFloat(el.getAttribute('data-w')); const h = parseFloat(el.getAttribute('data-h'));
    switch (side) {
        case 'top':    return { x: OFFSET + x + w/2, y: OFFSET + y };
        case 'bottom': return { x: OFFSET + x + w/2, y: OFFSET + y + h };
        case 'left':   return { x: OFFSET + x,       y: OFFSET + y + h/2 };
        case 'right':  return { x: OFFSET + x + w,   y: OFFSET + y + h/2 };
        default:       return { x: OFFSET + x + w/2, y: OFFSET + y + h/2 };
    }
}

function getBezierPath(p1, p2, s1, s2) {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const cpDist = Math.min(dist / 2, 150);
    const cp1 = { ...p1 }; const cp2 = { ...p2 };
    if (s1 === 'top') cp1.y -= cpDist; else if (s1 === 'bottom') cp1.y += cpDist;
    else if (s1 === 'left') cp1.x -= cpDist; else if (s1 === 'right') cp1.x += cpDist;
    if (s2 === 'top') cp2.y -= cpDist; else if (s2 === 'bottom') cp2.y += cpDist;
    else if (s2 === 'left') cp2.x -= cpDist; else if (s2 === 'right') cp2.x += cpDist;
    return `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
}

// --- 2. CAMERA COMMANDS ---

window.centerView = function() {
    scale = 0.8;
    const vW = window.innerWidth;
    const vH = window.innerHeight;
    const target = document.getElementById('node-tfhq') || document.querySelector('.orbat-node-wrapper');
    
    if (target) {
        const nX = parseFloat(target.getAttribute('data-x'));
        const nY = parseFloat(target.getAttribute('data-y'));
        translateX = (vW / 2) - ((OFFSET + nX + 110) * scale);
        translateY = (vH / 2) - ((OFFSET + nY + 90) * scale);
        updateTransform();
    } else {
        translateX = (vW / 2) - (OFFSET * scale);
        translateY = (vH / 2) - (OFFSET * scale);
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
    return { x: (clientX - rect.left - translateX) / scale, y: (clientY - rect.top - translateY) / scale };
}

canvas.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('editable-field')) return;

    // A. RESIZE
    if (e.target.classList.contains('resize-handle')) {
        const nodeWrapper = e.target.closest('.orbat-node-wrapper');
        if (nodeWrapper && document.getElementById('hq-admin-bar').classList.contains('edit-active')) {
            isResizingNode = true;
            resizeNode = nodeWrapper;
            
            // Identify direction
            if (e.target.classList.contains('top')) resizeDirection = 'top';
            else if (e.target.classList.contains('bottom')) resizeDirection = 'bottom';
            else if (e.target.classList.contains('left')) resizeDirection = 'left';
            else if (e.target.classList.contains('right')) resizeDirection = 'right';
            else if (e.target.classList.contains('bottom-right')) resizeDirection = 'bottom-right';

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

    const nodeWrapper = e.target.closest('.orbat-node-wrapper');
    const linkPath = e.target.closest('.orbat-link');
    const isClickingUI = e.target.closest('#node-context-menu');

    // B. LINK DRAWING / SELECTION
    if (isDrawingLink) {
        if (nodeWrapper) createNewLink(linkSourceId, linkSourceSide, nodeWrapper.getAttribute('data-id'), 'top');
        stopDrawingLink(); 
        return;
    }

    if (linkPath) {
        clearSelection();
        selectedLink = linkPath;
        linkPath.classList.add('selected');
        showContextToolbar();
        e.stopPropagation();
        return;
    }

    // C. NODE SELECTION / DRAG START
    if (nodeWrapper) {
        if (selectedLink) { selectedLink.classList.remove('selected'); selectedLink = null; }
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            // Toggle selection
            if (selectedNodes.has(nodeWrapper)) {
                selectedNodes.delete(nodeWrapper);
                nodeWrapper.classList.remove('selected');
            } else {
                selectedNodes.add(nodeWrapper);
                nodeWrapper.classList.add('selected');
            }
            updateSelectionUI();
        } else {
            // Single select (exclusive) unless clicking on an already selected node (to allow drag)
            if (!selectedNodes.has(nodeWrapper)) {
                clearSelection();
                selectedNodes.add(nodeWrapper);
                nodeWrapper.classList.add('selected');
                updateSelectionUI();
            }
        }

        // Setup Dragging
        if (document.getElementById('hq-admin-bar').classList.contains('edit-active')) {
            isDraggingNode = true;
            dragNode = nodeWrapper; // Primary drag target
            const coords = getCanvasCoords(e.clientX, e.clientY);
            startMouseX = coords.x; startMouseY = coords.y;
            
            // Record start positions for ALL selected nodes
            initialNodePositions.clear();
            selectedNodes.forEach(node => {
                initialNodePositions.set(node, {
                    x: parseFloat(node.getAttribute('data-x')),
                    y: parseFloat(node.getAttribute('data-y'))
                });
            });
            e.stopPropagation(); 
            return;
        }
    } 
    
    // D. CANVAS INTERACTIONS (Empty Space)
    else if (!isClickingUI) {
        // Shift + Drag = Box Selection
        if (e.shiftKey) {
            isSelecting = true;
            const rect = canvas.getBoundingClientRect();
            // Store raw client coords for the div placement (overlay)
            startMouseX = e.clientX - rect.left;
            startMouseY = e.clientY - rect.top;
            
            selectionBox = document.createElement('div');
            selectionBox.className = 'absolute z-[6000] pointer-events-none';
            selectionBox.style.border = '1px solid #b3995d';
            selectionBox.style.backgroundColor = 'rgba(179, 153, 93, 0.2)';
            
            selectionBox.style.left = `${startMouseX}px`;
            selectionBox.style.top = `${startMouseY}px`;
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
            canvas.appendChild(selectionBox);
            
            if (!e.ctrlKey && !e.metaKey) clearSelection();
        } 
        // Normal Drag = Pan
        else if (e.button === 0 || e.button === 1) {
            if (e.button === 1) e.preventDefault(); // Prevent browser autoscroll
            clearSelection();
            isPanning = true; 
            startMouseX = e.clientX; 
            startMouseY = e.clientY;
        }
    }
});

window.addEventListener('mousemove', (e) => {
    // 1. BOX SELECT
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

    // 2. RESIZE
    if (isResizingNode && resizeNode) {
        const m = getCanvasCoords(e.clientX, e.clientY);
        const dx = m.x - startMouseX;
        const dy = m.y - startMouseY;
        
        let newW = startWidth;
        let newH = startHeight;
        let newX = startNodeX;
        let newY = startNodeY;

        if (resizeDirection === 'right' || resizeDirection === 'bottom-right') {
            newW = Math.max(160, Math.round((startWidth + dx) / SNAP_SIZE) * SNAP_SIZE);
        }
        if (resizeDirection === 'bottom' || resizeDirection === 'bottom-right') {
            newH = Math.max(160, Math.round((startHeight + dy) / SNAP_SIZE) * SNAP_SIZE);
        }
        if (resizeDirection === 'left') {
            const potentialW = Math.max(160, Math.round((startWidth - dx) / SNAP_SIZE) * SNAP_SIZE);
            if (potentialW !== startWidth) {
                newX = startNodeX + (startWidth - potentialW);
                newW = potentialW;
            }
        }
        if (resizeDirection === 'top') {
            const potentialH = Math.max(160, Math.round((startHeight - dy) / SNAP_SIZE) * SNAP_SIZE);
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
        if (selectedNodes.size > 0) showContextToolbar();
        return;
    }

    // 3. LINK DRAWING
    if (isDrawingLink) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        const p1 = getPointOnSide(linkSourceId, linkSourceSide);
        const svgMouse = { x: coords.x + OFFSET, y: coords.y + OFFSET };
        tempLink.setAttribute('d', getBezierPath(p1, svgMouse, linkSourceSide, 'auto')); return;
    }
    
    // 4. DRAGGING NODES (MULTI)
    if (isDraggingNode && selectedNodes.size > 0) {
        const m = getCanvasCoords(e.clientX, e.clientY);
        const dx = m.x - startMouseX; 
        const dy = m.y - startMouseY;
        
        selectedNodes.forEach(node => {
            const startPos = initialNodePositions.get(node);
            if (startPos) {
                // Calculate un-snapped new pos
                const rawX = startPos.x + dx;
                const rawY = startPos.y + dy;
                
                // Snap to grid
                let newX = Math.round(rawX / SNAP_SIZE) * SNAP_SIZE;
                let newY = Math.round(rawY / SNAP_SIZE) * SNAP_SIZE;

                node.style.left = `${OFFSET + newX}px`; 
                node.style.top = `${OFFSET + newY}px`;
                node.setAttribute('data-x', newX); 
                node.setAttribute('data-y', newY);
            }
        });

        updateLinks(); 
        if (selectedNodes.size > 0) showContextToolbar(); 
        return;
    }
    
    // 5. PANNING
    if (isPanning) {
        translateX += e.clientX - startMouseX; translateY += e.clientY - startMouseY;
        startMouseX = e.clientX; startMouseY = e.clientY;
        updateTransform();
    }
});

window.addEventListener('mouseup', () => {
    // End Box Selection
    if (isSelecting && selectionBox) {
        // Perform intersection check
        const sbRect = selectionBox.getBoundingClientRect();
        
        // Remove visual
        selectionBox.remove();
        selectionBox = null;
        isSelecting = false;

        // Check each node for overlap
        document.querySelectorAll('.orbat-node-wrapper').forEach(node => {
            const nodeRect = node.getBoundingClientRect();
            if (!(sbRect.right < nodeRect.left || 
                  sbRect.left > nodeRect.right || 
                  sbRect.bottom < nodeRect.top || 
                  sbRect.top > nodeRect.bottom)) {
                selectedNodes.add(node);
                node.classList.add('selected');
            }
        });
        updateSelectionUI();
    }

    if (isDraggingNode) {
        // Final Snap & Save
        selectedNodes.forEach(node => {
            const x = Math.round(parseFloat(node.getAttribute('data-x')) / SNAP_SIZE) * SNAP_SIZE;
            const y = Math.round(parseFloat(node.getAttribute('data-y')) / SNAP_SIZE) * SNAP_SIZE;
            node.setAttribute('data-x', x); node.setAttribute('data-y', y);
            node.style.left = `${OFFSET + x}px`; node.style.top = `${OFFSET + y}px`;
        });
        updateLinks(); 
        saveState();
    }
    
    if (isResizingNode) saveState();

    isPanning = false; 
    isDraggingNode = false; 
    isResizingNode = false; 
    dragNode = null; 
    resizeNode = null;
    resizeDirection = null;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY > 0 ? 0.9 : 1.1);
}, { passive: false });

canvas.addEventListener('dblclick', (e) => {
    if (!document.getElementById('hq-admin-bar').classList.contains('edit-active')) return;
    if (e.target === canvas || e.target.id === 'orbat-nodes-layer') {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        window.addOrbatNodeAt(Math.round(coords.x / SNAP_SIZE) * SNAP_SIZE, Math.round(coords.y / SNAP_SIZE) * SNAP_SIZE);
    }
});

// --- 4. HISTORY & CLIPBOARD ---
let history = []; let historyIndex = -1;
function saveState() {
    const state = serializeCurrentState();
    if (historyIndex >= 0 && JSON.stringify(state) === JSON.stringify(history[historyIndex])) return;
    history = history.slice(0, historyIndex + 1); history.push(state); historyIndex++;
    if (history.length > 50) history.shift(), historyIndex--;
}
function undo() { if (historyIndex > 0) { historyIndex--; loadState(history[historyIndex]); showToast('ACTION_REVERSED'); } }
function redo() { if (historyIndex < history.length - 1) { historyIndex++; loadState(history[historyIndex]); showToast('ACTION_RESTORED'); } }
function serializeCurrentState() {
    const nodes = Array.from(document.querySelectorAll('.orbat-node-wrapper')).map(el => {
        // Capture personnel block if it exists
        const personnelEl = el.querySelector('.personnel-list');
        return {
            id: el.getAttribute('data-id'), 
            name: el.querySelector('[data-key="name"]').innerText.trim(),
            role: el.querySelector('[data-key="role"]')?.innerText.trim() || "Operational Support",
            callsign: el.querySelector('.orbat-node-card span.font-mono')?.innerText.trim() || "",
            icon: el.querySelector('img')?.getAttribute('data-icon-path') || null,
            personnelHtml: personnelEl ? personnelEl.outerHTML : null,
            x: parseFloat(el.getAttribute('data-x')), y: parseFloat(el.getAttribute('data-y')),
            w: parseFloat(el.getAttribute('data-w')), h: parseFloat(el.getAttribute('data-h'))
        };
    });
    const edges = Array.from(document.querySelectorAll('.orbat-link')).map(el => ({
        id: el.id.replace('edge-', ''), fromNode: el.getAttribute('data-source'), toNode: el.getAttribute('data-target'),
        fromSide: el.getAttribute('data-from-side'), toSide: el.getAttribute('data-to-side')
    }));
    return { nodes, edges };
}
function loadState(state) {
    document.getElementById('orbat-nodes-layer').innerHTML = '';
    document.querySelectorAll('.orbat-link').forEach(l => l.remove());
    state.nodes.forEach(n => renderNode(n));
    state.edges.forEach(e => createNewLink(e.fromNode, e.fromSide, e.toNode, e.toSide, e.id));
    updateLinks(); clearSelection();
}

function snapNodeHeight(node) {
    const card = node.querySelector('.orbat-node-card');
    if (!card) return;
    
    // Measure natural height by temporarily allowing growth
    node.style.height = 'auto';
    const rect = node.getBoundingClientRect();
    const actualH = rect.height / scale; // Adjust for current zoom scale
    
    // Snap to nearest 40px increment (minimum 200 - one big square)
    // Using floor to be more aggressive about staying small
    const snappedH = Math.max(200, Math.floor(actualH / SNAP_SIZE) * SNAP_SIZE);
    
    node.style.height = `${snappedH}px`;
    node.setAttribute('data-h', snappedH);
    updateLinks();
}

function renderNode(n) {
    const newNode = document.createElement('div');
    newNode.className = 'orbat-node-wrapper absolute shadow-2xl';
    newNode.id = `node-${n.id}`;
    newNode.setAttribute('data-id', n.id); newNode.setAttribute('data-x', n.x); newNode.setAttribute('data-y', n.y);
    newNode.setAttribute('data-w', n.w); newNode.setAttribute('data-h', n.h);
    newNode.style.left = `${OFFSET + n.x}px`; newNode.style.top = `${OFFSET + n.y}px`;
    newNode.style.width = `${n.w}px`; newNode.style.height = `${n.h}px`;
    const editMode = document.getElementById('hq-admin-bar').classList.contains('edit-active');
    newNode.innerHTML = `
        <div class="orbat-node-card h-full flex flex-col bracket-box bg-black/80 backdrop-blur-xl !p-0 overflow-hidden relative group/card border-white/5 pointer-events-auto">
            <div class="px-4 py-2 bg-white/[0.03] border-b border-white/10 flex justify-between items-center shrink-0">
                <div class="flex items-center space-x-3 min-w-0"><span class="text-[8px] font-mono text-gray-500 uppercase tracking-widest truncate">${n.callsign || "NODE"}</span></div>
                <div class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
            </div>
            <div class="p-4 flex-grow overflow-y-auto custom-scrollbar relative">
                <div class="space-y-3">
                    ${n.icon ? `<div class="flex justify-center"><img src="/${n.icon}" draggable="false" class="w-14 h-14 object-contain opacity-90 grayscale group-hover/card:grayscale-0 group-hover/card:opacity-100 transition-all duration-700" data-icon-path="${n.icon}"></div>` : ''}
                    <div class="border-l-2 border-[var(--primary)] pl-3">
                        <h5 class="text-sm font-black text-white uppercase tracking-tighter m-0 editable-field" data-key="name" contenteditable="${editMode}">${n.name}</h5>
                        <p class="text-[8px] text-[var(--primary)] font-mono uppercase mt-0.5 italic editable-field" data-key="role" contenteditable="${editMode}">${n.role}</p>
                    </div>
                    ${n.personnelHtml || ''}
                </div>
            </div>
            <div class="connection-points absolute inset-0 pointer-events-none ${editMode ? '' : 'hidden'}">
                <div class="c-point top" onmousedown="window.startDrawingLink(event, 'top')"><div class="c-dot"></div></div>
                <div class="c-point right" onmousedown="window.startDrawingLink(event, 'right')"><div class="c-dot"></div></div>
                <div class="c-point bottom" onmousedown="window.startDrawingLink(event, 'bottom')"><div class="c-dot"></div></div>
                <div class="c-point left" onmousedown="window.startDrawingLink(event, 'left')"><div class="c-dot"></div></div>
                
                <!-- EDGE RESIZE HANDLES -->
                <div class="resize-handle top absolute top-0 left-0 w-full h-1 cursor-ns-resize pointer-events-auto z-50 hover:bg-[var(--primary)] transition-colors opacity-0 hover:opacity-100"></div>
                <div class="resize-handle right absolute top-0 right-0 w-1 h-full cursor-ew-resize pointer-events-auto z-50 hover:bg-[var(--primary)] transition-colors opacity-0 hover:opacity-100"></div>
                <div class="resize-handle bottom absolute bottom-0 left-0 w-full h-1 cursor-ns-resize pointer-events-auto z-50 hover:bg-[var(--primary)] transition-colors opacity-0 hover:opacity-100"></div>
                <div class="resize-handle left absolute top-0 left-0 w-1 h-full cursor-ew-resize pointer-events-auto z-50 hover:bg-[var(--primary)] transition-colors opacity-0 hover:opacity-100"></div>
                
                <!-- CORNER RESIZE (Optional but helpful) -->
                <div class="resize-handle bottom-right absolute bottom-0 right-0 w-3 h-3 cursor-se-resize pointer-events-auto z-50 hover:bg-[var(--primary)] transition-colors opacity-0 hover:opacity-100"></div>
            </div>
        </div>
    `;
    document.getElementById('orbat-nodes-layer').appendChild(newNode);
    setTimeout(() => snapNodeHeight(newNode), 0);
}

// --- 5. UI: TOASTS & TOOLBARS ---

window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `p-4 bg-black/95 backdrop-blur-xl border-l-2 ${type === 'danger' ? 'border-red-600' : 'border-[var(--primary)]'} shadow-2xl animate-slide-in-right flex items-center space-x-4 min-w-[280px] pointer-events-auto transition-all duration-500`;
    toast.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${type === 'danger' ? 'bg-red-600' : 'bg-[var(--primary)]'} animate-pulse"></span><div class="flex flex-col"><span class="text-[10px] font-black text-white uppercase tracking-widest">${message}</span><span class="text-[7px] font-mono text-gray-500 uppercase tracking-tighter">System Node // ${new Date().toLocaleTimeString()}</span></div>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(50px)'; setTimeout(() => toast.remove(), 500); }, 4000);
};

// MULTI-SELECTION LOGIC
function clearSelection() {
    selectedNodes.forEach(n => n.classList.remove('selected'));
    selectedNodes.clear();
    if (selectedLink) {
        selectedLink.classList.remove('selected');
        selectedLink = null;
    }
    hideContextToolbar();
}

function updateSelectionUI() {
    if (selectedNodes.size > 0) {
        showContextToolbar();
    } else {
        hideContextToolbar();
    }
}

// Context toolbar position based on "primary" selected node (the last one added)
function showContextToolbar() {
    if (!document.getElementById('hq-admin-bar').classList.contains('edit-active')) return;
    
    let targetEl = null;
    let isLink = false;

    if (selectedNodes.size > 0) {
        targetEl = Array.from(selectedNodes).pop();
    } else if (selectedLink) {
        targetEl = selectedLink;
        isLink = true;
    }

    if (!targetEl) return;

    let t = document.getElementById('node-context-menu');
    if (!t) { t = document.createElement('div'); t.id = 'node-context-menu'; t.className = 'node-context-menu pointer-events-auto'; document.body.appendChild(t); }
    
    if (isLink) {
        t.innerHTML = `<button onclick="window.removeSelectedLink()" class="toolbar-btn text-red-500" title="Delete Link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
        
        // Find midpoint of path for toolbar position
        const pathLen = targetEl.getTotalLength();
        const midPoint = targetEl.getPointAtLength(pathLen / 2);
        const rect = canvas.getBoundingClientRect();
        
        t.style.left = `${midPoint.x * scale + translateX + rect.left}px`;
        t.style.top = `${midPoint.y * scale + translateY + rect.top - 40}px`;
    } else {
        const count = selectedNodes.size;
        const deleteTitle = count > 1 ? `Delete ${count} Units` : `Delete Unit`;
        const iconTitle = count > 1 ? `Set Icon for ${count} Units` : `Change Icon`;

        t.innerHTML = `<button onclick="window.openIconModalDirect()" class="toolbar-btn" title="${iconTitle}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></button><div class="toolbar-separator"></div><button onclick="window.removeSelectedNode()" class="toolbar-btn text-red-500" title="${deleteTitle}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
        
        const r = targetEl.getBoundingClientRect(); 
        t.style.left = `${r.left + r.width / 2}px`; 
        t.style.top = `${r.top - 60}px`; 
    }
    
    t.classList.remove('hidden');
}

window.removeSelectedLink = function() {
    if (selectedLink && confirm('Sever connection?')) {
        selectedLink.remove();
        selectedLink = null;
        clearSelection();
        saveState();
        showToast('CONNECTION_SEVERED', 'danger');
    }
};

function hideContextToolbar() { const t = document.getElementById('node-context-menu'); if (t) t.classList.add('hidden'); }

// --- 6. ADMIN UTILS ---

window.toggleEditMode = function() {
    const isActive = document.getElementById('hq-admin-bar').classList.toggle('edit-active');
    const btn = document.getElementById('edit-mode-btn');
    btn.classList.toggle('active', isActive);
    document.querySelectorAll('.connection-points').forEach(el => el.classList.toggle('hidden', !isActive));
    document.querySelectorAll('.editable-field').forEach(el => el.setAttribute('contenteditable', isActive ? 'true' : 'false'));
    if (!isActive) hideContextToolbar(); else if (selectedNodes.size > 0) showContextToolbar();
    showToast(isActive ? 'STRUCTURAL_EDIT_ENABLED' : 'STRUCTURAL_EDIT_DISABLED');
};

window.addOrbatNodeAt = function(x, y) {
    const id = `unit_${Math.random().toString(36).substr(2, 9)}`;
    renderNode({ id, name: "NEW_UNIT", role: "Operational Support", callsign: "SIG_ID", icon: "icons/MOD.png", x, y, w: 200, h: 200 }); 
    const n = document.getElementById(`node-${id}`);
    clearSelection();
    selectedNodes.add(n);
    n.classList.add('selected');
    updateSelectionUI();
    saveState();
};

window.addOrbatNode = () => {
    const c = getCanvasCoords(canvas.clientWidth / 2, canvas.clientHeight / 2);
    window.addOrbatNodeAt(Math.round(c.x / SNAP_SIZE) * SNAP_SIZE, Math.round(c.y / SNAP_SIZE) * SNAP_SIZE);
};

window.removeSelectedNode = function() {
    if (selectedNodes.size > 0 && confirm(`Decommission ${selectedNodes.size} unit(s)?`)) {
        selectedNodes.forEach(node => {
            const id = node.getAttribute('data-id');
            document.querySelectorAll(`.orbat-link[data-source="${id}"], .orbat-link[data-target="${id}"]`).forEach(l => l.remove());
            node.remove();
        });
        clearSelection();
        saveState(); 
        showToast('UNITS_DECOMMISSIONED', 'danger');
    }
};

window.exportOrbatJSON = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(serializeCurrentState(), null, 2)], { type: 'application/json' }));
    a.download = 'orbat_v2.json'; a.click(); showToast('ORBAT_DATA_EXPORTED');
};

window.openIconModalDirect = function() {
    if (selectedNodes.size === 0) return;
    activeNodeForIcon = Array.from(selectedNodes).pop(); // Default to last selected for preview logic, but apply to all?
    // Note: Applying to all selected nodes would be a nice feature
    
    iconGrid.innerHTML = '';
    const assets = ["icons/MOD.png", "icons/TFA.png", "icons/SAS.png", "icons/SBS.png", "icons/SRR.png", "icons/SFSG.png", "icons/JSFAW.png", "icons/MEDIC.png", "icons/Intelligence-Corps.png", "icons/RSIS.png", "icons/SIGNALS.png", "icons/RANGERS.png", "icons/UKSF-MAP.png", "icons/intelligence-map.png"];
    
    assets.forEach(path => {
        const item = document.createElement('div');
        item.className = 'group/icon flex flex-col items-center space-y-2 p-4 bg-white/[0.02] border border-white/5 hover:border-[var(--primary)]/40 cursor-pointer transition-all';
        item.onclick = () => { applyIcon(path); };
        item.innerHTML = `<img src="/${path}" class="w-12 h-12 object-contain opacity-60 group-hover/icon:opacity-100 transition-opacity"><span class="text-[7px] font-mono text-gray-600 group-hover/icon:text-white uppercase">${path.split('/').pop()}</span>`;
        iconGrid.appendChild(item);
    });
    iconModal.classList.remove('hidden');
};

window.closeIconModal = () => { iconModal.classList.add('hidden'); activeNodeForIcon = null; };

window.handleIconUpload = function(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { applyIcon(e.target.result); };
        reader.readAsDataURL(file);
    }
};

function applyIcon(src) {
    // Apply to ALL selected nodes
    selectedNodes.forEach(node => {
        const container = node.querySelector('.space-y-3');
        let imgDiv = container.querySelector('.flex.justify-center');
        if (!imgDiv) {
            imgDiv = document.createElement('div');
            imgDiv.className = 'flex justify-center';
            imgDiv.innerHTML = `<img draggable="false" class="w-14 h-14 object-contain opacity-90 grayscale group-hover/card:grayscale-0 group-hover/card:opacity-100 transition-all duration-700">`;
            container.insertBefore(imgDiv, container.firstChild);
        }
        const img = imgDiv.querySelector('img');
        img.src = src.startsWith('data:') ? src : `/${src}`;
        img.setAttribute('data-icon-path', src);
        snapNodeHeight(node);
    });
    
    showToast('ICON_APPLIED'); 
    saveState(); 
    closeIconModal();
}

window.startDrawingLink = function(e, side) {
    e.stopPropagation(); isDrawingLink = true;
    linkSourceId = e.target.closest('.orbat-node-wrapper').getAttribute('data-id');
    linkSourceSide = side; tempLink.classList.remove('hidden');
};

function stopDrawingLink() { isDrawingLink = false; linkSourceId = null; tempLink.classList.add('hidden'); }

function createNewLink(source, sSide, target, tSide, id = null) {
    if (source === target) return;
    const eid = id || `e_${Math.random().toString(36).substr(2, 9)}`;
    const newLink = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    newLink.setAttribute('class', 'orbat-link'); newLink.setAttribute('id', `edge-${eid}`);
    newLink.setAttribute('data-source', source); newLink.setAttribute('data-target', target);
    newLink.setAttribute('data-from-side', sSide); newLink.setAttribute('data-to-side', tSide);
    newLink.setAttribute('fill', 'none'); newLink.setAttribute('stroke', 'rgba(179, 153, 93, 0.4)');
    newLink.setAttribute('stroke-width', '2'); newLink.setAttribute('marker-end', 'url(#arrowhead)');
    svgLayer.appendChild(newLink);
    if (!id) { updateLinks(); saveState(); }
}

// Save the current state to the browser's persistent storage
window.saveToLocalStorage = function() {
    const state = serializeCurrentState();
    localStorage.setItem('orbat_canvas_data', JSON.stringify(state));
    showToast('DATABASE_SYNC_COMPLETE');
};

// Auto-load logic on boot
window.loadFromLocalStorage = function() {
    const savedData = localStorage.getItem('orbat_canvas_data');
    if (savedData) {
        try {
            const state = JSON.parse(savedData);
            loadState(state);
            showToast('LOCAL_DATA_RESTORED');
        } catch (e) {
            console.error("Failed to parse saved ORBAT data", e);
        }
    }
};

// Shortcuts
window.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('editable-field')) return;
    
    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    
    // Basic Actions
    if (e.key === 'Delete' || e.key === 'Backspace') window.removeSelectedNode();
    if (e.key === 'e' || e.key === 'E') window.toggleEditMode();
    if (e.key === 'n' || e.key === 'N') window.addOrbatNode();
    if (e.key === 'c' || e.key === 'C') window.centerView();

    // SAVE LOGIC:
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { 
        e.preventDefault(); 
        if (e.shiftKey) window.exportOrbatJSON(); else window.saveToLocalStorage();
    }
});

document.addEventListener('input', (e) => { 
    if (e.target.classList.contains('editable-field')) {
        const node = e.target.closest('.orbat-node-wrapper');
        if (node) snapNodeHeight(node);
        saveState(); 
    }
});

// Bootstrap
if (localStorage.getItem('uksf_hq_auth') === 'true') {
    document.getElementById('hq-admin-bar').classList.remove('hidden');
}

window.addEventListener('load', () => {
    window.loadFromLocalStorage();
    setTimeout(() => { window.centerView(); saveState(); }, 100); 
});