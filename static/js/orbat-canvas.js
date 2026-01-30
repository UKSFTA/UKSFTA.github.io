// Institutional ORBAT - Canvas Controller v1.0

const canvas = document.getElementById('orbat-canvas');
const content = document.getElementById('canvas-content');
const zoomDisplay = document.getElementById('zoom-level');

let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let startX, startY;

// 1. Zoom Logic
function updateTransform() {
    content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomDisplay.innerText = `Zoom: ${Math.round(scale * 100)}%`;
}

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const factor = Math.exp(delta * zoomSpeed);
    
    scale *= factor;
    scale = Math.min(Math.max(0.2, scale), 3); // Limit zoom range
    
    updateTransform();
}, { passive: false });

function adjustZoom(amount) {
    scale += amount;
    scale = Math.min(Math.max(0.2, scale), 3);
    updateTransform();
}

function resetCanvas() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
}

// 2. Pan Logic
canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left click
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// Initialize
updateTransform();

// --- HQ ADMINISTRATIVE LOGIC ---

const adminBar = document.getElementById('hq-admin-bar');
let editMode = false;

// 1. Authorization Check
if (localStorage.getItem('uksf_hq_auth') === 'true') {
    adminBar.classList.remove('hidden');
}

// 2. Toggle Edit Mode
window.toggleEditMode = function() {
    editMode = !editMode;
    const btn = document.getElementById('edit-mode-btn');
    const nodes = document.querySelectorAll('.tf-nc');
    const adminControls = document.querySelectorAll('.admin-controls');
    const editableFields = document.querySelectorAll('.editable-field');

    if (editMode) {
        btn.innerText = 'DISABLE_STRUCTURAL_EDIT';
        btn.classList.add('!bg-red-600/20', '!text-red-500', '!border-red-500/40');
        adminControls.forEach(el => el.classList.remove('hidden'));
        editableFields.forEach(el => el.setAttribute('contenteditable', 'true'));
        canvas.classList.remove('cursor-grab');
        canvas.style.cursor = 'default';
    } else {
        btn.innerText = 'ENABLE_STRUCTURAL_EDIT';
        btn.classList.remove('!bg-red-600/20', '!text-red-500', '!border-red-500/40');
        adminControls.forEach(el => el.classList.add('hidden'));
        editableFields.forEach(el => el.removeAttribute('contenteditable'));
        canvas.classList.add('cursor-grab');
    }
};

// 3. Structural Manipulation
window.addOrbatChild = function(btn) {
    const parentNode = btn.closest('.orbat-node-container');
    let ul = parentNode.querySelector('ul');
    
    if (!ul) {
        ul = document.createElement('ul');
        ul.className = 'flex justify-center mt-4';
        parentNode.appendChild(ul);
    }

    const li = document.createElement('li');
    li.className = 'px-4';
    
    // Create a new empty node based on the existing template
    li.innerHTML = `
        <div class="orbat-node-container flex flex-col items-center">
            <div class="tf-nc bracket-box !p-4 group relative min-w-[220px] pointer-events-auto">
                <div class="admin-controls absolute -top-2 -right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    
    ul.appendChild(li);
};

window.removeOrbatNode = function(btn) {
    if (confirm('CAUTION: Remove this unit and all sub-units from the current session?')) {
        const li = btn.closest('li');
        if (li) {
            li.remove();
        }
    }
};

// 4. JSON Serialization & Export
window.exportOrbatJSON = function() {
    const rootNode = document.querySelector('.tf-tree > ul > li > .orbat-node-container');
    
    function serialize(container) {
        const nodeDiv = container.querySelector('.tf-nc');
        const name = nodeDiv.querySelector('[data-key="name"]').innerText.trim();
        const callsign = nodeDiv.querySelector('[data-key="callsign"]')?.innerText.trim() || "";
        const iconImg = nodeDiv.querySelector('img');
        const icon = iconImg ? iconImg.getAttribute('data-icon-path') : null;

        const obj = { name, callsign };
        if (icon) obj.icon = icon;

        const childrenList = container.querySelector('ul');
        if (childrenList) {
            const childItems = childrenList.querySelectorAll(':scope > li > .orbat-node-container');
            if (childItems.length > 0) {
                obj.children = Array.from(childItems).map(child => serialize(child));
            }
        }
        return obj;
    }

    const orbatData = serialize(rootNode);
    const blob = new Blob([JSON.stringify(orbatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orbat_v2.json';
    a.click();
    
    alert('ORBAT data serialized. Download initialized. To persist these changes, overwrite data/orbat_v2.json with this file.');
};
