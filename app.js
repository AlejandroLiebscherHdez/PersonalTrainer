const SUPABASE_URL = "https://fckhkuamvuhgsbofncjh.supabase.co";
const SUPABASE_KEY = "sb_publishable_yioP3kIKXyRowVXpvPUpMw_GNQotMVy";

let authSession = JSON.parse(localStorage.getItem('supabase_auth_session')) || null;
let exercisePRs = JSON.parse(localStorage.getItem('exercisePRs')) || {};

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
let volumeChartInstance = null;

let allLogs = [];
let allHealth = [];
let allBodyMetrics = [];
let allWorkouts = [];
let allUserRecipes = [];

const savedProfileRaw = localStorage.getItem('userProfile');
let userProfile = savedProfileRaw ? JSON.parse(savedProfileRaw) : null;

let customRoutines = JSON.parse(localStorage.getItem('customUserRoutines')) || null;
let customDietPlan = JSON.parse(localStorage.getItem('customUserDietPlan')) || null;

let selectedWorkoutMetric = localStorage.getItem('selectedWorkoutMetric') || 'kg';
let completedWorkouts = JSON.parse(localStorage.getItem('completedWorkouts_' + new Date().toISOString().split('T')[0])) || {};
let checkedExercises = JSON.parse(localStorage.getItem('checkedExercises_' + new Date().toISOString().split('T')[0])) || {};
let dailyChecklist = JSON.parse(localStorage.getItem('dailyChecklist_' + new Date().toISOString().split('T')[0])) || {
  water: false, creatine: false, protein: false, steps: false, workout: false, clean: false, sleep: false
};
let completedMeals = JSON.parse(localStorage.getItem('completedMeals_' + new Date().toISOString().split('T')[0])) || [];
let currentAnalyzedRecipe = null;

// ==========================================
// CATÁLOGO Y ALTERNATIVAS DE NUTRICIÓN
// ==========================================
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
  { name: "Proteína Whey Aislada (1 cacito 30g)", type: "Proteína", kcal: 115, p: 24, c: 2, f: 1 },
  { name: "Brócoli / Espárragos Verdes al Vapor (150g)", type: "Verdura", kcal: 45, p: 4, c: 5, f: 0.4 }
];

const ALTERNATIVES_POOL = {
  desayuno: [
    { items: ["Tortilla de 3 claras y 1 huevo entero con jamón de pavo", "60g de copos de avena", "Frutos rojos"], kcal: 420 },
    { items: ["2 tostadas de pan integral de centeno", "1/2 aguacate", "2 huevos poché"], kcal: 430 },
    { items: ["Bowl de 250g queso fresco batido 0%", "40g avena", "1 plátano", "15g nueces"], kcal: 410 }
  ],
  almuerzo: [
    { items: ["200g pechuga de pollo a la plancha", "150g arroz basmati", "Brócoli con 1 cda AOVE"], kcal: 580 },
    { items: ["180g ternera magra picada", "200g patata al horno", "Ensalada mixta"], kcal: 570 },
    { items: ["200g lomo de salmón al horno", "150g boniato asado", "Espárragos verdes"], kcal: 590 }
  ],
  merienda: [
    { items: ["200g queso fresco batido 0%", "1 scoop proteína whey", "20g almendras"], kcal: 320 },
    { items: ["Sándwich integral", "2 latas de atún al natural", "Tomate y orégano"], kcal: 310 },
    { items: ["1 yogur griego", "1 plátano", "20g crema de cacahuete"], kcal: 330 }
  ],
  cena: [
    { items: ["200g merluza a la plancha", "Puré de calabaza", "Ensalada verde con AOVE"], kcal: 380 },
    { items: ["Revuelto de 4 claras y 1 huevo con gambas", "1 tostada de centeno"], kcal: 360 },
    { items: ["180g solomillo de pavo", "Champiñones salteados", "Canónigos y tomate"], kcal: 350 }
  ]
};

// ==========================================
// INICIALIZACIÓN GENERAL (Orden de arranque)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initUnifiedRecipeSystem();
  setupAuthSystem();
  setupProfileModal();
  setupHabitConfig();
  setupChecklist();
  setupRelaxProtocols();
  renderHeartZones();
  setupRoutineSystem();
  setupSearchEngine();
  setupFoodSearchEngine();
  setupWorkoutChartSelector();
  setupDietSection();
  setupTrainerChat();

  // Control de pestañas
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');

      if (btn.dataset.tab === 'tab-fitness') {
        if (stepsChartInstance) setTimeout(() => stepsChartInstance.resize(), 100);
        renderVolumeChart();
      }
      if (btn.dataset.tab === 'tab-health') {
        if (bpmHealthChartInstance) setTimeout(() => bpmHealthChartInstance.resize(), 100);
        renderHealthCharts();
        renderHeartZones();
      }
      if (btn.dataset.tab === 'tab-diet') {
        renderDietMeals();
        renderUserRecipes();
      }
    });
  });

  const bpmViewSelect = document.getElementById('bpm-chart-view-select');
  if (bpmViewSelect) {
    bpmViewSelect.addEventListener('change', () => renderHealthCharts());
  }

  // Comprobar sesión antes de mostrar cualquier modal
  if (!authSession) {
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.classList.add('open');
  } else {
    await syncProfileFromCloud();
    setupCheckinModal();
    checkWeighReminder();
  }

  initApp();
});

// ==========================================
// SINCRONIZACIÓN CON SUPABASE
// ==========================================
async function syncProfileFromCloud() {
  if (!authSession || !authSession.user) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=*&id=eq.${authSession.user.id}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const cloud = data[0];
      userProfile = {
        name: cloud.name || userProfile?.name || "Alejandro",
        age: Number(cloud.age) || userProfile?.age || 24,
        height: Number(cloud.height) || userProfile?.height || 178,
        weight: Number(cloud.weight) || userProfile?.weight || 80.0,
        targetLossKg: Number(cloud.target_loss_kg) || userProfile?.targetLossKg || 4,
        weeks: Number(cloud.weeks) || userProfile?.weeks || 8,
        hasWatch: cloud.has_watch !== undefined ? cloud.has_watch : (userProfile?.hasWatch ?? true),
        weighFreq: cloud.weigh_freq || userProfile?.weighFreq || "3days",
        dietPreference: cloud.diet_preference || userProfile?.dietPreference || "balanceada",
        habitType: userProfile?.habitType || "bombo",
        customDailyCost: userProfile?.customDailyCost || 1.70,
        workoutFocus: userProfile?.workoutFocus || "fullbody",
        workoutDays: userProfile?.workoutDays || 4
      };
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      document.getElementById('user-greeting').innerHTML = `${userProfile.name} <span>Trainer</span>`;
      document.getElementById('user-goal-subtitle').innerText = `Meta: Bajar ${userProfile.targetLossKg} kg en ${userProfile.weeks} semanas`;
    }
    renderCoachEngine();
    updateDashboardMetrics();
    renderDietMeals();
  } catch (err) {
    console.error("Error sincronizando perfil:", err);
  }
}

async function saveProfileToCloud() {
  if (!authSession || !authSession.user || !userProfile) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        id: authSession.user.id,
        name: userProfile.name,
        age: userProfile.age,
        height: userProfile.height,
        weight: userProfile.weight,
        target_loss_kg: userProfile.targetLossKg,
        weeks: userProfile.weeks,
        has_watch: userProfile.hasWatch,
        weigh_freq: userProfile.weighFreq,
        diet_preference: userProfile.dietPreference
      })
    });
  } catch (err) {
    console.error("Error guardando perfil en nube:", err);
  }
}

// ==========================================
// GESTOR UNIFICADO DE INGREDIENTES Y RECETAS
// ==========================================
let userIngredients = JSON.parse(localStorage.getItem('userIngredients')) || [
  { name: 'Arroz', weight: 100, calories: 350, protein: 7 },
  { name: 'Pechuga de Pollo', weight: 150, calories: 250, protein: 45 },
  { name: 'Verduras variadas', weight: 200, calories: 70, protein: 3 }
];

let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
let lastGeneratedRecipe = null;

function initUnifiedRecipeSystem() {
  renderIngredients();
  renderRecipeSelector();
  renderSavedRecipes();
  setupRecipeModeSwitcher();

  // 1. Añadir ingrediente a la despensa
  const ingForm = document.getElementById('ingredient-form');
  if (ingForm) {
    ingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newIng = {
        name: document.getElementById('ing-name').value.trim(),
        weight: Number(document.getElementById('ing-weight').value),
        calories: Number(document.getElementById('ing-cal').value),
        protein: Number(document.getElementById('ing-prot').value)
      };
      userIngredients.push(newIng);
      localStorage.setItem('userIngredients', JSON.stringify(userIngredients));
      ingForm.reset();
      renderIngredients();
      renderRecipeSelector();
    });
  }

  // 2. Creación Manual de Receta
  const manualRecipeForm = document.getElementById('create-recipe-form');
  if (manualRecipeForm) {
    manualRecipeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('recipe-title').value.trim();
      const ingredients = document.getElementById('recipe-ingredients').value.trim();
      const kcal = Number(document.getElementById('recipe-kcal').value);
      const protein = Number(document.getElementById('recipe-protein').value) || 0;

      if (!title || !kcal) return alert('Indica al menos el nombre y las calorías de la receta.');

      const newRecipe = { title, desc: ingredients, calories: kcal, protein };
      savedRecipes.push(newRecipe);
      localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));

      manualRecipeForm.reset();
      renderSavedRecipes();
      alert(`¡Receta "${title}" guardada con éxito en Mis Recetas!`);
    });
  }

  // 3. Generar Receta con IA (Despensa)
  const btnGen = document.getElementById('btn-generate-recipe');
  if (btnGen) {
    btnGen.addEventListener('click', () => {
      const checkedBoxes = document.querySelectorAll('.recipe-ing-checkbox:checked');
      if (checkedBoxes.length === 0) {
        alert('Selecciona al menos un ingrediente de tu despensa.');
        return;
      }

      const selectedNames = Array.from(checkedBoxes).map(cb => cb.value);
      const matchedIngs = userIngredients.filter(i => selectedNames.includes(i.name));

      const totalCal = matchedIngs.reduce((sum, i) => sum + i.calories, 0);
      const totalProt = matchedIngs.reduce((sum, i) => sum + i.protein, 0);
      
      let recipeTitle = "Plato Combinado Fitness";
      let recipeDesc = `Mezcla de ${selectedNames.join(', ')}. Salteado u horneado con especias al gusto.`;

      if (selectedNames.includes('Arroz') && selectedNames.includes('Pechuga de Pollo')) {
        recipeTitle = "Bowl de Arroz y Pollo Fitness";
        recipeDesc = "Saltea el pollo troceado con tus verduras y mezcla con el arroz cocido.";
      }

      lastGeneratedRecipe = { title: recipeTitle, desc: recipeDesc, calories: totalCal, protein: totalProt };

      document.getElementById('output-recipe-title').innerText = recipeTitle;
      document.getElementById('output-recipe-desc').innerText = recipeDesc;
      document.getElementById('output-recipe-macros').innerText = `🔥 Calorías: ${totalCal} kcal | 🥩 Proteínas: ${totalProt}g`;
      document.getElementById('recipe-output-box').style.display = 'block';
    });
  }

  // 4. Guardar Receta Generada por IA
  const btnSaveGen = document.getElementById('btn-save-generated-recipe');
  if (btnSaveGen) {
    btnSaveGen.addEventListener('click', () => {
      if (!lastGeneratedRecipe) return;
      savedRecipes.push(lastGeneratedRecipe);
      localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
      renderSavedRecipes();
      alert('¡Receta guardada en Mis Recetas con éxito!');
      document.getElementById('recipe-output-box').style.display = 'none';
    });
  }

  // 5. Botón Modal para Nueva Receta Manual
  const modalMan = document.getElementById('manual-recipe-modal');
  const btnOpenMan = document.getElementById('btn-open-manual-recipe');
  const btnCloseMan = document.getElementById('btn-close-manual-recipe');
  const formMan = document.getElementById('manual-recipe-form');

  if (btnOpenMan && modalMan) btnOpenMan.addEventListener('click', () => modalMan.classList.add('open'));
  if (btnCloseMan && modalMan) btnCloseMan.addEventListener('click', () => modalMan.classList.remove('open'));

  if (formMan) {
    formMan.addEventListener('submit', (e) => {
      e.preventDefault();
      const newRec = {
        title: document.getElementById('man-title').value,
        desc: document.getElementById('man-desc').value,
        calories: Number(document.getElementById('man-cal').value),
        protein: Number(document.getElementById('man-prot').value)
      };
      savedRecipes.push(newRec);
      localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
      formMan.reset();
      modalMan.classList.remove('open');
      renderSavedRecipes();
    });
  }

  const btnCloseAnalysis = document.getElementById('btn-close-analysis');
  if (btnCloseAnalysis) {
    btnCloseAnalysis.addEventListener('click', () => {
      document.getElementById('recipe-output-box').style.display = 'none';
    });
  }
}

