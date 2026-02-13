// MOD.UK Official Service Interface Logic

document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme Initialization & Management
  window.toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    
    if (isDark) {
      html.classList.remove('dark');
      html.classList.add('light');
      localStorage.setItem('moduk_theme', 'light');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
      localStorage.setItem('moduk_theme', 'dark');
    }
    
    console.log(
      '[MODUK_THEME] Setting toggled. New State:',
      html.classList.contains('dark') ? 'DARK' : 'LIGHT',
    );
  };

  // 2. Active Navigation State
  const navLinks = document.querySelectorAll('nav a');
  const currentPath = window.location.pathname;

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (
      href === currentPath ||
      (href !== '/' && currentPath.startsWith(href))
    ) {
      link.classList.add('active');
    }
  });

  // 3. System Handshake
  console.log(
    '%c[JSFC_NODE] HANDSHAKE_COMPLETE',
    'color: #532a45; font-weight: bold; font-family: sans-serif;',
  );
});
