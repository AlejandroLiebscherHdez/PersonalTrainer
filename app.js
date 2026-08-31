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

const savedProfileRaw = localStorage.getItem('userProfile');
let userProfile = savedProfileRaw ? JSON.parse(savedProfileRaw) : null;

let dailyChecklist = JSON.parse(localStorage.getItem('dailyChecklist_' + new Date().toISOString().split('T')[0])) || {
  water: false,
  creatine: false,
  protein: false,
  steps: false,
  workout: false,
  clean: false,
  sleep: false
};

// Base de datos de rutinas expandida
const ROUTINE_DATABASE = {
  fullbody: [
    { day: "Lunes", focus: "Full Body A (Énfasis Empuje & Cuádriceps)", exercises: [["Sentadilla trasera con barra / Prensa", "4 x 8-10"], ["Press de banca plano", "4 x 8-10"], ["Remo con barra / polea", "4 x 10"], ["Elevaciones laterales con mancuernas", "3 x 12-15"], ["Plancha abdominal", "3 x 45s"]] },
    { day: "Miércoles", focus: "Full Body B (Énfasis Tracción & Isquios)", exercises: [["Peso muerto rumano", "4 x 8-10"], ["Press militar mancuernas / barra", "4 x 8-10"], ["Dominadas / Jalón al pecho", "4 x 8-10"], ["Fondos en paralelas / Flexiones", "3 x 10-12"], ["Curl de bíceps", "3 x 12"]] },
    { day: "Viernes", focus: "Full Body C (Hipertrofia & Glúteos)", exercises: [["Hip Thrust con barra", "4 x 10-12"], ["Sentadilla búlgara", "3 x 10/pierna"], ["Press inclinado mancuernas", "4 x 10"], ["Remo unilateral con mancuerna", "3 x 10"], ["Extensión de tríceps en polea", "3 x 12"]] }
  ],
  ppl: [
    { day: "Día 1", focus: "Push (Pecho, Hombro & Tríceps)", exercises: [["Press banca plano", "4 x 8"], ["Press inclinado con mancuernas", "4 x 10"], ["Press militar de pie", "3 x 8-10"], ["Elevaciones laterales", "4 x 15"], ["Extensión tríceps en polea", "3 x 12"]] },
    { day: "Día 2", focus: "Pull (Espalda, Deltoides Posterior & Bíceps)", exercises: [["Jalón al pecho / Dominadas", "4 x 8-10"], ["Remo en polea baja", "4 x 10"], ["Pájaros para posterior", "3 x 15"], ["Curl bíceps barra Z", "3 x 10"], ["Curl martillo mancuernas", "3 x 12"]] },
    { day: "Día 3", focus: "Legs (Cuádriceps, Isquios & Glúteos)", exercises: [["Sentadilla con barra", "4 x 8"], ["Peso muerto rumano", "4 x 10"], ["Prensa de piernas", "3 x 12"], ["Curl femoral tumbado", "3 x 12"], ["Gemelos de pie", "4 x 15"]] },
    { day: "Día 4", focus: "Push / Pull Hipertrofia", exercises: [["Press con mancuernas", "4 x 10"], ["Remo con barra", "4 x 10"], ["Aperturas en polea", "3 x 12"], ["Supererie Bíceps + Tríceps", "3 x 12"]] }
  ],
  torso_pierna: [
    { day: "Lunes", focus: "Torso Fuerza", exercises: [["Press banca plano", "4 x 6-8"], ["Remo con barra", "4 x 6-8"], ["Press militar", "3 x 8"], ["Jalón al pecho", "3 x 10"]] },
    { day: "Martes", focus: "Pierna Fuerza", exercises: [["Sentadilla", "4 x 6-8"], ["Peso muerto rumano", "4 x 8"], ["Prensa", "3 x 10"], ["Gemelos", "4 x 12"]] },
    { day: "Jueves", focus: "Torso Hipertrofia", exercises: [["Press inclinado mancuernas", "4 x 10-12"], ["Remo polea baja", "4 x 10-12"], ["Elevaciones laterales", "4 x 15"], ["Bíceps / Tríceps", "3 x 12"]] },
    { day: "Viernes", focus: "Pierna Hipertrofia & Core", exercises: [["Sentadilla búlgara", "3 x 10/pierna"], ["Hip Thrust", "4 x 10-12"], ["Curl femoral", "4 x 12"], ["Abdominales en polea", "4 x 15"]] }
  ],
  chest_arms: [
    { day: "Lunes", focus: "Pecho Pesado & Bíceps", exercises: [["Press banca plano barra", "4 x 6-8"], ["Press inclinado mancuernas", "4 x 10"], ["Cruces de polea", "3 x 12"], ["Curl bíceps barra recta", "4 x 10"], ["Curl en banco inclinado", "3 x 12"]] },
    { day: "Miércoles", focus: "Hombro & Tríceps", exercises: [["Press militar", "4 x 8"], ["Elevaciones laterales polea", "4 x 15"], ["Fondos entre paralelas", "4 x 10"], ["Press francés barra Z", "3 x 10"], ["Extensión polea cuerda", "3 x 12"]] },
    { day: "Viernes", focus: "Volumen Torso & Brazos", exercises: [["Press declinado / Fondos", "4 x 10"], ["Aperturas mancuernas", "3 x 12"], ["Curl martillo", "4 x 12"], ["Patada de tríceps", "3 x 12"]] }
  ],
  back_shoulders: [
    { day: "Lunes", focus: "Espalda Amplitud (Dorsal)", exercises: [["Dominadas lastradas / neutras", "4 x 6-8"], ["Jalón al pecho agarre cerrado", "4 x 10"], ["Pullover en polea alta", "3 x 12"], ["Face Pulls", "4 x 15"]] },
    { day: "Miércoles", focus: "Hombro 3D & Trapecio", exercises: [["Press con mancuernas sentado", "4 x 8-10"], ["Elevaciones laterales pesadas + drop", "4 x 12-15"], ["Pájaros en máquina", "4 x 15"], ["Encogimientos trapecio", "4 x 12"]] },
    { day: "Viernes", focus: "Espalda Densidad & Lumbar", exercises: [["Remo con barra T", "4 x 8"], ["Remo unilateral mancuerna", "4 x 10"], ["Hiperextensiones lumbares", "3 x 15"], ["Planchas laterales", "3 x 45s"]] }
  ],
  legs_glutes: [
    { day: "Lunes", focus: "Cuádriceps & Aductores", exercises: [["Sentadilla trasera", "4 x 8"], ["Prensa 45 grados", "4 x 10"], ["Zancadas con mancuerna", "3 x 12/pierna"], ["Extensiones cuádriceps", "3 x 15"]] },
    { day: "Miércoles", focus: "Cadena Posterior & Glúteo", exercises: [["Hip Thrust con barra", "4 x 8-10"], ["Peso muerto rumano", "4 x 8-10"], ["Curl femoral tumbado", "4 x 12"], ["Abductores en máquina", "4 x 15"]] },
    { day: "Viernes", focus: "Pierna Completa & Gemelos", exercises: [["Sentadilla búlgara", "3 x 10/pierna"], ["Prensa unilateral", "3 x 12"], ["Elevación gemelos de pie", "4 x 15"], ["Elevación gemelos sentado", "4 x 15"]] }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  // Pestañas
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
  setupHabitConfig();
  setupChecklist();
  setupBreathGuide();
  setupRoutineGenerator();
  initApp();
});

