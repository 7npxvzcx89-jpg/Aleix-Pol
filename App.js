// Aleix&Pol MVP PWA

// Nombres visibles
const DISPLAY_NAMES = {
  A: 'Gemma i Santi',
  F: 'Marta i Josep',
  Admin: 'Uri i Maria',
};

const SHORT_NAME = {
  A: 'Gemma i Santi',
  F: 'Marta i Josep',
};

// Estado global
const state = {
  currentUser: null, // 'A' | 'F' | 'Admin'
  currentYear: 2026,
  currentMonth: 0, // 0 = enero
  days: {}, // clave: 'YYYY-MM-DD' -> info día
};

const MOTIVES_PRESET = [
  'Médico',
  'Vacaciones',
  'Otros nietos',
  'Compra / gestiones',
  'Peluquería',
];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// DOM refs
const userSelectView = document.getElementById('user-select-view');
const calendarView = document.getElementById('calendar-view');
const adminPanel = document.getElementById('admin-panel');
const currentUserLabel = document.getElementById('current-user-label');
const monthNameEl = document.getElementById('month-name');
const yearLabelEl = document.getElementById('year-label');
const calendarGrid = document.getElementById('calendar-grid');
const pendingList = document.getElementById('pending-list');
const btnPrevMonth = document.getElementById('btn-prev-month');
const btnNextMonth = document.getElementById('btn-next-month');
const btnBackCalendar = document.getElementById('btn-back-calendar');
const navCalendar = document.getElementById('nav-calendar');
const navAdmin = document.getElementById('nav-admin');

const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalDateLabel = document.getElementById('modal-date-label');
const modalContent = document.getElementById('modal-content');
const modalCancel = document.getElementById('modal-cancel');
const toastEl = document.getElementById('toast');

let currentModalContext = null; // { dateKey, mode: 'motive' | 'admin', dayInfo }

// Utils
function dateKeyFromYMD(y, m, d) {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem('aleixpol-state');
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
    } else {
      state.currentYear = 2026;
      state.currentMonth = 0;
      state.days = {};
    }
  } catch (e) {
    console.error('Error cargando estado', e);
  }
}

function saveState() {
  try {
    localStorage.setItem('aleixpol-state', JSON.stringify(state));
  } catch (e) {
    console.error('Error guardando estado', e);
  }
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// Inicializar días de un mes si no existen
function ensureMonthGenerated(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let ownerToggle = 'A'; // empezar por Gemma i Santi el primer día laborable

  for (let d = 1; d <= last.getDate(); d++) {
    const dt = new Date(year, month, d);
    const weekday = dt.getDay(); // 0=dom, 1=lun,... 6=sab
    if (weekday === 0 || weekday === 6) continue; // saltar fines de semana

    const key = dateKeyFromYMD(year, month, d);
    if (!state.days[key]) {
      state.days[key] = {
        year,
        month,
        day: d,
        assignedTo: ownerToggle, // 'A' o 'F'
        unavailability: {
          A: null,
          F: null,
        },
      };
      ownerToggle = ownerToggle === 'A' ? 'F' : 'A';
    }
  }
}

// Render

function renderViews() {
  if (!state.currentUser) {
    userSelectView.classList.add('active');
    calendarView.classList.remove('active');
    adminPanel.classList.remove('active');
    navCalendar.style.display = 'none';
    navAdmin.style.display = 'none';
    return;
  }

  navCalendar.style.display = 'block';
  navAdmin.style.display = state.currentUser === 'Admin' ? 'block' : 'none';

  if (navCalendar.classList.contains('active')) {
    userSelectView.classList.remove('active');
    calendarView.classList.add('active');
    adminPanel.classList.remove('active');
  } else if (navAdmin.classList.contains('active')) {
    userSelectView.classList.remove('active');
    calendarView.classList.remove('active');
    adminPanel.classList.add('active');
  }
}

function renderHeader() {
  if (!state.currentUser) {
    currentUserLabel.textContent = 'Selecciona usuario';
  } else if (state.currentUser === 'A' || state.currentUser === 'F') {
    currentUserLabel.textContent = 'Conectado: ' + DISPLAY_NAMES[state.currentUser];
  } else {
    currentUserLabel.textContent = 'Conectado: ' + DISPLAY_NAMES.Admin + ' (Admin)';
  }

  monthNameEl.textContent = MONTH_NAMES[state.currentMonth];
  yearLabelEl.textContent = state.currentYear;
}

function renderCalendar() {
  ensureMonthGenerated(state.currentYear, state.currentMonth);

  calendarGrid.innerHTML = '';
  const last = new Date(state.currentYear, state.currentMonth + 1, 0);

  const daysData = [];
  for (let d = 1; d <= last.getDate(); d++) {
    const dt = new Date(state.currentYear, state.currentMonth, d);
    const weekday = dt.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const key = dateKeyFromYMD(state.currentYear, state.currentMonth, d);
    daysData.push({ key, info: state.days[key] });
  }

  daysData.forEach(({ key, info }) => {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.dataset.dateKey = key;

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = info.day;
    cell.appendChild(dayNumber);

    const owner = document.createElement('div');
    owner.className = 'day-owner ' + (info.assignedTo === 'A' ? 'owner-a' : 'owner-f');
    owner.textContent = DISPLAY_NAMES[info.assignedTo]; // nombres completos
    cell.appendChild(owner);

    const statusEl = document.createElement('div');
    statusEl.className = 'day-status';

    const uaA = info.unavailability.A;
    const uaF = info.unavailability.F;

    if ((uaA && uaA.status === 'pending') || (uaF && uaF.status === 'pending')) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-pending';
      badge.textContent = 'Pendiente';
      statusEl.appendChild(badge);
    } else if (uaA && uaA.status === 'approved') {
      statusEl.textContent = DISPLAY_NAMES.A + ': ' + uaA.reason;
    } else if (uaF && uaF.status === 'approved') {
      statusEl.textContent = DISPLAY_NAMES.F + ': ' + uaF.reason;
    }

    cell.appendChild(statusEl);
    cell.addEventListener('click', () => onDayCellClick(key));
    calendarGrid.appendChild(cell);
  });
}

