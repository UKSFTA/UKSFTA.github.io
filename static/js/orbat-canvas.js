// Institutional ORBAT - Canvas Controller v4.0 (Obsidian Style)

const canvas = document.getElementById('orbat-canvas');
const content = document.getElementById('canvas-content');
const zoomDisplay = document.getElementById('zoom-level');
const svgLayer = document.getElementById('orbat-connectors');
const tempLink = document.getElementById('temp-link');

const SNAP_SIZE = 20; 
const OFFSET = 5000; // Large center offset for the 10000x10000 canvas

let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let isDraggingNode = false;
let isDrawingLink = false;
let dragNode = null;
let linkSourceId = null;
let linkSourceSide = null;
let lastMouseX, lastMouseY;

// 1. Point Calculation (Edge-anchored)
function getPointOnSide(nodeId, side) {
    const el = document.getElementById(`node-${nodeId}`);
    if (!el) return { x: 0, y: 0 };

    const x = parseFloat(el.getAttribute('data-x'));
    const y = parseFloat(el.getAttribute('data-y'));
    const w = parseFloat(el.getAttribute('data-w'));
    const h = parseFloat(el.getAttribute('data-h'));

    // Returns coordinates relative to the 5000px center
    switch (side) {
        case 'top':    return { x: OFFSET + x + w/2, y: OFFSET + y };
        case 'bottom': return { x: OFFSET + x + w/2, y: OFFSET + y + h };
        case 'left':   return { x: OFFSET + x,       y: OFFSET + y + h/2 };
        case 'right':  return { x: OFFSET + x + w,   y: OFFSET + y + h/2 };
        default:       return { x: OFFSET + x + w/2, y: OFFSET + y + h/2 };
    }
}

