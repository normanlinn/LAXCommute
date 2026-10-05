// Apply the saved appearance before the page paints. Keep in sync with ThemeProvider.
(() => {
  let preference = 'system';
  try {
    const saved = localStorage.getItem('laxcommute:theme');
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {
    // Use the device preference when storage is unavailable.
  }
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'lax-dark' : 'lax';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#101c16' : '#f5f7f6');
})();