// Selector de Modo (Manual vs IA)
function setupRecipeModeSwitcher() {
  const select = document.getElementById('recipe-mode-select');
  const manualView = document.getElementById('recipe-mode-manual-view');
  const iaView = document.getElementById('recipe-mode-ia-view');

  if (!select || !manualView || !iaView) return;

  select.addEventListener('change', (e) => {
    if (e.target.value === 'manual') {
      manualView.style.display = 'block';
      iaView.style.display = 'none';
    } else {
      manualView.style.display = 'none';
      iaView.style.display = 'block';
    }
  });
}

function renderIngredients() {
  const container = document.getElementById('ingredients-list');
  if (!container) return;
  container.innerHTML = userIngredients.map((ing, idx) => `
    <span class="reading-pill" style="font-size: 0.8rem; padding: 4px 8px; display: inline-flex; align-items: center; gap: 6px;">
      <strong>${ing.name}</strong> (${ing.weight}g) - ${ing.calories} kcal
      <button onclick="removeIngredient(${idx})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold;">&times;</button>
    </span>
  `).join('');
}

window.removeIngredient = function(index) {
  userIngredients.splice(index, 1);
  localStorage.setItem('userIngredients', JSON.stringify(userIngredients));
  renderIngredients();
  renderRecipeSelector();
};

function renderRecipeSelector() {
  const container = document.getElementById('recipe-builder-selector');
  if (!container) return;
  container.innerHTML = userIngredients.map(ing => `
    <label style="background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
      <input type="checkbox" value="${ing.name}" class="recipe-ing-checkbox" style="accent-color: #38bdf8;">
      ${ing.name} (${ing.calories} kcal)
    </label>
  `).join('');
}

function renderSavedRecipes() {
  const container = document.getElementById('saved-recipes-container');
  if (!container) return;
  if (savedRecipes.length === 0) {
    container.innerHTML = '<p class="empty-msg" style="color: var(--text-muted); font-size: 0.85rem;">No tienes recetas guardadas todavía.</p>';
    return;
  }
  container.innerHTML = savedRecipes.map((rec, idx) => `
    <div class="reading-pill" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start; background: #0b0f19; padding: 10px; border-radius: 10px; border: 1px solid var(--card-border);">
      <div>
        <strong style="color: #38bdf8;">🍳 ${rec.title}</strong><br>
        <small style="color: #94a3b8; display: block; margin: 4px 0;">${rec.desc || ''}</small>
        <span style="font-size: 0.75rem; background: rgba(56, 189, 248, 0.1); color: #38bdf8; padding: 2px 6px; border-radius: 4px;">
          🔥 ${rec.calories} kcal | 🥩 ${rec.protein || 0}g Proteína
        </span>
      </div>
      <div style="display: flex; gap: 6px; align-items: center;">
        <button class="btn-meal-action" onclick="addSavedRecipeToMenu(${idx})" style="padding: 4px 8px; font-size: 0.75rem;">+ Menú</button>
        <button onclick="removeSavedRecipe(${idx})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size: 1.1rem;">&times;</button>
      </div>
    </div>
  `).join('');
}

window.removeSavedRecipe = function(index) {
  savedRecipes.splice(index, 1);
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  renderSavedRecipes();
};

window.addSavedRecipeToMenu = function(recipeIdx) {
  const recipe = savedRecipes[recipeIdx];
  if (!recipe || !customDietPlan) return;

  const mealNum = prompt(`¿A qué comida deseas añadir "${recipe.title}" (${recipe.calories} kcal)?\n1: Desayuno\n2: Almuerzo\n3: Merienda\n4: Cena`, "2");
  if (mealNum) {
    const idx = parseInt(mealNum) - 1;
    if (customDietPlan[idx]) {
      customDietPlan[idx].items.push(`${recipe.title} (${recipe.calories} kcal)`);
      customDietPlan[idx].kcal += Number(recipe.calories); // <-- Recálculo dinámico de calorías
      localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
      renderDietMeals();
      alert(`"${recipe.title}" añadida correctamente a ${customDietPlan[idx].title}. Calorías actualizadas.`);
    }
  }
};

// ==========================================
// AUTENTICACIÓN CON SUPABASE
// ==========================================
function setupAuthSystem() {
  const modal = document.getElementById('auth-modal');
  const btnOpen = document.getElementById('btn-auth-action');
  const btnClose = document.getElementById('btn-close-auth');
  const btnSignIn = document.getElementById('btn-auth-signin');
  const btnSignUp = document.getElementById('btn-auth-signup');
  const btnLogout = document.getElementById('btn-auth-logout');
  const btnSkipAuth = document.getElementById('btn-skip-auth');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      if (authSession && authSession.user) {
        document.getElementById('auth-modal-title').innerText = `Sesión: ${authSession.user.email}`;
        btnSignIn.style.display = 'none';
        btnSignUp.style.display = 'none';
        if (btnSkipAuth) btnSkipAuth.style.display = 'none';
        btnLogout.style.display = 'block';
        if (btnClose) btnClose.style.display = 'block';
      } else {
        document.getElementById('auth-modal-title').innerText = "Iniciar Sesión / Registro";
        btnSignIn.style.display = 'inline-block';
        btnSignUp.style.display = 'inline-block';
        if (btnSkipAuth) btnSkipAuth.style.display = 'block';
        btnLogout.style.display = 'none';
        if (btnClose) btnClose.style.display = 'block';
      }
      modal.classList.add('open');
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => modal.classList.remove('open'));
  }

  if (btnSkipAuth) {
    btnSkipAuth.addEventListener('click', () => {
      modal.classList.remove('open');
      // Al omitir login, se ejecutan las verificaciones normales de perfil o pesaje
      if (!userProfile) {
        const profModal = document.getElementById('profile-modal');
        if (profModal) profModal.classList.add('open');
      } else {
        setupCheckinModal();
        checkWeighReminder();
      }
    });
  }

  if (btnSignIn) {
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
        // Descargar perfil oficial de la nube antes de cualquier modal
        await syncProfileFromCloud();
        loadData();
        setupCheckinModal();
      } else {
        alert(`Error al iniciar sesión: ${data.error_description || data.msg || 'Credenciales incorrectas'}`);
      }
    });
  }

  if (btnSignUp) {
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
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      authSession = null;
      localStorage.removeItem('supabase_auth_session');
      modal.classList.remove('open');
      alert('Has cerrado sesión.');
      location.reload();
    });
  }
}

