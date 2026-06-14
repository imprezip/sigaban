import { checklistData } from './data.js';

const STORAGE_KEY = 'sigaban_checklist';

function loadChecklistState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveChecklistState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function renderChecklist() {
  const cl = document.getElementById('checklist');
  if (!cl) return;

  const savedState = loadChecklistState();
  cl.innerHTML = '';

  checklistData.forEach((item, index) => {
    item.done = !!savedState[index];

    const d = document.createElement('div');
    d.className = 'check-item';
    if (item.done) d.classList.add('done');

    d.innerHTML = `
      <div class="check-box"></div>
      <div>
        <div class="check-label">${item.label}</div>
        <div class="check-note">${item.note}</div>
      </div>
    `;

    d.addEventListener('click', () => {
      item.done = !item.done;
      d.classList.toggle('done', item.done);

      savedState[index] = item.done;
      saveChecklistState(savedState);
    });

    cl.appendChild(d);
  });
}