const SUPABASE_URL = "https://fckhkuamvuhgsbofncjh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZja2hrdWFtdnVoZ3Nib2ZuY2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTk2OTUsImV4cCI6MjEwMzc3NTY5NX0.FAwiXp4vqfsqPrTTmxtx4oISz-A_bAoJkLVOicajJVY";

let authSession = JSON.parse(localStorage.getItem('supabase_auth_session')) || null;

function getAuthHeaders() {
  const token = authSession ? authSession.access_token : SUPABASE_KEY;
  return {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}

let cleanSince = localStorage.getItem('cleanSince') || Date.now();
let stepsChartInstance = null;
let bpmHealthChartInstance = null;

let allLogs = [];
let allHealth = [];
let allWorkouts = [];

const savedProfileRaw = localStorage.getItem('userProfile');
let userProfile = savedProfileRaw ? JSON.parse(savedProfileRaw) : null;
let customRoutines = JSON.parse(localStorage.getItem('customUserRoutines')) || null;

let dailyChecklist = JSON.parse(localStorage.getItem('dailyChecklist_' + new Date().toISOString().split('T')[0])) || {
  water: false,
  creatine: false,
  protein: false,
  steps: false,
  workout: false,
  clean: false,
  sleep: false
};

const ACTIVITY_DATABASE = [
  { name: "Pádel (Partido / Clase)", type: "Deporte", kcal: "~450 kcal/h", bpm: "120-160 bpm" },
  { name: "Fútbol 7 / Fútbol 11", type: "Deporte", kcal: "~600 kcal/h", bpm: "135-175 bpm" },
  { name: "Caminata Rápida (LISS)", type: "Cardio", kcal: "~250 kcal/h", bpm: "95-120 bpm" },
  { name: "Baloncesto", type: "Deporte", kcal: "~550 kcal/h", bpm: "130-170 bpm" },
  { name: "Natación", type: "Cardio", kcal: "~500 kcal/h", bpm: "125-160 bpm" },
  { name: "Press de Banca Plano", type: "Pecho", sets: "4 x 8-10" },
  { name: "Press Inclinado con Mancuernas", type: "Pecho Superior", sets: "4 x 10-12" },
  { name: "Aperturas en Polea", type: "Pecho", sets: "3 x 12-15" },
  { name: "Dominadas / Jalón al Pecho", type: "Espalda", sets: "4 x 8-10" },
  { name: "Remo con Barra", type: "Espalda", sets: "4 x 8-10" },
  { name: "Press Militar", type: "Hombro", sets: "4 x 8-10" },
  { name: "Elevaciones Laterales", type: "Hombro Lateral", sets: "4 x 12-15" },
  { name: "Sentadilla Trasera con Barra", type: "Pierna", sets: "4 x 8-10" },
  { name: "Peso Muerto Rumano", type: "Isquios / Glúteos", sets: "4 x 8-10" },
  { name: "Hip Thrust con Barra", type: "Glúteos", sets: "4 x 10-12" },
  { name: "Curl Bíceps Barra Z", type: "Bíceps", sets: "3 x 10-12" },
  { name: "Extensión Tríceps Polea", type: "Tríceps", sets: "4 x 12" },
  { name: "Plancha Abdominal", type: "Core", sets: "3 x 45s" }
];

const ROUTINE_TEMPLATES = {
  fullbody: [
    { day: "Lunes", focus: "Full Body A (Énfasis Empuje)", exercises: [["Sentadilla Trasera / Prensa", "4 x 8-10"], ["Press Banca Plano", "4 x 8-10"], ["Remo con Barra", "4 x 10"], ["Elevaciones Laterales", "3 x 15"], ["Plancha Abdominal", "3 x 45s"]] },
    { day: "Miércoles", focus: "Full Body B (Énfasis Tracción)", exercises: [["Peso Muerto Rumano", "4 x 8-10"], ["Press Militar", "4 x 8-10"], ["Jalón al Pecho / Dominadas", "4 x 8-10"], ["Fondos / Flexiones", "3 x 12"], ["Curl Bíceps", "3 x 12"]] },
    { day: "Viernes", focus: "Full Body C (Hipertrofia & Glúteo)", exercises: [["Hip Thrust con Barra", "4 x 10"], ["Sentadilla Búlgara", "3 x 10/pierna"], ["Press Inclinado", "4 x 10"], ["Remo Mancuerna", "3 x 10"], ["Extensión Tríceps", "3 x 12"]] }
  ],
  ppl: [
    { day: "Día 1", focus: "Push (Pecho, Hombro, Tríceps)", exercises: [["Press Banca Plano", "4 x 8"], ["Press Inclinado Mancuernas", "4 x 10"], ["Press Militar", "3 x 10"], ["Elevaciones Laterales", "4 x 15"], ["Extensión Tríceps Polea", "3 x 12"]] },
    { day: "Día 2", focus: "Pull (Espalda & Bíceps)", exercises: [["Jalón al Pecho / Dominadas", "4 x 8-10"], ["Remo Polea Baja", "4 x 10"], ["Pájaros Posterior", "3 x 15"], ["Curl Bíceps Barra Z", "3 x 10"], ["Curl Martillo", "3 x 12"]] },
    { day: "Día 3", focus: "Legs (Pierna & Glúteos)", exercises: [["Sentadilla con Barra", "4 x 8"], ["Peso Muerto Rumano", "4 x 10"], ["Prensa 45°", "3 x 12"], ["Curl Femoral", "3 x 12"], ["Gemelos de Pie", "4 x 15"]] },
    { day: "Día 4", focus: "Push / Pull Hipertrofia", exercises: [["Press con Mancuernas", "4 x 10"], ["Remo con Barra", "4 x 10"], ["Aperturas Polea", "3 x 12"], ["Bíceps + Tríceps", "3 x 12"]] }
  ],
  torso_pierna: [
    { day: "Lunes", focus: "Torso Fuerza", exercises: [["Press Banca Plano", "4 x 6-8"], ["Remo con Barra", "4 x 6-8"], ["Press Militar", "3 x 8"], ["Jalón al Pecho", "3 x 10"]] },
    { day: "Martes", focus: "Pierna Fuerza", exercises: [["Sentadilla con Barra", "4 x 6-8"], ["Peso Muerto Rumano", "4 x 8"], ["Prensa", "3 x 10"], ["Gemelos", "4 x 12"]] },
    { day: "Jueves", focus: "Torso Hipertrofia", exercises: [["Press Inclinado Mancuernas", "4 x 10-12"], ["Remo Polea", "4 x 10-12"], ["Elevaciones Laterales", "4 x 15"], ["Bíceps / Tríceps", "3 x 12"]] },
    { day: "Viernes", focus: "Pierna Hipertrofia", exercises: [["Sentadilla Búlgara", "3 x 10/pierna"], ["Hip Thrust", "4 x 10-12"], ["Curl Femoral", "4 x 12"], ["Abdomen Polea", "4 x 15"]] }
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
      if (btn.dataset.tab === 'tab-diet') renderDietMeals();
    });
  });

  setupAuthSystem();
  setupProfileModal();
  setupHabitConfig();
  setupChecklist();
  setupRelaxProtocols();
  setupRoutineSystem();
  setupSearchEngine();
  setupDietSection();
  checkWeighReminder();
  initApp();
});

