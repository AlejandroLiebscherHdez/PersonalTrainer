const SUPABASE_URL = "https://fckhkuamvuhgsbofncjh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZja2hrdWFtdnVoZ3Nib2ZuY2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTk2OTUsImV4cCI6MjEwMzc3NTY5NX0.FAwiXp4vqfsqPrTTmxtx4oISz-A_bAoJkLVOicajJVY";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

let cleanSince = localStorage.getItem('cleanSince') || Date.now();
let currentFilter = 'all';
let allLogsCache = [];
let allHealthCache = [];

// Manejador de Pestañas
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) {
        target.classList.add('active');
      }
    });
  });

  initApp();
});

// Temporizador
function updateTimer() {
  const diff = Math.max(0, Date.now() - Number(cleanSince));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const timerEl = document.getElementById('clean-timer');
  if (timerEl) {
    timerEl.innerText = `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
}
setInterval(updateTimer, 1000);
updateTimer();

// Carga de datos vía REST
async function loadData() {
  try {
    const [resLogs, resHealth] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/vape_logs?select=*&order=created_at.desc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/daily_health?select=*&order=created_at.desc`, { headers })
    ]);

    allLogsCache = await resLogs.json();
    allHealthCache = await resHealth.json();

    const lastRelapse = Array.isArray(allLogsCache) ? allLogsCache.find(l => l.type === 'recaida') : null;
    if (lastRelapse) {
      cleanSince = new Date(lastRelapse.created_at).getTime();
    }

    updateDashboard();
    renderDiagnostic();
    renderHealthPills();
    renderHistory();
  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}

function updateDashboard() {
  if (Array.isArray(allLogsCache)) {
    const cravings = allLogsCache.filter(l => l.type === 'urgencia');
    const cravingsEl = document.getElementById('metric-cravings-count');
    if (cravingsEl) cravingsEl.innerText = cravings.length;
  }

  if (Array.isArray(allHealthCache) && allHealthCache.length > 0) {
    const lastHealth = allHealthCache[0];
    const lastBpmEl = document.getElementById('metric-last-bpm');
    if (lastBpmEl) lastBpmEl.innerText = `${lastHealth.resting_bpm || '--'} bpm`;
  }
}

function renderDiagnostic() {
  const container = document.getElementById('bpm-diagnostic');
  if (!container) return;

  if (!Array.isArray(allHealthCache) || allHealthCache.length === 0) {
    container.innerHTML = "<p>Esperando lecturas de reposo del Apple Watch...</p>";
    return;
  }

  const latest = allHealthCache[0].resting_bpm;
  let statusHTML = `Tu última lectura de reposo es de <strong>${latest} BPM</strong>.<br><br>`;

  if (latest < 60) {
    statusHTML += `🟢 <strong>Rango atlético / reposo profundo:</strong> Tu corazón muestra una excelente recuperación.`;
  } else if (latest <= 75) {
    statusHTML += `🟢 <strong>Rango óptimo:</strong> Ritmo cardiovascular saludable.`;
  } else if (latest <= 88) {
    statusHTML += `🟡 <strong>Rango moderado / estimulado:</strong> Típico de estrés o consumo de nicotina. Al mantenerte limpio bajará progresivamente.`;
  } else {
    statusHTML += `🔴 <strong>Rango elevado:</strong> Tu sistema simpático está acelerado. Respira hondo e hidrátate.`;
  }

  container.innerHTML = statusHTML;
}

