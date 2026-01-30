// Institutional ORBAT - Canvas Controller v3.0 (Workflow Pro)

const canvas = document.getElementById('orbat-canvas');
const content = document.getElementById('canvas-content');
const zoomDisplay = document.getElementById('zoom-level');
const svgLayer = document.getElementById('orbat-connectors');
const tempLink = document.getElementById('temp-link');

const SNAP_SIZE = 50; 
const OFFSET = 2500; // Center offset

let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let isDraggingNode = false;
let isDrawingLink = false;
let dragNode = null;
let linkSourceId = null;
let lastMouseX, lastMouseY;

// 1. Path Calculation (Cubic Bezier)
function getBezierPath(x1, y1, x2, y2) {
    const dy = Math.abs(y2 - y1);
    const cp1y = y1 + dy / 2;
    const cp2y = y2 - dy / 2;
    return `M ${x1} ${y1} C ${x1} ${cp1y}, ${x2} ${cp2y}, ${x2} ${y2}`;
}

// 2. Core Transform & Rendering
function updateTransform() {
    content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomDisplay.innerText = `Zoom: ${Math.round(scale * 100)}%`;
    updateLinks();
}

function updateLinks() {
    const links = document.querySelectorAll('.orbat-link');
    links.forEach(link => {
        const sourceId = link.getAttribute('data-source');
        const targetId = link.getAttribute('data-target');
        
        const sourceEl = document.getElementById(`node-${sourceId}`);
        const targetEl = document.getElementById(`node-${targetId}`);
        
        if (sourceEl && targetEl) {
            const sX = parseFloat(sourceEl.getAttribute('data-x')) + OFFSET;
            const sY = parseFloat(sourceEl.getAttribute('data-y')) + OFFSET;
            const tX = parseFloat(targetEl.getAttribute('data-x')) + OFFSET;
            const tY = parseFloat(targetEl.getAttribute('data-y')) + OFFSET;
            
            link.setAttribute('d', getBezierPath(sX, sY, tX, tY));
        }
    });
}

