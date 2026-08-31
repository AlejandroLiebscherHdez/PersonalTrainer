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
let allUserRecipes = [];

const savedProfileRaw = localStorage.getItem('userProfile');
let userProfile = savedProfileRaw ? JSON.parse(savedProfileRaw) : null;
let customRoutines = JSON.parse(localStorage.getItem('customUserRoutines')) || null;
let customDietPlan = JSON.parse(localStorage.getItem('customUserDietPlan')) || null;

let dailyChecklist = JSON.parse(localStorage.getItem('dailyChecklist_' + new Date().toISOString().split('T')[0])) || {
  water: false,
  creatine: false,
  protein: false,
  steps: false,
  workout: false,
  clean: false,
  sleep: false
};

let completedMeals = JSON.parse(localStorage.getItem('completedMeals_' + new Date().toISOString().split('T')[0])) || [];
let currentAnalyzedRecipe = null;

// Catálogo de Alimentos Españoles & Mercadona
const FOOD_DATABASE = [
  { name: "Queso Fresco Batido 0% Hacendado (200g)", type: "Proteína", kcal: 92, p: 16, c: 7, f: 0 },
  { name: "Pechuga de Pollo a la Plancha (180g)", type: "Proteína", kcal: 216, p: 43, c: 0, f: 4 },
  { name: "Pechuga de Pavo 92% Hacendado (100g)", type: "Proteína", kcal: 89, p: 18, c: 1, f: 1.5 },
  { name: "Huevos Enteros M (2 unidades)", type: "Proteína/Grasa", kcal: 140, p: 13, c: 1, f: 10 },
  { name: "Claras de Huevo Líquidas (150g)", type: "Proteína", kcal: 75, p: 16, c: 1, f: 0 },
  { name: "Lomo de Salmón al Horno (160g)", type: "Proteína/Grasa", kcal: 320, p: 34, c: 0, f: 20 },
  { name: "Lata de Atún al Natural Hacendado (2 latas)", type: "Proteína", kcal: 110, p: 26, c: 0, f: 1 },
  { name: "Copos de Avena Integral Hacendado (60g)", type: "Carbohidrato", kcal: 225, p: 8, c: 35, f: 4 },
  { name: "Arroz Basmati / Integral Cocido (150g)", type: "Carbohidrato", kcal: 195, p: 4, c: 42, f: 1 },
  { name: "Patata / Boniato al Horno (200g)", type: "Carbohidrato", kcal: 170, p: 4, c: 38, f: 0.2 },
  { name: "Plátano de Canarias (1 unidad mediana)", type: "Carbohidrato", kcal: 95, p: 1, c: 23, f: 0.3 },
  { name: "Pan 100% Integral de Centeno (2 rebanadas)", type: "Carbohidrato", kcal: 150, p: 6, c: 28, f: 2 },
  { name: "Aceite de Oliva Virgen Extra (1 cucharada 10g)", type: "Grasa Saludable", kcal: 90, p: 0, c: 0, f: 10 },
  { name: "Nueces / Almendras Naturales Hacendado (25g)", type: "Grasa Saludable", kcal: 155, p: 4, c: 3, f: 14 },
  { name: "Aguacate (1/2 pieza 80g)", type: "Grasa Saludable", kcal: 130, p: 1.5, c: 2, f: 12 },
  { name: "Yogur Griego Natural Ligero (125g)", type: "Proteína/Lácteo", kcal: 75, p: 7, c: 4, f: 3 },
  { name: "Proteína Whey / Aislada (1 cacito 30g)", type: "Proteína", kcal: 115, p: 24, c: 2, f: 1 },
  { name: "Brócoli / Espárragos Verdes al Vapor (150g)", type: "Verdura", kcal: 45, p: 4, c: 5, f: 0.4 }
];

