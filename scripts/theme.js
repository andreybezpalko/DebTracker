// theme.js — перемикач світлої/темної теми

const Theme = (() => {
  const KEY = 'lt_theme';
  const ICONS = { dark: '🌙', light: '☀️' };

  function get() {
    return localStorage.getItem(KEY) || 'dark';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
    localStorage.setItem(KEY, theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? ICONS.light : ICONS.dark;
  }

  function toggle() {
    apply(get() === 'dark' ? 'light' : 'dark');
  }

  function init() {
    apply(get());
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggle);
  }

  return { init, toggle, get };
})();

document.addEventListener('DOMContentLoaded', () => Theme.init());
