// Institutional ORBAT - Canvas Controller v2.5 (Workflow Mode)

const canvas = document.getElementById('orbat-canvas');
const content = document.getElementById('canvas-content');
const zoomDisplay = document.getElementById('zoom-level');
const svgLayer = document.getElementById('orbat-connectors');
const tempLink = document.getElementById('temp-link');

const SNAP_SIZE = 50; // Grid snapping size

let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let isDraggingNode = false;
let isDrawingLink = false;
let dragNode = null;
let linkSourceId = null;
let startX, startY;

// 1. Core Transform Logic
function updateTransform() {
    content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomDisplay.innerText = `Zoom: ${Math.round(scale * 100)}%`;
    updateLinks();
}

// 2. SVG Link Drawing
function updateLinks() {
    const links = document.querySelectorAll('.orbat-link');
    links.forEach(link => {
        const sourceId = link.getAttribute('data-source');
        const targetId = link.getAttribute('data-target');
        
        const sourceEl = document.getElementById(`node-${sourceId}`);
        const targetEl = document.getElementById(`node-${targetId}`);
        
        if (sourceEl && targetEl) {
            const sX = parseFloat(sourceEl.getAttribute('data-x')) + 2500;
            const sY = parseFloat(sourceEl.getAttribute('data-y')) + 2500;
            const tX = parseFloat(targetEl.getAttribute('data-x')) + 2500;
            const tY = parseFloat(targetEl.getAttribute('data-y')) + 2500;
            
            link.setAttribute('x1', sX);
            link.setAttribute('y1', sY);
            link.setAttribute('x2', tX);
            link.setAttribute('y2', tY);
        }
    });
}

// 3. Interaction Handlers
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= factor;
    scale = Math.min(Math.max(0.1, scale), 3);
    updateTransform();
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    // A. Handle Link Finalization (Target Click)
    if (isDrawingLink) {
        const targetNode = e.target.closest('.orbat-node-wrapper');
        if (targetNode && targetNode.getAttribute('data-id') !== linkSourceId) {
            createNewLink(linkSourceId, targetNode.getAttribute('data-id'));
        }
        stopDrawingLink();
        return;
    }

    // B. Handle Node Dragging
    if (e.target.classList.contains('node-drag-handle')) {
        isDraggingNode = true;
        dragNode = e.target.closest('.orbat-node-wrapper');
        startX = e.clientX;
        startY = e.clientY;
        e.stopPropagation();
        return;
    }

    // C. Handle Panning
    if (e.button === 0) {
        isPanning = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
    }
});

window.addEventListener('mousemove', (e) => {
    // 1. Draw Temp Link
    if (isDrawingLink) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - translateX) / scale;
        const mouseY = (e.clientY - rect.top - translateY) / scale;
        
        tempLink.setAttribute('x2', mouseX);
        tempLink.setAttribute('y2', mouseY);
        return;
    }

    // 2. Node Dragging with Snapping
    if (isDraggingNode && dragNode) {
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;
        
        let newX = (parseFloat(dragNode.getAttribute('data-x')) || 0) + dx;
        let newY = (parseFloat(dragNode.getAttribute('data-y')) || 0) + dy;
        
        // Apply Grid Snapping
        newX = Math.round(newX / SNAP_SIZE) * SNAP_SIZE;
        newY = Math.round(newY / SNAP_SIZE) * SNAP_SIZE;
        
        dragNode.style.left = `calc(2500px + ${newX}px)`;
        dragNode.style.top = `calc(2500px + ${newY}px)`;
        dragNode.setAttribute('data-x', newX);
        dragNode.setAttribute('data-y', newY);
        
        startX = e.clientX;
        startY = e.clientY;
        updateLinks();
        return;
    }

    // 3. View Panning
    if (isPanning) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    }
});

window.addEventListener('mouseup', () => {
    isPanning = false;
    isDraggingNode = false;
});

// 4. Link Creation Logic
window.startDrawingLink = function(e, handle) {
    e.stopPropagation();
    isDrawingLink = true;
    const node = handle.closest('.orbat-node-wrapper');
    linkSourceId = node.getAttribute('data-id');
    
    const sX = parseFloat(node.getAttribute('data-x')) + 2500;
    const sY = parseFloat(node.getAttribute('data-y')) + 2500;
    
    tempLink.setAttribute('x1', sX);
    tempLink.setAttribute('y1', sY);
    tempLink.setAttribute('x2', sX);
    tempLink.setAttribute('y2', sY);
    tempLink.classList.remove('hidden');
};

function stopDrawingLink() {
    isDrawingLink = false;
    linkSourceId = null;
    tempLink.classList.add('hidden');
}

function createNewLink(source, target) {
    // Prevent duplicates
    if (document.querySelector(`.orbat-link[data-source="${source}"][data-target="${target}"]`)) return;

    const newLink = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    newLink.setAttribute('class', 'orbat-link');
    newLink.setAttribute('data-source', source);
    newLink.setAttribute('data-target', target);
    newLink.setAttribute('stroke', 'rgba(179, 153, 93, 0.2)');
    newLink.setAttribute('stroke-width', '1');
    newLink.setAttribute('marker-end', 'url(#arrowhead)');
    svgLayer.appendChild(newLink);
    updateLinks();
}

// 5. HQ Administrative Logic
window.toggleEditMode = function() {
    const editMode = document.getElementById('hq-admin-bar').classList.toggle('edit-active');
    const btn = document.getElementById('edit-mode-btn');
    const adminControls = document.querySelectorAll('.admin-controls');
    const editableFields = document.querySelectorAll('.editable-field');

    if (document.getElementById('hq-admin-bar').classList.contains('edit-active')) {
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
    newNode.style.left = `calc(2500px + ${pX}px)`;
    newNode.style.top = `calc(2500px + ${pY}px)`;
    
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
};

window.removeOrbatNode = function(btn) {
    if (confirm('Remove unit?')) {
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

// 6. Bootstrap
if (localStorage.getItem('uksf_hq_auth') === 'true') {
    document.getElementById('hq-admin-bar').classList.remove('hidden');
}
setTimeout(updateTransform, 100);
