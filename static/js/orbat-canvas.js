// Institutional ORBAT - Canvas Controller v6.2 (Camera Fix)

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
let isPanning = false;
let isDraggingNode = false;
let isDrawingLink = false;
let dragNode = null;
let selectedNode = null;
let linkSourceId = null;
let linkSourceSide = null;
let activeNodeForIcon = null;
let startMouseX, startMouseY;
let startNodeX, startNodeY;

// --- 1. CORE RENDERING ---

function updateTransform() {
    content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomDisplay.innerText = `Zoom: ${Math.round(scale * 100)}%`;
    updateLinks();
    if (selectedNode) showContextToolbar(selectedNode);
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
    
    // 1. Viewport Dimensions (more reliable than rect in full screen)
    const vW = window.innerWidth;
    const vH = window.innerHeight;
    
    // 2. Target: TFHQ or first node
    const target = document.getElementById('node-tfhq') || document.querySelector('.orbat-node-wrapper');
    
    if (target) {
        const nX = parseFloat(target.getAttribute('data-x'));
        const nY = parseFloat(target.getAttribute('data-y'));
        
        // 3. Calculation: Midpoint - Scaled Position
        // Centering the node (approx 220x180 size)
        translateX = (vW / 2) - ((OFFSET + nX + 110) * scale);
        translateY = (vH / 2) - ((OFFSET + nY + 90) * scale);
        
        updateTransform();
    } else {
        // Fallback
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
    const nodeWrapper = e.target.closest('.orbat-node-wrapper');
    
    if (isDrawingLink) {
        if (nodeWrapper) createNewLink(linkSourceId, linkSourceSide, nodeWrapper.getAttribute('data-id'), 'top');
        stopDrawingLink(); return;
    }

    if (nodeWrapper) {
        updateSelection(nodeWrapper);
        if (document.getElementById('hq-admin-bar').classList.contains('edit-active')) {
            isDraggingNode = true; dragNode = nodeWrapper;
            const coords = getCanvasCoords(e.clientX, e.clientY);
            startMouseX = coords.x; startMouseY = coords.y;
            startNodeX = parseFloat(dragNode.getAttribute('data-x')); startNodeY = parseFloat(dragNode.getAttribute('data-y'));
            e.stopPropagation(); return;
        }
    } else { updateSelection(null); }

    if (e.button === 0) {
        isPanning = true; startMouseX = e.clientX; startMouseY = e.clientY;
    }
});

window.addEventListener('mousemove', (e) => {
    if (isDrawingLink) {
        const m = getCanvasCoords(e.clientX, e.clientY);
        const p1 = getPointOnSide(linkSourceId, linkSourceSide);
        const svgMouse = { x: m.x + OFFSET, y: m.y + OFFSET };
        tempLink.setAttribute('d', getBezierPath(p1, svgMouse, linkSourceSide, 'auto')); return;
    }
    if (isDraggingNode && dragNode) {
        const m = getCanvasCoords(e.clientX, e.clientY);
        const dx = m.x - startMouseX; const dy = m.y - startMouseY;
        const newX = startNodeX + dx; const newY = startNodeY + dy;
        dragNode.style.left = `${OFFSET + newX}px`; dragNode.style.top = `${OFFSET + newY}px`;
        dragNode.setAttribute('data-x', newX); dragNode.setAttribute('data-y', newY);
        updateLinks(); if (selectedNode) showContextToolbar(selectedNode); return;
    }
    if (isPanning) {
        translateX += e.clientX - startMouseX; translateY += e.clientY - startMouseY;
        startMouseX = e.clientX; startMouseY = e.clientY;
        updateTransform();
    }
});

