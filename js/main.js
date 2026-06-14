import { showPage } from './navigation.js';
import { initMap } from './map.js';
import { renderPrediksi } from './prediksi.js';
import { renderChecklist } from './checklist.js';
import { renderEvak, filterEvak } from './evakuasi.js';

window.showPage = showPage;
window.filterEvak = filterEvak;

window.addEventListener('DOMContentLoaded', async () => {
  await initMap();
  renderPrediksi();
  renderChecklist();
  renderEvak();
});