// Alternativas desglosadas en arrays de ingredientes
const ALTERNATIVES_POOL = {
  desayuno: [
    { items: ["Tortilla de 3 claras y 1 huevo entero con jamón de pavo", "60g de copos de avena en bebida vegetal", "1 puñado de frutos rojos"], kcal: 420 },
    { items: ["2 tostadas de pan 100% integral de centeno", "1/2 aguacate maduro", "2 huevos poché", "Café o té solo"], kcal: 430 },
    { items: ["Bowl de 250g queso fresco batido 0% Hacendado", "40g copos de avena", "1 plátano de Canarias", "15g nueces"], kcal: 410 },
    { items: ["Tortitas de avena caseras (60g avena + 150g claras)", "1 cucharada de queso de untar light", "Arándanos frescos"], kcal: 390 }
  ],
  almuerzo: [
    { items: ["200g pechuga de pollo a la plancha", "150g arroz basmati cocido", "Brócoli al vapor con 1 cda de AOVE"], kcal: 580 },
    { items: ["180g ternera magra picada a la plancha", "200g patata o boniato al horno", "Ensalada mixta (lechuga, tomate, pepino)"], kcal: 570 },
    { items: ["200g lomo de salmón fresco al horno", "150g boniato asado", "Espárragos verdes a la plancha con sal en escamas"], kcal: 590 },
    { items: ["Plato de lentejas con verduras", "150g dados de pechuga de pavo", "1 rebanada de pan integral"], kcal: 550 }
  ],
  merienda: [
    { items: ["200g queso fresco batido 0% Hacendado", "1 cacito de proteína whey", "20g almendras o nueces crudas"], kcal: 320 },
    { items: ["Sándwich de pan integral", "2 latas de atún al natural", "Rodajas de tomate y orégano"], kcal: 310 },
    { items: ["1 yogur griego natural", "1 plátano de Canarias", "20g crema de cacahuete 100% Hacendado"], kcal: 330 },
    { items: ["Batido con 300ml bebida vegetal o leche", "1 scoop proteína whey", "40g copos de avena"], kcal: 340 }
  ],
  cena: [
    { items: ["200g filete de merluza o bacalao a la plancha", "Puré casero de calabaza", "Ensalada verde con aceite de oliva virgen extra"], kcal: 380 },
    { items: ["Revuelto de 4 claras y 1 huevo con gambas y espárragos", "1 tostada de pan de centeno"], kcal: 360 },
    { items: ["180g solomillo de pavo al limón", "Champiñones salteados con ajo y perejil", "Ensalada de canónigos y tomate"], kcal: 350 },
    { items: ["2 hamburguesas caseras de pollo 100%", "Verduras asadas (calabacín, pimiento, cebolla)"], kcal: 390 }
  ]
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
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');

      if (btn.dataset.tab === 'tab-fitness' && stepsChartInstance) setTimeout(() => stepsChartInstance.resize(), 100);
      if (btn.dataset.tab === 'tab-health' && bpmHealthChartInstance) setTimeout(() => bpmHealthChartInstance.resize(), 100);
      if (btn.dataset.tab === 'tab-diet') {
        renderDietMeals();
        renderUserRecipes();
      }
    });
  });

  setupAuthSystem();
  setupProfileModal();
  setupHabitConfig();
  setupChecklist();
  setupRelaxProtocols();
  setupRoutineSystem();
  setupSearchEngine();
  setupFoodSearchEngine();
  setupCustomRecipeCreator();
  setupDietSection();
  checkWeighReminder();
  initApp();
});