function renderHealthPills() {
  const container = document.getElementById('health-readings-list');
  if (!container || !Array.isArray(allHealthCache)) return;

  if (allHealthCache.length === 0) {
    container.innerHTML = '<p class="empty-msg">Sin datos recientes.</p>';
    return;
  }

  container.innerHTML = allHealthCache.slice(0, 7).map(h => {
    const date = new Date(h.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `<div class="reading-pill">
      <span>⌚ ${date}</span>
      <strong style="color: #38bdf8;">❤️ ${h.resting_bpm} bpm</strong>
    </div>`;
  }).join('');
}

function renderHistory() {
  const list = document.getElementById('full-history-list');
  if (!list) return;
  list.innerHTML = '';

  const logs = Array.isArray(allLogsCache) ? allLogsCache.map(l => ({ ...l, source: 'log' })) : [];
  const health = Array.isArray(allHealthCache) ? allHealthCache.map(h => ({
    type: 'daily',
    bpm: h.resting_bpm,
    created_at: h.created_at,
    source: 'health'
  })) : [];

  let combined = [...logs, ...health].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (currentFilter !== 'all') {
    combined = combined.filter(item => item.type === currentFilter);
  }

  combined.slice(0, 30).forEach(item => {
    const li = document.createElement('li');
    li.className = `history-item ${item.type === 'urgencia' ? 'craving' : ''}`;
    const date = new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

    if (item.type === 'daily') {
      li.innerHTML = `<strong>⌚ Apple Watch (Reposo)</strong> | ❤️ ${item.bpm} bpm - ${date}`;
    } else if (item.type === 'urgencia') {
      li.innerHTML = `<strong>⚡ Urgencia Registrada</strong> ${item.bpm ? `| ❤️ ${item.bpm} bpm` : ''} - ${date}<br><small>${item.note || ''}</small>`;
    } else if (item.type === 'recaida') {
      li.innerHTML = `<strong>🔄 Recaída / Reinicio</strong> - ${date} (${item.note || ''})`;
    } else {
      li.innerHTML = `<strong>Ánimo: ${item.mood || '--'}/10</strong> ${item.bpm ? `| ❤️ ${item.bpm} bpm` : ''} - ${date}<br><small>${item.note || 'Sin notas'}</small>`;
    }
    list.appendChild(li);
  });
}

function initApp() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderHistory();
    });
  });

  const logType = document.getElementById('log-type');
  if (logType) {
    logType.addEventListener('change', (e) => {
      const extra = document.getElementById('vape-extra-fields');
      if (extra) extra.style.display = e.target.value === 'vapeo' ? 'block' : 'none';
    });
  }

  const moodInput = document.getElementById('mood');
  if (moodInput) {
    moodInput.addEventListener('input', (e) => {
      const val = document.getElementById('mood-val');
      if (val) val.innerText = e.target.value;
    });
  }

  const btnCraving = document.getElementById('btn-craving');
  if (btnCraving) {
    btnCraving.addEventListener('click', async () => {
      await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: 'urgencia', note: 'Brote registrado desde botón web' })
      });
      alert('¡Urgencia registrada! Respira hondo 4 segundos.');
      loadData();
    });
  }

  const btnReset = document.getElementById('btn-reset-timer');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (!confirm("¿Confirmar registro de recaída?")) return;
      cleanSince = Date.now();
      localStorage.setItem('cleanSince', cleanSince);
      await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: 'recaida', note: 'Reinicio de contador' })
      });
      loadData();
    });
  }

  const form = document.getElementById('tracker-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = document.getElementById('log-type').value;
      const bpm = document.getElementById('bpm').value;
      const mood = document.getElementById('mood').value;
      const note = document.getElementById('notes').value;

      if (type === 'vapeo') {
        const trigger = document.getElementById('trigger').value;
        const bpmAfter = document.getElementById('bpm-after').value;
        cleanSince = Date.now();
        localStorage.setItem('cleanSince', cleanSince);
        await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: 'recaida',
            bpm: bpm ? Number(bpm) : null,
            mood: Number(mood),
            note: `Sesión: ${trigger} (Pulso post: ${bpmAfter || '--'} bpm). ${note}`
          })
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: 'estado',
            bpm: bpm ? Number(bpm) : null,
            mood: Number(mood),
            note: note
          })
        });
      }

      form.reset();
      const extra = document.getElementById('vape-extra-fields');
      if (extra) extra.style.display = 'none';
      alert('Registro guardado');
      loadData();
    });
  }

  loadData();
  setInterval(loadData, 10000);
}