import { datakos, zonaColor, zonaLabel } from './data.js';

let mapObj = null;

const polygonColor = {
  'hijau': '#38A169',  
  'kuning': '#D69E2E', 
  'merah': '#E53E3E'   
};

const potensiLabel = {
  'hijau': 'Rendah',
  'kuning': 'Sedang',
  'merah': 'Tinggi'
};

async function loadZonaGeoJSON() {
  const response = await fetch('./data/zona.geojson');
  if (!response.ok) {
    throw new Error(`Gagal memuat GeoJSON: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

function bindZonaPopup(feature, layer) {
  const p = feature.properties || {};
  const nama = p.nama || 'Area Tanpa Nama';
  const zona = (p.zona || 'kuning').toLowerCase();
  
  const color = polygonColor[zona] || '#D69E2E';
  const potensiTeks = (potensiLabel[zona] || zona).toUpperCase();

  layer.bindPopup(`
    <div class="popup-nama">Potensi Banjir <span style="color:${color}">${potensiTeks}</span></div>
    <div class="popup-addr">Kec. Jatinangor, Kab. Sumedang</div>
    <div class="popup-row">Tingkat ancaman: <b>${p.ancaman || '-'}</b></div>
    <div class="popup-row">Tingkat kerentanan: <b>${p.kerentanan || '-'}</b></div>
    <div class="popup-row">Tingkat kapasitas: <b>${p.kapasitas || '-'}</b></div>
  `, { className: 'custom-popup', maxWidth: 220 });
}

function formatHarga(harga) {
  if (!harga) return '-';
  
  return harga
    .replace(/(\d+)\.000rb/gi, '$1jt')             
    .replace(/(\d+)\.(\d*[1-9])0*rb/gi, '$1,$2jt')
}

export async function initMap() {
  mapObj = L.map('map', { zoomControl: false, attributionControl: false }).setView([-6.9265, 107.778], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      className: 'dark-map-tiles'
  }).addTo(mapObj);

  try {
    const geojson = await loadZonaGeoJSON();

    L.geoJSON(geojson, {
      style: feature => {
        const zona = (feature.properties?.zona || 'kuning').toLowerCase();
        const color = polygonColor[zona] || '#D69E2E';
        return {
          color,
          weight: 1.5,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: 0.15,
        };
      },
      onEachFeature: (feature, layer) => {
        const zona = (feature.properties?.zona || 'kuning').toLowerCase();
        const color = polygonColor[zona] || '#D69E2E';
        bindZonaPopup(feature, layer);
        layer.on('mouseover', () => layer.setStyle({ weight: 2, opacity: 1, fillOpacity: 0.15 }));
        layer.on('mouseout',  () => layer.setStyle({ weight: 1.5, opacity: 0.9, fillOpacity: 0.1 }));
      }
    }).addTo(mapObj);
  } catch (error) {
    console.error(error);
    const fallback = document.getElementById('map');
    if (fallback) {
      fallback.innerHTML = `
        <div style="padding:16px;color:#E8F0ED;font-family:Plus Jakarta Sans,sans-serif;">
          <b>GeoJSON zona risiko tidak dapat dimuat.</b><br/>
          Pastikan file <code>./data/zona.geojson</code> ada dan formatnya valid.
        </div>
      `;
    }
  }

  const kosMarkers = new Map();

  datakos.forEach(k => {
    const color = zonaColor[k.zona];
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:12px;height:12px;border-radius:50%;
        background:${color};border:2px solid #fff;
        box-shadow:0 0 8px ${color},0 2px 4px rgba(0,0,0,.6);
      "></div>`,
      iconSize: [14,14], iconAnchor: [7,7], popupAnchor: [0,-10]
    });
    
    const marker = L.marker([k.lat, k.lng], { icon })
      .bindPopup(`
        <div class="popup-nama">${k.nama}</div>
        <div class="popup-addr">Desa ${k.desa}</div>
        <div class="popup-row">Potensi banjir: <b style="color:${color}">${zonaLabel[k.zona]}</b></div>
        <div class="popup-row">Harga kos: <b>${formatHarga(k.harga)}</b></div>
        <a class="popup-btn" href="${k.gmaps}" target="_blank" rel="noopener" style="color:var(--accent); border: 1px solid var(--accent); background: none"><i class="fa-solid fa-location-dot"></i> Buka di Google Maps</a>
      `, { className:'custom-popup', maxWidth:220 })
      .addTo(mapObj);

    kosMarkers.set(k.nama, marker);
  });

  L.control.zoom({ position: 'bottomright' }).addTo(mapObj);

  const style = document.createElement('style');
  style.textContent = `
    .leaflet-tooltip-zona {
      background: rgba(11,15,14,0.85);
      border: none;
      box-shadow: none;
      color: #E8F0ED;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 8px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .leaflet-tooltip-zona::before { display: none; }
  `;
  document.head.appendChild(style);

  const kosList = document.getElementById('kos-list');
  if (kosList) {
    kosList.innerHTML = '';
    datakos.forEach(k => {
      const d = document.createElement('div');
      d.className = 'kos-item';
      d.innerHTML = `
        <div>
          <div class="kos-name">${k.nama}</div>
          <div class="kos-detail">${k.desa} · ${formatHarga(k.harga)}</div>
        </div>
        <span class="zona-badge zona-${k.zona}">${k.zona.toUpperCase()}</span>
      `;

      let hoverTimer = null;

      d.addEventListener('mouseover', () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          const page1 = document.getElementById('page-1');
          document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
          document.querySelectorAll('.nav-btn').forEach((b, j) =>
            b.classList.toggle('active', j === 0)
          );

          if (page1) page1.classList.add('active');
          if (mapObj) {
            setTimeout(() => mapObj.invalidateSize(), 100);
          }

          const marker = kosMarkers.get(k.nama);
          if (marker) {
            marker.openPopup();
          }
        }, 1000);
      });

      d.addEventListener('mouseout', () => {
        clearTimeout(hoverTimer);
        const marker = kosMarkers.get(k.nama);
        if (marker) {
          marker.closePopup();
        }
      });


      d.addEventListener('click', () => {
        const page1 = document.getElementById('page-1');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach((b, j) => b.classList.toggle('active', j === 0));
        if (page1) page1.classList.add('active');
        const marker = kosMarkers.get(k.nama);
        mapObj.flyTo([k.lat, k.lng], 16, { duration: 1 });
        if (marker) {
          setTimeout(() => {
            marker.openPopup();
          }, 1000);
        }
      });
      kosList.appendChild(d);
    });
  }

  window.showKosOnMap = function (namaKos) {
    const kos = datakos.find(k => k.nama === namaKos);
    const marker = kosMarkers.get(namaKos);
    if (!kos || !marker || !mapObj) return;
    const navBtn = document.querySelector('.nav-btn');
    if (typeof window.showPage === 'function') {
      window.showPage(1, navBtn);
    } else {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-1')?.classList.add('active');
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        mapObj.invalidateSize(true);
        mapObj.closePopup();
        mapObj.flyTo([kos.lat, kos.lng], 16, {
          duration: 1.2,
          animate: true
        });

        setTimeout(() => {
          marker.openPopup();
        }, 1300);
      }, 200);
    });
  };

  mapObj.locate({
    setView: true, 
    maxZoom: 16,
    timeout: 30000,           
    maximumAge: 60000,        
    enableHighAccuracy: true 
  });

  mapObj.on('locationfound', (e) => {
    const myLocationIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:12px;height:12px;border-radius:50%;
          background:rgb(116, 192, 252);border:2px solid #fff;
          box-shadow:0 0 8px rgb(116, 192, 252,0) 2px 4px rgba(0,0,0,.6);
        "></div>`,
        iconSize: [14,14], iconAnchor: [7,7], popupAnchor: [0,-10]
    });
    L.marker(e.latlng, { icon: myLocationIcon })
      .bindPopup(`
        <div class="popup-nama">Lokasi Saya</div>
      `, { className: 'custom-popup' })
      .addTo(mapObj)
  });

  mapObj.on('locationerror', (e) => {
    alert("Gagal mendeteksi lokasi live: " + e.message);
  });

  document.addEventListener('pagechange', (e) => {
    if (e.detail?.page === 1 && mapObj) setTimeout(() => mapObj.invalidateSize(), 100);
  });

  return mapObj;
}

export function getMap() {
  return mapObj;
}
