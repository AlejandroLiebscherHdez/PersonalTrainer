const SUPABASE_URL = "https://fckhkuamvuhgsbofncjh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZja2hrdWFtdnVoZ3Nib2ZuY2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTk2OTUsImV4cCI6MjEwMzc3NTY5NX0.FAwiXp4vqfsqPrTTmxtx4oISz-A_bAoJkLVOicajJVY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    document.getElementById(btn.dataset.tab).classList.add('active');

    if (btn.dataset.tab === 'tab-health' && bpmChartInstance) {
      bpmChartInstance.resize();
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

  document.getElementById('clean-timer').innerText =
    `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}
setInterval(updateTimer, 1000);
updateTimer();

// Cargar y procesar datos
async function loadAppData() {
  const [logsRes, healthRes] = await Promise.all([
    supabase.from('vape_logs').select('*').order('created_at', { ascending: false }),
    supabase.from('daily_health').select('*').order('created_at', { ascending: true })
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
}

function updateDashboardMetrics() {
  const cravings = allLogsCache.filter(l => l.type === 'urgencia');
  document.getElementById('metric-cravings-count').innerText = cravings.length;

  if (allHealthCache.length > 0) {
    const lastHealth = allHealthCache[allHealthCache.length - 1];
    document.getElementById('metric-last-bpm').innerText = `${lastHealth.resting_bpm || '--'} bpm`;
  }
}

// Diagnóstico cardiovascular inteligente
function renderDiagnostic() {
  const container = document.getElementById('bpm-diagnostic');
  if (allHealthCache.length === 0) {
    container.innerHTML = "<p>Aún no hay suficientes lecturas de reposo del Apple Watch para emitir un diagnóstico.</p>";
    return;
  }

  const latest = allHealthCache[allHealthCache.length - 1].resting_bpm;
  let statusHTML = `Tu último pulso en reposo registrado es de <strong>${latest} BPM</strong>. <br><br>`;

  if (latest < 60) {
    statusHTML += `🟢 <strong>Rango bajo / atlético:</strong> Tu corazón tiene una excelente eficiencia de bombeo.`;
  } else if (latest <= 75) {
    statusHTML += `🟢 <strong>Rango óptimo:</strong> Ritmo cardiovascular saludable. A medida que pasan los días sin nicotina, se mantendrá en esta zona.`;
  } else if (latest <= 88) {
    statusHTML += `🟡 <strong>Rango moderado / estimulado:</strong> Típico tras consumo de nicotina o estrés. Al dejar de vapear, lo habitual es ver cómo desciende progresivamente entre 5 y 10 pulsaciones.`;
  } else {
    statusHTML += `🔴 <strong>Rango elevado:</strong> Tu sistema nervioso simpático está activo. Practica respiraciones lentas y mantente hidratado.`;
  }

  container.innerHTML = statusHTML;
}

// Gráfica con Chart.js
function renderChart() {
  const ctx = document.getElementById('bpmChart').getContext('2d');
  const labels = allHealthCache.map(h => new Date(h.created_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' }));
  const data = allHealthCache.map(h => h.resting_bpm);

  if (bpmChartInstance) {
    bpmChartInstance.destroy();
  }

  bpmChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Pulso en Reposo (BPM)',
        data: data,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#38bdf8'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          suggestedMin: 55,
          suggestedMax: 95,
          grid: { color: '#222230' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Historial filtrable
function renderFilteredHistory() {
  const list = document.getElementById('full-history-list');
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
      li.innerHTML = `<strong>⚡ Urgencia Superada</strong> ${item.bpm ? `| ❤️ ${item.bpm} bpm` : ''} - ${date}<br><small>${item.note || ''}</small>`;
    } else if (item.type === 'recaida') {
      li.innerHTML = `<strong>🔄 Reinicio</strong> - ${date}`;
    } else {
      li.innerHTML = `<strong>Ánimo: ${item.mood || '--'}/10</strong> ${item.bpm ? `| ❤️ ${item.bpm} bpm` : ''} - ${date}<br><small>${item.note || 'Sin notas'}</small>`;
    }
    list.appendChild(li);
  });
}

// Filtros de historial
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderFilteredHistory();
  });
});

// Formulario y Botones
document.getElementById('log-type').addEventListener('change', (e) => {
  document.getElementById('vape-extra-fields').style.display = e.target.value === 'vapeo' ? 'block' : 'none';
});
document.getElementById('mood').addEventListener('input', (e) => {
  document.getElementById('mood-val').innerText = e.target.value;
});

document.getElementById('btn-craving').addEventListener('click', async () => {
  await supabase.from('vape_logs').insert([{ type: 'urgencia', note: 'Brote registrado desde botón de inicio' }]);
  alert('¡Urgencia registrada! Respira profundo 4 segundos.');
  loadAppData();
});

document.getElementById('btn-reset-timer').addEventListener('click', async () => {
  if (confirm("¿Confirmar registro de recaída?")) {
    cleanSince = Date.now();
    localStorage.setItem('cleanSince', cleanSince);
    await supabase.from('vape_logs').insert([{ type: 'recaida', note: 'Reinicio' }]);
    loadAppData();
  }
});

document.getElementById('tracker-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('log-type').value;
  const bpm = document.getElementById('bpm').value;
  const mood = document.getElementById('mood').value;
  const note = document.getElementById('notes').value;

  await supabase.from('vape_logs').insert([{
    type: type === 'vapeo' ? 'recaida' : 'estado',
    bpm: bpm ? Number(bpm) : null,
    mood: Number(mood),
    note: type === 'vapeo' ? `Sesión vapeo: ${document.getElementById('trigger').value}. ${note}` : note
  }]);

  document.getElementById('tracker-form').reset();
  alert('Registro guardado');
  loadAppData();
});

// Sincronización Realtime
supabase.channel('public_changes')
  .on('postgres_changes', { event: '*', schema: 'public' }, () => loadAppData())
  .subscribe();

loadAppData();