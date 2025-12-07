export function openUrlInNewTab(url: string) {
  try {
    // Use an anchor element to avoid Safari returning null from window.open
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    // As a last resort, navigate current tab (should rarely happen)
    try {
      window.open(url, '_blank');
    } catch {
      // Do nothing — avoid replacing the current tab
    }
  }
}