// Onboarding & Modal de Perfil
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

    let safety = "🟢 Ritmo óptimo y sostenible";
    if (weeklyRate > 1.0) safety = "🔴 Déficit agresivo";
    else if (weeklyRate > 0.7) safety = "🟡 Ritmo moderado / rápido";

    preview.innerHTML = `
      <strong>Meta:</strong> Bajar ${kg} kg en ${w} semanas (${weeklyRate} kg/sem).<br>
      <strong>Déficit calórico diario:</strong> -${dailyDeficit} kcal/día.<br>
      <small>${safety}</small>
    `;
  }

  inLoss.addEventListener('input', updatePlanPreview);
  inWeeks.addEventListener('input', updatePlanPreview);

  // Si no hay perfil guardado, forzar apertura al cargar la página
  if (!userProfile) {
    userProfile = {
      name: "Alejandro",
      age: 24,
      height: 178,
      weight: 80.0,
      targetLossKg: 4,
      weeks: 8,
      habitType: "bombo",
      customDailyCost: 1.70,
      workoutFocus: "fullbody",
      workoutDays: 4
    };
    modal.classList.add('open');
    btnClose.style.display = 'none'; // Obligatorio guardar primero
  }

  btnOpen.addEventListener('click', () => {
    document.getElementById('prof-name').value = userProfile.name;
    document.getElementById('prof-age').value = userProfile.age;
    document.getElementById('prof-height').value = userProfile.height;
    document.getElementById('prof-weight').value = userProfile.weight;
    inLoss.value = userProfile.targetLossKg;
    inWeeks.value = userProfile.weeks;
    updatePlanPreview();
    btnClose.style.display = 'block';
    modal.classList.add('open');
  });

  btnClose.addEventListener('click', () => modal.classList.remove('open'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    userProfile = {
      ...userProfile,
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
    renderHeartZones();
  });
}

