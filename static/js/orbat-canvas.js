// Institutional ORBAT - Canvas Controller v4.3 (Modal Edition)

const canvas = document.getElementById('orbat-canvas');
const content = document.getElementById('canvas-content');
const zoomDisplay = document.getElementById('zoom-level');
const svgLayer = document.getElementById('orbat-connectors');
const tempLink = document.getElementById('temp-link');
const toastContainer = document.getElementById('toast-container');
const iconModal = document.getElementById('icon-modal');
const iconGrid = document.getElementById('icon-grid');

const SNAP_SIZE = 20; 
const OFFSET = 5000; 

let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let isDraggingNode = false;
let isDrawingLink = false;
let dragNode = null;
let linkSourceId = null;
let linkSourceSide = null;
let activeNodeForIcon = null;
let startMouseX, startMouseY;
let startNodeX, startNodeY;

// 1. UI: Notification System
window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `p-4 bg-black/90 backdrop-blur-xl border-l-2 ${type === 'danger' ? 'border-red-600' : 'border-[var(--primary)]'} shadow-2xl animate-slide-in-top flex items-center space-x-4 min-w-[250px] pointer-events-auto`;
    toast.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full ${type === 'danger' ? 'bg-red-600' : 'bg-[var(--primary)]'} animate-pulse"></span>
        <span class="text-[10px] font-mono text-white uppercase tracking-widest">${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

// 2. Icon Selection System
const UNIT_ICONS = ["icons/MOD.png", "icons/TFA.png", "icons/SAS.png", "icons/SBS.png", "icons/SRR.png", "icons/SFSG.png", "icons/JSFAW.png", "icons/MEDIC.png", "icons/Intelligence-Corps.png", "icons/RSIS.png", "icons/SIGNALS.png", "icons/RANGERS.png"];

window.openIconModal = function(btn) {
    activeNodeForIcon = btn.closest('.orbat-node-wrapper');
    iconGrid.innerHTML = ''; // Clear existing
    
    UNIT_ICONS.forEach(path => {
        const item = document.createElement('div');
        item.className = 'group/icon flex flex-col items-center space-y-2 p-4 bg-white/[0.02] border border-white/5 hover:border-[var(--primary)]/40 cursor-pointer transition-all';
        item.onclick = () => selectIcon(path);
        
        const fileName = path.split('/').pop();
        item.innerHTML = `
            <img src="/${path}" class="w-12 h-12 object-contain opacity-60 group-hover/icon:opacity-100 transition-opacity">
            <span class="text-[7px] font-mono text-gray-600 group-hover/icon:text-white uppercase">${fileName}</span>
        `;
        iconGrid.appendChild(item);
    });
    
    iconModal.classList.remove('hidden');
};

function selectIcon(path) {
    if (activeNodeForIcon) {
        let img = activeNodeForIcon.querySelector('img');
        if (!img) {
            // Create image if it doesn't exist
            const body = activeNodeForIcon.querySelector('.p-5 .space-y-6');
            const wrapper = document.createElement('div');
            wrapper.className = 'flex justify-center mb-2';
            img = document.createElement('img');
            img.className = 'w-16 h-16 object-contain opacity-90 grayscale group-hover/card:grayscale-0 group-hover/card:opacity-100 transition-all duration-700';
            wrapper.appendChild(img);
            body.prepend(wrapper);
        }
        img.src = '/' + path;
        img.setAttribute('data-icon-path', path);
        showToast(`ICON_APPLIED: ${path.split('/').pop()}`);
    }
    closeIconModal();
}

window.closeIconModal = function() {
    iconModal.classList.add('hidden');
    activeNodeForIcon = null;
};

// 3. Coordinate Math
function getCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left - translateX) / scale, y: (clientY - rect.top - translateY) / scale };
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
    const cp1 = { x: p1.x, y: p1.y }; const cp2 = { x: p2.x, y: p2.y };
    if (s1 === 'top') cp1.y -= cpDist; else if (s1 === 'bottom') cp1.y += cpDist;
    else if (s1 === 'left') cp1.x -= cpDist; else if (s1 === 'right') cp1.x += cpDist;
    if (s2 === 'top') cp2.y -= cpDist; else if (s2 === 'bottom') cp2.y += cpDist;
    else if (s2 === 'left') cp2.x -= cpDist; else if (s2 === 'right') cp2.x += cpDist;
    return `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
}

// 4. Core Transformation
function updateTransform() {
    content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomDisplay.innerText = `Zoom: ${Math.round(scale * 100)}%`;
    updateLinks();
}

function updateLinks() {
    document.querySelectorAll('.orbat-link').forEach(link => {
        const p1 = getPointOnSide(link.getAttribute('data-source'), link.getAttribute('data-from-side'));
        const p2 = getPointOnSide(link.getAttribute('data-target'), link.getAttribute('data-to-side'));
        link.setAttribute('d', getBezierPath(p1, p2, link.getAttribute('data-from-side'), link.getAttribute('data-to-side')));
    });
}

// 5. Input Listeners
canvas.addEventListener('mousedown', (e) => {
    if (isDrawingLink) {
        const target = e.target.closest('.orbat-node-wrapper');
        if (target) createNewLink(linkSourceId, linkSourceSide, target.getAttribute('data-id'), 'top');
        stopDrawingLink(); return;
    }
    const dragHandle = e.target.closest('.node-drag-handle') || e.target.closest('.orbat-node-card > div:first-child');
    if (dragHandle) {
        isDraggingNode = true; dragNode = dragHandle.closest('.orbat-node-wrapper');
        const coords = getCanvasCoords(e.clientX, e.clientY);
        startMouseX = coords.x; startMouseY = coords.y;
        startNodeX = parseFloat(dragNode.getAttribute('data-x')); startNodeY = parseFloat(dragNode.getAttribute('data-y'));
        e.stopPropagation(); return;
    }
    if (e.button === 0) {
        isPanning = true; startMouseX = e.clientX - translateX; startMouseY = e.clientY - translateY;
    }
});

window.addEventListener('mousemove', (e) => {
    if (isDrawingLink) {
        const m = getCanvasCoords(e.clientX, e.clientY);
        const p1 = getPointOnSide(linkSourceId, linkSourceSide);
        tempLink.setAttribute('d', getBezierPath(p1, m, linkSourceSide, 'auto')); return;
    }
    if (isDraggingNode && dragNode) {
        const m = getCanvasCoords(e.clientX, e.clientY);
        const newX = startNodeX + (m.x - startMouseX); const newY = startNodeY + (m.y - startMouseY);
        dragNode.style.left = `${OFFSET + newX}px`; dragNode.style.top = `${OFFSET + newY}px`;
        dragNode.setAttribute('data-x', newX); dragNode.setAttribute('data-y', newY);
        updateLinks(); return;
    }
    if (isPanning) {
        translateX = e.clientX - startMouseX; translateY = e.clientY - startMouseY;
        updateTransform();
    }
});

window.addEventListener('mouseup', () => {
    if (isDraggingNode && dragNode) {
        const x = Math.round(parseFloat(dragNode.getAttribute('data-x')) / SNAP_SIZE) * SNAP_SIZE;
        const y = Math.round(parseFloat(dragNode.getAttribute('data-y')) / SNAP_SIZE) * SNAP_SIZE;
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

// 6. Admin structural
window.startDrawingLink = function(e, side) {
    e.stopPropagation(); isDrawingLink = true;
    linkSourceId = e.target.closest('.orbat-node-wrapper').getAttribute('data-id');
    linkSourceSide = side; tempLink.classList.remove('hidden');
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
    btn.innerText = isActive ? 'EXIT_EDIT_MODE' : 'ENABLE_STRUCTURAL_EDIT';
    btn.classList.toggle('!bg-red-600/20', isActive); btn.classList.toggle('!text-red-500', isActive);
    document.querySelectorAll('.admin-controls, .connection-points').forEach(el => el.classList.toggle('hidden', !isActive));
    document.querySelectorAll('.editable-field').forEach(el => el.setAttribute('contenteditable', isActive ? 'true' : 'false'));
    showToast(isActive ? 'STRUCTURAL_EDIT_ENABLED' : 'STRUCTURAL_EDIT_DISABLED');
};

window.addOrbatNode = function() {
    const newId = `unit_${Math.random().toString(36).substr(2, 9)}`;
    const newNode = document.createElement('div');
    newNode.className = 'orbat-node-wrapper absolute shadow-2xl';
    newNode.id = `node-${newId}`;
    newNode.setAttribute('data-id', newId); newNode.setAttribute('data-x', -translateX/scale); newNode.setAttribute('data-y', -translateY/scale);
    newNode.setAttribute('data-w', 220); newNode.setAttribute('data-h', 180);
    newNode.style.left = `${OFFSET - translateX/scale}px`; newNode.style.top = `${OFFSET - translateY/scale}px`;
    newNode.style.width = '220px'; newNode.style.height = '180px';
    newNode.innerHTML = `
        <div class="orbat-node-card h-full flex flex-col bracket-box bg-black/80 backdrop-blur-xl !p-0 overflow-hidden relative group/card border-white/5">
            <div class="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex justify-between items-center shrink-0">
                <div class="flex items-center space-x-3 min-w-0">
                    <span class="text-[8px] font-mono text-gray-500 uppercase tracking-widest truncate">NEW_NODE</span>
                </div>
                <div class="admin-controls flex items-center space-x-2">
                    <div class="node-drag-handle text-gray-600 hover:text-[var(--primary)] cursor-move transition-colors text-sm">✥</div>
                    <button onclick="window.openIconModal(this)" class="text-gray-600 hover:text-blue-500 transition-colors text-sm">❖</button>
                    <button onclick="window.removeOrbatNode(this)" class="text-gray-600 hover:text-red-500 transition-colors text-sm">×</button>
                </div>
            </div>
            <div class="p-5 flex-grow overflow-y-auto custom-scrollbar pointer-events-auto relative">
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
    showToast('NEW_NODE_CREATED');
};