// Autenticación de Supabase (Login, Registro y Multiusuario)
function setupAuthSystem() {
  const modal = document.getElementById('auth-modal');
  const btnOpen = document.getElementById('btn-auth-action');
  const btnClose = document.getElementById('btn-close-auth');
  const btnSignIn = document.getElementById('btn-auth-signin');
  const btnSignUp = document.getElementById('btn-auth-signup');
  const btnLogout = document.getElementById('btn-auth-logout');

  btnOpen.addEventListener('click', () => {
    if (authSession) {
      document.getElementById('auth-modal-title').innerText = `👤 Sesión: ${authSession.user.email}`;
      btnSignIn.style.display = 'none';
      btnSignUp.style.display = 'none';
      btnLogout.style.display = 'block';
    } else {
      document.getElementById('auth-modal-title').innerText = "🔐 Iniciar Sesión / Registro";
      btnSignIn.style.display = 'inline-block';
      btnSignUp.style.display = 'inline-block';
      btnLogout.style.display = 'none';
    }
    modal.classList.add('open');
  });

  btnClose.addEventListener('click', () => modal.classList.remove('open'));

  btnSignIn.addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || !password) return alert('Introduce email y contraseña');

    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.access_token) {
      authSession = data;
      localStorage.setItem('supabase_auth_session', JSON.stringify(authSession));
      modal.classList.remove('open');
      alert('¡Sesión iniciada con éxito!');
      loadData();
    } else {
      alert(`Error al iniciar sesión: ${data.error_description || data.msg || 'Credenciales incorrectas'}`);
    }
  });

  btnSignUp.addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || !password) return alert('Introduce email y contraseña');

    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.id || data.user) {
      alert('¡Cuenta creada correctamente! Ya puedes iniciar sesión con tus datos.');
    } else {
      alert(`Error al registrar: ${data.error_description || data.msg || 'No se pudo crear'}`);
    }
  });

  btnLogout.addEventListener('click', () => {
    authSession = null;
    localStorage.removeItem('supabase_auth_session');
    modal.classList.remove('open');
    alert('Has cerrado sesión.');
    location.reload();
  });
}