// Creador y Analizador Real de Recetas
function setupCustomRecipeCreator() {
  const form = document.getElementById('create-recipe-form');
  const box = document.getElementById('recipe-analysis-box');
  const txt = document.getElementById('analysis-text');
  const btnAdd = document.getElementById('btn-add-recipe-to-diet');
  const btnClose = document.getElementById('btn-close-analysis');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('recipe-title').value.trim();
    const ingredients = document.getElementById('recipe-ingredients').value.trim();
    const kcal = Number(document.getElementById('recipe-kcal').value);
    const protein = Number(document.getElementById('recipe-protein').value) || 0;

    const lower = (title + " " + ingredients).toLowerCase();

    // Detección de Ultraprocesados / Caprichos
    const isJunk = lower.includes('donut') || lower.includes('donuts') || lower.includes('bollo') || lower.includes('croissant') || lower.includes('pizza') || lower.includes('hamburguesa con queso') || lower.includes('patatas fritas') || lower.includes('helado') || lower.includes('nutella') || lower.includes('chocolate con leche') || lower.includes('doritos') || lower.includes('galletas');

    let suggestedMeal = "Almuerzo o Cena";
    let icon = "🥗";
    let evaluation = "";

    if (isJunk) {
      icon = "⚠️";
      suggestedMeal = "Capricho puntual / Cheat Meal (Post-Entreno)";
      evaluation = `Contiene azúcares simples y grasas saturadas elevadas con baja densidad nutricional. Si decides consumirlo, hazlo cerca de un entreno de alta intensidad o en la merienda para rellenar glucógeno muscular y evitar picos de insulina en la cena.`;
    } else {
      const isBreakfast = lower.includes('avena') || lower.includes('huevo') || lower.includes('claras') || lower.includes('tostada') || lower.includes('fruta') || lower.includes('yogur') || lower.includes('leche') || lower.includes('tortitas');
      const isHeavyLunch = lower.includes('pollo') || lower.includes('arroz') || lower.includes('pasta') || lower.includes('ternera') || lower.includes('patata') || lower.includes('legumbres') || lower.includes('lentejas');
      const isLightDinner = lower.includes('ensalada') || lower.includes('pescado') || lower.includes('merluza') || lower.includes('salmón') || lower.includes('verdura') || lower.includes('pavo') || lower.includes('champiñones');

      if (isBreakfast && kcal <= 500) {
        icon = "🥞";
        suggestedMeal = "Desayuno o Merienda Energética";
        evaluation = `Excelente combinación de energía matutina y carbohidratos complejos para rendir durante el día.`;
      } else if (isHeavyLunch && kcal >= 480) {
        icon = "🍗";
        suggestedMeal = "Almuerzo Principal";
        evaluation = `Plato saciante y completo con alta densidad calórica y aminoácidos para recuperación muscular.`;
      } else if (isLightDinner) {
        icon = "🥗";
        suggestedMeal = "Cena Ligera o Almuerzo";
        evaluation = `Comida limpia con buen volumen y fácil digestión para favorecer el descanso nocturno.`;
      } else {
        icon = "🍽️";
        suggestedMeal = kcal > 500 ? "Almuerzo" : "Merienda / Cena";
        evaluation = `Aporte calórico equilibrado (~${kcal} kcal).`;
      }
    }

    const recommendation = `${icon} <strong>Análisis:</strong> Recomendado como <strong>${suggestedMeal}</strong>.<br><small style="color: #94a3b8;">${evaluation}</small>`;

    currentAnalyzedRecipe = { title, ingredients, kcal, protein, recommendation, isJunk };

    txt.innerHTML = recommendation;
    box.style.display = 'block';

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/user_recipes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          ingredients,
          kcal,
          protein,
          recommendation
        })
      });
    } catch (err) {
      console.error("Error guardando receta:", err);
    }

    form.reset();
    loadUserRecipes();
  });

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      if (!currentAnalyzedRecipe || !customDietPlan) return;
      const mealNum = prompt(`¿A qué comida deseas incorporar "${currentAnalyzedRecipe.title}" (${currentAnalyzedRecipe.kcal} kcal)?\n1: Desayuno\n2: Almuerzo\n3: Merienda\n4: Cena`, "2");
      if (mealNum) {
        const idx = parseInt(mealNum) - 1;
        if (customDietPlan[idx]) {
          // Desglosar ingredientes si vienen separados por comas o sumar la receta
          const rawItems = currentAnalyzedRecipe.ingredients.split(',').map(s => s.trim()).filter(s => s.length > 0);
          const itemsToAdd = rawItems.length > 1 ? rawItems : [`${currentAnalyzedRecipe.title} (${currentAnalyzedRecipe.ingredients})`];

          customDietPlan[idx].items.push(...itemsToAdd);
          customDietPlan[idx].kcal = currentAnalyzedRecipe.kcal;
          localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
          renderDietMeals();
          alert(`¡"${currentAnalyzedRecipe.title}" añadida con éxito a tu ${customDietPlan[idx].title}!`);
        }
      }
      box.style.display = 'none';
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => { box.style.display = 'none'; });
  }
}