window.addEventListener('mouseup', () => {
    if (isDraggingNode && dragNode) {
        const x = Math.round(parseFloat(dragNode.getAttribute('data-x')) / SNAP_SIZE) * SNAP_SIZE;
        const y = Math.round(parseFloat(dragNode.getAttribute('data-y')) / SNAP_SIZE) * SNAP_SIZE;
        dragNode.setAttribute('data-x', x); dragNode.setAttribute('data-y', y);
        dragNode.style.left = `${OFFSET + x}px`; dragNode.style.top = `${OFFSET + y}px`;
        updateLinks(); saveState();
    }
    isPanning = false; isDraggingNode = false; dragNode = null;
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

// --- 4. HISTORY & CLIPBOARD (Redacted for brevity, keeping existing logic) ---
let history = []; let historyIndex = -1; let clipboard = null;
function saveState() {
    const state = serializeCurrentState();
    if (historyIndex >= 0 && JSON.stringify(state) === JSON.stringify(history[historyIndex])) return;
    history = history.slice(0, historyIndex + 1); history.push(state); historyIndex++;
    if (history.length > 50) history.shift(), historyIndex--;
}
function undo() { if (historyIndex > 0) { historyIndex--; loadState(history[historyIndex]); showToast('ACTION_REVERSED'); } }
function redo() { if (historyIndex < history.length - 1) { historyIndex++; loadState(history[historyIndex]); showToast('ACTION_RESTORED'); } }
function serializeCurrentState() {
    const nodes = Array.from(document.querySelectorAll('.orbat-node-wrapper')).map(el => ({
        id: el.getAttribute('data-id'), name: el.querySelector('[data-key="name"]').innerText.trim(),
        role: el.querySelector('[data-key="role"]')?.innerText.trim() || "Operational Support",
        callsign: el.querySelector('.orbat-node-card span.font-mono')?.innerText.trim() || "",
        icon: el.querySelector('img')?.getAttribute('data-icon-path') || null,
        x: parseFloat(el.getAttribute('data-x')), y: parseFloat(el.getAttribute('data-y')),
        w: parseFloat(el.getAttribute('data-w')), h: parseFloat(el.getAttribute('data-h'))
    }));
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
    updateLinks(); updateSelection(null);
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
            <div class="p-5 flex-grow overflow-y-auto custom-scrollbar relative">
                <div class="space-y-6">
                    ${n.icon ? `<div class="flex justify-center mb-2"><img src="/${n.icon}" class="w-16 h-16 object-contain opacity-90 grayscale group-hover/card:grayscale-0 group-hover/card:opacity-100 transition-all duration-700" data-icon-path="${n.icon}"></div>` : ''}
                    <div class="border-l-2 border-[var(--primary)] pl-4">
                        <h5 class="text-sm font-black text-white uppercase tracking-tighter m-0 editable-field" data-key="name" contenteditable="${editMode}">${n.name}</h5>
                        <p class="text-[8px] text-[var(--primary)] font-mono uppercase mt-1 italic editable-field" data-key="role" contenteditable="${editMode}">${n.role}</p>
                    </div>
                </div>
            </div>
            <div class="connection-points absolute inset-0 pointer-events-none ${editMode ? '' : 'hidden'}">
                <div class="c-point top" onmousedown="window.startDrawingLink(event, 'top')"></div>
                <div class="c-point right" onmousedown="window.startDrawingLink(event, 'right')"></div>
                <div class="c-point bottom" onmousedown="window.startDrawingLink(event, 'bottom')"></div>
                <div class="c-point left" onmousedown="window.startDrawingLink(event, 'left')"></div>
            </div>
        </div>
    `;
    document.getElementById('orbat-nodes-layer').appendChild(newNode);
}

// --- 5. UI: TOASTS & TOOLBARS ---

window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `p-4 bg-black/95 backdrop-blur-xl border-l-2 ${type === 'danger' ? 'border-red-600' : 'border-[var(--primary)]'} shadow-2xl animate-slide-in-right flex items-center space-x-4 min-w-[280px] pointer-events-auto transition-all duration-500`;
    toast.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${type === 'danger' ? 'bg-red-600' : 'bg-[var(--primary)]'} animate-pulse"></span><div class="flex flex-col"><span class="text-[10px] font-black text-white uppercase tracking-widest">${message}</span><span class="text-[7px] font-mono text-gray-500 uppercase tracking-tighter">System Node // ${new Date().toLocaleTimeString()}</span></div>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(50px)'; setTimeout(() => toast.remove(), 500); }, 4000);
};

function updateSelection(node) {
    document.querySelectorAll('.orbat-node-wrapper').forEach(n => n.classList.remove('selected'));
    selectedNode = node; if (node) { node.classList.add('selected'); showContextToolbar(node); } else hideContextToolbar();
}

function showContextToolbar(node) {
    if (!document.getElementById('hq-admin-bar').classList.contains('edit-active')) return;
    let t = document.getElementById('node-context-menu');
    if (!t) { t = document.createElement('div'); t.id = 'node-context-menu'; t.className = 'node-context-menu pointer-events-auto'; document.body.appendChild(t); }
    t.innerHTML = `<button onclick="window.openIconModalDirect()" class="toolbar-btn" title="Change Icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></button><div class="toolbar-separator"></div><button onclick="window.removeSelectedNode()" class="toolbar-btn text-red-500" title="Delete Unit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
    const r = node.getBoundingClientRect(); t.style.left = `${r.left + r.width / 2}px`; t.style.top = `${r.top - 60}px`; t.classList.remove('hidden');
}

function hideContextToolbar() { const t = document.getElementById('node-context-menu'); if (t) t.classList.add('hidden'); }

// --- 6. ADMIN UTILS ---

window.toggleEditMode = function() {
    const isActive = document.getElementById('hq-admin-bar').classList.toggle('edit-active');
    const btn = document.getElementById('edit-mode-btn');
    btn.classList.toggle('active', isActive);
    document.querySelectorAll('.connection-points').forEach(el => el.classList.toggle('hidden', !isActive));
    document.querySelectorAll('.editable-field').forEach(el => el.setAttribute('contenteditable', isActive ? 'true' : 'false'));
    if (!isActive) hideContextToolbar(); else if (selectedNode) showContextToolbar(selectedNode);
    showToast(isActive ? 'STRUCTURAL_EDIT_ENABLED' : 'STRUCTURAL_EDIT_DISABLED');
};

window.addOrbatNodeAt = function(x, y) {
    const id = `unit_${Math.random().toString(36).substr(2, 9)}`;
    renderNode({ id, name: "NEW_UNIT", role: "Operational Support", callsign: "SIG_ID", icon: "icons/MOD.png", x, y, w: 220, h: 180 });
    updateSelection(document.getElementById(`node-${id}`)); saveState();
};

window.addOrbatNode = () => {
    const c = getCanvasCoords(canvas.clientWidth / 2, canvas.clientHeight / 2);
    window.addOrbatNodeAt(Math.round(c.x / SNAP_SIZE) * SNAP_SIZE, Math.round(c.y / SNAP_SIZE) * SNAP_SIZE);
};

window.removeSelectedNode = function() {
    if (selectedNode && confirm('Decommission unit?')) {
        const id = selectedNode.getAttribute('data-id');
        document.querySelectorAll(`.orbat-link[data-source="${id}"], .orbat-link[data-target="${id}"]`).forEach(l => l.remove());
        selectedNode.remove(); updateSelection(null); saveState(); showToast('UNIT_DECOMMISSIONED', 'danger');
    }
};

window.exportOrbatJSON = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(serializeCurrentState(), null, 2)], { type: 'application/json' }));
    a.download = 'orbat_v2.json'; a.click(); showToast('ORBAT_DATA_EXPORTED');
};