// ==========================================
// PLAN NUTRICIONAL & MACRONUTRIENTES
// ==========================================
function setupDietSection() {
  const prefSelect = document.getElementById('diet-preference-select');
  if (prefSelect && userProfile) {
    prefSelect.value = userProfile.dietPreference || 'balanceada';
    prefSelect.addEventListener('change', () => {
      userProfile.dietPreference = prefSelect.value;
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      saveProfileToCloud();
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

  if (pref === 'alta_proteina') { proteinFactor = 2.2; fatPct = 0.25; }
  else if (pref === 'volumen') { proteinFactor = 1.9; fatPct = 0.25; }
  else if (pref === 'lowcarb') { proteinFactor = 2.2; fatPct = 0.45; }

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
      { id: "desayuno", title: "🥑 Desayuno Anabólico", items: ["Tortilla 3 huevos + 2 claras con jamón", "60g copos de avena", "Frutos rojos"], kcal: 430 },
      { id: "almuerzo", title: "🥗 Almuerzo de Definición", items: ["200g pechuga de pollo", "150g arroz basmati", "Ensalada verde con AOVE"], kcal: 580 },
      { id: "merienda", title: "🥜 Merienda / Pre-Entreno", items: ["250g queso fresco batido 0%", "1 scoop proteína whey", "20g nueces"], kcal: 320 },
      { id: "cena", title: "🐟 Cena Recuperadora", items: ["200g salmón o merluza", "Verduras al vapor", "1 rebanada pan integral"], kcal: 380 }
    ];
  } else if (pref === 'volumen') {
    customDietPlan = [
      { id: "desayuno", title: "🥞 Desayuno Hipercalórico", items: ["Tostadas con aguacate y 3 huevos", "Bowl de 80g avena con leche y plátano"], kcal: 620 },
      { id: "almuerzo", title: "🥩 Almuerzo de Fuerza", items: ["220g ternera o pollo", "200g pasta integral", "Verduras con aceite de oliva"], kcal: 750 },
      { id: "merienda", title: "🥤 Batido Energético", items: ["Batido leche, 1 scoop whey, 60g avena, plátano y crema de cacahuete"], kcal: 540 },
      { id: "cena", title: "🍛 Cena Anabólica", items: ["200g pescado azul", "250g boniato asado", "Ensalada con frutos secos"], kcal: 590 }
    ];
  } else {
    customDietPlan = [
      { id: "desayuno", title: "🥑 Desayuno Equilibrado", items: ["Tostadas integrales con aguacate y huevos", "Yogur natural con fruta"], kcal: 420 },
      { id: "almuerzo", title: "🍗 Almuerzo Completo", items: ["180g pechuga de pollo o legumbres", "120g arroz basmati", "Verduras asadas"], kcal: 560 },
      { id: "merienda", title: "🥜 Merienda Saludable", items: ["Yogur griego con frutos secos (25g)", "1 plátano"], kcal: 290 },
      { id: "cena", title: "🥣 Cena Ligera", items: ["Pescado blanco a la plancha", "Puré de calabaza", "Ensalada verde"], kcal: 360 }
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
  renderMacroDoughnutChart(macros);

  document.getElementById('macro-protein').innerText = `${macros.proteinGrams} g`;
  document.getElementById('macro-protein-kcal').innerText = `${macros.proteinKcal} kcal`;
  document.getElementById('macro-carbs').innerText = `${macros.carbsGrams} g`;
  document.getElementById('macro-carbs-kcal').innerText = `${macros.carbsKcal} kcal`;
  document.getElementById('macro-fats').innerText = `${macros.fatsGrams} g`;
  document.getElementById('macro-fats-kcal').innerText = `${macros.fatsKcal} kcal`;

  // --- Motor de Recomendaciones Estratégicas ---
  const adviceBox = document.getElementById('nutrition-smart-advice');
  if (adviceBox) {
    let title = `<strong style="color: #38bdf8;">💡 Plan de Acción para Hoy:</strong><br>`;
    let tips = `<span>• Tu prioridad absoluta es llegar a <strong>${macros.proteinGrams}g de proteína</strong> para proteger tu masa muscular.</span><br>`;
    
    if (totalCal <= 1600) {
      tips += `<span>• ⚠️ Presupuesto agresivo (<strong>${totalCal} kcal</strong>). Usa alimentos de alto volumen como vegetales y claras.</span>`;
    } else {
      tips += `<span>• 🔋 Tienes margen calórico óptimo. Aprovecha los carbohidratos en torno al entrenamiento.</span>`;
    }

    const hydration = dailyChecklist.water || 0;
    if (hydration < 2.5) {
      tips += `<br><span>• 💧 Llevas ${hydration.toFixed(1)}L de agua. ¡Hidrátate bien para metabolizar mejor la grasa!</span>`;
    } else {
      tips += `<br><span>• 🌊 ¡Hidratación óptima alcanzada!</span>`;
    }
    
    adviceBox.innerHTML = title + tips;
  }
  // ---------------------------------------------

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
          <button class="btn-delete-ex" title="Eliminar alimento" onclick="removeFoodItem(${idx}, ${itemIdx})">X</button>
        </li>
        `).join('')}
      </ul>
      <div class="meal-actions-row">
        <button class="btn-meal-action" onclick="replaceMealAlternative('${m.id}', ${idx})">🔄 Alternativa</button>
        <button class="btn-meal-action" onclick="addFoodToMealPrompt(${idx})">+ Añadir</button>
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

window.replaceMealAlternative = function(mealType, mealIdx) {
  const pool = ALTERNATIVES_POOL[mealType] || ALTERNATIVES_POOL.almuerzo;
  const randomChoice = pool[Math.floor(Math.random() * pool.length)];
  customDietPlan[mealIdx].items = [...randomChoice.items];
  customDietPlan[mealIdx].kcal = randomChoice.kcal;
  localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
  renderDietMeals();
};

window.removeFoodItem = function(mealIdx, itemIdx) {
  if (confirm("¿Eliminar este alimento de la comida?")) {
    customDietPlan[mealIdx].items.splice(itemIdx, 1);
    customDietPlan[mealIdx].kcal = Math.max(150, customDietPlan[mealIdx].kcal - 80); // Recálculo dinámico de calorías al restar
    localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
    renderDietMeals();
  }
};

window.addFoodToMealPrompt = function(mealIdx) {
  const food = prompt("Nombre y cantidad del alimento a añadir (Ej: 100g Arroz, 1 Plátano...):");
  if (food && food.trim() !== "") {
    customDietPlan[mealIdx].items.push(food.trim());
    customDietPlan[mealIdx].kcal += 100; // Suma estimada de calorías al añadir
    localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
    renderDietMeals();
  }
};

// ==========================================
// BUSCADOR RÁPIDO DE ALIMENTOS
// ==========================================
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
            <small style="color: #94a3b8;">${m.type} | P:${m.p}g C:${m.c}g G:${m.f}g</small>
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
      customDietPlan[idx].kcal += kcal; // Recálculo exacto con base en la base de datos
      localStorage.setItem('customUserDietPlan', JSON.stringify(customDietPlan));
      renderDietMeals();
      alert(`"${name}" añadido a ${customDietPlan[idx].title} correctamente.`);
    }
  }
  document.getElementById('food-search-results').style.display = 'none';
  document.getElementById('food-search-input').value = "";
};

// ==========================================
// RUTINAS Y ENTRENAMIENTOS
// ==========================================
const ROUTINE_TEMPLATES = {
  fullbody: [
    { day: "Lunes", focus: "Full Body A (Empuje)", exercises: [["Sentadilla / Prensa", "4 x 8-10", "80"], ["Press Banca", "4 x 8-10", "65"], ["Remo con Barra", "4 x 10", "55"], ["Elevaciones Laterales", "3 x 15", "10"], ["Plancha", "3 x 45s", "0"]] },
    { day: "Miércoles", focus: "Full Body B (Tracción)", exercises: [["Peso Muerto Rumano", "4 x 8-10", "75"], ["Press Militar", "4 x 8-10", "40"], ["Jalón al Pecho", "4 x 8-10", "65"], ["Fondos", "3 x 12", "0"], ["Curl Bíceps", "3 x 12", "25"]] },
    { day: "Viernes", focus: "Full Body C (Hipertrofia)", exercises: [["Hip Thrust", "4 x 10", "90"], ["Sentadilla Búlgara", "3 x 10", "16"], ["Press Inclinado", "4 x 10", "22"], ["Remo Mancuerna", "3 x 10", "24"], ["Extensión Tríceps", "3 x 12", "25"]] }
  ],
  ppl: [
    { day: "Día 1", focus: "Push (Pecho, Hombro, Tríceps)", exercises: [["Press Banca", "4 x 8", "70"], ["Press Inclinado", "4 x 10", "24"], ["Press Militar", "3 x 10", "40"], ["Elevaciones Laterales", "4 x 15", "10"], ["Tríceps", "3 x 12", "25"]] },
    { day: "Día 2", focus: "Pull (Espalda y Bíceps)", exercises: [["Jalón al Pecho", "4 x 8-10", "65"], ["Remo Polea Baja", "4 x 10", "55"], ["Pájaros", "3 x 15", "8"], ["Curl Bíceps", "3 x 10", "25"], ["Curl Martillo", "3 x 12", "14"]] },
    { day: "Día 3", focus: "Legs (Pierna)", exercises: [["Sentadilla", "4 x 8", "85"], ["Peso Muerto", "4 x 10", "80"], ["Prensa 45°", "3 x 12", "140"], ["Curl Femoral", "3 x 12", "45"], ["Gemelos", "4 x 15", "50"]] }
  ],
  torso_pierna: [
    { day: "Lunes", focus: "Torso Fuerza", exercises: [["Press Banca", "4 x 6-8", "75"], ["Remo con Barra", "4 x 6-8", "65"], ["Press Militar", "3 x 8", "45"], ["Jalón al Pecho", "3 x 10", "70"]] },
    { day: "Martes", focus: "Pierna Fuerza", exercises: [["Sentadilla", "4 x 6-8", "90"], ["Peso Muerto Rumano", "4 x 8", "85"], ["Prensa", "3 x 10", "150"], ["Gemelos", "4 x 12", "60"]] }
  ]
};

function setupRoutineSystem() {
  const selectFocus = document.getElementById('workout-focus');
  const selectDays = document.getElementById('workout-days-week');
  const btnGen = document.getElementById('btn-generate-routine');

  // Blindaje para evitar que explote si el DOM aún no lo ha renderizado
  if (userProfile) {
    if (userProfile.workoutFocus && selectFocus) selectFocus.value = userProfile.workoutFocus;
    if (userProfile.workoutDays && selectDays) selectDays.value = userProfile.workoutDays;
  }

  function generateNewRoutine() {
    const focus = selectFocus ? selectFocus.value : 'fullbody';
    const daysCount = selectDays ? Number(selectDays.value) : 4;
    let base = ROUTINE_TEMPLATES[focus] || ROUTINE_TEMPLATES.fullbody;

    if (userProfile) {
      userProfile.workoutFocus = focus;
      userProfile.workoutDays = daysCount;
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      if (typeof saveProfileToCloud === 'function') saveProfileToCloud();
    }

    let list = JSON.parse(JSON.stringify(base));

    while (list.length < daysCount) {
      list.push({ day: "", focus: "Cardio / Recuperación", exercises: [["Pádel o Deporte Libre", "60 min", "0"], ["Estiramientos", "10 min", "0"]] });
    }
    
    list = list.slice(0, daysCount);

    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    list.forEach((item, index) => {
      item.day = dayNames[index] || `Día ${index + 1}`;
    });

    customRoutines = list;
    localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
    
    renderCurrentRoutine();
    renderVolumeChart();
  }

  if (!customRoutines) generateNewRoutine();
  else {
    renderCurrentRoutine();
    renderVolumeChart();
  }

  if (btnGen) btnGen.addEventListener('click', generateNewRoutine);
}

function setupWorkoutChartSelector() {
  const select = document.getElementById('workout-chart-metric-select');
  if (select) {
    select.value = selectedWorkoutMetric;
    select.addEventListener('change', (e) => {
      selectedWorkoutMetric = e.target.value;
      localStorage.setItem('selectedWorkoutMetric', selectedWorkoutMetric);
      renderVolumeChart();
    });
  }
}

function renderCurrentRoutine() {
  const container = document.getElementById('weekly-routine-container');
  if (!container || !customRoutines) return;

  container.innerHTML = customRoutines.map((r, dIdx) => {
    const isDone = !!completedWorkouts[dIdx];
    let dayTonnage = 0;
    let dayReps = 0;

    r.exercises.forEach((ex) => {
      const kg = Number(ex[2] || 0);
      const setsStr = String(ex[1]);
      const setsMatch = setsStr.match(/(\d+)\s*x\s*(\d+)/i);
      if (setsMatch) {
        const totalReps = Number(setsMatch[1]) * Number(setsMatch[2]);
        dayReps += totalReps;
        if (kg > 0) dayTonnage += totalReps * kg;
      }
    });

    const dayKcal = Math.round(200 + (dayTonnage * 0.015));

    return `
    <div class="routine-day-card ${isDone ? 'completed-workout' : ''}">
      <div class="routine-day-header">
        <span class="routine-day-name">${r.day}</span>
        <span class="routine-day-focus">${r.focus}</span>
      </div>
      <div class="workout-stats-summary">
        <span>Volumen: <strong>${dayTonnage.toLocaleString()} kg</strong></span>
        <span>Gasto Estimado: <strong>~${dayKcal} kcal</strong></span>
      </div>
      <ul class="exercise-list">
        ${r.exercises.map((ex, eIdx) => {
          const exKey = `${dIdx}_${eIdx}`;
          const isChecked = !!checkedExercises[exKey];
          const exName = ex[0];
          const kgVal = ex[2] !== undefined ? ex[2] : "0";
          
          // Inyectar medalla de Récord Personal (PR)
          const pr = exercisePRs[exName] ? exercisePRs[exName] : 0;
          const prBadge = pr > 0 ? `<span style="font-size: 0.7rem; color: #f59e0b; margin-left: 8px; font-weight: 700;">🏆 PR: ${pr} kg</span>` : '';

          return `
          <li class="exercise-item">
            <div style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" class="exercise-check-box" ${isChecked ? 'checked' : ''} onchange="toggleExerciseCheck(${dIdx}, ${eIdx})">
              <span style="${isChecked ? 'text-decoration: line-through; color: #94a3b8;' : ''}">${exName} ${prBadge}</span>
            </div>
            <div class="exercise-meta-row">
              <span class="exercise-sets" onclick="editExerciseSets(${dIdx}, ${eIdx})">${ex[1]}</span>
              <span class="exercise-kg-badge" onclick="editExerciseKg(${dIdx}, ${eIdx})">${kgVal} kg</span>
              <button class="btn-delete-ex" title="Eliminar ejercicio" onclick="deleteExercise(${dIdx}, ${eIdx})">X</button>
            </div>
          </li>`;
        }).join('')}
      </ul>
      <button class="btn-add-ex" onclick="addNewExerciseToDay(${dIdx})">+ Añadir ejercicio a ${r.day}</button>
      <button class="btn-complete-workout ${isDone ? 'completed' : ''}" onclick="toggleWorkoutCompleted(${dIdx}, ${dayTonnage}, ${dayKcal}, ${dayReps})">
        ${isDone ? 'Sesión Completada (Registrada)' : 'Completar Sesión de Hoy'}
      </button>
    </div>`;
  }).join('');
}

window.toggleExerciseCheck = function(dIdx, eIdx) {
  const exKey = `${dIdx}_${eIdx}`;
  checkedExercises[exKey] = !checkedExercises[exKey];
  localStorage.setItem('checkedExercises_' + new Date().toISOString().split('T')[0], JSON.stringify(checkedExercises));
  renderCurrentRoutine();
};

window.toggleWorkoutCompleted = async function(dIdx, tonnage, kcal, reps) {
  const todayKey = 'completedWorkouts_' + new Date().toISOString().split('T')[0];
  const isDone = !!completedWorkouts[dIdx];

  if (isDone) {
    delete completedWorkouts[dIdx];
  } else {
    completedWorkouts[dIdx] = { tonnage, kcal, reps, completedAt: Date.now() };
  }
  localStorage.setItem(todayKey, JSON.stringify(completedWorkouts));

  if (!isDone) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/workouts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          workout_type: `Gimnasio: ${customRoutines[dIdx].day} (${customRoutines[dIdx].focus})`,
          active_calories: kcal,
          avg_bpm: 125
        })
      });
      alert(`¡Sesión completada! Se han sumado ${kcal} kcal y ${tonnage} kg a tu balance.`);
    } catch (err) {
      console.error(err);
    }
  }
  loadData();
  renderCurrentRoutine();
  renderVolumeChart();
};

window.editExerciseKg = function (dayIdx, exIdx) {
  const current = customRoutines[dayIdx].exercises[exIdx];
  const exName = current[0];
  const currentKg = current[2] || "0";
  
  const newKg = prompt(`Introduce los kilos para "${exName}":`, currentKg);
  
  if (newKg !== null && !isNaN(newKg)) {
    const kgNum = Number(newKg);
    customRoutines[dayIdx].exercises[exIdx][2] = String(kgNum);
    localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
    
    // Lógica de Sobrecarga Progresiva (PR)
    if (!exercisePRs[exName] || kgNum > exercisePRs[exName]) {
      exercisePRs[exName] = kgNum;
      localStorage.setItem('exercisePRs', JSON.stringify(exercisePRs));
      if (kgNum > 0) alert(`🏆 ¡Nuevo récord en ${exName}! Has levantado ${kgNum} kg.`);
    }
    
    renderCurrentRoutine();
    renderVolumeChart();
  }
};

window.deleteExercise = function(dayIdx, exIdx) {
  const name = customRoutines[dayIdx].exercises[exIdx][0];
  if (confirm(`¿Eliminar "${name}" de ${customRoutines[dayIdx].day}?`)) {
    customRoutines[dayIdx].exercises.splice(exIdx, 1);
    localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
    renderCurrentRoutine();
    renderVolumeChart();
  }
};

window.editExerciseSets = function(dayIdx, exIdx) {
  const current = customRoutines[dayIdx].exercises[exIdx];
  const newSets = prompt(`Editar series/reps para "${current[0]}":`, current[1]);
  if (newSets !== null && newSets.trim() !== "") {
    customRoutines[dayIdx].exercises[exIdx][1] = newSets.trim();
    localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
    renderCurrentRoutine();
    renderVolumeChart();
  }
};

window.addNewExerciseToDay = function(dayIdx) {
  const name = prompt("Nombre del ejercicio:");
  if (!name) return;
  const sets = prompt("Series y repeticiones (Ej: 4 x 10):", "4 x 10");
  const kg = prompt("Kilos (kg):", "20");
  customRoutines[dayIdx].exercises.push([name, sets || "4 x 10", kg || "0"]);
  localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
  renderCurrentRoutine();
  renderVolumeChart();
};

function renderVolumeChart() {
  const canvas = document.getElementById('volumeChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  const labels = customRoutines.map(r => r.day);
  let chartData = [];
  let datasetLabel = 'Kg Levantados';
  let chartColor = '#10b981';

  if (selectedWorkoutMetric === 'kcal') {
    datasetLabel = 'Kcal Quemadas';
    chartColor = '#f59e0b';
    chartData = customRoutines.map((r, dIdx) => {
      const session = completedWorkouts[dIdx];
      return session ? (session.kcal || 0) : 0;
    });
  } else if (selectedWorkoutMetric === 'reps') {
    datasetLabel = 'Repeticiones Totales';
    chartColor = '#38bdf8';
    chartData = customRoutines.map((r, dIdx) => {
      const session = completedWorkouts[dIdx];
      return session ? (session.reps || 0) : 0;
    });
  } else {
    datasetLabel = 'Kg Levantados (Tonelaje)';
    chartColor = '#10b981';
    chartData = customRoutines.map((r, dIdx) => {
      const session = completedWorkouts[dIdx];
      return session ? (session.tonnage || 0) : 0;
    });
  }

  if (volumeChartInstance) volumeChartInstance.destroy();

  volumeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: datasetLabel, data: chartData, backgroundColor: chartColor, borderRadius: 8 }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, grid: { color: '#1f2a44' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { display: true, labels: { color: '#94a3b8', boxWidth: 12 } } }
    }
  });
}

let macroChartInstance = null;

function renderMacroDoughnutChart(macros) {
  const canvas = document.getElementById('macroDoughnutChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');

  const pKcal = macros.proteinKcal || 0;
  const cKcal = macros.carbsKcal || 0;
  const fKcal = macros.fatsKcal || 0;

  if (macroChartInstance) macroChartInstance.destroy();

  macroChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Proteínas', 'Carbohidratos', 'Grasas'],
      datasets: [{
        data: [pKcal, cKcal, fKcal],
        backgroundColor: ['#38bdf8', '#f59e0b', '#10b981'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', boxWidth: 10, font: { size: 11 } }
        }
      }
    }
  });
}

// ==========================================
// BUSCADOR DE ACTIVIDADES
// ==========================================
const ACTIVITY_DATABASE = [
  { name: "Pádel (Partido / Clase)", type: "Deporte", kcal: "~450 kcal/h", bpm: "120-160 bpm" },
  { name: "Fútbol 7 / Fútbol 11", type: "Deporte", kcal: "~600 kcal/h", bpm: "135-175 bpm" },
  { name: "Caminata Rápida (LISS)", type: "Cardio", kcal: "~250 kcal/h", bpm: "95-120 bpm" },
  { name: "Baloncesto", type: "Deporte", kcal: "~550 kcal/h", bpm: "130-170 bpm" },
  { name: "Natación", type: "Cardio", kcal: "~500 kcal/h", bpm: "125-160 bpm" }
];

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
        <div class="search-item" onclick="selectSearchActivity('${m.name}', '${m.kcal}')">
          <div>
            <strong>${m.name}</strong><br>
            <small style="color: #94a3b8;">${m.type}</small>
          </div>
          <span style="color: #38bdf8; font-weight: 600;">${m.kcal}</span>
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
  const dayIdx = prompt(`¿A qué día deseas añadir "${name}"? (1 para Día 1, 2 para Día 2...):`, "1");
  if (dayIdx && customRoutines) {
    const idx = parseInt(dayIdx) - 1;
    if (customRoutines[idx]) {
      customRoutines[idx].exercises.push([name, detail || "60 min", "0"]);
      localStorage.setItem('customUserRoutines', JSON.stringify(customRoutines));
      renderCurrentRoutine();
      renderVolumeChart();
      alert(`"${name}" añadido al ${customRoutines[idx].day}!`);
    }
  }
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('activity-search-input').value = "";
};

// ==========================================
// PERFIL Y CONFIGURACIÓN
// ==========================================
function checkWeighReminder() {
  if (!userProfile || userProfile.weighFreq === 'never') return;
  const lastWeigh = localStorage.getItem('lastWeighedDate');
  const now = Date.now();
  let daysLimit = 3;
  if (userProfile.weighFreq === 'daily') daysLimit = 1;
  else if (userProfile.weighFreq === 'weekly') daysLimit = 7;

  if (!lastWeigh || (now - Number(lastWeigh)) > (daysLimit * 24 * 60 * 60 * 1000)) {
    setTimeout(() => {
      const peso = prompt(`Recordatorio de Pesaje (${userProfile.weighFreq}):\nIntroduce tu peso actual en kg:`, userProfile.weight);
      if (peso && !isNaN(peso)) {
        userProfile.weight = Number(peso);
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        localStorage.setItem('lastWeighedDate', String(Date.now()));
        saveProfileToCloud();
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

// ==========================================
// CONFIGURACIÓN DEL PERFIL (No sobreescribe)
// ==========================================
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
    if (!inLoss || !inWeeks || !valLoss || !valWeeks) return;
    valLoss.innerText = inLoss.value;
    valWeeks.innerText = inWeeks.value;
    const kg = Number(inLoss.value);
    const w = Number(inWeeks.value);
    const weeklyRate = (kg / w).toFixed(2);
    const dailyDeficit = Math.round((kg * 7700) / (w * 7));
    let safety = "Ritmo óptimo y sostenible";
    if (weeklyRate > 1.0) safety = "Déficit agresivo";
    else if (weeklyRate > 0.7) safety = "Ritmo moderado";
    if (preview) {
      preview.innerHTML = `<strong>Meta:</strong> Bajar ${kg} kg en ${w} semanas (${weeklyRate} kg/sem).<br><strong>Déficit calórico diario:</strong> ${dailyDeficit} kcal/día.<br><small>${safety}</small>`;
    }
  }

  if (inLoss && inWeeks) {
    inLoss.addEventListener('input', updatePlanPreview);
    inWeeks.addEventListener('input', updatePlanPreview);
  }

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      if (userProfile) {
        document.getElementById('prof-name').value = userProfile.name || '';
        document.getElementById('prof-age').value = userProfile.age || 24;
        document.getElementById('prof-height').value = userProfile.height || 178;
        document.getElementById('prof-weight').value = userProfile.weight || 80;
        const watchSelect = document.getElementById('prof-has-watch');
        if (watchSelect) watchSelect.value = String(userProfile.hasWatch !== false);
        document.getElementById('prof-weigh-freq').value = userProfile.weighFreq || '3days';
        inLoss.value = userProfile.targetLossKg || 4;
        inWeeks.value = userProfile.weeks || 8;
        updatePlanPreview();
      }
      if (btnClose) btnClose.style.display = 'block';
      modal.classList.add('open');
    });
  }

  if (btnClose) btnClose.addEventListener('click', () => modal.classList.remove('open'));

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const watchSelect = document.getElementById('prof-has-watch');
      userProfile = {
        ...userProfile,
        name: document.getElementById('prof-name').value,
        age: Number(document.getElementById('prof-age').value),
        height: Number(document.getElementById('prof-height').value),
        weight: Number(document.getElementById('prof-weight').value),
        hasWatch: watchSelect ? watchSelect.value === 'true' : true,
        weighFreq: document.getElementById('prof-weigh-freq').value,
        targetLossKg: Number(inLoss.value),
        weeks: Number(inWeeks.value)
      };
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      await saveProfileToCloud();
      modal.classList.remove('open');
      document.getElementById('user-greeting').innerHTML = `${userProfile.name} <span>Trainer</span>`;
      document.getElementById('user-goal-subtitle').innerText = `Meta: Bajar ${userProfile.targetLossKg} kg en ${userProfile.weeks} semanas`;
      renderCoachEngine();
      updateDashboardMetrics();
      renderDietMeals();
    });
  }
  // --- Generador de Informe CSV ---
  const btnExport = document.getElementById('btn-export-data');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      let csvContent = "data:text/csv;charset=utf-8,Fecha,Peso (kg),Pasos,Pulso Reposo (BPM)\n";
      
      const metricsArray = Array.isArray(allBodyMetrics) ? allBodyMetrics : [];
      const healthArray = Array.isArray(allHealth) ? allHealth : [];

      // Extraer y unificar todas las fechas únicas
      const rawDates = [
        ...metricsArray.map(m => m.created_at?.split('T')[0]),
        ...healthArray.map(h => h.created_at?.split('T')[0])
      ];
      const uniqueDates = [...new Set(rawDates)].filter(Boolean).sort();

      if (uniqueDates.length === 0) {
        return alert("No hay suficientes datos registrados para exportar.");
      }

      // Cruzar datos día a día
      uniqueDates.forEach(date => {
        const weightEntry = metricsArray.reverse().find(m => m.created_at?.startsWith(date));
        const healthEntry = healthArray.reverse().find(h => h.created_at?.startsWith(date));
        
        const weight = weightEntry?.weight_kg || '';
        const steps = healthEntry?.steps || '';
        const bpm = healthEntry?.resting_bpm || '';
        
        csvContent += `${date},${weight},${steps},${bpm}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "Alejandro_Trainer_Progreso.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}

// ==========================================
// PROTOCOLOS DE SALUD Y RELAX
// ==========================================
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
    const type = typeSelect ? typeSelect.value : 'breath';

    if (type === 'breath') {
      let phase = 'inhale';
      let count = 4;
      statusEl.innerText = "Inhala lentamente por la nariz...";
      statusEl.style.color = "#38bdf8";
      const interval = setInterval(() => {
        timerEl.innerText = count;
        count--;
        if (count < 0) {
          if (phase === 'inhale') { phase = 'hold'; count = 7; statusEl.innerText = "Mantén el aire..."; statusEl.style.color = "#f59e0b"; }
          else if (phase === 'hold') { phase = 'exhale'; count = 8; statusEl.innerText = "Exhala suavemente..."; statusEl.style.color = "#10b981"; }
          else { phase = 'inhale'; count = 4; statusEl.innerText = "Inhala de nuevo..."; statusEl.style.color = "#38bdf8"; }
        }
      }, 1000);
      setTimeout(() => { clearInterval(interval); guideBox.style.display = 'none'; btn.style.display = 'block'; alert('¡Sesión 4-7-8 completada!'); }, 60000);

    } else if (type === 'coherence') {
      let inhale = true;
      let count = 5;
      statusEl.innerText = "Inhala profundo (5s)...";
      statusEl.style.color = "#38bdf8";
      const interval = setInterval(() => {
        timerEl.innerText = count;
        count--;
        if (count < 0) {
          inhale = !inhale;
          count = 5;
          statusEl.innerText = inhale ? "Inhala profundo (5s)..." : "Exhala lento (5s)...";
          statusEl.style.color = inhale ? "#38bdf8" : "#10b981";
        }
      }, 1000);
      setTimeout(() => { clearInterval(interval); guideBox.style.display = 'none'; btn.style.display = 'block'; alert('¡Coherencia cardíaca finalizada!'); }, 60000);

    } else if (type === 'box') {
      let step = 0;
      let count = 4;
      const stepsText = ["Inhala (4s)", "Mantén pulmones llenos (4s)", "Exhala suave (4s)", "Mantén vacío (4s)"];
      statusEl.innerText = stepsText[0];
      statusEl.style.color = "#38bdf8";
      const interval = setInterval(() => {
        timerEl.innerText = count;
        count--;
        if (count < 0) {
          step = (step + 1) % 4;
          count = 4;
          statusEl.innerText = stepsText[step];
        }
      }, 1000);
      setTimeout(() => { clearInterval(interval); guideBox.style.display = 'none'; btn.style.display = 'block'; alert('¡Box Breathing completado!'); }, 64000);

    } else if (type === 'muscle') {
      const steps = ["Relaja la mandíbula y la frente (15s)", "Baja los hombros y suelta los brazos (15s)", "Respira profundo aflojando el abdomen (15s)", "Cierra los ojos y descansa (15s)"];
      let idx = 0;
      let count = 15;
      statusEl.innerText = steps[idx];
      statusEl.style.color = "#10b981";
      const interval = setInterval(() => {
        timerEl.innerText = count;
        count--;
        if (count < 0) {
          idx++;
          if (idx < steps.length) { count = 15; statusEl.innerText = steps[idx]; }
        }
      }, 1000);
      setTimeout(() => { clearInterval(interval); guideBox.style.display = 'none'; btn.style.display = 'block'; alert('¡Relajación muscular finalizada!'); }, 62000);

    } else {
      const neckSteps = ["Gira suavemente hacia la derecha (15s)", "Gira suavemente hacia la izquierda (15s)", "Oreja derecha al hombro (15s)", "Oreja izquierda al hombro (15s)"];
      let idx = 0;
      let count = 15;
      statusEl.innerText = neckSteps[idx];
      statusEl.style.color = "#38bdf8";
      const interval = setInterval(() => {
        timerEl.innerText = count;
        count--;
        if (count < 0) {
          idx++;
          if (idx < neckSteps.length) { count = 15; statusEl.innerText = neckSteps[idx]; }
        }
      }, 1000);
      setTimeout(() => { clearInterval(interval); guideBox.style.display = 'none'; btn.style.display = 'block'; alert('¡Movilidad cervical completada!'); }, 62000);
    }
  });
}

// ==========================================
// HÁBITOS Y AHORRO
// ==========================================
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
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
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

// ==========================================
// CARGA DE DATOS Y DASHBOARD
// ==========================================
async function loadData() {
  try {
    const [resLogs, resHealth, resWorkouts, resMetrics] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/vape_logs?select=*&order=created_at.desc`, { headers: getAuthHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/daily_health?select=*&order=created_at.asc`, { headers: getAuthHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/workouts?select=*&order=created_at.desc`, { headers: getAuthHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/body_metrics?select=*&order=created_at.asc`, { headers: getAuthHeaders() })
    ]);
    
    const dataLogs = await resLogs.json();
    const dataHealth = await resHealth.json();
    const dataWorkouts = await resWorkouts.json();
    const dataMetrics = await resMetrics.json();
    
    allLogs = Array.isArray(dataLogs) ? dataLogs : [];
    allHealth = Array.isArray(dataHealth) ? dataHealth : [];
    allWorkouts = Array.isArray(dataWorkouts) ? dataWorkouts : [];
    allBodyMetrics = Array.isArray(dataMetrics) ? dataMetrics : [];
    
    const lastRelapse = allLogs.find(l => l.type === 'recaida');
    if (lastRelapse) {
      cleanSince = new Date(lastRelapse.created_at).getTime();
    }

    // --- LLAMADAS DE RENDERIZADO ---
    if (typeof updateDashboardMetrics === 'function') updateDashboardMetrics();
    if (typeof renderCoachEngine === 'function') renderCoachEngine();
    if (typeof renderStepsChart === 'function') renderStepsChart();
    if (typeof renderHealthCharts === 'function') renderHealthCharts();
    if (typeof renderWorkoutsList === 'function') renderWorkoutsList();
    if (typeof renderDiagnostic === 'function') renderDiagnostic();
    if (typeof renderWeightChart === 'function') renderWeightChart();
    
    // ➔ PÉGALA AQUÍ EXACTAMENTE:
    if (typeof updateHealthStats === 'function') updateHealthStats();

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
  let dailyDeficit = Math.round(totalDeficitNeeded / daysTotal);

  // --- Algoritmo de Ajuste Metabólico PRO (Fase 7: Medias Semanales) ---
  let stagnationModifier = 0;
  let alertMessage = '';
  const validMetrics = (Array.isArray(allBodyMetrics) ? allBodyMetrics : [])
    .filter(item => item.weight_kg)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const dailyWeightMap = {};
  validMetrics.forEach(entry => {
    if (entry.created_at) {
      const d = new Date(entry.created_at);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyWeightMap[dayKey] = Number(entry.weight_kg);
    }
  });
  const sortedDays = Object.keys(dailyWeightMap).sort();

  if (sortedDays.length >= 14) {
    const last7Days = sortedDays.slice(-7).map(k => dailyWeightMap[k]);
    const prev7Days = sortedDays.slice(-14, -7).map(k => dailyWeightMap[k]);
    
    const currentAvg = last7Days.reduce((a, b) => a + b, 0) / last7Days.length;
    const prevAvg = prev7Days.reduce((a, b) => a + b, 0) / prev7Days.length;

    if (currentAvg >= prevAvg - 0.1) {
      stagnationModifier = 150;
      alertMessage = `<div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 0.85rem;"><span style="color: #ef4444; font-weight: bold;">⚠️ Alerta de Estancamiento (Media Semanal):</span> Tu peso medio no baja. Aplicamos recorte (-150 kcal) para romper la meseta.</div>`;
    } else {
      alertMessage = `<div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 0.85rem;"><span style="color: #10b981; font-weight: bold;">🔥 Metabolismo Óptimo:</span> Tu media semanal sigue bajando. Mantenemos tus macros.</div>`;
    }
  } else if (sortedDays.length > 0) {
    alertMessage = `<div style="background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 0.85rem;"><span style="color: #38bdf8; font-weight: bold;">📊 Recopilando datos:</span> Llevas ${sortedDays.length} días de pesaje. Necesitamos 14 para calcular tu media semanal.</div>`;
  }
  
  dailyDeficit += stagnationModifier;

  // --- Motor de Recuperación / Readiness (Fase 6) ---
  let readinessScore = 100;
  const sleepHours = dailyChecklist.sleep || 0;
  
  if (sleepHours < 7.5 && sleepHours > 0) {
    readinessScore -= (7.5 - sleepHours) * 12;
  } else if (sleepHours === 0) {
    readinessScore -= 30;
  }

  const validBpmLogs = (Array.isArray(allHealth) ? allHealth : []).filter(h => h.resting_bpm && Number(h.resting_bpm) > 35);
  if (validBpmLogs.length >= 2) {
    const currentBpm = Number(validBpmLogs[validBpmLogs.length - 1].resting_bpm);
    const recentLogs = validBpmLogs.slice(-7);
    const avgBpm = recentLogs.reduce((acc, curr) => acc + Number(curr.resting_bpm), 0) / recentLogs.length;
    if (currentBpm > avgBpm + 2) readinessScore -= (currentBpm - avgBpm) * 2.5;
  }

  readinessScore = Math.max(0, Math.min(100, Math.round(readinessScore)));
  const readinessEl = document.getElementById('readiness-score');
  if (readinessEl) {
    readinessEl.innerText = `${readinessScore}%`;
    if (readinessScore >= 70) readinessEl.style.color = '#10b981';
    else if (readinessScore >= 40) readinessEl.style.color = '#f59e0b';
    else readinessEl.style.color = '#ef4444';
  }

  let readinessAdvice = '';
  if (readinessScore < 40) readinessAdvice = `<p>⚠️ <strong>Fatiga Central Alta:</strong> Pulso alterado o falta de sueño. Prioriza LISS o descanso.</p>`;
  else if (readinessScore < 70) readinessAdvice = `<p>🔋 <strong>Recuperación Moderada:</strong> Puedes entrenar, pero controla la intensidad.</p>`;

  // --- Cálculo Final ---
  const now = new Date();
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const todayHealthEntries = (Array.isArray(allHealth) ? allHealth : []).filter(h => h.created_at && h.created_at.startsWith(localTodayStr));
  const todayWorkouts = (Array.isArray(allWorkouts) ? allWorkouts : []).filter(w => w.created_at && w.created_at.startsWith(localTodayStr));

  const todaySteps = todayHealthEntries.reduce((max, h) => Math.max(max, Number(h.steps) || 0), 0);
  const totalBurn = Math.round(todaySteps * 0.04) + todayWorkouts.reduce((acc, w) => acc + (w.active_calories ? Number(w.active_calories) : 250), 0);

  let finalCalorieTarget;
  let adviceHTML = '';

  if (userProfile.hasWatch) {
    finalCalorieTarget = Math.max(1200, Math.round(bmr * 1.2) + totalBurn - dailyDeficit);
    targetCalEl.innerText = `${finalCalorieTarget} kcal`;
    if (todayWorkouts.length > 0) adviceHTML = `<p>⚡ <strong>¡Entrenamiento registrado!</strong> Gasto activo: +${totalBurn} kcal. Objetivo: <strong>${finalCalorieTarget} kcal</strong>.</p>`;
    else if (todaySteps > 8000) adviceHTML = `<p>🚶 <strong>Gran volumen de pasos:</strong> (+${Math.round(todaySteps * 0.04)} kcal). Objetivo: <strong>${finalCalorieTarget} kcal</strong>.</p>`;
    else adviceHTML = `<p>🎯 <strong>Día de recuperación:</strong> Para cumplir tu meta, consume <strong>${finalCalorieTarget} kcal</strong>.</p>`;
  } else {
    finalCalorieTarget = Math.max(1200, Math.round(bmr * 1.35) + totalBurn - dailyDeficit);
    targetCalEl.innerText = `${finalCalorieTarget} kcal`;
    adviceHTML = `<p>🎯 <strong>Plan Estándar Activo:</strong> Tu objetivo son <strong>${finalCalorieTarget} kcal</strong>.</p>`;
  }

  container.innerHTML = adviceHTML + readinessAdvice + alertMessage;

  // Forzar sincronización del Plan de Acción en Nutrición
  if (typeof renderDietMeals === 'function') renderDietMeals();
}