function getPendingItems() {
  const pending = [];
  for (const [key, info] of Object.entries(state.days)) {
    const uaA = info.unavailability.A;
    const uaF = info.unavailability.F;
    if (uaA && uaA.status === 'pending') {
      pending.push({ key, info, who: 'A', ua: uaA });
    }
    if (uaF && uaF.status === 'pending') {
      pending.push({ key, info, who: 'F', ua: uaF });
    }
  }
  pending.sort((a, b) => a.key.localeCompare(b.key));
  return pending;
}

function renderPendingList() {
  pendingList.innerHTML = '';
  const pendings = getPendingItems();
  if (pendings.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No hay días pendientes de validación.';
    pendingList.appendChild(li);
    return;
  }

  pendings.forEach(({ key, info, who, ua }) => {
    const li = document.createElement('li');
    li.className = 'pending-item';
    const dateLabel = formatDateLabel(info);
    const nombre = DISPLAY_NAMES[who];

    li.innerHTML = `
      <strong>${dateLabel}</strong>
      <div>${nombre} — Motivo: ${ua.reason}</div>
      <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn primary" data-action="validate-reorg">Validar y reorganizar</button>
        <button class="btn secondary" data-action="validate-no-reorg">Validar sin reorganizar</button>
        <button class="btn secondary" data-action="manual">Resolver manualmente</button>
      </div>
    `;

    li.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        onAdminAction(key, info, who, ua, btn.dataset.action);
      });
    });

    pendingList.appendChild(li);
  });
}

function formatDateLabel(info) {
  const d = String(info.day).padStart(2, '0');
  const m = String(info.month + 1).padStart(2, '0');
  return `${d}/${m}/${info.year}`;
}

// Handlers

function onDayCellClick(dateKey) {
  if (!state.currentUser) return;

  const dayInfo = state.days[dateKey];
  if (!dayInfo) return;

  if (state.currentUser === 'A' || state.currentUser === 'F') {
    openMotiveModal(dateKey, dayInfo);
  } else if (state.currentUser === 'Admin') {
    openAdminDayModal(dateKey, dayInfo);
  }
}

function openMotiveModal(dateKey, dayInfo) {
  currentModalContext = { dateKey, mode: 'motive', dayInfo };
  modalTitle.textContent = 'Seleccionar motivo';
  modalDateLabel.textContent = formatDateLabel(dayInfo);
  modalContent.innerHTML = '';

  const motivesContainer = document.createElement('div');
  motivesContainer.className = 'motive-buttons';

  MOTIVES_PRESET.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'motive-btn primary';
    btn.textContent = m;
    btn.addEventListener('click', () => selectMotive(dateKey, m));
    motivesContainer.appendChild(btn);
  });

  const customContainer = document.createElement('div');
  customContainer.className = 'custom-input';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Otro motivo...';
  const addBtn = document.createElement('button');
  addBtn.className = 'btn secondary';
  addBtn.textContent = 'Añadir';
  addBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) {
      showToast('Escribe un motivo');
      return;
    }
    selectMotive(dateKey, val);
  });

  customContainer.appendChild(input);
  customContainer.appendChild(addBtn);

  modalContent.appendChild(motivesContainer);
  modalContent.appendChild(customContainer);

  showModal();
}

