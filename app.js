const SUPABASE_URL = "https://fckhkuamvuhgsbofncjh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZja2hrdWFtdnVoZ3Nib2ZuY2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTk2OTUsImV4cCI6MjEwMzc3NTY5NX0.FAwiXp4vqfsqPrTTmxtx4oISz-A_bAoJkLVOicajJVY";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

let cleanSince = localStorage.getItem('cleanSince') || Date.now();
let stepsChartInstance = null;
let bpmHealthChartInstance = null;

let allLogs = [];
let allHealth = [];
let allWorkouts = [];

let userProfile = JSON.parse(localStorage.getItem('userProfile')) || {
  name: "Alejandro",
  age: 24,
  height: 178,
  weight: 80.0,
  targetLossKg: 4,
  weeks: 8
};

document.addEventListener('DOMContentLoaded', () => {
  // Manejador de Pestañas
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');

      if (btn.dataset.tab === 'tab-fitness' && stepsChartInstance) setTimeout(() => stepsChartInstance.resize(), 100);
      if (btn.dataset.tab === 'tab-health' && bpmHealthChartInstance) setTimeout(() => bpmHealthChartInstance.resize(), 100);
    });
  });

  setupProfileModal();
  initApp();
});

// Temporizador y Ahorro
function updateTimerAndSavings() {
  const diff = Math.max(0, Date.now() - Number(cleanSince));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const timerEl = document.getElementById('clean-timer');
  if (timerEl) {
    timerEl.innerText = `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }

  const cleanDaysEl = document.getElementById('metric-clean-days');
  if (cleanDaysEl) cleanDaysEl.innerText = `${days} d`;

  const fractionDays = diff / (1000 * 60 * 60 * 24);
  const savedMoney = (fractionDays * 3.50).toFixed(2);
  const moneyEl = document.getElementById('metric-money-saved');
  if (moneyEl) moneyEl.innerText = `${savedMoney} €`;
}
setInterval(updateTimerAndSavings, 1000);
updateTimerAndSavings();

// Carga general de datos
async function loadData() {
  try {
    const [resLogs, resHealth, resWorkouts] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/vape_logs?select=*&order=created_at.desc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/daily_health?select=*&order=created_at.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/workouts?select=*&order=created_at.desc`, { headers })
    ]);

    allLogs = await resLogs.json();
    allHealth = await resHealth.json();
    allWorkouts = await resWorkouts.json();

    const lastRelapse = Array.isArray(allLogs) ? allLogs.find(l => l.type === 'recaida') : null;
    if (lastRelapse) cleanSince = new Date(lastRelapse.created_at).getTime();

    updateDashboardMetrics();
    renderCoachEngine();
    renderStepsChart();
    renderBpmChart();
    renderWorkoutsList();
    renderDiagnostic();
  } catch (err) {
    console.error("Error cargando datos:", err);
  }
}

// Coach Inteligente y Cálculo Calórico Dinámico
function renderCoachEngine() {
  const container = document.getElementById('coach-advice-container');
  const targetCalEl = document.getElementById('daily-target-calories');
  if (!container || !targetCalEl) return;

  // Mifflin-St Jeor
  const bmr = (10 * userProfile.weight) + (6.25 * userProfile.height) - (5 * userProfile.age) + 5;
  const totalDeficitNeeded = userProfile.targetLossKg * 7700;
  const daysTotal = userProfile.weeks * 7;
  const dailyDeficit = Math.round(totalDeficitNeeded / daysTotal);

  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayHealth = Array.isArray(allHealth) ? allHealth.find(h => h.created_at.startsWith(todayDateStr)) : null;
  const todayWorkouts = Array.isArray(allWorkouts) ? allWorkouts.filter(w => w.created_at.startsWith(todayDateStr)) : [];

  const todaySteps = todayHealth && todayHealth.steps ? Number(todayHealth.steps) : 0;
  const stepsBurn = Math.round(todaySteps * 0.04);
  const workoutBurn = todayWorkouts.reduce((acc, w) => acc + (w.active_calories ? Number(w.active_calories) : 250), 0);
  const totalBurn = stepsBurn + (todayWorkouts.length > 0 ? workoutBurn : 0);

  const maintenanceBase = Math.round(bmr * 1.2);
  const finalCalorieTarget = Math.max(1400, maintenanceBase + totalBurn - dailyDeficit);

  targetCalEl.innerText = `${finalCalorieTarget} kcal`;

  let adviceHTML = '';
  if (todayWorkouts.length > 0) {
    adviceHTML = `<p>🔥 <strong>¡Día de alto rendimiento!</strong> Registraste entrenamientos en tu Apple Watch (+${workoutBurn} kcal). Tu margen para comer sube a <strong>${finalCalorieTarget} kcal</strong> para nutrir el músculo sin frenar la pérdida de grasa.</p>`;
  } else if (todaySteps > 8000) {
    adviceHTML = `<p>🚶‍♂️ <strong>Gran actividad de pasos:</strong> Llevas ${todaySteps.toLocaleString()} pasos hoy (+${stepsBurn} kcal quemadas). Tu meta nutricional es de <strong>${finalCalorieTarget} kcal</strong>.</p>`;
  } else {
    adviceHTML = `<p>🎯 <strong>Día de recuperación:</strong> Para cumplir tu meta de bajar <strong>${userProfile.targetLossKg} kg en ${userProfile.weeks} semanas</strong>, consume <strong>${finalCalorieTarget} kcal</strong>. ¡Una caminata ligera te ayudará a sumar pasos!</p>`;
  }

  container.innerHTML = adviceHTML;
}