function getBezierPath(p1, p2, s1, s2) {
    // Control point distance based on distance between nodes
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const cpDist = Math.min(dist / 2, 100);

    const cp1 = { x: p1.x, y: p1.y };
    const cp2 = { x: p2.x, y: p2.y };

    // Adjust control points based on side orientation
    if (s1 === 'top') cp1.y -= cpDist;
    if (s1 === 'bottom') cp1.y += cpDist;
    if (s1 === 'left') cp1.x -= cpDist;
    if (s1 === 'right') cp1.x += cpDist;

    if (s2 === 'top') cp2.y -= cpDist;
    if (s2 === 'bottom') cp2.y += cpDist;
    if (s2 === 'left') cp2.x -= cpDist;
    if (s2 === 'right') cp2.x += cpDist;

    return `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
}

// 2. Core Rendering
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
        const sSide = link.getAttribute('data-from-side');
        const tSide = link.getAttribute('data-to-side');
        
        const p1 = getPointOnSide(sourceId, sSide);
        const p2 = getPointOnSide(targetId, tSide);
        
        link.setAttribute('d', getBezierPath(p1, p2, sSide, tSide));
    });
}

// 3. Interaction Logic
canvas.addEventListener('mousedown', (e) => {
    // A. Node Drag Handler
    const handle = e.target.closest('.node-drag-handle') || e.target.closest('.orbat-node-card > div:first-child');
    if (handle && !isDrawingLink) {
        isDraggingNode = true;
        dragNode = handle.closest('.orbat-node-wrapper');
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        e.stopPropagation();
        return;
    }

    // B. Panning Handler
    if (e.button === 0) {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

window.addEventListener('mousemove', (e) => {
    // 1. Temp Link
    if (isDrawingLink) {
        const rect = canvas.getBoundingClientRect();
        const mX = (e.clientX - rect.left - translateX) / scale;
        const mY = (e.clientY - rect.top - translateY) / scale;
        
        const p1 = getPointOnSide(linkSourceId, linkSourceSide);
        tempLink.setAttribute('d', getBezierPath(p1, { x: mX, y: mY }, linkSourceSide, 'auto'));
        
        // Auto-detect closest side of hovered node
        const targetNode = e.target.closest('.orbat-node-wrapper');
        if (targetNode) {
            targetNode.style.boxShadow = '0 0 0 2px var(--primary)';
        } else {
            document.querySelectorAll('.orbat-node-wrapper').forEach(n => n.style.boxShadow = '');
        }
        return;
    }

    // 2. Node Dragging
    if (isDraggingNode && dragNode) {
        const dx = (e.clientX - lastMouseX) / scale;
        const dy = (e.clientY - lastMouseY) / scale;
        
        let curX = parseFloat(dragNode.getAttribute('data-x'));
        let curY = parseFloat(dragNode.getAttribute('data-y'));
        
        let newX = curX + dx;
        let newY = curY + dy;

        dragNode.style.left = `${OFFSET + newX}px`;
        dragNode.style.top = `${OFFSET + newY}px`;
        dragNode.setAttribute('data-x', newX);
        dragNode.setAttribute('data-y', newY);
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        updateLinks();
        return;
    }

    // 3. Panning
    if (isPanning) {
        translateX += e.clientX - lastMouseX;
        translateY += e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        updateTransform();
    }
});

window.addEventListener('mouseup', (e) => {
    if (isDrawingLink) {
        const targetNode = e.target.closest('.orbat-node-wrapper');
        if (targetNode) {
            const targetId = targetNode.getAttribute('data-id');
            // Determine best target side based on relative position
            createNewLink(linkSourceId, linkSourceSide, targetId, 'top'); 
        }
        stopDrawingLink();
    }

    if (isDraggingNode && dragNode) {
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
    document.querySelectorAll('.orbat-node-wrapper').forEach(n => n.style.boxShadow = '');
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= factor;
    scale = Math.min(Math.max(0.1, scale), 3);
    updateTransform();
}, { passive: false });

// 4. Link Functions
window.startDrawingLink = function(e, side) {
    e.stopPropagation();
    isDrawingLink = true;
    const node = e.target.closest('.orbat-node-wrapper');
    linkSourceId = node.getAttribute('data-id');
    linkSourceSide = side;
    
    const p1 = getPointOnSide(linkSourceId, side);
    tempLink.setAttribute('d', `M ${p1.x} ${p1.y} L ${p1.x} ${p1.y}`);
    tempLink.classList.remove('hidden');
};

function stopDrawingLink() {
    isDrawingLink = false;
    linkSourceId = null;
    tempLink.classList.add('hidden');
}

function createNewLink(source, sSide, target, tSide) {
    if (source === target) return;
    const id = `e_${Math.random().toString(36).substr(2, 9)}`;
    
    const newLink = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    newLink.setAttribute('class', 'orbat-link');
    newLink.setAttribute('id', `edge-${id}`);
    newLink.setAttribute('data-source', source);
    newLink.setAttribute('data-target', target);
    newLink.setAttribute('data-from-side', sSide);
    newLink.setAttribute('data-to-side', tSide);
    newLink.setAttribute('fill', 'none');
    newLink.setAttribute('stroke', 'rgba(179, 153, 93, 0.4)');
    newLink.setAttribute('stroke-width', '2');
    newLink.setAttribute('marker-end', 'url(#arrowhead)');
    svgLayer.appendChild(newLink);
    updateLinks();
}

// 5. Admin Controls
window.toggleEditMode = function() {
    const bar = document.getElementById('hq-admin-bar');
    const isActive = bar.classList.toggle('edit-active');
    const btn = document.getElementById('edit-mode-btn');
    
    const adminControls = document.querySelectorAll('.admin-controls');
    const connectionPoints = document.querySelectorAll('.connection-points');
    const editableFields = document.querySelectorAll('.editable-field');

    if (isActive) {
        btn.innerText = 'EXIT_EDIT_MODE';
        btn.classList.add('!bg-red-600/20', '!text-red-500');
        adminControls.forEach(el => el.classList.remove('hidden'));
        connectionPoints.forEach(el => el.classList.remove('hidden'));
        editableFields.forEach(el => el.setAttribute('contenteditable', 'true'));
    } else {
        btn.innerText = 'ENABLE_STRUCTURAL_EDIT';
        btn.classList.remove('!bg-red-600/20', '!text-red-500');
        adminControls.forEach(el => el.classList.add('hidden'));
        connectionPoints.forEach(el => el.classList.add('hidden'));
        editableFields.forEach(el => el.removeAttribute('contenteditable'));
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
    const edgeEls = document.querySelectorAll('.orbat-link');
    
    const nodes = Array.from(nodeEls).map(el => ({
        id: el.getAttribute('data-id'),
        name: el.querySelector('[data-key="name"]').innerText.trim(),
        callsign: el.querySelector('.orbat-node-card span.font-mono')?.innerText.trim() || "",
        icon: el.querySelector('img')?.getAttribute('data-icon-path') || null,
        x: Math.round(parseFloat(el.getAttribute('data-x'))),
        y: Math.round(parseFloat(el.getAttribute('data-y'))),
        width: Math.round(parseFloat(el.getAttribute('data-w'))),
        height: Math.round(parseFloat(el.getAttribute('data-h')))
    }));
    
    const edges = Array.from(edgeEls).map(el => ({
        id: el.id.replace('edge-', ''),
        fromNode: el.getAttribute('data-source'),
        toNode: el.getAttribute('data-target'),
        fromSide: el.getAttribute('data-from-side'),
        toSide: el.getAttribute('data-to-side')
    }));

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' }));
    a.download = 'orbat_v2.json';
    a.click();
};

// 6. Bootstrap
if (localStorage.getItem('uksf_hq_auth') === 'true') {
    document.getElementById('hq-admin-bar').classList.remove('hidden');
}
setTimeout(updateTransform, 100);