// Plan Nutricional y Cálculo de Macros
function setupDietSection() {
  const prefSelect = document.getElementById('diet-preference-select');
  if (prefSelect) {
    prefSelect.addEventListener('change', () => {
      if (userProfile) {
        userProfile.dietPreference = prefSelect.value;
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
      }
      renderDietMeals();
    });
  }
}

function calculateMacros(totalCalories) {
  const weight = userProfile ? userProfile.weight : 80;
  // Proteína: 2.0g por kg
  const proteinGrams = Math.round(weight * 2.0);
  const proteinKcal = proteinGrams * 4;

  // Grasas: 0.9g por kg
  const fatsGrams = Math.round(weight * 0.9);
  const fatsKcal = fatsGrams * 9;

  // Carbohidratos: el resto de calorías
  const remainingKcal = Math.max(0, totalCalories - (proteinKcal + fatsKcal));
  const carbsGrams = Math.round(remainingKcal / 4);

  return { proteinGrams, proteinKcal, fatsGrams, fatsKcal, carbsGrams, carbsKcal: carbsGrams * 4 };
}

function renderDietMeals() {
  const container = document.getElementById('diet-meals-container');
  if (!container || !userProfile) return;

  const targetCalText = document.getElementById('daily-target-calories').innerText;
  const totalCal = parseInt(targetCalText) || 2200;
  const macros = calculateMacros(totalCal);

  document.getElementById('macro-protein').innerText = `${macros.proteinGrams} g`;
  document.getElementById('macro-protein-kcal').innerText = `${macros.proteinKcal} kcal`;
  document.getElementById('macro-carbs').innerText = `${macros.carbsGrams} g`;
  document.getElementById('macro-carbs-kcal').innerText = `${macros.carbsKcal} kcal`;
  document.getElementById('macro-fats').innerText = `${macros.fatsGrams} g`;
  document.getElementById('macro-fats-kcal').innerText = `${macros.fatsKcal} kcal`;

  const mealCal = Math.round(totalCal / 4);
  const pref = userProfile.dietPreference || 'balanceada';

  let menus = [];
  if (pref === 'alta_proteina') {
    menus = [
      { name: "🍳 Desayuno Anabólico", cal: `${mealCal} kcal`, desc: "Tortilla de 3 huevos + 2 claras con jamón de pavo, 60g de avena en leche/bebida vegetal y frutos rojos." },
      { name: "🥩 Almuerzo de Definición", cal: `${mealCal} kcal`, desc: "200g de pechuga de pollo o ternera magra a la plancha, 80g de arroz integral/patata al horno y ensalada verde abundante con aceite de oliva." },
      { name: "⚡ Merienda / Pre-Entreno", cal: `${mealCal} kcal`, desc: "250g de queso fresco batido 0% o yogurt griego con 1 scoop de proteína, 25g de nueces o almendras y un plátano." },
      { name: "🐟 Cena Recuperadora", cal: `${mealCal} kcal`, desc: "200g de lomo de salmón o merluza al horno, verduras salteadas (brócoli/espárragos) y 1 tostada de pan integral." }
    ];
  } else {
    menus = [
      { name: "🥑 Desayuno Energético", cal: `${mealCal} kcal`, desc: "Tostadas integrales con aguacate y huevos poché, bowl de yogurt natural con fruta de temporada y café." },
      { name: "🍗 Almuerzo Equilibrado", cal: `${mealCal} kcal`, desc: "180g de pechuga de pollo o legumbres (lentejas/garbanzos), 100g de arroz basmati y verduras asadas con aceite virgen extra." },
      { name: "🍌 Merienda Activa", cal: `${mealCal} kcal`, desc: "Batido de frutas con yogurt, 30g de frutos secos y sandwich integral de atún o pavo." },
      { name: "🥗 Cena Ligera", cal: `${mealCal} kcal`, desc: "Filete de pescado blanco o revuelto de champiñones con gambas, puré de calabaza o boniato y ensalada." }
    ];
  }

  container.innerHTML = menus.map(m => `
    <div class="meal-card">
      <div class="meal-title">
        <span>${m.name}</span>
        <span style="color: var(--accent-green); font-size: 0.8rem;">~${m.cal}</span>
      </div>
      <p class="meal-desc">${m.desc}</p>
    </div>
  `).join('');
}