// Generador de Rutinas
function setupRoutineGenerator() {
  const selectFocus = document.getElementById('workout-focus');
  const selectDays = document.getElementById('workout-days-week');
  const btnGen = document.getElementById('btn-generate-routine');
  const container = document.getElementById('weekly-routine-container');

  if (userProfile.workoutFocus && selectFocus) selectFocus.value = userProfile.workoutFocus;
  if (userProfile.workoutDays && selectDays) selectDays.value = userProfile.workoutDays;

  function renderRoutine() {
    const focus = selectFocus.value;
    const daysCount = Number(selectDays.value);
    let routine = ROUTINE_DATABASE[focus] || ROUTINE_DATABASE.fullbody;

    userProfile.workoutFocus = focus;
    userProfile.workoutDays = daysCount;
    localStorage.setItem('userProfile', JSON.stringify(userProfile));

    // Si pide más días de los que tiene la plantilla base, duplica inteligentemente
    let renderedList = [...routine];
    while (renderedList.length < daysCount) {
      renderedList.push({ day: `Día Extra ${renderedList.length + 1}`, focus: "Cardio LISS / Fútbol / Movilidad", exercises: [["Partido o carrera continua", "45-60 min"], ["Estiramientos completos", "15 min"]] });
    }
    renderedList = renderedList.slice(0, daysCount);

    container.innerHTML = renderedList.map(r => `
      <div class="routine-day-card">
        <div class="routine-day-header">
          <span class="routine-day-name">${r.day}</span>
          <span class="routine-day-focus">${r.focus}</span>
        </div>
        <ul class="exercise-list">
          ${r.exercises.map(ex => `
            <li class="exercise-item">
              <span>${ex[0]}</span>
              <span class="exercise-sets">${ex[1]}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');
  }

  if (btnGen) btnGen.addEventListener('click', renderRoutine);
  renderRoutine();
}

// Zonas Cardíacas
function renderHeartZones() {
  const container = document.getElementById('heart-zones-box');
  if (!container) return;

  const maxHr = 220 - userProfile.age;
  const z2_min = Math.round(maxHr * 0.60);
  const z2_max = Math.round(maxHr * 0.70);
  const z3_max = Math.round(maxHr * 0.80);
  const z4_max = Math.round(maxHr * 0.90);

  container.innerHTML = `
    <div class="zone-row"><span>Zona 1 (Recuperación):</span> <strong>< ${z2_min} bpm</strong></div>
    <div class="zone-row"><span style="color: #10b981;">Zona 2 (Quema Grasa / Base):</span> <strong style="color: #10b981;">${z2_min} - ${z2_max} bpm</strong></div>
    <div class="zone-row"><span>Zona 3 (Aeróbica / Fútbol):</span> <strong>${z2_max + 1} - ${z3_max} bpm</strong></div>
    <div class="zone-row"><span style="color: #f59e0b;">Zona 4 (Umbral Anaeróbico):</span> <strong style="color: #f59e0b;">${z3_max + 1} - ${z4_max} bpm</strong></div>
    <div class="zone-row"><span style="color: #ef4444;">Zona 5 (Máximo Esfuerzo):</span> <strong style="color: #ef4444;">> ${z4_max} bpm</strong></div>
  `;
}

function getDailyCost() {
  switch (userProfile.habitType) {
    case 'bombo': return 1.70;
    case 'disposable': return 4.00;
    case 'tobacco': return 5.50;
    case 'custom': return Number(userProfile.customDailyCost) || 2.00;
    default: return 1.70;
  }
}

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

  const dailyCost = getDailyCost();
  const fractionDays = diff / (1000 * 60 * 60 * 24);
  const savedMoney = (fractionDays * dailyCost).toFixed(2);
  const moneyEl = document.getElementById('metric-money-saved');
  if (moneyEl) moneyEl.innerText = `${savedMoney} €`;

  // Barra de recuperación pulmonar
  const dopPercent = Math.min(100, Math.round(20 + (days * 5)));
  const dopEl = document.getElementById('prog-dop-val');
  const dopBar = document.getElementById('prog-dop-bar');
  if (dopEl && dopBar) {
    dopEl.innerText = `${dopPercent}%`;
    dopBar.style.width = `${dopPercent}%`;
  }
}
setInterval(updateTimerAndSavings, 1000);
updateTimerAndSavings();

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
    renderHeartZones();
  } catch (err) {
    console.error("Error cargando datos:", err);
  }
}

