// Apply the saved appearance and palette before the page paints. Keep in sync with ThemeProvider.
(() => {
  let preference = 'system';
  let palette = 'transit';
  const themeChoice = false;
  const palettes = [
    'transit',
    'cobalt',
    'forest',
    'berry',
    'harbor',
    'slate',
    'desert',
    'royal',
    'mono',
  ];
  try {
    const saved = localStorage.getItem('laxcommute:theme');
    if (saved === 'light' || saved === 'dark') preference = saved;
    // Theme choice is paused (THEME_CHOICE_ENABLED in ThemeProvider): keep the default.
    const savedPalette = themeChoice && localStorage.getItem('laxcommute:palette');
    if (palettes.includes(savedPalette)) palette = savedPalette;
  } catch {
    // Use the device preference and default palette when storage is unavailable.
  }
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'lax-dark' : 'lax';
  document.documentElement.dataset.palette = palette;
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