// Rutinas: Edición y Eliminación directa
function setupRoutineSystem() {
  const selectFocus = document.getElementById('workout-focus');
  const selectDays = document.getElementById('workout-days-week');
  const btnGen = document.getElementById('btn-generate-routine');

  if (userProfile && userProfile.workoutFocus && selectFocus) selectFocus.value = userProfile.workoutFocus;
  if (userProfile && userProfile.workoutDays && selectDays) selectDays.value = userProfile.workoutDays;

  function generateNewRoutine() {
    const focus = selectFocus.value;
    const daysCount = Number(selectDays.value);
    let base = ROUTINE_TEMPLATES[focus] || ROUTINE_TEMPLATES.fullbody;

    userProfile.workoutFocus = focus;
    userProfile.workoutDays = daysCount;
    localStorage.setItem('userProfile', JSON.stringify(userProfile));

    let list = JSON.parse(JSON.stringify(base));
    while (list.length < daysCount) {
      list.push({ day: `Día ${list.length + 1}`, focus: "Cardio / Pádel / Fútbol", exercises: [["Pádel o Deporte Libre", "60 min"], ["Estiramientos", "10 min"]] });
    }
    customRoutines = list.slice(0, daysCount);
    localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
    renderCurrentRoutine();
  }

  if (!customRoutines) generateNewRoutine();
  else renderCurrentRoutine();

  if (btnGen) btnGen.addEventListener('click', generateNewRoutine);
}

function renderCurrentRoutine() {
  const container = document.getElementById('weekly-routine-container');
  if (!container || !customRoutines) return;

  container.innerHTML = customRoutines.map((r, dIdx) => `
    <div class="routine-day-card">
      <div class="routine-day-header">
        <span class="routine-day-name">${r.day}</span>
        <span class="routine-day-focus">${r.focus}</span>
      </div>
      <ul class="exercise-list">
        ${r.exercises.map((ex, eIdx) => `
          <li class="exercise-item">
            <span>${ex[0]}</span>
            <div>
              <span class="exercise-sets" onclick="editExerciseSets(${dIdx}, ${eIdx})">${ex[1]} ✏️</span>
              <button class="btn-delete-ex" title="Eliminar ejercicio" onclick="deleteExercise(${dIdx}, ${eIdx})">✕</button>
            </div>
          </li>
        `).join('')}
      </ul>
      <button class="btn-add-ex" onclick="addNewExerciseToDay(${dIdx})">+ Añadir ejercicio a ${r.day}</button>
    </div>
  `).join('');
}

window.deleteExercise = function(dayIdx, exIdx) {
  const name = customRoutines[dayIdx].exercises[exIdx][0];
  if (confirm(`¿Eliminar "${name}" del ${customRoutines[dayIdx].day}?`)) {
    customRoutines[dayIdx].exercises.splice(exIdx, 1);
    localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
    renderCurrentRoutine();
  }
};

window.editExerciseSets = function(dayIdx, exIdx) {
  const current = customRoutines[dayIdx].exercises[exIdx];
  const newSets = prompt(`Editar series/repeticiones para "${current[0]}":`, current[1]);
  if (newSets !== null && newSets.trim() !== '') {
    customRoutines[dayIdx].exercises[exIdx][1] = newSets.trim();
    localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
    renderCurrentRoutine();
  }
};