function updateDashboardMetrics() {
  const todayDateStr = new Date().toISOString().split('T')[0];

  // 1. Filtrar filas registradas hoy por su timestamp created_at
  const todayHealthEntries = (Array.isArray(allHealth) ? allHealth : []).filter(h => {
    return h.created_at && h.created_at.startsWith(todayDateStr);
  });

  const todayWorkouts = Array.isArray(allWorkouts)
    ? allWorkouts.filter(w => w.created_at && w.created_at.startsWith(todayDateStr))
    : [];

  // 2. Extraer el valor más alto de pasos registrado hoy
  const stepsEl = document.getElementById('metric-today-steps');
  if (stepsEl) {
    const maxStepsToday = todayHealthEntries.reduce((max, entry) => {
      const s = Number(entry.steps) || 0;
      return s > max ? s : max;
    }, 0);
    stepsEl.innerText = maxStepsToday.toLocaleString();
  }

  // 3. Gasto de entrenamientos
  const burnEl = document.getElementById('metric-today-burn');
  if (burnEl) {
    const totalWkBurn = todayWorkouts.reduce((acc, w) => acc + (w.active_calories ? Number(w.active_calories) : 250), 0);
    burnEl.innerText = `${totalWkBurn} kcal`;
  }

  // 4. Extraer el último pulso en reposo válido (> 35 bpm)
  const bpmEl = document.getElementById('metric-resting-bpm');
  if (bpmEl && Array.isArray(allHealth) && allHealth.length > 0) {
    const validBpmLogs = allHealth.filter(h => h.resting_bpm && Number(h.resting_bpm) > 35);
    const lastHealthWithBpm = validBpmLogs.length > 0 ? validBpmLogs[validBpmLogs.length - 1] : null;
    bpmEl.innerText = lastHealthWithBpm ? `${lastHealthWithBpm.resting_bpm} bpm` : '-- bpm';
  }

  const cravings = Array.isArray(allLogs) ? allLogs.filter(l => l.type === 'urgencia') : [];
  const cravingsEl = document.getElementById('metric-cravings-count');
  if (cravingsEl) cravingsEl.innerText = cravings.length;

  // 5. Mostrar Porcentaje de Grasa
  const bodyFatEl = document.getElementById('metric-body-fat');
  const storedFat = localStorage.getItem('latestBodyFat');
  if (bodyFatEl && storedFat) {
    bodyFatEl.innerText = `${storedFat} %`;
  }
}

