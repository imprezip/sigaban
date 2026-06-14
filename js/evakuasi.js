import { dataEvak } from './data.js';

let activeFilter = 'semua';

export function renderEvak() {
  const cont = document.getElementById('evak-list');
  if (!cont) return;

  cont.innerHTML = '';
  dataEvak
    .filter(e => activeFilter === 'semua' || e.tipe === activeFilter)
    .forEach(e => {
      const d = document.createElement('div');
      d.className = 'evak-card';
      d.innerHTML = `
        <div class="evak-name">${e.nama}</div>
        <div class="evak-addr"><i class="fa-solid fa-location-dot"></i> ${e.alamat}</div>
        <div class="evak-tags">${e.fasilitas.map(f => `<span class="evak-tag">${f}</span>`).join('')}</div>
        <div class="evak-dist-row">
          <div class="evak-dist">${e.dist}</div>
          <button class="evak-btn" onclick="window.open('${e.gmaps}','_blank','noopener')">Navigasi</button>
        </div>
      `;
      cont.appendChild(d);
    });
}

export function filterEvak(btn, tipe) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  activeFilter = tipe;
  renderEvak();
}