window.addNewExerciseToDay = function(dayIdx) {
  const name = prompt("Nombre del ejercicio o actividad (Ej: Pádel, Curl Martillo, Prensa...):");
  if (!name) return;
  const sets = prompt("Series y repeticiones (Ej: 4 x 12, 60 min, etc.):", "3 x 10");
  customRoutines[dayIdx].exercises.push([name, sets || "3 x 10"]);
  localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
  renderCurrentRoutine();
};

function setupSearchEngine() {
  const input = document.getElementById('activity-search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  input.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (!val) { results.style.display = 'none'; return; }

    const matches = ACTIVITY_DATABASE.filter(a => a.name.toLowerCase().includes(val) || a.type.toLowerCase().includes(val));
    if (matches.length === 0) {
      results.innerHTML = `<div class="search-item"><span>Sin resultados para "${val}"</span></div>`;
    } else {
      results.innerHTML = matches.map(m => `
        <div class="search-item" onclick="selectSearchActivity('${m.name}', '${m.sets || m.kcal}')">
          <div>
            <strong>${m.name}</strong><br>
            <small style="color: #94a3b8;">${m.type}</small>
          </div>
          <span style="color: #38bdf8; font-weight: 600;">${m.sets || m.kcal}</span>
        </div>
      `).join('');
    }
    results.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.style.display = 'none';
    }
  });
}

window.selectSearchActivity = function(name, detail) {
  const dayIdx = prompt(`¿A qué día de tu rutina deseas añadir "${name}"? (Ej: 1 para Día 1, 2 para Día 2, etc.):`, "1");
  if (dayIdx && customRoutines) {
    const idx = parseInt(dayIdx) - 1;
    if (customRoutines[idx]) {
      customRoutines[idx].exercises.push([name, detail || "3 x 10"]);
      localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
      renderCurrentRoutine();
      alert(`¡${name} añadido al ${customRoutines[idx].day}!`);
    }
  }
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('activity-search-input').value = '';
};