// 3. Mouse Interaction
canvas.addEventListener('mousedown', (e) => {
    // A. Link Drawing Handler
    if (isDrawingLink) {
        const targetNode = e.target.closest('.orbat-node-wrapper');
        if (targetNode) {
            const targetId = targetNode.getAttribute('data-id');
            if (targetId !== linkSourceId) {
                createNewLink(linkSourceId, targetId);
            }
        }
        stopDrawingLink();
        return;
    }

    // B. Node Drag Handler
    const dragHandle = e.target.closest('.node-drag-handle');
    if (dragHandle) {
        isDraggingNode = true;
        dragNode = dragHandle.closest('.orbat-node-wrapper');
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        e.stopPropagation();
        return;
    }

    // C. Panning Handler (Left Click)
    if (e.button === 0) {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

window.addEventListener('mousemove', (e) => {
    // 1. Update Temporary Link
    if (isDrawingLink) {
        const rect = canvas.getBoundingClientRect();
        const mX = (e.clientX - rect.left - translateX) / scale;
        const mY = (e.clientY - rect.top - translateY) / scale;
        
        const sourceEl = document.getElementById(`node-${linkSourceId}`);
        const sX = parseFloat(sourceEl.getAttribute('data-x')) + OFFSET;
        const sY = parseFloat(sourceEl.getAttribute('data-y')) + OFFSET;
        
        tempLink.setAttribute('d', getBezierPath(sX, sY, mX, mY));
        return;
    }

    // 2. Handle Node Dragging
    if (isDraggingNode && dragNode) {
        const dx = (e.clientX - lastMouseX) / scale;
        const dy = (e.clientY - lastMouseY) / scale;
        
        let curX = parseFloat(dragNode.getAttribute('data-x'));
        let curY = parseFloat(dragNode.getAttribute('data-y'));
        
        let newX = curX + dx;
        let newY = curY + dy;

        // Visual feedback during drag (unsnapped for smoothness)
        dragNode.style.left = `${OFFSET + newX}px`;
        dragNode.style.top = `${OFFSET + newY}px`;
        
        dragNode.setAttribute('data-x', newX);
        dragNode.setAttribute('data-y', newY);
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        updateLinks();
        return;
    }

    // 3. Handle Canvas Panning
    if (isPanning) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        
        translateX += dx;
        translateY += dy;
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        updateTransform();
    }
});

window.addEventListener('mouseup', () => {
    if (isDraggingNode && dragNode) {
        // Apply snapping on drop
        let x = parseFloat(dragNode.getAttribute('data-x'));
        let y = parseFloat(dragNode.getAttribute('data-y'));
        
        x = Math.round(x / SNAP_SIZE) * SNAP_SIZE;
        y = Math.round(y / SNAP_SIZE) * SNAP_SIZE;
        
        dragNode.setAttribute('data-x', x);
        dragNode.setAttribute('data-y', y);
        dragNode.style.left = `${OFFSET + x}px`;
        dragNode.style.top = `${OFFSET + y}px`;
        
        updateLinks();
    }
    isPanning = false;
    isDraggingNode = false;
    dragNode = null;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= factor;
    scale = Math.min(Math.max(0.1, scale), 3);
    updateTransform();
}, { passive: false });

// 4. Link & Structure Logic
window.startDrawingLink = function(e, handle) {
    e.stopPropagation();
    isDrawingLink = true;
    const node = handle.closest('.orbat-node-wrapper');
    linkSourceId = node.getAttribute('data-id');
    
    const sX = parseFloat(node.getAttribute('data-x')) + OFFSET;
    const sY = parseFloat(node.getAttribute('data-y')) + OFFSET;
    
    tempLink.setAttribute('d', getBezierPath(sX, sY, sX, sY));
    tempLink.classList.remove('hidden');
};

function stopDrawingLink() {
    isDrawingLink = false;
    linkSourceId = null;
    tempLink.classList.add('hidden');
}

function createNewLink(source, target) {
    if (document.querySelector(`.orbat-link[data-source="${source}"][data-target="${target}"]`)) return;

    const newLink = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    newLink.setAttribute('class', 'orbat-link');
    newLink.setAttribute('data-source', source);
    newLink.setAttribute('data-target', target);
    newLink.setAttribute('fill', 'none');
    newLink.setAttribute('stroke', 'rgba(179, 153, 93, 0.3)');
    newLink.setAttribute('stroke-width', '1.5');
    newLink.setAttribute('marker-end', 'url(#arrowhead)');
    svgLayer.appendChild(newLink);
    updateLinks();
}

window.addOrbatChild = function(btn) {
    const parentNode = btn ? btn.closest('.orbat-node-wrapper') : null;
    const newId = `unit_${Math.random().toString(36).substr(2, 9)}`;
    const pX = parentNode ? parseFloat(parentNode.getAttribute('data-x')) : 0;
    const pY = parentNode ? parseFloat(parentNode.getAttribute('data-y')) + 150 : 0;
    
    const newNode = document.createElement('div');
    newNode.className = 'orbat-node-wrapper absolute transform -translate-x-1/2 -translate-y-1/2';
    newNode.id = `node-${newId}`;
    newNode.setAttribute('data-id', newId);
    newNode.setAttribute('data-x', pX);
    newNode.setAttribute('data-y', pY);
    newNode.style.left = `${OFFSET + pX}px`;
    newNode.style.top = `${OFFSET + pY}px`;
    
    newNode.innerHTML = `
        <div class="orbat-node-container flex flex-col items-center">
            <div class="tf-nc bracket-box !p-4 group relative min-w-[220px] pointer-events-auto">
                <div class="admin-controls absolute -top-2 -right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="node-drag-handle w-5 h-5 bg-[var(--primary)] text-black rounded flex items-center justify-center text-xs shadow-xl cursor-move">✥</div>
                    <div class="link-handle w-5 h-5 bg-blue-600 text-white rounded flex items-center justify-center text-xs shadow-xl cursor-crosshair" onmousedown="startDrawingLink(event, this)">⇿</div>
                    <button onclick="addOrbatChild(this)" class="w-5 h-5 bg-green-600 text-white rounded flex items-center justify-center text-xs shadow-xl">+</button>
                    <button onclick="removeOrbatNode(this)" class="w-5 h-5 bg-red-600 text-white rounded flex items-center justify-center text-xs shadow-xl">×</button>
                </div>
                <div class="space-y-1 text-center">
                    <h5 class="text-[11px] font-bold text-white uppercase tracking-tight m-0 editable-field" data-key="name" contenteditable="true">NEW_UNIT</h5>
                    <p class="text-[8px] text-gray-500 font-mono uppercase italic m-0 editable-field" data-key="callsign" contenteditable="true">CALLSIGN</p>
                </div>
                <div class="absolute top-2 right-2">
                    <span class="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] block"></span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('orbat-nodes-layer').appendChild(newNode);
    if (parentNode) createNewLink(parentNode.getAttribute('data-id'), newId);
    
    // Ensure edit mode styles are applied if active
    if (document.getElementById('hq-admin-bar').classList.contains('edit-active')) {
        newNode.querySelectorAll('.admin-controls').forEach(el => el.classList.remove('hidden'));
        newNode.querySelectorAll('.editable-field').forEach(el => el.setAttribute('contenteditable', 'true'));
    }
};

window.removeOrbatNode = function(btn) {
    if (confirm('Decommission unit?')) {
        const node = btn.closest('.orbat-node-wrapper');
        const id = node.getAttribute('data-id');
        document.querySelectorAll(`.orbat-link[data-source="${id}"], .orbat-link[data-target="${id}"]`).forEach(l => l.remove());
        node.remove();
    }
};

window.exportOrbatJSON = function() {
    const nodeEls = document.querySelectorAll('.orbat-node-wrapper');
    const linkEls = document.querySelectorAll('.orbat-link');
    
    const nodes = Array.from(nodeEls).map(el => ({
        id: el.getAttribute('data-id'),
        name: el.querySelector('[data-key="name"]').innerText.trim(),
        callsign: el.querySelector('[data-key="callsign"]')?.innerText.trim() || "",
        icon: el.querySelector('img')?.getAttribute('data-icon-path') || null,
        x: Math.round(parseFloat(el.getAttribute('data-x'))),
        y: Math.round(parseFloat(el.getAttribute('data-y')))
    }));
    
    const links = Array.from(linkEls).map(el => ({
        source: el.getAttribute('data-source'),
        target: el.getAttribute('data-target')
    }));

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ nodes, links }, null, 2)], { type: 'application/json' }));
    a.download = 'orbat_v2.json';
    a.click();
};

window.toggleEditMode = function() {
    const adminBar = document.getElementById('hq-admin-bar');
    const isActive = adminBar.classList.toggle('edit-active');
    const btn = document.getElementById('edit-mode-btn');
    const adminControls = document.querySelectorAll('.admin-controls');
    const editableFields = document.querySelectorAll('.editable-field');

    if (isActive) {
        btn.innerText = 'DISABLE_STRUCTURAL_EDIT';
        btn.classList.add('!bg-red-600/20', '!text-red-500', '!border-red-500/40');
        adminControls.forEach(el => el.classList.remove('hidden'));
        editableFields.forEach(el => el.setAttribute('contenteditable', 'true'));
    } else {
        btn.innerText = 'ENABLE_STRUCTURAL_EDIT';
        btn.classList.remove('!bg-red-600/20', '!text-red-500', '!border-red-500/40');
        adminControls.forEach(el => el.classList.add('hidden'));
        editableFields.forEach(el => el.removeAttribute('contenteditable'));
    }
};

// 5. Bootstrap
if (localStorage.getItem('uksf_hq_auth') === 'true') {
    document.getElementById('hq-admin-bar').classList.remove('hidden');
}
setTimeout(updateTransform, 100);