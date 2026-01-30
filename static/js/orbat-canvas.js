// Institutional ORBAT - Canvas Controller v5.1 (Workflow Polished)

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

let scale = 1;
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

// --- 1. UI: NOTIFICATIONS & CONTEXT ---

window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    // Moved to top-right to avoid covering bottom toolbar
    toast.className = `p-4 bg-black/95 backdrop-blur-xl border-l-2 ${type === 'danger' ? 'border-red-600' : 'border-[var(--primary)]'} shadow-2xl animate-slide-in-right flex items-center space-x-4 min-w-[280px] pointer-events-auto transition-all duration-500`;
    
    toast.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full ${type === 'danger' ? 'bg-red-600' : 'bg-[var(--primary)]'} animate-pulse"></span>
        <div class="flex flex-col">
            <span class="text-[10px] font-black text-white uppercase tracking-widest">${message}</span>
            <span class="text-[7px] font-mono text-gray-500 uppercase tracking-tighter">System Notification // ${new Date().toLocaleTimeString()}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
};

function updateSelection(node) {
    document.querySelectorAll('.orbat-node-wrapper').forEach(n => n.classList.remove('selected'));
    selectedNode = node;
    if (node) {
        node.classList.add('selected');
        showContextToolbar(node);
    } else {
        hideContextToolbar();
    }
}

function showContextToolbar(node) {
    if (!document.getElementById('hq-admin-bar').classList.contains('edit-active')) return;
    
    let toolbar = document.getElementById('node-context-menu');
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.id = 'node-context-menu';
        toolbar.className = 'node-context-menu pointer-events-auto';
        document.body.appendChild(toolbar);
    }

    toolbar.innerHTML = `
        <button onclick="window.openIconModalDirect()" class="toolbar-btn" title="Change Icon">❖</button>
        <div class="toolbar-separator"></div>
        <button onclick="window.removeSelectedNode()" class="toolbar-btn text-red-500" title="Delete Unit">×</button>
    `;

    const rect = node.getBoundingClientRect();
    toolbar.style.left = `${rect.left + rect.width / 2}px`;
    toolbar.style.top = `${rect.top - 60}px`;
    toolbar.classList.remove('hidden');
}

function hideContextToolbar() {
    const toolbar = document.getElementById('node-context-menu');
    if (toolbar) toolbar.classList.add('hidden');
}

// --- 2. CANVAS MATH (Fixed Projection) ---

function getCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    // Logic: (ScreenPos - CanvasTopLeft - Translation) / Scale
    return {
        x: (clientX - rect.left - translateX) / scale,
        y: (clientY - rect.top - translateY) / scale
    };
}