async function loadUserRecipes() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_recipes?select=*&order=created_at.desc`, { headers: getAuthHeaders() });
    allUserRecipes = await res.json();
    if (!Array.isArray(allUserRecipes)) allUserRecipes = [];
    renderUserRecipes();
  } catch (err) {
    console.error("Error cargando recetas:", err);
  }
}

function renderUserRecipes() {
  const container = document.getElementById('user-recipes-list');
  if (!container) return;

  if (!allUserRecipes || allUserRecipes.length === 0) {
    container.innerHTML = '<p class="empty-msg" style="color: var(--text-muted); font-size: 0.85rem;">No tienes recetas guardadas todavía. ¡Crea una arriba!</p>';
    return;
  }

  container.innerHTML = allUserRecipes.map((r, idx) => `
    <div class="recipe-saved-item">
      <div class="recipe-saved-header">
        <strong style="color: var(--accent-blue); font-size: 0.92rem;">${r.title}</strong>
        <span style="color: var(--accent-green); font-weight: 700; font-size: 0.85rem;">${r.kcal} kcal</span>
      </div>
      <p style="font-size: 0.82rem; color: var(--text-muted);"><strong>Ingredientes:</strong> ${r.ingredients}</p>
      <small style="color: #94a3b8; font-size: 0.76rem;">${r.recommendation || ''}</small>
      <div class="recipe-saved-actions">
        <button class="btn-meal-action" onclick="addSavedRecipeToMenu(${idx})">+ Añadir al Menú de Hoy</button>
        <button class="btn-delete-ex" title="Eliminar receta" onclick="deleteSavedRecipe(${r.id})">✕</button>
      </div>
    </div>
  `).join('');
}

window.addSavedRecipeToMenu = function(recipeIdx) {
  const recipe = allUserRecipes[recipeIdx];
  if (!recipe || !customDietPlan) return;

  const mealNum = prompt(`¿A qué comida deseas incorporar "${recipe.title}" (${recipe.kcal} kcal)?\n1: Desayuno\n2: Almuerzo\n3: Merienda\n4: Cena`, "2");
  if (mealNum) {
    const idx = parseInt(mealNum) - 1;
    if (customDietPlan[idx]) {
      const rawItems = recipe.ingredients.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const itemsToAdd = rawItems.length > 1 ? rawItems : [`${recipe.title} (${recipe.ingredients})`];

      customDietPlan[idx].items.push(...itemsToAdd);
      customDietPlan[idx].kcal = recipe.kcal;
      localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
      renderDietMeals();
      alert(`¡"${recipe.title}" añadida a tu ${customDietPlan[idx].title}!`);
    }
  }
};

window.deleteSavedRecipe = async function(recipeId) {
  if (confirm("¿Deseas eliminar esta receta guardada?")) {
    await fetch(`${SUPABASE_URL}/rest/v1/user_recipes?id=eq.${recipeId}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    loadUserRecipes();
  }
};

// Autenticación de Supabase
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
      loadUserRecipes();
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

// Plan Nutricional & Macros
function setupDietSection() {
  const prefSelect = document.getElementById('diet-preference-select');
  if (prefSelect && userProfile) {
    prefSelect.value = userProfile.dietPreference || 'balanceada';
    prefSelect.addEventListener('change', () => {
      userProfile.dietPreference = prefSelect.value;
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      generateBaseDietPlan();
      renderDietMeals();
    });
  }
}