function openAdminDayModal(dateKey, dayInfo) {
  const uaA = dayInfo.unavailability.A;
  const uaF = dayInfo.unavailability.F;
  const hasPending = (uaA && uaA.status === 'pending') || (uaF && uaF.status === 'pending');

  if (hasPending) {
    navCalendar.classList.remove('active');
    navAdmin.classList.add('active');
    renderViews();
    renderPendingList();
    return;
  } else {
    currentModalContext = { dateKey, mode: 'admin-info', dayInfo };
    modalTitle.textContent = 'Detalle del día';
    modalDateLabel.textContent = formatDateLabel(dayInfo);
    modalContent.innerHTML = '';

    const p = document.createElement('p');
    p.textContent = `Asignado a ${DISPLAY_NAMES[dayInfo.assignedTo]}. No hay solicitudes pendientes.`;
    modalContent.appendChild(p);

    showModal();
  }
}

function selectMotive(dateKey, motive) {
  if (!state.currentUser || (state.currentUser !== 'A' && state.currentUser !== 'F')) return;
  const dayInfo = state.days[dateKey];
  const who = state.currentUser;

  dayInfo.unavailability[who] = {
    status: 'pending',
    reason: motive,
  };

  saveState();
  hideModal();
  renderCalendar();
  showToast('Día marcado como pendiente de validación');
}

function onAdminAction(dateKey, dayInfo, who, ua, action) {
  if (action === 'validate-no-reorg') {
    dayInfo.unavailability[who].status = 'approved';
    saveState();
    renderCalendar();
    renderPendingList();
    showToast('Cambio validado sin reorganizar');
  } else if (action === 'manual') {
    currentModalContext = { dateKey, dayInfo, who };
    modalTitle.textContent = 'Resolver manualmente';
    modalDateLabel.textContent = formatDateLabel(dayInfo);
    modalContent.innerHTML = '';

    const info = document.createElement('p');
    info.textContent = `Actualmente asignado a ${DISPLAY_NAMES[dayInfo.assignedTo]}.`;
    modalContent.appendChild(info);

    const btns = document.createElement('div');
    btns.className = 'motive-buttons';

    ['A', 'F'].forEach(gp => {
      const b = document.createElement('button');
      b.className = 'motive-btn primary';
      b.textContent = `Asignar a ${DISPLAY_NAMES[gp]}`;
      b.addEventListener('click', () => {
        dayInfo.assignedTo = gp;
        dayInfo.unavailability[who].status = 'approved';
        saveState();
        hideModal();
        renderCalendar();
        renderPendingList();
        showToast('Asignación actualizada');
      });
      btns.appendChild(b);
    });

    modalContent.appendChild(btns);
    showModal();
  } else if (action === 'validate-reorg') {
    const other = who === 'A' ? 'F' : 'A';
    const otherUA = dayInfo.unavailability[other];
    if (otherUA && (otherUA.status === 'approved' || otherUA.status === 'pending')) {
      showToast('No se puede reorganizar: conflicto con el otro cuidador');
      return;
    }
    dayInfo.assignedTo = other;
    dayInfo.unavailability[who].status = 'approved';
    saveState();
    renderCalendar();
    renderPendingList();
    showToast(`Día reasignado a ${DISPLAY_NAMES[other]}`);
  }
}

// Modal helpers
function showModal() {
  modalOverlay.classList.remove('hidden');
}

function hideModal() {
  modalOverlay.classList.add('hidden');
  currentModalContext = null;
}

// Event listeners

document.querySelectorAll('[data-user]').forEach(btn => {
  btn.addEventListener('click', () => {
    const user = btn.dataset.user;
    state.currentUser = user;
    if (user === 'Admin') {
      navAdmin.style.display = 'block';
    }
    navCalendar.classList.add('active');
    navAdmin.classList.remove('active');
    renderHeader();
    renderViews();
    renderCalendar();
    renderPendingList();
    saveState();
  });
});

btnPrevMonth.addEventListener('click', () => {
  if (state.currentMonth === 0) {
    state.currentMonth = 11;
    state.currentYear -= 1;
  } else {
    state.currentMonth -= 1;
  }
  renderHeader();
  renderCalendar();
  saveState();
});

btnNextMonth.addEventListener('click', () => {
  if (state.currentMonth === 11) {
    state.currentMonth = 0;
    state.currentYear += 1;
  } else {
    state.currentMonth += 1;
  }
  renderHeader();
  renderCalendar();
  saveState();
});

btnBackCalendar.addEventListener('click', () => {
  navAdmin.classList.remove('active');
  navCalendar.classList.add('active');
  renderViews();
  renderCalendar();
});

navCalendar.addEventListener('click', () => {
  navCalendar.classList.add('active');
  navAdmin.classList.remove('active');
  renderViews();
  renderCalendar();
});

navAdmin.addEventListener('click', () => {
  if (state.currentUser !== 'Admin') return;
  navAdmin.classList.add('active');
  navCalendar.classList.remove('active');
  renderViews();
  renderPendingList();
});

modalCancel.addEventListener('click', hideModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) hideModal();
});

// Init
loadState();
renderHeader();
renderViews();
renderCalendar();