window.openIconModalDirect = function() {
    if (!selectedNode) return;
    activeNodeForIcon = selectedNode; iconGrid.innerHTML = '';
    ["icons/MOD.png", "icons/TFA.png", "icons/SAS.png", "icons/SBS.png", "icons/SRR.png", "icons/SFSG.png", "icons/JSFAW.png", "icons/MEDIC.png", "icons/Intelligence-Corps.png", "icons/RSIS.png", "icons/SIGNALS.png", "icons/RANGERS.png"].forEach(path => {
        const item = document.createElement('div');
        item.className = 'group/icon flex flex-col items-center space-y-2 p-4 bg-white/[0.02] border border-white/5 hover:border-[var(--primary)]/40 cursor-pointer transition-all';
        item.onclick = () => {
            const img = activeNodeForIcon.querySelector('img');
            if (img) { img.src = '/' + path; img.setAttribute('data-icon-path', path); }
            showToast(`ICON_APPLIED: ${path.split('/').pop()}`); saveState(); closeIconModal();
        };
        item.innerHTML = `<img src="/${path}" class="w-12 h-12 object-contain opacity-60 group-hover/icon:opacity-100 transition-opacity"><span class="text-[7px] font-mono text-gray-600 group-hover/icon:text-white uppercase">${path.split('/').pop()}</span>`;
        iconGrid.appendChild(item);
    });
    iconModal.classList.remove('hidden');
};

window.closeIconModal = () => { iconModal.classList.add('hidden'); activeNodeForIcon = null; };

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

// Shortcuts
window.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('editable-field')) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    if (e.key === 'Delete' || e.key === 'Backspace') window.removeSelectedNode();
    if (e.key === 'e' || e.key === 'E') window.toggleEditMode();
    if (e.key === 'n' || e.key === 'N') window.addOrbatNode();
    if (e.key === 'c' || e.key === 'C') window.centerView();
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); window.exportOrbatJSON(); }
});

document.addEventListener('input', (e) => { if (e.target.classList.contains('editable-field')) saveState(); });

// Bootstrap
if (localStorage.getItem('uksf_hq_auth') === 'true') document.getElementById('hq-admin-bar').classList.remove('hidden');
window.addEventListener('load', () => { setTimeout(() => { window.centerView(); saveState(); }, 100); });
