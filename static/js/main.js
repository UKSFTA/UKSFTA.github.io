// UKSF Bespoke Theme Logic

document.addEventListener('DOMContentLoaded', () => {
    console.log('UKSF_INTERFACE_LOADED // VER 4.0');

    const header = document.getElementById('main-header');
    
    // Header Scroll State
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('bg-black/90', 'backdrop-blur-xl', 'py-4', 'border-b', 'border-white/5');
            header.classList.remove('py-8');
        } else {
            header.classList.remove('bg-black/90', 'backdrop-blur-xl', 'py-4', 'border-b', 'border-white/5');
            header.classList.add('py-8');
        }
    });

    // Handle smooth internal scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});
