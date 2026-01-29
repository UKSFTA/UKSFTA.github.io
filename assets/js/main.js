// UKSF Directorate Gateway - Interface Logic

document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.nav-header');
    
    // 1. Technical Scroll Interaction
    window.addEventListener('scroll', () => {
        if (!header) return;

        if (window.scrollY > 50) {
            // High-Density State
            header.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            header.style.backdropFilter = 'blur(30px)';
            header.style.height = '80px';
            header.classList.add('shadow-2xl');
        } else {
            // Floating State
            header.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            header.style.backdropFilter = 'blur(20px)';
            header.style.height = '100px';
            header.classList.remove('shadow-2xl');
        }
    });

    // 2. Technical Link State Handlers
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // 3. System Console Initialization
    console.log("%c[JSFC_NODE] HANDSHAKE_COMPLETE", "color: #b3995d; font-weight: bold; font-family: monospace;");
});
