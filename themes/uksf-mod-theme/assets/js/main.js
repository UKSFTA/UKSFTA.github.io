// MOD.UK Official Service Interface Logic

document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme Initialization & Management
  window.toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('moduk_theme', isDark ? 'dark' : 'light');
    console.log(
      '[MODUK_THEME] Setting toggled. Active:',
      isDark ? 'DARK' : 'LIGHT',
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