function getPointOnSide(nodeId, side) {
    const el = document.getElementById(`node-${nodeId}`);
    if (!el) return { x: 0, y: 0 };

    const x = parseFloat(el.getAttribute('data-x'));
    const y = parseFloat(el.getAttribute('data-y'));
    const w = parseFloat(el.getAttribute('data-w'));
    const h = parseFloat(el.getAttribute('data-h'));

    // Returns absolute coordinates in the 10000x10000 space
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

    const cp1 = { x: p1.x, y: p1.y };
    const cp2 = { x: p2.x, y: p2.y };

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

// --- 3. RENDERING & INTERACTION ---

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

canvas.addEventListener('mousedown', (e) => {
    const nodeWrapper = e.target.closest('.orbat-node-wrapper');
    const dragHandle = e.target.closest('.node-drag-handle') || e.target.closest('.orbat-node-card > div:first-child');

    if (isDrawingLink) {
        if (nodeWrapper) {
            const targetId = nodeWrapper.getAttribute('data-id');
            if (targetId !== linkSourceId) createNewLink(linkSourceId, linkSourceSide, targetId, 'top');
        }
        stopDrawingLink(); return;
    }

    if (nodeWrapper) {
        updateSelection(nodeWrapper);
        if (dragHandle || document.getElementById('hq-admin-bar').classList.contains('edit-active')) {
            isDraggingNode = true;
            dragNode = nodeWrapper;
            const coords = getCanvasCoords(e.clientX, e.clientY);
            startMouseX = coords.x; startMouseY = coords.y;
            startNodeX = parseFloat(dragNode.getAttribute('data-x')); startNodeY = parseFloat(dragNode.getAttribute('data-y'));
            e.stopPropagation(); return;
        }
    } else {
        updateSelection(null);
    }

    if (e.button === 0) {
        isPanning = true;
        startMouseX = e.clientX; startMouseY = e.clientY;
    }
});

window.addEventListener('mousemove', (e) => {
    if (isDrawingLink) {
        const m = getCanvasCoords(e.clientX, e.clientY);
        const p1 = getPointOnSide(linkSourceId, linkSourceSide);
        // Correct mouse pos for SVG layer (which is at OFFSET center)
        const svgMouse = { x: m.x + OFFSET, y: m.y + OFFSET };
        tempLink.setAttribute('d', getBezierPath(p1, svgMouse, linkSourceSide, 'auto')); return;
    }
    if (isDraggingNode && dragNode) {
        const m = getCanvasCoords(e.clientX, e.clientY);
        const newX = startNodeX + (m.x - startMouseX); const newY = startNodeY + (m.y - startMouseY);
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
        let x = parseFloat(dragNode.getAttribute('data-x')); let y = parseFloat(dragNode.getAttribute('data-y'));
        x = Math.round(x / SNAP_SIZE) * SNAP_SIZE; y = Math.round(y / SNAP_SIZE) * SNAP_SIZE;
        dragNode.setAttribute('data-x', x); dragNode.setAttribute('data-y', y);
        dragNode.style.left = `${OFFSET + x}px`; dragNode.style.top = `${OFFSET + y}px`;
        updateLinks();
    }
    isPanning = false; isDraggingNode = false; dragNode = null;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.001);
    const rect = canvas.getBoundingClientRect();
    const mX = e.clientX - rect.left; const mY = e.clientY - rect.top;
    const x0 = (mX - translateX) / scale; const y0 = (mY - translateY) / scale;
    scale = Math.min(Math.max(0.1, scale), 3); scale *= factor;
    translateX = mX - x0 * scale; translateY = mY - y0 * scale;
    updateTransform();
}, { passive: false });

canvas.addEventListener('dblclick', (e) => {
    if (!document.getElementById('hq-admin-bar').classList.contains('edit-active')) return;
    if (e.target === canvas || e.target.id === 'orbat-nodes-layer') {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        window.addOrbatNodeAt(coords.x, coords.y);
    }
});

// --- 4. ADMIN & CORE FUNCTIONS ---

const UNIT_ICONS = ["icons/MOD.png", "icons/TFA.png", "icons/SAS.png", "icons/SBS.png", "icons/SRR.png", "icons/SFSG.png", "icons/JSFAW.png", "icons/MEDIC.png", "icons/Intelligence-Corps.png", "icons/RSIS.png", "icons/SIGNALS.png", "icons/RANGERS.png"];

window.openIconModalDirect = function() {
    if (!selectedNode) return;
    activeNodeForIcon = selectedNode;
    iconGrid.innerHTML = '';
    UNIT_ICONS.forEach(path => {
        const item = document.createElement('div');
        item.className = 'group/icon flex flex-col items-center space-y-2 p-4 bg-white/[0.02] border border-white/5 hover:border-[var(--primary)]/40 cursor-pointer transition-all';
        item.onclick = () => selectIcon(path);
        item.innerHTML = `<img src="/${path}" class="w-12 h-12 object-contain opacity-60 group-hover/icon:opacity-100 transition-opacity"><span class="text-[7px] font-mono text-gray-600 group-hover/icon:text-white uppercase">${path.split('/').pop()}</span>`;
        iconGrid.appendChild(item);
    });
    iconModal.classList.remove('hidden');
};

