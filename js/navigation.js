export function showPage(n, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const page = document.getElementById('page-' + n);
  if (page) page.classList.add('active');
  if (btn) btn.classList.add('active');

  const indicator = document.getElementById('nav-indicator');
  if (indicator) {
    indicator.style.transform = `translateX(${(n - 1) * 100}%)`;
  }

  document.dispatchEvent(new CustomEvent('pagechange', { detail: { page: n } }));
}