function updateDashboardMetrics() {
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayHealth = Array.isArray(allHealth) ? allHealth.find(h => h.created_at.startsWith(todayDateStr)) : null;
  const todayWorkouts = Array.isArray(allWorkouts) ? allWorkouts.filter(w => w.created_at.startsWith(todayDateStr)) : [];

  const stepsEl = document.getElementById('metric-today-steps');
  if (stepsEl) stepsEl.innerText = todayHealth && todayHealth.steps ? Number(todayHealth.steps).toLocaleString() : '0';

  const burnEl = document.getElementById('metric-today-burn');
  if (burnEl) {
    const totalWkBurn = todayWorkouts.reduce((acc, w) => acc + (w.active_calories ? Number(w.active_calories) : 250), 0);
    burnEl.innerText = `${totalWkBurn} kcal`;
  }

  const bpmEl = document.getElementById('metric-resting-bpm');
  if (bpmEl && Array.isArray(allHealth) && allHealth.length > 0) {
    bpmEl.innerText = `${allHealth[allHealth.length - 1].resting_bpm || '--'} bpm`;
  }

  const cravings = Array.isArray(allLogs) ? allLogs.filter(l => l.type === 'urgencia') : [];
  const cravingsEl = document.getElementById('metric-cravings-count');
  if (cravingsEl) cravingsEl.innerText = cravings.length;
}