function selectIcon(path) {
    if (activeNodeForIcon) {
        const img = activeNodeForIcon.querySelector('img');
        if (img) { img.src = '/' + path; img.setAttribute('data-icon-path', path); }
        showToast(`ICON_APPLIED: ${path.split('/').pop()}`);
    }
    closeIconModal();
}

window.closeIconModal = function() { iconModal.classList.add('hidden'); activeNodeForIcon = null; };

window.startDrawingLink = function(e, side) {
    e.stopPropagation(); isDrawingLink = true;
    const node = e.target.closest('.orbat-node-wrapper');
    linkSourceId = node.getAttribute('data-id');
    linkSourceSide = side;
    
    const p1 = getPointOnSide(linkSourceId, side);
    tempLink.setAttribute('d', `M ${p1.x} ${p1.y} L ${p1.x} ${p1.y}`);
    tempLink.classList.remove('hidden');
};

function stopDrawingLink() { isDrawingLink = false; linkSourceId = null; tempLink.classList.add('hidden'); }

function createNewLink(source, sSide, target, tSide) {
    if (source === target) return;
    const id = `e_${Math.random().toString(36).substr(2, 9)}`;
    const newLink = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    newLink.setAttribute('class', 'orbat-link'); newLink.setAttribute('id', `edge-${id}`);
    newLink.setAttribute('data-source', source); newLink.setAttribute('data-target', target);
    newLink.setAttribute('data-from-side', sSide); newLink.setAttribute('data-to-side', tSide);
    newLink.setAttribute('fill', 'none'); newLink.setAttribute('stroke', 'rgba(179, 153, 93, 0.4)');
    newLink.setAttribute('stroke-width', '2'); newLink.setAttribute('marker-end', 'url(#arrowhead)');
    svgLayer.appendChild(newLink); updateLinks();
}

window.toggleEditMode = function() {
    const isActive = document.getElementById('hq-admin-bar').classList.toggle('edit-active');
    const btn = document.getElementById('edit-mode-btn');
    btn.classList.toggle('active', isActive);
    document.querySelectorAll('.admin-controls, .connection-points').forEach(el => el.classList.toggle('hidden', !isActive));
    document.querySelectorAll('.editable-field').forEach(el => el.setAttribute('contenteditable', isActive ? 'true' : 'false'));
    if (!isActive) hideContextToolbar();
    else if (selectedNode) showContextToolbar(selectedNode);
    showToast(isActive ? 'STRUCTURAL_EDIT_ENABLED' : 'STRUCTURAL_EDIT_DISABLED');
};

window.centerView = function() {
    const tfhq = document.getElementById('node-tfhq');
    if (tfhq) {
        const x = parseFloat(tfhq.getAttribute('data-x'));
        const y = parseFloat(tfhq.getAttribute('data-y'));
        translateX = canvas.clientWidth / 2 - x - OFFSET;
        translateY = canvas.clientHeight / 2 - y - OFFSET;
        scale = 0.8;
        updateTransform();
        showToast('VIEW_CENTERED');
    }
};

