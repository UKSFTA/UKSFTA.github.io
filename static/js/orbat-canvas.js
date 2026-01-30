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