window.removeOrbatNode = function(btn) {
    if (confirm('Decommission unit?')) {
        const node = btn.closest('.orbat-node-wrapper');
        const id = node.getAttribute('data-id');
        document.querySelectorAll(`.orbat-link[data-source="${id}"], .orbat-link[data-target="${id}"]`).forEach(l => l.remove());
        node.remove();
        showToast('UNIT_DECOMMISSIONED', 'danger');
    }
};

window.exportOrbatJSON = function() {
    const nodes = Array.from(document.querySelectorAll('.orbat-node-wrapper')).map(el => ({
        id: el.getAttribute('data-id'),
        name: el.querySelector('[data-key="name"]').innerText.trim(),
        role: el.querySelector('[data-key="role"]')?.innerText.trim() || "Operational Support",
        callsign: el.querySelector('.orbat-node-card span.font-mono')?.innerText.trim() || "",
        icon: el.querySelector('img')?.getAttribute('data-icon-path') || null,
        x: Math.round(parseFloat(el.getAttribute('data-x'))), y: Math.round(parseFloat(el.getAttribute('data-y'))),
        width: Math.round(parseFloat(el.getAttribute('data-w'))), height: Math.round(parseFloat(el.getAttribute('data-h')))
    }));
    const edges = Array.from(document.querySelectorAll('.orbat-link')).map(el => ({
        id: el.id.replace('edge-', ''), fromNode: el.getAttribute('data-source'), toNode: el.getAttribute('data-target'),
        fromSide: el.getAttribute('data-from-side'), toSide: el.getAttribute('data-to-side')
    }));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' }));
    a.download = 'orbat_v2.json'; a.click();
    showToast('ORBAT_DATA_EXPORTED');
};

if (localStorage.getItem('uksf_hq_auth') === 'true') document.getElementById('hq-admin-bar').classList.remove('hidden');
setTimeout(updateTransform, 100);