window.addOrbatNodeAt = function(x = 0, y = 0) {
    const newId = `unit_${Math.random().toString(36).substr(2, 9)}`;
    const newNode = document.createElement('div');
    newNode.className = 'orbat-node-wrapper absolute shadow-2xl';
    newNode.id = `node-${newId}`;
    newNode.setAttribute('data-id', newId); newNode.setAttribute('data-x', x); newNode.setAttribute('data-y', y);
    newNode.setAttribute('data-w', 220); newNode.setAttribute('data-h', 180);
    newNode.style.left = `${OFFSET + x}px`; newNode.style.top = `${OFFSET + y}px`;
    newNode.style.width = '220px'; newNode.style.height = '180px';
    newNode.innerHTML = `
        <div class="orbat-node-card h-full flex flex-col bracket-box bg-black/80 backdrop-blur-xl !p-0 overflow-hidden relative group/card border-white/5 pointer-events-auto">
            <div class="px-4 py-2 bg-white/[0.03] border-b border-white/10 flex justify-between items-center shrink-0">
                <div class="flex items-center space-x-3 min-w-0"><span class="text-[8px] font-mono text-gray-500 uppercase tracking-widest truncate">NEW_NODE</span></div>
                <div class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
            </div>
            <div class="p-5 flex-grow overflow-y-auto custom-scrollbar relative">
                <div class="border-l-2 border-[var(--primary)] pl-4">
                    <h5 class="text-sm font-black text-white uppercase tracking-tighter m-0 editable-field" data-key="name" contenteditable="true">NEW_UNIT</h5>
                    <p class="text-[8px] text-[var(--primary)] font-mono uppercase mt-1 italic editable-field" data-key="role" contenteditable="true">Operational Support</p>
                </div>
            </div>
            <div class="connection-points absolute inset-0 pointer-events-none">
                <div class="c-point top" onmousedown="window.startDrawingLink(event, 'top')"></div>
                <div class="c-point right" onmousedown="window.startDrawingLink(event, 'right')"></div>
                <div class="c-point bottom" onmousedown="window.startDrawingLink(event, 'bottom')"></div>
                <div class="c-point left" onmousedown="window.startDrawingLink(event, 'left')"></div>
            </div>
        </div>
    `;
    document.getElementById('orbat-nodes-layer').appendChild(newNode);
    updateSelection(newNode);
    showToast('NEW_NODE_CREATED');
};

window.addOrbatNode = () => {
    const coords = getCanvasCoords(canvas.clientWidth / 2, canvas.clientHeight / 2);
    window.addOrbatNodeAt(coords.x, coords.y);
};

window.removeSelectedNode = function() {
    if (selectedNode && confirm('Decommission unit?')) {
        const id = selectedNode.getAttribute('data-id');
        document.querySelectorAll(`.orbat-link[data-source="${id}"], .orbat-link[data-target="${id}"]`).forEach(l => l.remove());
        selectedNode.remove();
        updateSelection(null);
        showToast('UNIT_DECOMMISSIONED', 'danger');
    }
};

window.exportOrbatJSON = function() {
    const nodeEls = document.querySelectorAll('.orbat-node-wrapper');
    const edgeEls = document.querySelectorAll('.orbat-link');
    const nodes = Array.from(nodeEls).map(el => ({
        id: el.getAttribute('data-id'),
        name: el.querySelector('[data-key="name"]').innerText.trim(),
        role: el.querySelector('[data-key="role"]')?.innerText.trim() || "Operational Support",
        callsign: el.querySelector('.orbat-node-card span.font-mono')?.innerText.trim() || "",
        icon: el.querySelector('img')?.getAttribute('data-icon-path') || null,
        x: Math.round(parseFloat(el.getAttribute('data-x'))), y: Math.round(parseFloat(el.getAttribute('data-y'))),
        width: Math.round(parseFloat(el.getAttribute('data-w'))), height: Math.round(parseFloat(el.getAttribute('data-h')))
    }));
    const edges = Array.from(edgeEls).map(el => ({
        id: el.id.replace('edge-', ''), fromNode: el.getAttribute('data-source'), toNode: el.getAttribute('data-target'),
        fromSide: el.getAttribute('data-from-side'), toSide: el.getAttribute('data-to-side')
    }));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' }));
    a.download = 'orbat_v2.json'; a.click();
    showToast('ORBAT_DATA_EXPORTED');
};

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('editable-field')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') window.removeSelectedNode();
    if (e.key === 'e' || e.key === 'E') window.toggleEditMode();
    if (e.key === 'n' || e.key === 'N') window.addOrbatNode();
    if (e.key === 's' || e.key === 'S' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); window.exportOrbatJSON(); }
});

// Initialization
if (localStorage.getItem('uksf_hq_auth') === 'true') document.getElementById('hq-admin-bar').classList.remove('hidden');
setTimeout(() => {
    window.centerView();
    updateTransform();
}, 200);