// Institutional ORBAT - Canvas Controller v2.0 (Workflow Edition)

const canvas = document.getElementById('orbat-canvas');
const content = document.getElementById('canvas-content');
const zoomDisplay = document.getElementById('zoom-level');
const svgLayer = document.getElementById('orbat-connectors');

let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let isDraggingNode = false;
let dragNode = null;
let startX, startY;

// 1. Core Transform Logic
function updateTransform() {
    content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomDisplay.innerText = `Zoom: ${Math.round(scale * 100)}%`;
    updateLinks(); // Redraw lines when zooming/panning
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
            // Get center coordinates relative to the nodes layer
            const sX = parseFloat(sourceEl.style.left);
            const sY = parseFloat(sourceEl.style.top);
            const tX = parseFloat(targetEl.style.left);
            const tY = parseFloat(targetEl.style.top);
            
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
    // Check if clicking a drag handle
    if (e.target.classList.contains('node-drag-handle')) {
        isDraggingNode = true;
        dragNode = e.target.closest('.orbat-node-wrapper');
        startX = e.clientX;
        startY = e.clientY;
        e.stopPropagation();
        return;
    }

    // Default to Panning
    if (e.button === 0) {
        isPanning = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
    }
});

window.addEventListener('mousemove', (e) => {
    if (isDraggingNode && dragNode) {
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;
        
        const currentX = parseFloat(dragNode.getAttribute('data-x')) || 0;
        const currentY = parseFloat(dragNode.getAttribute('data-y')) || 0;
        
        const newX = currentX + dx;
        const newY = currentY + dy;
        
        dragNode.style.left = `calc(2500px + ${newX}px)`;
        dragNode.style.top = `calc(2500px + ${newY}px)`;
        
        dragNode.setAttribute('data-x', newX);
        dragNode.setAttribute('data-y', newY);
        
        startX = e.clientX;
        startY = e.clientY;
        updateLinks();
        return;
    }

    if (isPanning) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    }
});

window.addEventListener('mouseup', () => {
    isPanning = false;
    isDraggingNode = false;
    dragNode = null;
});

// 4. HQ Administrative Logic
const adminBar = document.getElementById('hq-admin-bar');
let editMode = false;

if (localStorage.getItem('uksf_hq_auth') === 'true') {
    adminBar.classList.remove('hidden');
}

window.toggleEditMode = function() {
    editMode = !editMode;
    const btn = document.getElementById('edit-mode-btn');
    const adminControls = document.querySelectorAll('.admin-controls');
    const editableFields = document.querySelectorAll('.editable-field');

    if (editMode) {
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
    const parentNode = btn.closest('.orbat-node-wrapper');
    const parentId = parentNode.getAttribute('data-id');
    const newId = `unit_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get parent position
    const pX = parseFloat(parentNode.getAttribute('data-x'));
    const pY = parseFloat(parentNode.getAttribute('data-y'));
    
    // Create Node Element
    const newNode = document.createElement('div');
    newNode.className = 'orbat-node-wrapper absolute transform -translate-x-1/2 -translate-y-1/2';
    newNode.id = `node-${newId}`;
    newNode.setAttribute('data-id', newId);
    newNode.setAttribute('data-x', pX);
    newNode.setAttribute('data-y', pY + 150); // Drop below parent
    newNode.style.left = `calc(2500px + ${pX}px)`;
    newNode.style.top = `calc(2500px + ${pY + 150}px)`;
    
    // Simple template for new nodes
    newNode.innerHTML = `
        <div class="orbat-node-container flex flex-col items-center">
            <div class="tf-nc bracket-box !p-4 group relative min-w-[220px] pointer-events-auto">
                <div class="admin-controls absolute -top-2 -right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="node-drag-handle w-5 h-5 bg-[var(--primary)] text-black rounded flex items-center justify-center text-xs shadow-xl cursor-move">✥</div>
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
    
    // Create SVG Link
    const newLink = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    newLink.setAttribute('class', 'orbat-link');
    newLink.setAttribute('data-source', parentId);
    newLink.setAttribute('data-target', newId);
    newLink.setAttribute('stroke', 'rgba(179, 153, 93, 0.2)');
    newLink.setAttribute('stroke-width', '1');
    newLink.setAttribute('marker-end', 'url(#arrowhead)');
    svgLayer.appendChild(newLink);
    
    updateLinks();
};

window.removeOrbatNode = function(btn) {
    if (confirm('Decommission this unit? This will remove the node and its connections.')) {
        const node = btn.closest('.orbat-node-wrapper');
        const id = node.getAttribute('data-id');
        
        // Remove links
        document.querySelectorAll(`.orbat-link[data-source="${id}"], .orbat-link[data-target="${id}"]`).forEach(l => l.remove());
        
        // Remove node
        node.remove();
    }
};

window.exportOrbatJSON = function() {
    const nodeEls = document.querySelectorAll('.orbat-node-wrapper');
    const linkEls = document.querySelectorAll('.orbat-link');
    
    const nodes = Array.from(nodeEls).map(el => {
        return {
            id: el.getAttribute('data-id'),
            name: el.querySelector('[data-key="name"]').innerText.trim(),
            callsign: el.querySelector('[data-key="callsign"]')?.innerText.trim() || "",
            icon: el.querySelector('img')?.getAttribute('data-icon-path') || null,
            x: Math.round(parseFloat(el.getAttribute('data-x'))),
            y: Math.round(parseFloat(el.getAttribute('data-y')))
        };
    });
    
    const links = Array.from(linkEls).map(el => ({
        source: el.getAttribute('data-source'),
        target: el.getAttribute('data-target')
    }));

    const exportData = { nodes, links };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orbat_v2.json';
    a.click();
    
    alert('ORBAT export successful. Overwrite data/orbat_v2.json with the downloaded file to persist changes.');
};

// Initialize
setTimeout(updateTransform, 100); // Small delay to ensure styles are ready