function renderStepsChart() {
  const canvas = document.getElementById('stepsChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  const last7Health = Array.isArray(allHealth) ? allHealth.slice(-7) : [];

  const labels = last7Health.map(h => new Date(h.created_at).toLocaleDateString([], { weekday: 'short', day: 'numeric' }));
  const stepsData = last7Health.map(h => h.steps || 0);

  if (stepsChartInstance) stepsChartInstance.destroy();

  stepsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Hoy'],
      datasets: [{
        label: 'Pasos',
        data: stepsData.length ? stepsData : [0],
        backgroundColor: '#38bdf8',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { grid: { color: '#1f2a44' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderBpmChart() {
  const canvas = document.getElementById('bpmHealthChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  const labels = (allHealth || []).map(h => new Date(h.created_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' }));
  const bpmData = (allHealth || []).map(h => h.resting_bpm);

  if (bpmHealthChartInstance) bpmHealthChartInstance.destroy();

  bpmHealthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['Hoy'],
      datasets: [{
        label: 'BPM Reposo',
        data: bpmData.length ? bpmData : [0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { suggestedMin: 55, suggestedMax: 95, grid: { color: '#1f2a44' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderWorkoutsList() {
  const container = document.getElementById('workouts-list');
  if (!container) return;

  if (!Array.isArray(allWorkouts) || allWorkouts.length === 0) {
    container.innerHTML = '<p class="empty-msg">No hay entrenamientos del reloj registrados todavía.</p>';
    return;
  }

  container.innerHTML = allWorkouts.slice(0, 6).map(w => {
    const date = new Date(w.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    return `
      <div class="reading-pill">
        <div>
          <strong>⚽ ${w.workout_type || 'Entreno Apple Watch'}</strong><br>
          <small style="color: #94a3b8;">${date}</small>
        </div>
        <strong style="color: #38bdf8;">❤️ ${w.avg_bpm ? w.avg_bpm + ' bpm' : 'OK'}</strong>
      </div>
    `;
  }).join('');
}

function renderDiagnostic() {
  const container = document.getElementById('bpm-diagnostic-container');
  if (!container) return;

  if (!Array.isArray(allHealth) || allHealth.length === 0) {
    container.innerHTML = "<p>Esperando lecturas de reposo del Apple Watch...</p>";
    return;
  }

  const latest = allHealth[allHealth.length - 1].resting_bpm;
  let statusHTML = `Último pulso basal: <strong>${latest} BPM</strong>.<br><br>`;

  if (latest < 60) statusHTML += `🟢 <strong>Rango atlético:</strong> Alta eficiencia cardiovascular.`;
  else if (latest <= 75) statusHTML += `🟢 <strong>Rango óptimo:</strong> Tu corazón recupera con normalidad.`;
  else if (latest <= 88) statusHTML += `🟡 <strong>Rango estimulado:</strong> Fatiga o estrés. Prioriza sueño e hidratación.`;
  else statusHTML += `🔴 <strong>Rango elevado:</strong> Tu sistema simpático está activo. Respira hondo y descansa.`;

  container.innerHTML = statusHTML;
}

// Modal de Perfil
function setupProfileModal() {
  const modal = document.getElementById('profile-modal');
  const btnOpen = document.getElementById('btn-open-profile');
  const btnClose = document.getElementById('btn-close-modal');
  const form = document.getElementById('profile-form');

  const inLoss = document.getElementById('prof-target-loss');
  const inWeeks = document.getElementById('prof-weeks');
  const valLoss = document.getElementById('val-target-loss');
  const valWeeks = document.getElementById('val-weeks');
  const preview = document.getElementById('preview-plan');

  function updatePlanPreview() {
    valLoss.innerText = inLoss.value;
    valWeeks.innerText = inWeeks.value;
    const kg = Number(inLoss.value);
    const w = Number(inWeeks.value);
    const weeklyRate = (kg / w).toFixed(2);
    const dailyDeficit = Math.round((kg * 7700) / (w * 7));

    let safety = "🟢 Ritmo sostenible y óptimo";
    if (weeklyRate > 1.0) safety = "🔴 Déficit muy agresivo";
    else if (weeklyRate > 0.7) safety = "🟡 Ritmo rápido";

    preview.innerHTML = `
      <strong>Meta:</strong> Bajar ${kg} kg en ${w} semanas (${weeklyRate} kg/semana).<br>
      <strong>Déficit calórico diario:</strong> -${dailyDeficit} kcal/día.<br>
      <small>${safety}</small>
    `;
  }

  inLoss.addEventListener('input', updatePlanPreview);
  inWeeks.addEventListener('input', updatePlanPreview);

  btnOpen.addEventListener('click', () => {
    document.getElementById('prof-name').value = userProfile.name;
    document.getElementById('prof-age').value = userProfile.age;
    document.getElementById('prof-height').value = userProfile.height;
    document.getElementById('prof-weight').value = userProfile.weight;
    inLoss.value = userProfile.targetLossKg;
    inWeeks.value = userProfile.weeks;
    updatePlanPreview();
    modal.classList.add('open');
  });

  btnClose.addEventListener('click', () => modal.classList.remove('open'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    userProfile = {
      name: document.getElementById('prof-name').value,
      age: Number(document.getElementById('prof-age').value),
      height: Number(document.getElementById('prof-height').value),
      weight: Number(document.getElementById('prof-weight').value),
      targetLossKg: Number(inLoss.value),
      weeks: Number(inWeeks.value)
    };
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    modal.classList.remove('open');
    document.getElementById('user-greeting').innerHTML = `${userProfile.name} <span>Trainer</span>`;
    document.getElementById('user-goal-subtitle').innerText = `Meta: Bajar ${userProfile.targetLossKg} kg en ${userProfile.weeks} semanas`;
    renderCoachEngine();
  });
}

function initApp() {
  const logType = document.getElementById('log-type');
  if (logType) {
    logType.addEventListener('change', (e) => {
      document.getElementById('vape-extra-fields').style.display = e.target.value === 'vapeo' ? 'block' : 'none';
      document.getElementById('form-weight-group').style.display = e.target.value === 'peso' ? 'block' : 'none';
      document.getElementById('form-bpm-group').style.display = e.target.value === 'estado' ? 'block' : 'none';
    });
  }

  const moodInput = document.getElementById('mood');
  if (moodInput) moodInput.addEventListener('input', (e) => document.getElementById('mood-val').innerText = e.target.value);

  const btnCraving = document.getElementById('btn-craving');
  if (btnCraving) {
    btnCraving.addEventListener('click', async () => {
      await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
        method: "POST",
        headers,
        body: JSON.stringify({ type: 'urgencia', note: 'Brote registrado desde app' })
      });
      alert('¡Urgencia registrada! Inhala en 4s y bebe agua.');
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

      if (type === 'peso') {
        const weight = document.getElementById('input-weight').value;
        if (weight) {
          userProfile.weight = Number(weight);
          localStorage.setItem('userProfile', JSON.stringify(userProfile));
          await fetch(`${SUPABASE_URL}/rest/v1/body_metrics`, {
            method: "POST",
            headers,
            body: JSON.stringify({ weight_kg: Number(weight), note: note })
          });
        }
      } else if (type === 'vapeo') {
        cleanSince = Date.now();
        localStorage.setItem('cleanSince', cleanSince);
        await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: 'recaida',
            bpm: bpm ? Number(bpm) : null,
            mood: Number(mood),
            note: `Sesión: ${document.getElementById('trigger').value}. ${note}`
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
      alert('Datos guardados');
      loadData();
    });
  }

  document.getElementById('user-greeting').innerHTML = `${userProfile.name} <span>Trainer</span>`;
  document.getElementById('user-goal-subtitle').innerText = `Meta: Bajar ${userProfile.targetLossKg} kg en ${userProfile.weeks} semanas`;

  loadData();
  setInterval(loadData, 10000);
}