function checkWeighReminder() {
  if (!userProfile || userProfile.weighFreq === 'never') return;
  const lastWeigh = localStorage.getItem('lastWeighedDate');
  const now = Date.now();
  let daysLimit = 3;
  if (userProfile.weighFreq === 'daily') daysLimit = 1;
  else if (userProfile.weighFreq === 'weekly') daysLimit = 7;

  if (!lastWeigh || (now - Number(lastWeigh)) > (daysLimit * 24 * 60 * 60 * 1000)) {
    setTimeout(() => {
      const peso = prompt(`🔔 Recordatorio de Pesaje (${userProfile.weighFreq}):\nIntroduce tu peso actual en kg para actualizar tu plan calórico:`, userProfile.weight);
      if (peso && !isNaN(peso)) {
        userProfile.weight = Number(peso);
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        localStorage.setItem('lastWeighedDate', String(Date.now()));
        fetch(`${SUPABASE_URL}/rest/v1/body_metrics`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ weight_kg: Number(peso), note: 'Pesaje recordatorio automático' })
        });
        renderCoachEngine();
      }
    }, 800);
  }
}

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
    else if (weeklyRate > 0.7) safety = "🟡 Ritmo moderado";

    preview.innerHTML = `
      <strong>Meta:</strong> Bajar ${kg} kg en ${w} semanas (${weeklyRate} kg/sem).<br>
      <strong>Déficit calórico diario:</strong> -${dailyDeficit} kcal/día.<br>
      <small>${safety}</small>
    `;
  }

  inLoss.addEventListener('input', updatePlanPreview);
  inWeeks.addEventListener('input', updatePlanPreview);

  if (!userProfile) {
    userProfile = {
      name: "Alejandro",
      age: 24,
      height: 178,
      weight: 80.0,
      targetLossKg: 4,
      weeks: 8,
      weighFreq: "3days",
      habitType: "bombo",
      customDailyCost: 1.70,
      workoutFocus: "fullbody",
      workoutDays: 4,
      dietPreference: "balanceada"
    };
    modal.classList.add('open');
    btnClose.style.display = 'none';
  }

  btnOpen.addEventListener('click', () => {
    document.getElementById('prof-name').value = userProfile.name;
    document.getElementById('prof-age').value = userProfile.age;
    document.getElementById('prof-height').value = userProfile.height;
    document.getElementById('prof-weight').value = userProfile.weight;
    document.getElementById('prof-weigh-freq').value = userProfile.weighFreq || '3days';
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
      weighFreq: document.getElementById('prof-weigh-freq').value,
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

function setupRelaxProtocols() {
  const btn = document.getElementById('btn-start-relax');
  const typeSelect = document.getElementById('relax-routine-type');
  const guideBox = document.getElementById('relax-guide-box');
  const statusEl = document.getElementById('relax-status');
  const timerEl = document.getElementById('relax-timer');

  if (!btn || !guideBox) return;

  btn.addEventListener('click', () => {
    guideBox.style.display = 'block';
    btn.style.display = 'none';
    const type = typeSelect.value;

    if (type === 'breath') {
      let phase = 'inhale';
      let count = 4;
      statusEl.innerText = "Inhala lentamente por la nariz...";
      statusEl.style.color = "#38bdf8";

      const breathInterval = setInterval(() => {
        timerEl.innerText = count;
        count--;
        if (count < 0) {
          if (phase === 'inhale') {
            phase = 'hold'; count = 7;
            statusEl.innerText = "Mantén el aire en los pulmones..."; statusEl.style.color = "#f59e0b";
          } else if (phase === 'hold') {
            phase = 'exhale'; count = 8;
            statusEl.innerText = "Exhala suavemente por la boca..."; statusEl.style.color = "#10b981";
          } else {
            phase = 'inhale'; count = 4;
            statusEl.innerText = "Inhala de nuevo..."; statusEl.style.color = "#38bdf8";
          }
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(breathInterval);
        guideBox.style.display = 'none';
        btn.style.display = 'block';
        alert('¡Sesión 4-7-8 completada!');
      }, 60000);
    } else {
      const neckSteps = [
        "Gira la cabeza lentamente hacia la derecha (15s)",
        "Gira la cabeza lentamente hacia la izquierda (15s)",
        "Inclina la oreja derecha hacia el hombro derecho (15s)",
        "Inclina la oreja izquierda hacia el hombro izquierdo (15s)"
      ];
      let stepIdx = 0;
      let count = 15;
      statusEl.innerText = neckSteps[stepIdx];
      statusEl.style.color = "#38bdf8";

      const neckInterval = setInterval(() => {
        timerEl.innerText = count;
        count--;
        if (count < 0) {
          stepIdx++;
          if (stepIdx < neckSteps.length) {
            count = 15;
            statusEl.innerText = neckSteps[stepIdx];
          }
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(neckInterval);
        guideBox.style.display = 'none';
        btn.style.display = 'block';
        alert('¡Movilidad cervical completada! Tensión liberada.');
      }, 62000);
    }
  });
}

function getDailyCost() {
  switch (userProfile ? userProfile.habitType : 'bombo') {
    case 'bombo': return 1.70;
    case 'disposable': return 4.00;
    case 'tobacco': return 5.50;
    case 'custom': return Number(userProfile.customDailyCost) || 2.00;
    default: return 1.70;
  }
}

// Contador y Reinicio a Cero
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

  const totalHours = diff / (1000 * 60 * 60);
  const oxPct = Math.min(100, Math.round((totalHours / 24) * 100));
  const oxVal = document.getElementById('prog-ox-val');
  const oxBar = document.getElementById('prog-ox-bar');
  if (oxVal && oxBar) { oxVal.innerText = `${oxPct}%`; oxBar.style.width = `${oxPct}%`; }

  const ciliaPct = Math.min(100, Math.round((days / 30) * 100));
  const ciliaVal = document.getElementById('prog-cilia-val');
  const ciliaBar = document.getElementById('prog-cilia-bar');
  if (ciliaVal && ciliaBar) { ciliaVal.innerText = `${ciliaPct}%`; ciliaBar.style.width = `${ciliaPct}%`; }

  const dopPct = Math.min(100, Math.round((days / 90) * 100));
  const dopVal = document.getElementById('prog-dop-val');
  const dopBar = document.getElementById('prog-dop-bar');
  if (dopVal && dopBar) { dopVal.innerText = `${dopPct}%`; dopBar.style.width = `${dopPct}%`; }
}
setInterval(updateTimerAndSavings, 1000);
updateTimerAndSavings();

async function loadData() {
  try {
    const [resLogs, resHealth, resWorkouts] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/vape_logs?select=*&order=created_at.desc`, { headers: getAuthHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/daily_health?select=*&order=created_at.asc`, { headers: getAuthHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/workouts?select=*&order=created_at.desc`, { headers: getAuthHeaders() })
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
  if (!container || !targetCalEl || !userProfile) return;

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
      datasets: [{ label: 'Pasos', data: stepsData.length ? stepsData : [0], backgroundColor: '#38bdf8', borderRadius: 8 }]
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
      datasets: [{ label: 'BPM Reposo', data: bpmData.length ? bpmData : [0], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', fill: true, tension: 0.35 }]
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
          <strong>🏃 ${w.workout_type || 'Sesión Apple Watch'}</strong><br>
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

function renderHeartZones() {
  const container = document.getElementById('heart-zones-box');
  if (!container) return;

  const maxHr = 220 - (userProfile ? userProfile.age : 24);
  const z2_min = Math.round(maxHr * 0.60);
  const z2_max = Math.round(maxHr * 0.70);
  const z3_max = Math.round(maxHr * 0.80);
  const z4_max = Math.round(maxHr * 0.90);

  container.innerHTML = `
    <div class="zone-row"><span>Zona 1 (Recuperación):</span> <strong>< ${z2_min} bpm</strong></div>
    <div class="zone-row"><span style="color: #10b981;">Zona 2 (Quema Grasa / Base):</span> <strong style="color: #10b981;">${z2_min} - ${z2_max} bpm</strong></div>
    <div class="zone-row"><span>Zona 3 (Aeróbica / Deporte):</span> <strong>${z2_max + 1} - ${z3_max} bpm</strong></div>
    <div class="zone-row"><span style="color: #f59e0b;">Zona 4 (Umbral Anaeróbico):</span> <strong style="color: #f59e0b;">${z3_max + 1} - ${z4_max} bpm</strong></div>
    <div class="zone-row"><span style="color: #ef4444;">Zona 5 (Máximo Esfuerzo):</span> <strong style="color: #ef4444;">> ${z4_max} bpm</strong></div>
  `;
}

function setupHabitConfig() {
  const select = document.getElementById('habit-product-type');
  const customGroup = document.getElementById('custom-cost-group');
  const customInput = document.getElementById('custom-daily-cost');

  if (select) {
    select.value = userProfile ? (userProfile.habitType || 'bombo') : 'bombo';
    if (customGroup) customGroup.style.display = select.value === 'custom' ? 'block' : 'none';

    select.addEventListener('change', (e) => {
      if (userProfile) {
        userProfile.habitType = e.target.value;
        if (customGroup) customGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
      }
    });
  }

  if (customInput && userProfile) {
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ type: 'urgencia', note: 'Brote registrado desde app' })
      });
      alert('¡Urgencia registrada! Inhala en 4s y bebe un vaso de agua.');
      loadData();
    });
  }

  // Reinicio exacto de contador al instante
  const btnReset = document.getElementById('btn-reset-timer');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (!confirm("¿Confirmar registro de recaída? El contador se reiniciará a 0d 00h 00m 00s.")) return;
      cleanSince = Date.now();
      localStorage.setItem('cleanSince', cleanSince);
      updateTimerAndSavings();
      await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
        method: "POST",
        headers: getAuthHeaders(),
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
        if (weight && userProfile) {
          userProfile.weight = Number(weight);
          localStorage.setItem('userProfile', JSON.stringify(userProfile));
          localStorage.setItem('lastWeighedDate', String(Date.now()));
          await fetch(`${SUPABASE_URL}/rest/v1/body_metrics`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ weight_kg: Number(weight), note: note })
          });
        }
      } else if (type === 'vapeo') {
        cleanSince = Date.now();
        localStorage.setItem('cleanSince', cleanSince);
        updateTimerAndSavings();
        await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
          method: "POST",
          headers: getAuthHeaders(),
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
          headers: getAuthHeaders(),
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