function renderCoachEngine() {
  const container = document.getElementById('coach-advice-container');
  const targetCalEl = document.getElementById('daily-target-calories');
  if (!container || !targetCalEl) return;

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
    adviceHTML = `<p>🔥 <strong>¡Día de alto gasto!</strong> Gasto adicional de +${workoutBurn} kcal. Tu margen sube a <strong>${finalCalorieTarget} kcal</strong> para recuperar glucógeno sin ganar grasa.</p>`;
  } else if (todaySteps > 8000) {
    adviceHTML = `<p>🚶‍♂️ <strong>Gran volumen de pasos:</strong> Llevas ${todaySteps.toLocaleString()} pasos hoy (+${stepsBurn} kcal). Mantente en <strong>${finalCalorieTarget} kcal</strong>.</p>`;
  } else {
    adviceHTML = `<p>🎯 <strong>Día de recuperación:</strong> Para cumplir tu meta de perder <strong>${userProfile.targetLossKg} kg en ${userProfile.weeks} semanas</strong>, consume <strong>${finalCalorieTarget} kcal</strong>.</p>`;
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
    container.innerHTML = '<p class="empty-msg">No hay entrenamientos registrados todavía.</p>';
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

  if (latest < 60) statusHTML += `🟢 <strong>Rango atlético:</strong> Alta eficiencia cardiovascular y tono vagal óptimo.`;
  else if (latest <= 75) statusHTML += `🟢 <strong>Rango óptimo:</strong> Tu corazón recupera adecuadamente.`;
  else if (latest <= 88) statusHTML += `🟡 <strong>Rango estimulado:</strong> Fatiga o estrés simpático. Hidrátate bien y descansa.`;
  else statusHTML += `🔴 <strong>Rango elevado:</strong> Tu sistema simpático está activo. Respira hondo y descansa.`;

  container.innerHTML = statusHTML;
}

function setupHabitConfig() {
  const select = document.getElementById('habit-product-type');
  const customGroup = document.getElementById('custom-cost-group');
  const customInput = document.getElementById('custom-daily-cost');

  if (select) {
    select.value = userProfile.habitType || 'bombo';
    if (customGroup) customGroup.style.display = select.value === 'custom' ? 'block' : 'none';

    select.addEventListener('change', (e) => {
      userProfile.habitType = e.target.value;
      if (customGroup) customGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
    });
  }

  if (customInput) {
    customInput.value = userProfile.customDailyCost || 1.70;
    customInput.addEventListener('input', (e) => {
      userProfile.customDailyCost = Number(e.target.value);
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
    });
  }
}

function setupChecklist() {
  const todayKey = 'dailyChecklist_' + new Date().toISOString().split('T')[0];
  const keys = ['water', 'creatine', 'protein', 'steps', 'workout', 'clean', 'sleep'];

  keys.forEach(k => {
    const el = document.getElementById('chk-' + k);
    if (el) {
      el.checked = !!dailyChecklist[k];
      el.addEventListener('change', () => {
        dailyChecklist[k] = el.checked;
        localStorage.setItem(todayKey, JSON.stringify(dailyChecklist));
      });
    }
  });
}

function setupBreathGuide() {
  const btn = document.getElementById('btn-start-breath');
  const guideBox = document.getElementById('breath-guide-box');
  const statusEl = document.getElementById('breath-status');
  const timerEl = document.getElementById('breath-timer');

  if (!btn || !guideBox) return;

  btn.addEventListener('click', () => {
    guideBox.style.display = 'block';
    btn.style.display = 'none';

    let phase = 'inhale';
    let count = 4;
    statusEl.innerText = "Inhala lentamente por la nariz...";
    statusEl.style.color = "#38bdf8";

    const breathInterval = setInterval(() => {
      timerEl.innerText = count;
      count--;

      if (count < 0) {
        if (phase === 'inhale') {
          phase = 'hold';
          count = 7;
          statusEl.innerText = "Mantén el aire en los pulmones...";
          statusEl.style.color = "#f59e0b";
        } else if (phase === 'hold') {
          phase = 'exhale';
          count = 8;
          statusEl.innerText = "Exhala suavemente por la boca...";
          statusEl.style.color = "#10b981";
        } else {
          phase = 'inhale';
          count = 4;
          statusEl.innerText = "Inhala de nuevo...";
          statusEl.style.color = "#38bdf8";
        }
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(breathInterval);
      guideBox.style.display = 'none';
      btn.style.display = 'block';
      alert('¡Sesión completada!');
    }, 60000);
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
      alert('¡Urgencia registrada! Respira 4 segundos y bebe un vaso de agua.');
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

  if (userProfile) {
    document.getElementById('user-greeting').innerHTML = `${userProfile.name} <span>Trainer</span>`;
    document.getElementById('user-goal-subtitle').innerText = `Meta: Bajar ${userProfile.targetLossKg} kg en ${userProfile.weeks} semanas`;
  }

  loadData();
  setInterval(loadData, 10000);
}