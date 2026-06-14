import { datakos, zonaColor } from './data.js';

let prediksiItems = [];
let controlsBound = false;
let currentSort = 'potensi';
let currentOrder = 'asc';
let currentSearch = '';

const filters = {
  desa: 'all'
};

const potensiOrder = { tinggi: 2, sedang: 1, rendah: 0 };

async function loadPrediksiItems() {
  if (prediksiItems.length) return prediksiItems;

  const res = await fetch('./data/desa.geojson');
  if (!res.ok) throw new Error(`Gagal memuat desa.geojson: ${res.status}`);

  const geojson = await res.json();
  const desaMap = new Map(
    (geojson.features || []).map(feature => {
      const p = feature.properties || {};
      return [String(p.nama || '').trim().toLowerCase(), p];
    })
  );

  prediksiItems = datakos.map(k => {
    const p = desaMap.get(String(k.desa || '').trim().toLowerCase()) || {};
    const zona = k.zona || p.zona || 'sedang';

    return {
      ...k,
      zona,
      ancaman: p.ancaman || '-',
      kerentanan: p.kerentanan || '-',
      kapasitas: p.kapasitas || '-',
      luas: p.luas || '-'
    };
  });

  return prediksiItems;
}

function parseHarga(harga) {
  const text = String(harga || '').toLowerCase().replace(/\s/g, '');
  const matchRb = text.match(/([\d.,]+)rb/);
  if (matchRb) {
    const num = matchRb[1].replace(/\./g, '').replace(',', '.');
    return parseFloat(num) * 1000;
  }
  const matchJt = text.match(/([\d.,]+)jt/);
  if (matchJt) {
    const num = matchJt[1].replace(/\./g, '').replace(',', '.');
    return parseFloat(num) * 1000000;
  }
  const angka = text.replace(/[^\d]/g, '');
  return angka ? Number(angka) : 0;
}

function uniqueValues(list) {
  return [...new Set(list.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'id', { sensitivity: 'base' }));
}