function renderStepsChart() {
  const canvas = document.getElementById('stepsChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  const last7Health = Array.isArray(allHealth) ? allHealth.slice(-7) : [];
  const labels = last7Health.map(h => new Date(h.created_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
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
        y: {
          grid: { color: '#1f2a44' },
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

function renderStepsChart() {
  const canvas = document.getElementById('stepsChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  
  const dailyStepsMap = {};
  const validHealth = Array.isArray(allHealth) ? allHealth : [];
  
  // Agrupar por día local y quedarse con el valor máximo
  validHealth.forEach(entry => {
    if (entry.created_at) {
      const d = new Date(entry.created_at);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const currentSteps = Number(entry.steps) || 0;
      
      if (!dailyStepsMap[dayKey] || currentSteps > dailyStepsMap[dayKey].steps) {
        dailyStepsMap[dayKey] = { steps: currentSteps, dateObj: d };
      }
    }
  });

  const sortedKeys = Object.keys(dailyStepsMap).sort();
  const recentKeys = sortedKeys.slice(-7);

  const labels = recentKeys.map(k => dailyStepsMap[k].dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
  const stepsData = recentKeys.map(k => dailyStepsMap[k].steps);

  if (window.stepsChartInstance) window.stepsChartInstance.destroy();
  window.stepsChartInstance = new Chart(ctx, {
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

function renderHealthCharts() {
  const canvas = document.getElementById('restingBpmChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');

  const viewMode = document.getElementById('bpm-chart-view-select')?.value || 'week';
  const now = new Date();
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 1. Filtrar solo filas con resting_bpm válido (> 35)
  const validBpmEntries = (Array.isArray(allHealth) ? allHealth : [])
    .filter(item => item.resting_bpm && Number(item.resting_bpm) > 35)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  let labels = [];
  let dataValues = [];

  if (viewMode === 'today') {
    // Vista: todas las lecturas de hoy ordenadas por hora
    const todayEntries = validBpmEntries.filter(entry => {
      if (!entry.created_at) return false;
      const d = new Date(entry.created_at);
      const itemStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return itemStr === localTodayStr;
    });

    labels = todayEntries.map(e => new Date(e.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    dataValues = todayEntries.map(e => Number(e.resting_bpm));
  } else {
    // Vista: últimos 7 días agrupados por día
    const dailyBpmMap = {};
    validBpmEntries.forEach(entry => {
      if (entry.created_at) {
        const d = new Date(entry.created_at);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dailyBpmMap[dayKey] = { bpm: Number(entry.resting_bpm), dateObj: d };
      }
    });

    const sortedKeys = Object.keys(dailyBpmMap).sort();
    const recentKeys = sortedKeys.slice(-7);
    labels = recentKeys.map(k => dailyBpmMap[k].dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
    dataValues = recentKeys.map(k => dailyBpmMap[k].bpm);
  }

  // Corregir texto del diagnóstico
  const monitorText = document.getElementById('bpm-diagnostic-container');
  if (monitorText && validBpmEntries.length > 0) {
    const lastBpm = Number(validBpmEntries[validBpmEntries.length - 1].resting_bpm);
    let diag = 'Alta eficiencia cardiovascular.';
    if (lastBpm > 60 && lastBpm <= 75) diag = 'Tu corazón recupera adecuadamente.';
    else if (lastBpm > 75) diag = 'Fatiga o estrés. Hidrátate y descansa.';

    monitorText.innerHTML = `<p>Último pulso basal: <strong>${lastBpm} BPM</strong>.<br><br><span style="color:#10b981;">●</span> <strong>Rango actual:</strong> ${diag}</p>`;
  }

  if (window.bpmChartInstance) window.bpmChartInstance.destroy();

  window.bpmChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['Sin datos'],
      datasets: [{
        label: 'Frecuencia en Reposo (BPM)',
        data: dataValues.length ? dataValues : [0],
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#38bdf8',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: 40, max: 110, grid: { color: '#1f2a44' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderWorkoutsList() {
  const container = document.getElementById('workouts-list');
  if (!container) return;

  if (allWorkouts.length === 0) {
    container.innerHTML = '<p class="empty-msg">No hay entrenamientos registrados todavía.</p>';
    return;
  }

  container.innerHTML = allWorkouts.slice(0, 6).map(w => {
    const date = new Date(w.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    return `
      <div class="reading-pill">
        <div>
          <strong>${w.workout_type || 'Sesión Registrada'}</strong><br>
          <small style="color: #94a3b8;">${date} | +${w.active_calories || 250} kcal</small>
        </div>
        <strong style="color: #38bdf8;">${w.avg_bpm ? w.avg_bpm + ' bpm' : 'OK'}</strong>
      </div>
    `;
  }).join('');
}

function renderDiagnostic() {
  const container = document.getElementById('bpm-diagnostic-container');
  if (!container) return;

  if (allHealth.length === 0) {
    container.innerHTML = "<p>Esperando lecturas de reposo del Apple Watch...</p>";
    return;
  }

  const latest = allHealth[allHealth.length - 1].resting_bpm;
  let statusHTML = `Último pulso basal: <strong>${latest} BPM</strong>.<br><br>`;

  if (latest < 60) statusHTML += `🟢 <strong>Rango atlético:</strong> Alta eficiencia cardiovascular.`;
  else if (latest <= 75) statusHTML += `🟢 <strong>Rango óptimo:</strong> Tu corazón recupera adecuadamente.`;
  else if (latest <= 88) statusHTML += `🟡 <strong>Rango estimulado:</strong> Fatiga o estrés. Hidrátate y descansa.`;
  else statusHTML += `🔴 <strong>Rango elevado:</strong> Sistema simpático activo. Respira hondo y descansa.`;

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
    <div class="zone-row"><span style="color: #10b981;">Zona 2 (Quema Grasa):</span> <strong style="color: #10b981;">${z2_min} - ${z2_max} bpm</strong></div>
    <div class="zone-row"><span>Zona 3 (Aeróbica):</span> <strong>${z2_max + 1} - ${z3_max} bpm</strong></div>
    <div class="zone-row"><span style="color: #f59e0b;">Zona 4 (Umbral):</span> <strong style="color: #f59e0b;">${z3_max + 1} - ${z4_max} bpm</strong></div>
    <div class="zone-row"><span style="color: #ef4444;">Zona 5 (Máximo):</span> <strong style="color: #ef4444;">> ${z4_max} bpm</strong></div>
  `;
}

function setupChecklist() {
  const todayKey = 'dailyChecklist_' + new Date().toISOString().split('T')[0];
  
  // Si venimos de la versión anterior (booleanos), convertimos agua y sueño a números
  if (typeof dailyChecklist.water === 'boolean') dailyChecklist.water = 0;
  if (typeof dailyChecklist.sleep === 'boolean') dailyChecklist.sleep = 0;

  // 1. Lógica de Checkboxes Estándar (se quitaron water y sleep de esta lista)
  const keys = ['creatine', 'protein', 'steps', 'workout', 'clean'];
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

  // 2. Lógica del Contador de Agua
  const waterDisplay = document.getElementById('water-val-display');
  const btnWaterPlus = document.getElementById('btn-water-plus');
  const btnWaterMinus = document.getElementById('btn-water-minus');

  const updateWaterUI = () => {
    if (waterDisplay) waterDisplay.innerText = `${(dailyChecklist.water || 0).toFixed(2)} L`;
  };
  updateWaterUI();

  if (btnWaterPlus) {
    btnWaterPlus.addEventListener('click', () => {
      dailyChecklist.water = (Number(dailyChecklist.water) || 0) + 0.25;
      localStorage.setItem(todayKey, JSON.stringify(dailyChecklist));
      updateWaterUI();
    });
  }
  
  if (btnWaterMinus) {
    btnWaterMinus.addEventListener('click', () => {
      dailyChecklist.water = Math.max(0, (Number(dailyChecklist.water) || 0) - 0.25);
      localStorage.setItem(todayKey, JSON.stringify(dailyChecklist));
      updateWaterUI();
    });
  }

  // 3. Lógica del Registro de Sueño
  const sleepDisplay = document.getElementById('sleep-val-display');
  const sleepInput = document.getElementById('input-sleep-hours');
  const btnSaveSleep = document.getElementById('btn-save-sleep');

  const updateSleepUI = () => {
    if (sleepDisplay) sleepDisplay.innerText = `${dailyChecklist.sleep || 0} h`;
  };
  updateSleepUI();

  if (btnSaveSleep && sleepInput) {
    btnSaveSleep.addEventListener('click', () => {
      const val = Number(sleepInput.value);
      if (val >= 0 && val <= 24) {
        dailyChecklist.sleep = val;
        localStorage.setItem(todayKey, JSON.stringify(dailyChecklist));
        updateSleepUI();
        sleepInput.value = '';
        renderCoachEngine();
      }
    });
  }
}

// ==========================================
// CHECK-IN Y REGISTROS MANUALES
// ==========================================
function setupCheckinModal() {
  const modal = document.getElementById('checkin-modal');
  const greetingEl = document.getElementById('checkin-greeting');
  const skipBtn = document.getElementById('btn-skip-checkin');
  const form = document.getElementById('checkin-form');
  const moodInput = document.getElementById('checkin-mood');
  const moodVal = document.getElementById('checkin-mood-val');

  if (!modal) return;
  const storedProfile = JSON.parse(localStorage.getItem('userProfile')) || {};
  if (greetingEl) greetingEl.innerText = `¡Hola, ${storedProfile.name || 'Atleta'}!`;

  if (moodInput && moodVal) {
    moodInput.addEventListener('input', (e) => { moodVal.innerText = e.target.value; });
  }

  modal.classList.add('open');

  if (skipBtn) {
    skipBtn.addEventListener('click', () => { modal.classList.remove('open'); });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const weightVal = document.getElementById('checkin-weight')?.value;
      const bpmVal = document.getElementById('checkin-bpm')?.value;
      const moodScore = moodInput ? Number(moodInput.value) : 7;

      try {
        const promises = [];
        if (weightVal) {
          storedProfile.weight = Number(weightVal);
          localStorage.setItem('userProfile', JSON.stringify(storedProfile));
          promises.push(
            fetch(`${SUPABASE_URL}/rest/v1/body_metrics`, {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({ weight_kg: Number(weightVal), note: 'Check-in apertura' })
            }).catch(err => console.warn(err))
          );
        }
        if (bpmVal || weightVal) {
          promises.push(
            fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({ type: 'estado', bpm: bpmVal ? Number(bpmVal) : null, mood: moodScore, note: 'Check-in apertura' })
            }).catch(err => console.warn(err))
          );
        }
        if (promises.length > 0) await Promise.all(promises);
      } catch (err) {
        console.error(err);
      } finally {
        modal.classList.remove('open');
        loadData();
      }
    });
  }
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
      alert('¡Urgencia registrada! Inhala y bebe agua.');
      loadData();
    });
  }

  const btnReset = document.getElementById('btn-reset-timer');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (!confirm("¿Confirmar registro de recaída? Se reiniciará el contador.")) return;
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
        const waist = document.getElementById('input-waist').value;
        const neck = document.getElementById('input-neck').value;
        
        let finalNote = note;

        if (weight && userProfile) {
          userProfile.weight = Number(weight);
          localStorage.setItem('userProfile', JSON.stringify(userProfile));
          localStorage.setItem('lastWeighedDate', String(Date.now()));
          
          // Calculadora de Grasa Corporal (Fórmula Marina EEUU para hombres)
          if (waist && neck && userProfile.height) {
            const w = Number(waist);
            const n = Number(neck);
            const h = Number(userProfile.height);
            // Fórmula: 495 / (1.0324 - 0.19077 * log10(cintura - cuello) + 0.15456 * log10(altura)) - 450
            const bodyFat = (495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450).toFixed(1);
            
            if (!isNaN(bodyFat)) {
              localStorage.setItem('latestBodyFat', bodyFat);
              finalNote = `Cintura: ${w}cm | Cuello: ${n}cm | Grasa Estimada: ${bodyFat}% | ` + note;
              alert(`¡Medidas registradas! Tu porcentaje de grasa estimado es ${bodyFat}%`);
            }
          }

          await saveProfileToCloud();
          await fetch(`${SUPABASE_URL}/rest/v1/body_metrics`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ weight_kg: Number(weight), note: finalNote })
          });
        }
      } else if (type === 'vapeo') {
        cleanSince = Date.now();
        localStorage.setItem('cleanSince', cleanSince);
        updateTimerAndSavings();
        await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ type: 'recaida', bpm: bpm ? Number(bpm) : null, mood: Number(mood), note })
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ type: 'estado', bpm: bpm ? Number(bpm) : null, mood: Number(mood), note })
        });
      }

      form.reset();
      alert('Datos guardados correctamente en la nube');
      loadData();
    });
  }

  if (userProfile) {
    document.getElementById('user-greeting').innerHTML = `${userProfile.name} <span>Trainer</span>`;
    document.getElementById('user-goal-subtitle').innerText = `Meta: Bajar ${userProfile.targetLossKg} kg en ${userProfile.weeks} semanas`;
  }

  if (authSession) syncProfileFromCloud();
  loadData();
  setInterval(loadData, 10000);
}

function updateHealthStats() {
  const validBpmLogs = (Array.isArray(allHealth) ? allHealth : []).filter(h => h.resting_bpm && Number(h.resting_bpm) > 35);
  const minBpmEl = document.getElementById('health-min-bpm');
  
  if (minBpmEl && validBpmLogs.length > 0) {
    const recentBpm = validBpmLogs.slice(-7).map(h => Number(h.resting_bpm));
    const minVal = Math.min(...recentBpm);
    minBpmEl.innerText = `${minVal} bpm`;
  }
}

function renderWeightChart() {
  const canvas = document.getElementById('weightChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');

  const validMetrics = (Array.isArray(allBodyMetrics) ? allBodyMetrics : [])
    .filter(item => item.weight_kg)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const dailyWeightMap = {};
  validMetrics.forEach(entry => {
    if (entry.created_at) {
      const d = new Date(entry.created_at);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyWeightMap[dayKey] = { weight: Number(entry.weight_kg), dateObj: d };
    }
  });

  const sortedKeys = Object.keys(dailyWeightMap).sort();
  const recentKeys = sortedKeys.slice(-14);
  const labels = recentKeys.map(k => dailyWeightMap[k].dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
  const dataValues = recentKeys.map(k => dailyWeightMap[k].weight);

  const monitorText = document.getElementById('weight-diagnostic-container');
  if (monitorText && sortedKeys.length >= 14) {
    const last7Days = sortedKeys.slice(-7).map(k => dailyWeightMap[k].weight);
    const prev7Days = sortedKeys.slice(-14, -7).map(k => dailyWeightMap[k].weight);
    const currentAvg = last7Days.reduce((a, b) => a + b, 0) / 7;
    const prevAvg = prev7Days.reduce((a, b) => a + b, 0) / 7;
    const diff = (currentAvg - prevAvg).toFixed(2);
    
    let diag = '';
    if (diff <= -0.1) diag = `<span style="color:#10b981;">Bajando (${diff} kg)</span>. Ritmo constante.`;
    else if (diff > 0.1) diag = `<span style="color:#ef4444;">Subiendo (+${diff} kg)</span>. Cuidado con la ingesta.`;
    else diag = `<span style="color:#f59e0b;">Estancamiento</span>. Meseta natural.`;

    monitorText.innerHTML = `<p>Media últimos 7 días: <strong>${currentAvg.toFixed(1)} kg</strong> (Semana anterior: ${prevAvg.toFixed(1)} kg).<br>Tendencia Real: ${diag}</p>`;
  } else if (monitorText && dataValues.length > 0) {
    monitorText.innerHTML = `<p>Último peso: <strong>${dataValues[dataValues.length - 1]} kg</strong>. Necesitamos 14 días para mostrar la tendencia semanal.</p>`;
  }

  if (window.weightChartInstance) window.weightChartInstance.destroy();
  window.weightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['Sin datos'],
      datasets: [{
        label: 'Peso Corporal (kg)',
        data: dataValues.length ? dataValues : [0],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#f59e0b',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: dataValues.length ? Math.floor(Math.min(...dataValues) - 2) : 0,
          max: dataValues.length ? Math.ceil(Math.max(...dataValues) + 2) : 100,
          grid: { color: '#1f2a44' },
          ticks: { color: '#94a3b8' }
        },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ==========================================
// ASISTENTE DE IA REAL CON GEMINI API (FIXED)
// ==========================================
function setupTrainerChat() {
  const toggleBtn = document.getElementById('btn-toggle-trainer-chat');
  const closeBtn = document.getElementById('btn-close-trainer-chat');
  const chatWindow = document.getElementById('trainer-chat-window');
  const sendBtn = document.getElementById('trainer-chat-send');
  const inputEl = document.getElementById('trainer-chat-input');
  const messagesBox = document.getElementById('trainer-chat-messages');

  if (!toggleBtn || !chatWindow) return;

  toggleBtn.addEventListener('click', () => {
    const isVisible = chatWindow.style.display === 'flex';
    chatWindow.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible && inputEl) inputEl.focus();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      chatWindow.style.display = 'none';
    });
  }

  // Chips de acceso rápido
  document.querySelectorAll('.chat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.getAttribute('data-cmd');
      if (inputEl) inputEl.value = cmd;
      handleUserMessage();
    });
  });

  const handleUserMessage = async () => {
    const text = inputEl.value.trim();
    if (!text) return;

    messagesBox.innerHTML += `<div style="background: #2563eb; color: white; padding: 8px 12px; border-radius: 10px; align-self: flex-end; max-width: 80%;"> ${text}</div>`;
    inputEl.value = '';
    messagesBox.scrollTop = messagesBox.scrollHeight;

    const loadingId = 'loading-' + Date.now();
    messagesBox.innerHTML += `<div id="${loadingId}" style="background: #1f2a44; border: 1px solid var(--card-border); padding: 8px 12px; border-radius: 10px; align-self: flex-start; color: var(--text-muted);">🤖 Pensando...</div>`;
    messagesBox.scrollTop = messagesBox.scrollHeight;

    try {
      let apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) {
        apiKey = prompt("Introduce tu API Key de Google AI Studio (la que empieza por AQ...):");
        if (apiKey) {
          localStorage.setItem('gemini_api_key', apiKey.trim());
        } else {
          document.getElementById(loadingId)?.remove();
          messagesBox.innerHTML += `<div style="background: #ef4444; color: white; padding: 8px 12px; border-radius: 10px; align-self: flex-start;">Falta la API Key de Gemini para continuar.</div>`;
          return;
        }
      }

      // URL limpia sin la clave en la URL
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

      const currentWeight = userProfile ? userProfile.weight : 80;
      const targetCals = document.getElementById('daily-target-calories')?.innerText || "2000 kcal";

      const systemPrompt = `Eres Alejandro Trainer Bot, un asistente experto en fitness, nutrición, suplementación y rendimiento deportivo. 
      El usuario actual pesa ${currentWeight} kg y su objetivo calórico diario es ${targetCals}. 
      Responde con cercanía, rigor y motivación. Si el usuario pide una acción, añade al final de tu respuesta:
      - [ACTION: SLEEP, X] (donde X son las horas)
      - [ACTION: WATER]
      - [ACTION: CHECKLIST]
      - [ACTION: INGREDIENT]`;

      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey.trim() // <-- Clave pasada por cabecera de seguridad
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\nUsuario: " + text }] }
          ]
        })
      });

      const data = await response.json();
      
      // Si Google devuelve un error en el JSON, lo capturamos para verlo claro
      if (!response.ok) {
        console.error("Error de la API de Google:", data);
        throw new Error(data.error?.message || "Error HTTP " + response.status);
      }

      let botReply = "No he podido procesar la respuesta de la IA.";
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        botReply = data.candidates[0].content.parts[0].text;
      }

      document.getElementById(loadingId)?.remove();

      // Intérprete de acciones
      const todayKey = 'dailyChecklist_' + new Date().toISOString().split('T')[0];

      if (botReply.includes('[ACTION: SLEEP')) {
        const match = botReply.match(/\[ACTION: SLEEP,\s*([\d.]+)\]/);
        const hours = match ? parseFloat(match[1]) : 8;
        dailyChecklist.sleep = hours;
        localStorage.setItem(todayKey, JSON.stringify(dailyChecklist));
        const sleepDisplay = document.getElementById('sleep-val-display');
        if (sleepDisplay) sleepDisplay.innerText = `${hours} h`;
        if (typeof renderCoachEngine === 'function') renderCoachEngine();
        botReply = botReply.replace(/\[ACTION:.*?\]/g, '');
      } 
      else if (botReply.includes('[ACTION: WATER]')) {
        dailyChecklist.water = (Number(dailyChecklist.water) || 0) + 0.5;
        localStorage.setItem(todayKey, JSON.stringify(dailyChecklist));
        const waterDisplay = document.getElementById('water-val-display');
        if (waterDisplay) waterDisplay.innerText = `${dailyChecklist.water.toFixed(2)} L`;
        botReply = botReply.replace(/\[ACTION:.*?\]/g, '');
      }
      else if (botReply.includes('[ACTION: CHECKLIST]')) {
        dailyChecklist.creatine = true;
        dailyChecklist.protein = true;
        dailyChecklist.steps = true;
        dailyChecklist.workout = true;
        dailyChecklist.clean = true;
        localStorage.setItem(todayKey, JSON.stringify(dailyChecklist));
        ['creatine', 'protein', 'steps', 'workout', 'clean'].forEach(k => {
          const el = document.getElementById('chk-' + k);
          if (el) el.checked = true;
        });
        botReply = botReply.replace(/\[ACTION:.*?\]/g, '');
      }
      else if (botReply.includes('[ACTION: INGREDIENT]')) {
        const newIng = { name: 'Arroz Basmati Extra', weight: 100, calories: 350, protein: 7 };
        userIngredients.push(newIng);
        localStorage.setItem('userIngredients', JSON.stringify(userIngredients));
        if (typeof renderIngredients === 'function') renderIngredients();
        if (typeof renderRecipeSelector === 'function') renderRecipeSelector();
        botReply = botReply.replace(/\[ACTION:.*?\]/g, '');
      }

      messagesBox.innerHTML += `<div style="background: #1f2a44; border: 1px solid var(--card-border); padding: 8px 12px; border-radius: 10px; align-self: flex-start; max-width: 80%; color: var(--text-main);">${botReply}</div>`;
      messagesBox.scrollTop = messagesBox.scrollHeight;

    } catch (err) {
      console.error("Error completo en chat:", err);
      document.getElementById(loadingId)?.remove();
      messagesBox.innerHTML += `<div style="background: #ef4444; color: white; padding: 8px 12px; border-radius: 10px; align-self: flex-start;">Error de IA: ${err.message}</div>`;
    }
  };

  if (sendBtn) sendBtn.addEventListener('click', handleUserMessage);
  if (inputEl) {
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleUserMessage();
    });
  }
}