const STORAGE_KEY = 'mantto-lite-pwa-v1';

function todayOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const defaultData = {
  settings: {
    sites: ['Juan Maestro Zona Franca', 'Doggis Espacio Urbano'],
    technicians: ['Carlos Soto', 'María Vera', 'Proveedor externo']
  },
  requests: [
    {
      id: 1001,
      site: 'Juan Maestro Zona Franca',
      asset: 'Freidora 1',
      type: 'Correctiva',
      priority: 'Alta',
      status: 'En progreso',
      assignedTo: 'Carlos Soto',
      scheduledDate: todayOffset(1),
      cost: 45000,
      description: 'Presenta corte intermitente y baja temperatura.',
      checklist: [
        { text: 'Revisar cableado', done: true },
        { text: 'Verificar resistencia', done: false }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 1002,
      site: 'Doggis Espacio Urbano',
      asset: 'Campana extracción',
      type: 'Preventiva',
      priority: 'Media',
      status: 'Abierta',
      assignedTo: 'Proveedor externo',
      scheduledDate: todayOffset(3),
      cost: 80000,
      description: 'Limpieza profunda y revisión de filtros.',
      checklist: [
        { text: 'Limpieza de filtros', done: false },
        { text: 'Registrar evidencia fotográfica', done: false }
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ]
};

function cloneDefault() {
  return JSON.parse(JSON.stringify(defaultData));
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : cloneDefault();
  } catch {
    return cloneDefault();
  }
}

const state = {
  data: loadData(),
  currentView: 'dashboardView',
  editId: null,
  checklistDraft: [],
  filters: { text: '', status: 'all', priority: 'all' },
  deferredPrompt: null
};

const els = {
  views: [...document.querySelectorAll('.view')],
  navButtons: [...document.querySelectorAll('.nav-btn[data-view]')],
  goViewButtons: [...document.querySelectorAll('[data-go-view]')],
  statsGrid: document.getElementById('statsGrid'),
  recentRequests: document.getElementById('recentRequests'),
  prioritySummary: document.getElementById('prioritySummary'),
  requestsCards: document.getElementById('requestsCards'),
  scheduledList: document.getElementById('scheduledList'),
  checklistTemplates: document.getElementById('checklistTemplates'),
  sitesList: document.getElementById('sitesList'),
  techsList: document.getElementById('techsList'),
  siteInput: document.getElementById('siteInput'),
  techInput: document.getElementById('techInput'),
  addSiteBtn: document.getElementById('addSiteBtn'),
  addTechBtn: document.getElementById('addTechBtn'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  priorityFilter: document.getElementById('priorityFilter'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetBtn: document.getElementById('resetBtn'),
  installBtn: document.getElementById('installBtn'),
  quickNewBtn: document.getElementById('quickNewBtn'),
  newRequestBtn: document.getElementById('newRequestBtn'),
  fabBtn: document.getElementById('fabBtn'),
  requestModal: document.getElementById('requestModal'),
  requestForm: document.getElementById('requestForm'),
  modalTitle: document.getElementById('modalTitle'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  siteField: document.getElementById('siteField'),
  assetField: document.getElementById('assetField'),
  typeField: document.getElementById('typeField'),
  priorityField: document.getElementById('priorityField'),
  statusField: document.getElementById('statusField'),
  assignedField: document.getElementById('assignedField'),
  scheduledField: document.getElementById('scheduledField'),
  costField: document.getElementById('costField'),
  descriptionField: document.getElementById('descriptionField'),
  checklistInput: document.getElementById('checklistInput'),
  addChecklistItemBtn: document.getElementById('addChecklistItemBtn'),
  checklistBuilder: document.getElementById('checklistBuilder')
};

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function getFilteredRequests() {
  return [...state.data.requests]
    .filter(r => state.filters.status === 'all' || r.status === state.filters.status)
    .filter(r => state.filters.priority === 'all' || r.priority === state.filters.priority)
    .filter(r => {
      const query = state.filters.text.trim().toLowerCase();
      if (!query) return true;
      return [r.site, r.asset, r.description, r.assignedTo, r.type].join(' ').toLowerCase().includes(query);
    })
    .sort((a, b) => b.id - a.id);
}

function setView(viewId) {
  state.currentView = viewId;
  els.views.forEach(view => view.classList.toggle('active', view.id === viewId));
  els.navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStats() {
  const requests = state.data.requests;
  const active = requests.filter(r => r.status !== 'Cerrada').length;
  const urgent = requests.filter(r => r.priority === 'Alta' && r.status !== 'Cerrada').length;
  const scheduled = requests.filter(r => r.scheduledDate).length;
  const totalCost = requests.reduce((sum, r) => sum + Number(r.cost || 0), 0);
  const cards = [
    ['Activas', active],
    ['Urgentes', urgent],
    ['Agenda', scheduled],
    ['Costo', formatMoney(totalCost)]
  ];
  els.statsGrid.innerHTML = cards.map(([label, value]) => `
    <article class="stat-card">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
    </article>
  `).join('');
}

function renderRecentRequests() {
  const rows = [...state.data.requests].sort((a, b) => b.id - a.id).slice(0, 4);
  els.recentRequests.innerHTML = rows.length ? rows.map(renderMiniRequestCard).join('') : '<p class="muted">No hay solicitudes cargadas.</p>';
}

function renderMiniRequestCard(r) {
  return `
    <div class="list-item">
      <div class="request-card-head">
        <div>
          <h4>#${r.id} · ${r.asset}</h4>
          <p>${r.site}</p>
        </div>
        <span class="badge" data-status="${r.status}">${r.status}</span>
      </div>
      <div class="mini-row" style="margin-top:10px;">
        <span class="badge ${r.priority}">${r.priority}</span>
        <span class="muted">${formatDate(r.scheduledDate)}</span>
      </div>
    </div>
  `;
}

function renderPrioritySummary() {
  const total = Math.max(1, state.data.requests.length);
  const items = ['Alta', 'Media', 'Baja'].map(level => {
    const count = state.data.requests.filter(r => r.priority === level).length;
    return { level, count, pct: Math.round((count / total) * 100) };
  });
  els.prioritySummary.innerHTML = items.map(item => `
    <div class="summary-bar">
      <strong>${item.level} · ${item.count}</strong>
      <div class="progress"><div style="width:${item.pct}%"></div></div>
    </div>
  `).join('');
}

function renderRequestCard(r) {
  const checklist = (r.checklist || []).map(item => `${item.done ? '✅' : '⬜'} ${item.text}`).join('<br>');
  return `
    <article class="list-item">
      <div class="request-card-head">
        <div>
          <h4>#${r.id} · ${r.asset}</h4>
          <p>${r.site} · ${r.type}</p>
        </div>
        <span class="badge" data-status="${r.status}">${r.status}</span>
      </div>
      <div class="mini-row" style="margin-top:10px;">
        <span class="badge ${r.priority}">${r.priority}</span>
        <span class="muted">${r.assignedTo || 'Sin asignar'}</span>
      </div>
      <div class="meta-grid">
        <div class="meta-pill"><strong>Fecha</strong><br>${formatDate(r.scheduledDate)}</div>
        <div class="meta-pill"><strong>Costo</strong><br>${formatMoney(r.cost)}</div>
      </div>
      <p style="margin-top:10px;">${r.description || 'Sin descripción'}</p>
      ${checklist ? `<div class="meta-pill" style="margin-top:10px;"><strong>Checklist</strong><br>${checklist}</div>` : ''}
      <div class="action-row">
        <button class="secondary" onclick="editRequest(${r.id})">Editar</button>
        <button class="danger" onclick="deleteRequest(${r.id})">Eliminar</button>
      </div>
    </article>
  `;
}

function renderRequests() {
  const rows = getFilteredRequests();
  els.requestsCards.innerHTML = rows.length ? rows.map(renderRequestCard).join('') : '<p class="muted">No se encontraron órdenes.</p>';
}

function renderScheduled() {
  const rows = [...state.data.requests].filter(r => r.scheduledDate).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  els.scheduledList.innerHTML = rows.length ? rows.map(r => `
    <div class="list-item">
      <div class="request-card-head">
        <div>
          <h4>${formatDate(r.scheduledDate)} · ${r.asset}</h4>
          <p>${r.site}</p>
        </div>
        <span class="badge ${r.priority}">${r.priority}</span>
      </div>
      <p>${r.assignedTo || 'Sin asignar'} · ${r.status}</p>
    </div>
  `).join('') : '<p class="muted">No hay trabajos programados.</p>';
}

function renderTemplates() {
  const templates = [
    { title: 'Freidoras', items: ['Revisar temperatura', 'Verificar cableado', 'Revisar fuga de aceite'] },
    { title: 'Campanas', items: ['Inspección filtros', 'Limpieza exterior', 'Revisión de ruido'] },
    { title: 'POS / cajas', items: ['Prueba de conexión', 'Estado impresora', 'Validar cierre de turno'] }
  ];
  els.checklistTemplates.innerHTML = templates.map(t => `
    <div class="list-item">
      <h4>${t.title}</h4>
      <p>${t.items.join(' · ')}</p>
    </div>
  `).join('');
}

function renderSettings() {
  els.sitesList.innerHTML = state.data.settings.sites.map(site => `<span class="tag">${site}<button type="button" onclick="removeTag('sites', ${JSON.stringify(site)})">✕</button></span>`).join('');
  els.techsList.innerHTML = state.data.settings.technicians.map(tech => `<span class="tag">${tech}<button type="button" onclick="removeTag('technicians', ${JSON.stringify(tech)})">✕</button></span>`).join('');
  els.siteField.innerHTML = state.data.settings.sites.map(site => `<option>${site}</option>`).join('');
  els.assignedField.innerHTML = `<option value="">Sin asignar</option>` + state.data.settings.technicians.map(tech => `<option>${tech}</option>`).join('');
}

function renderChecklistBuilder() {
  els.checklistBuilder.innerHTML = state.checklistDraft.length ? state.checklistDraft.map((item, index) => `
    <div class="check-item">
      <span>${item.done ? '✅' : '⬜'} ${item.text}</span>
      <button type="button" class="ghost" onclick="removeChecklistItem(${index})">Eliminar</button>
    </div>
  `).join('') : '<p class="muted">Sin items.</p>';
}

function renderAll() {
  renderStats();
  renderRecentRequests();
  renderPrioritySummary();
  renderRequests();
  renderScheduled();
  renderTemplates();
  renderSettings();
  renderChecklistBuilder();
  saveData();
}

function nextId() {
  return Math.max(1000, ...state.data.requests.map(r => r.id)) + 1;
}

function resetForm() {
  state.editId = null;
  state.checklistDraft = [];
  els.requestForm.reset();
  renderSettings();
  renderChecklistBuilder();
}

function openModal(editing = false) {
  els.modalTitle.textContent = editing ? 'Editar orden' : 'Nueva orden';
  els.requestModal.showModal();
}

function closeModal() {
  els.requestModal.close();
  resetForm();
}

function collectFormData() {
  return {
    id: state.editId || nextId(),
    site: els.siteField.value,
    asset: els.assetField.value.trim(),
    type: els.typeField.value,
    priority: els.priorityField.value,
    status: els.statusField.value,
    assignedTo: els.assignedField.value,
    scheduledDate: els.scheduledField.value,
    cost: Number(els.costField.value || 0),
    description: els.descriptionField.value.trim(),
    checklist: state.checklistDraft,
    createdAt: new Date().toISOString()
  };
}

function upsertRequest(payload) {
  const idx = state.data.requests.findIndex(r => r.id === payload.id);
  if (idx >= 0) {
    state.data.requests[idx] = { ...state.data.requests[idx], ...payload };
  } else {
    state.data.requests.unshift(payload);
  }
  renderAll();
}

window.editRequest = function(id) {
  const req = state.data.requests.find(r => r.id === id);
  if (!req) return;
  state.editId = id;
  state.checklistDraft = (req.checklist || []).map(i => ({ ...i }));
  renderSettings();
  els.siteField.value = req.site;
  els.assetField.value = req.asset;
  els.typeField.value = req.type;
  els.priorityField.value = req.priority;
  els.statusField.value = req.status;
  els.assignedField.value = req.assignedTo || '';
  els.scheduledField.value = req.scheduledDate || '';
  els.costField.value = req.cost || '';
  els.descriptionField.value = req.description || '';
  renderChecklistBuilder();
  openModal(true);
};

window.deleteRequest = function(id) {
  if (!confirm('¿Eliminar esta orden?')) return;
  state.data.requests = state.data.requests.filter(r => r.id !== id);
  renderAll();
};

window.removeChecklistItem = function(index) {
  state.checklistDraft.splice(index, 1);
  renderChecklistBuilder();
};

window.removeTag = function(type, value) {
  state.data.settings[type] = state.data.settings[type].filter(item => item !== value);
  renderAll();
};

els.navButtons.forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
els.goViewButtons.forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.goView)));
[els.quickNewBtn, els.newRequestBtn, els.fabBtn].forEach(btn => btn.addEventListener('click', () => {
  resetForm();
  openModal(false);
}));
els.closeModalBtn.addEventListener('click', closeModal);
els.cancelModalBtn.addEventListener('click', closeModal);

els.requestForm.addEventListener('submit', event => {
  event.preventDefault();
  upsertRequest(collectFormData());
  closeModal();
  setView('requestsView');
});

els.addChecklistItemBtn.addEventListener('click', () => {
  const text = els.checklistInput.value.trim();
  if (!text) return;
  state.checklistDraft.push({ text, done: false });
  els.checklistInput.value = '';
  renderChecklistBuilder();
});

els.searchInput.addEventListener('input', e => {
  state.filters.text = e.target.value;
  renderRequests();
});
els.statusFilter.addEventListener('change', e => {
  state.filters.status = e.target.value;
  renderRequests();
});
els.priorityFilter.addEventListener('change', e => {
  state.filters.priority = e.target.value;
  renderRequests();
});

els.addSiteBtn.addEventListener('click', () => {
  const value = els.siteInput.value.trim();
  if (!value || state.data.settings.sites.includes(value)) return;
  state.data.settings.sites.push(value);
  els.siteInput.value = '';
  renderAll();
});

els.addTechBtn.addEventListener('click', () => {
  const value = els.techInput.value.trim();
  if (!value || state.data.settings.technicians.includes(value)) return;
  state.data.settings.technicians.push(value);
  els.techInput.value = '';
  renderAll();
});

els.exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mantto-lite-backup.json';
  a.click();
  URL.revokeObjectURL(url);
});

els.importInput.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed.settings || !parsed.requests) throw new Error('Formato inválido');
    state.data = parsed;
    renderAll();
    alert('Datos importados correctamente.');
  } catch {
    alert('No se pudo importar el archivo.');
  } finally {
    e.target.value = '';
  }
});

els.resetBtn.addEventListener('click', () => {
  if (!confirm('Esto reemplazará los datos actuales por la demo.')) return;
  state.data = cloneDefault();
  renderAll();
});

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.deferredPrompt = e;
  els.installBtn.hidden = false;
});

els.installBtn.addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  els.installBtn.hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}

renderAll();
setView('dashboardView');