function calculateMacros(totalCalories) {
  const weight = userProfile ? userProfile.weight : 80;
  const pref = userProfile ? (userProfile.dietPreference || 'balanceada') : 'balanceada';

  let proteinFactor = 2.0;
  let fatPct = 0.28;

  if (pref === 'alta_proteina') {
    proteinFactor = 2.2;
    fatPct = 0.25;
  } else if (pref === 'volumen') {
    proteinFactor = 1.9;
    fatPct = 0.25;
  } else if (pref === 'lowcarb') {
    proteinFactor = 2.2;
    fatPct = 0.45;
  }

  const proteinGrams = Math.round(weight * proteinFactor);
  const proteinKcal = proteinGrams * 4;
  const fatsKcal = Math.round(totalCalories * fatPct);
  const fatsGrams = Math.round(fatsKcal / 9);
  const remainingKcal = Math.max(300, totalCalories - (proteinKcal + fatsKcal));
  const carbsGrams = Math.round(remainingKcal / 4);

  return { proteinGrams, proteinKcal, fatsGrams, fatsKcal, carbsGrams, carbsKcal: carbsGrams * 4 };
}

function generateBaseDietPlan() {
  const pref = userProfile ? (userProfile.dietPreference || 'balanceada') : 'balanceada';
  
  if (pref === 'alta_proteina') {
    customDietPlan = [
      { id: "desayuno", title: "🍳 Desayuno Anabólico", items: ["Tortilla de 3 huevos + 2 claras con jamón de pavo", "60g de copos de avena en bebida vegetal", "1 puñado de frutos rojos"], kcal: 430 },
      { id: "almuerzo", title: "🥩 Almuerzo de Definición", items: ["200g pechuga de pollo a la plancha", "150g arroz basmati o patata asada", "Ensalada verde con 1 cda AOVE"], kcal: 580 },
      { id: "merienda", title: "⚡ Merienda / Pre-Entreno", items: ["250g queso fresco batido 0% Hacendado", "1 cacito de proteína whey", "20g nueces o almendras"], kcal: 320 },
      { id: "cena", title: "🐟 Cena Recuperadora", items: ["200g lomo de salmón o merluza", "Verduras al vapor (brócoli/espárragos)", "1 rebanada de pan 100% integral"], kcal: 380 }
    ];
  } else if (pref === 'volumen') {
    customDietPlan = [
      { id: "desayuno", title: "🥑 Desayuno Hipercalórico Limpio", items: ["Tostadas de centeno con aguacate y 3 huevos enteros", "Bowl de 80g avena con leche entera y plátano", "Café o té"], kcal: 620 },
      { id: "almuerzo", title: "🍗 Almuerzo de Fuerza", items: ["220g pechuga de pollo o ternera magra", "200g arroz jazmín o pasta integral", "Verduras salteadas con aceite de oliva"], kcal: 750 },
      { id: "merienda", title: "🍌 Batido de Carga Energética", items: ["Batido con 350ml leche, 1 scoop whey, 60g avena, 1 plátano y 25g crema de cacahuete"], kcal: 540 },
      { id: "cena", title: "🥩 Cena Anabólica Nocturna", items: ["200g pescado azul o solomillo de pavo", "250g boniato asado", "Ensalada completa con frutos secos"], kcal: 590 }
    ];
  } else {
    customDietPlan = [
      { id: "desayuno", title: "🥑 Desayuno Equilibrado", items: ["Tostadas integrales con aguacate y huevos poché", "Bowl de yogur natural con fruta de temporada", "Café solo"], kcal: 420 },
      { id: "almuerzo", title: "🍗 Almuerzo Completo", items: ["180g pechuga de pollo o legumbres", "120g arroz basmati", "Verduras asadas con AOVE"], kcal: 560 },
      { id: "merienda", title: "🍌 Merienda Saludable", items: ["Yogur griego con frutos secos (25g)", "1 plátano de Canarias"], kcal: 290 },
      { id: "cena", title: "🥗 Cena Ligera", items: ["Filete de pescado blanco a la plancha", "Puré de calabaza o boniato", "Ensalada verde mixta"], kcal: 360 }
    ];
  }

  localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
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

  if (!customDietPlan) generateBaseDietPlan();

  container.innerHTML = customDietPlan.map((m, idx) => {
    const isCompleted = completedMeals.includes(m.id);
    return `
      <div class="meal-card ${isCompleted ? 'completed' : ''}" id="meal-card-${m.id}">
        <div class="meal-header">
          <span class="meal-title-text">${m.title}</span>
          <span class="meal-kcal-badge">~${m.kcal} kcal</span>
        </div>
        <ul class="meal-food-list">
          ${m.items.map((item, itemIdx) => `
            <li class="meal-food-item">
              <span>${item}</span>
              <button class="btn-delete-ex" title="Eliminar alimento" onclick="removeFoodItem(${idx}, ${itemIdx})">✕</button>
            </li>
          `).join('')}
        </ul>
        <div class="meal-actions-row">
          <button class="btn-meal-action" onclick="replaceMealAlternative('${m.id}', ${idx})">🔄 Alternativa</button>
          <button class="btn-meal-action" onclick="addFoodToMealPrompt(${idx})">+ Añadir Alimento</button>
          <button class="btn-meal-action ${isCompleted ? 'active' : ''}" onclick="toggleMealDone('${m.id}')">
            ${isCompleted ? '✓ Hecha' : 'Completar'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleMealDone = function(mealId) {
  const todayKey = 'completedMeals_' + new Date().toISOString().split('T')[0];
  if (completedMeals.includes(mealId)) {
    completedMeals = completedMeals.filter(id => id !== mealId);
  } else {
    completedMeals.push(mealId);
  }
  localStorage.setItem(todayKey, JSON.stringify(completedMeals));
  renderDietMeals();
};

// Alternativas separadas por líneas
window.replaceMealAlternative = function(mealType, mealIdx) {
  const pool = ALTERNATIVES_POOL[mealType] || ALTERNATIVES_POOL.almuerzo;
  const randomChoice = pool[Math.floor(Math.random() * pool.length)];
  
  // Guardamos array de ingredientes individuales
  customDietPlan[mealIdx].items = [...randomChoice.items];
  customDietPlan[mealIdx].kcal = randomChoice.kcal;
  localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
  renderDietMeals();
};

window.removeFoodItem = function(mealIdx, itemIdx) {
  if (confirm("¿Eliminar este alimento de la comida?")) {
    customDietPlan[mealIdx].items.splice(itemIdx, 1);
    localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
    renderDietMeals();
  }
};

window.addFoodToMealPrompt = function(mealIdx) {
  const food = prompt("Nombre y cantidad del alimento a añadir (Ej: 100g Queso batido, 1 Plátano, 30g Nueces...):");
  if (food && food.trim() !== "") {
    customDietPlan[mealIdx].items.push(food.trim());
    localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
    renderDietMeals();
  }
};

function setupFoodSearchEngine() {
  const input = document.getElementById('food-search-input');
  const results = document.getElementById('food-search-results');
  if (!input || !results) return;

  input.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (!val) { results.style.display = 'none'; return; }

    const matches = FOOD_DATABASE.filter(f => f.name.toLowerCase().includes(val) || f.type.toLowerCase().includes(val));
    if (matches.length === 0) {
      results.innerHTML = `<div class="search-item"><span>Sin alimentos para "${val}"</span></div>`;
    } else {
      results.innerHTML = matches.map(m => `
        <div class="search-item" onclick="selectFoodToMeal('${m.name}', ${m.kcal})">
          <div>
            <strong>${m.name}</strong><br>
            <small style="color: #94a3b8;">${m.type} • P:${m.p}g C:${m.c}g G:${m.f}g</small>
          </div>
          <span style="color: #10b981; font-weight: 700;">${m.kcal} kcal</span>
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

window.selectFoodToMeal = function(name, kcal) {
  const mealNum = prompt(`¿A qué comida deseas añadir "${name}"?\n1: Desayuno\n2: Almuerzo\n3: Merienda\n4: Cena`, "1");
  if (mealNum && customDietPlan) {
    const idx = parseInt(mealNum) - 1;
    if (customDietPlan[idx]) {
      customDietPlan[idx].items.push(name);
      customDietPlan[idx].kcal += kcal;
      localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
      renderDietMeals();
      alert(`¡${name} añadido a ${customDietPlan[idx].title}!`);
    }
  }
  document.getElementById('food-search-results').style.display = 'none';
  document.getElementById('food-search-input').value = '';
};

// Rutinas
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
    renderDietMeals();
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
    renderDietMeals();
    loadUserRecipes();
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