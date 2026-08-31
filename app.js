const SUPABASE_URL = "https://fckhkuamvuhgsbofncjh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZja2hrdWFtdnVoZ3Nib2ZuY2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTk2OTUsImV4cCI6MjEwMzc3NTY5NX0.FAwiXp4vqfsqPrTTmxtx4oISz-A_bAoJkLVOicajJVY";

// Inicializar cliente Supabase de forma segura
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let cleanSince = localStorage.getItem('cleanSince') || Date.now();
let bpmChartInstance = null;
let currentFilter = 'all';
let allLogsCache = [];
let allHealthCache = [];

// Manejador de Pestañas
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    if (target) {
      target.classList.add('active');
    }

    if (btn.dataset.tab === 'tab-health' && bpmChartInstance) {
      setTimeout(() => bpmChartInstance.resize(), 100);
    }
  });
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

// Cargar datos
async function loadAppData() {
  if (!supabaseClient) return;

  try {
    const [logsRes, healthRes] = await Promise.all([
      supabaseClient.from('vape_logs').select('*').order('created_at', { ascending: false }),
      supabaseClient.from('daily_health').select('*').order('created_at', { ascending: true })
    ]);

    allLogsCache = logsRes.data || [];
    allHealthCache = healthRes.data || [];

    const lastRelapse = allLogsCache.find(l => l.type === 'recaida');
    if (lastRelapse) {
      cleanSince = new Date(lastRelapse.created_at).getTime();
    }

    updateDashboardMetrics();
    renderDiagnostic();
    renderChart();
    renderFilteredHistory();
  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}

function updateDashboardMetrics() {
  const cravings = allLogsCache.filter(l => l.type === 'urgencia');
  const cravingsEl = document.getElementById('metric-cravings-count');
  if (cravingsEl) cravingsEl.innerText = cravings.length;

  if (allHealthCache.length > 0) {
    const lastHealth = allHealthCache[allHealthCache.length - 1];
    const lastBpmEl = document.getElementById('metric-last-bpm');
    if (lastBpmEl) lastBpmEl.innerText = `${lastHealth.resting_bpm || '--'} bpm`;
  }
}

function renderDiagnostic() {
  const container = document.getElementById('bpm-diagnostic');
  if (!container) return;

  if (allHealthCache.length === 0) {
    container.innerHTML = "<p>Aún no hay suficientes lecturas de reposo del Apple Watch registradas.</p>";
    return;
  }

  const latest = allHealthCache[allHealthCache.length - 1].resting_bpm;
  let statusHTML = `Tu último pulso en reposo registrado es de <strong>${latest} BPM</strong>.<br><br>`;

  if (latest < 60) {
    statusHTML += `🟢 <strong>Rango atlético / reposo profundo:</strong> Tu sistema cardiovascular tiene alta eficiencia.`;
  } else if (latest <= 75) {
    statusHTML += `🟢 <strong>Rango óptimo:</strong> Ritmo saludable en reposo.`;
  } else if (latest <= 88) {
    statusHTML += `🟡 <strong>Rango moderado / estimulado:</strong> Típico tras nicotina o estrés continuado. Al mantener los días sin vapear, tenderá a bajar entre 5 y 10 bpm.`;
  } else {
    statusHTML += `🔴 <strong>Rango elevado:</strong> Tu sistema simpático está activo. Practica respiraciones lentas y buena hidratación.`;
  }

  container.innerHTML = statusHTML;
}

function renderChart() {
  const canvas = document.getElementById('bpmChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  const labels = allHealthCache.map(h => new Date(h.created_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' }));
  const data = allHealthCache.map(h => h.resting_bpm);

  if (bpmChartInstance) {
    bpmChartInstance.destroy();
  }

  bpmChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['Hoy'],
      datasets: [{
        label: 'BPM Reposo',
        data: data.length ? data : [0],
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#38bdf8',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          suggestedMin: 55,
          suggestedMax: 95,
          grid: { color: '#21262d' },
          ticks: { color: '#8b949e' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#8b949e' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderFilteredHistory() {
  const list = document.getElementById('full-history-list');
  if (!list) return;
  list.innerHTML = '';

  let combined = [
    ...allLogsCache.map(l => ({ ...l, source: 'log' })),
    ...allHealthCache.map(h => ({
      type: 'daily',
      bpm: h.resting_bpm,
      created_at: h.created_at,
      source: 'health'
    }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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

// Filtros
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderFilteredHistory();
  });
});

// Eventos de formulario
const logTypeSelect = document.getElementById('log-type');
if (logTypeSelect) {
  logTypeSelect.addEventListener('change', (e) => {
    const extra = document.getElementById('vape-extra-fields');
    if (extra) extra.style.display = e.target.value === 'vapeo' ? 'block' : 'none';
  });
}

const moodInput = document.getElementById('mood');
if (moodInput) {
  moodInput.addEventListener('input', (e) => {
    const span = document.getElementById('mood-val');
    if (span) span.innerText = e.target.value;
  });
}

const btnCraving = document.getElementById('btn-craving');
if (btnCraving) {
  btnCraving.addEventListener('click', async () => {
    if (!supabaseClient) return;
    await supabaseClient.from('vape_logs').insert([{ type: 'urgencia', note: 'Brote registrado desde botón web' }]);
    alert('¡Urgencia registrada! Respira hondo 4 segundos y bebe un vaso de agua.');
    loadAppData();
  });
}

const btnReset = document.getElementById('btn-reset-timer');
if (btnReset) {
  btnReset.addEventListener('click', async () => {
    if (!confirm("¿Confirmar registro de recaída?")) return;
    cleanSince = Date.now();
    localStorage.setItem('cleanSince', cleanSince);
    if (supabaseClient) {
      await supabaseClient.from('vape_logs').insert([{ type: 'recaida', note: 'Reinicio de contador' }]);
    }
    loadAppData();
  });
}

const trackerForm = document.getElementById('tracker-form');
if (trackerForm) {
  trackerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabaseClient) return;

    const type = document.getElementById('log-type').value;
    const bpm = document.getElementById('bpm').value;
    const mood = document.getElementById('mood').value;
    const note = document.getElementById('notes').value;

    if (type === 'vapeo') {
      const trigger = document.getElementById('trigger').value;
      const bpmAfter = document.getElementById('bpm-after').value;
      cleanSince = Date.now();
      localStorage.setItem('cleanSince', cleanSince);
      await supabaseClient.from('vape_logs').insert([{
        type: 'recaida',
        bpm: bpm ? Number(bpm) : null,
        mood: Number(mood),
        note: `Sesión: ${trigger} (Pulso post: ${bpmAfter || '--'} bpm). ${note}`
      }]);
    } else {
      await supabaseClient.from('vape_logs').insert([{
        type: 'estado',
        bpm: bpm ? Number(bpm) : null,
        mood: Number(mood),
        note: note
      }]);
    }

    trackerForm.reset();
    const extra = document.getElementById('vape-extra-fields');
    if (extra) extra.style.display = 'none';
    alert('Registro guardado correctamente.');
    loadAppData();
  });
}

// Escucha en tiempo real
if (supabaseClient) {
  supabaseClient.channel('public_changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => loadAppData())
    .subscribe();
}

loadAppData();