function fillSelect(selectEl, label, values) {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="all">${label}</option>` + values.map(v => {
    const value = String(v);
    return `<option value="${value}">${value}</option>`;
  }).join('');
}

function bindFilterOptions() {
  const desaEl = document.getElementById('filter-desa');
  fillSelect(desaEl, 'Semua Desa', uniqueValues(prediksiItems.map(i => i.desa)));
}

function getSortedAndFilteredItems() {
  const query = currentSearch.trim().toLowerCase();

  let items = prediksiItems.filter(item => {
    const matchSearch =
      !query ||
      String(item.nama || '').toLowerCase().includes(query) ||
      String(item.desa || '').toLowerCase().includes(query) ||
      String(item.harga || '').toLowerCase().includes(query) ||
      String(item.zona || '').toLowerCase().includes(query);

    const matchDesa = filters.desa === 'all' || String(item.desa || '').toLowerCase() === filters.desa.toLowerCase();

    return matchSearch && matchDesa;
  });

  items.sort((a, b) => {
    let cmp = 0;

    if (currentSort === 'nama') {
      cmp = String(a.nama).localeCompare(String(b.nama), 'id', { sensitivity: 'base' });
    } else if (currentSort === 'harga') {
      cmp = parseHarga(a.harga) - parseHarga(b.harga);
    } else {
      const zoneDiff = (potensiOrder[a.zona] ?? 99) - (potensiOrder[b.zona] ?? 99);
      if (zoneDiff !== 0) cmp = zoneDiff;
      else cmp = String(a.nama).localeCompare(String(b.nama), 'id', { sensitivity: 'base' });
    }

    return currentOrder === 'desc' ? -cmp : cmp;
  });

  return items;
}

function formatHarga(harga) {
  if (!harga) return '-';
  
  return harga
    .replace(/(\d+)\.000rb/gi, '$1jt')             
    .replace(/(\d+)\.(\d*[1-9])0*rb/gi, '$1,$2jt')
}

function renderPrediksiCards() {
  const desaGrid = document.getElementById('desa-grid');
  if (!desaGrid) return;

  const items = getSortedAndFilteredItems();
  desaGrid.innerHTML = '';

  if (!items.length) {
    desaGrid.innerHTML = `
      <div class="desa-card">
        <div class="desa-nama">Tidak ada hasil</div>
        <div class="desa-luas">Coba ubah filter atau kata kunci.</div>
      </div>
    `;
    return;
  }

  items.forEach(k => {
    const color = zonaColor[k.zona] || zonaColor.sedang;

    const el = document.createElement('div');
    el.className = 'desa-card';
    el.innerHTML = `
      <div class="desa-card-top">
        <div>
          <div class="desa-nama">${k.nama}</div>
          <div class="desa-luas">Desa ${k.desa}</div>
          <div class="desa-luas">Harga: ${formatHarga(k.harga)}</div>
        </div>
        <span class="zona-badge zona-${k.zona}" style="font-size:11px;padding:3px 9px;background:${color}22;border-color:${color};color:${color}">
          ${k.zona.toUpperCase()}
        </span>
      </div>

      <div class="desa-params">
        <span class="desa-param"><i class="fa-solid fa-triangle-exclamation"></i> Ancaman: ${k.ancaman}</span>
        <span class="desa-param"><i class="fa-solid fa-house-crack"></i> Kerentanan: ${k.kerentanan}</span>
        <span class="desa-param"><i class="fa-solid fa-person-shelter"></i> Kapasitas: ${k.kapasitas}</span>
      </div>

      <div style="display:flex; justify-content:flex-end; margin-top:-15px;">
        <button type="button" class="prediksi-map-btn toko-btn">
          <i class="fa-solid fa-location-dot"></i> Tunjukkan di Peta
        </button>
      </div>
    `;

    el.querySelector('.prediksi-map-btn')?.addEventListener('click', () => {
      if (typeof window.showKosOnMap === 'function') {
        window.showKosOnMap(k.nama);
      }
    });

    desaGrid.appendChild(el);
  });
}

function bindPrediksiControls() {
  if (controlsBound) return;
  controlsBound = true;

  const sortEl = document.getElementById('prediksi-sort');
  const searchEl = document.getElementById('prediksi-search');
  const orderAscBtn = document.getElementById('prediksi-order-asc');
  const orderDescBtn = document.getElementById('prediksi-order-desc');

  const filterDesa = document.getElementById('filter-desa');

  const setOrderActive = () => {
    orderAscBtn?.classList.toggle('active', currentOrder === 'asc');
    orderDescBtn?.classList.toggle('active', currentOrder === 'desc');
  };

  sortEl?.addEventListener('change', () => {
    currentSort = sortEl.value || 'potensi';
    renderPrediksiCards();
  });

  searchEl?.addEventListener('input', () => {
    currentSearch = searchEl.value || '';
    renderPrediksiCards();
  });

  filterDesa?.addEventListener('change', () => {
    filters.desa = filterDesa.value || 'all';
    renderPrediksiCards();
  });

  orderAscBtn?.addEventListener('click', () => {
    currentOrder = 'asc';
    setOrderActive();
    renderPrediksiCards();
  });

  orderDescBtn?.addEventListener('click', () => {
    currentOrder = 'desc';
    setOrderActive();
    renderPrediksiCards();
  });

  setOrderActive();
}

export async function renderPrediksi() {
  const desaGrid = document.getElementById('desa-grid');
  if (!desaGrid) return;

  try {
    await loadPrediksiItems();
    bindFilterOptions();
    bindPrediksiControls();

    const sortEl = document.getElementById('prediksi-sort');
    if (sortEl && !sortEl.value) sortEl.value = currentSort;

    const orderAscBtn = document.getElementById('prediksi-order-asc');
    const orderDescBtn = document.getElementById('prediksi-order-desc');
    orderAscBtn?.classList.toggle('active', currentOrder === 'asc');
    orderDescBtn?.classList.toggle('active', currentOrder === 'desc');

    renderPrediksiCards();
  } catch (err) {
    console.error(err);
    desaGrid.innerHTML = `
      <div class="desa-card">
        <div class="desa-nama">Gagal memuat data prediksi</div>
        <div class="desa-luas">Periksa file data/desa.geojson</div>
      </div>
    `;
  }
}