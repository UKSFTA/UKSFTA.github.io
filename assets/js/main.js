// UKSF Digital Presence - Main Entry Point

document.addEventListener('DOMContentLoaded', () => {
    console.log('UKSF Interface // Initialized');

    // Role Finder Mock Functionality
    const findBtn = document.querySelector('.btn-find');
    const roleInput = document.querySelector('.role-finder input');

    if (findBtn && roleInput) {
        findBtn.addEventListener('click', () => {
            const query = roleInput.value.trim();
            if (query) {
                alert(`Searching for roles related to: "${query}"...\nThis would normally filter the roles database.`);
            } else {
                alert('Please enter a role or interest.');
            }
        });
    }

    // Scroll Effects for Sticky Header
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header-banner');
        if (window.scrollY > 100) {
            header.style.background = 'rgba(255, 255, 255, 1)';
            header.style.padding = '0.8rem 0';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.padding = '1.5rem 0';
        }
    });
});