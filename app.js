const SUPABASE_URL = "https://fckhkuamvuhgsbofncjh.supabase.co";
const SUPABASE_KEY = "sb_publishable_yioP3kIKXyRowVXpvPUpMw_GNQotMVy";
// Cargar y escuchar datos de Supabase
async function fetchLogs() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vape_logs?select=*&order=created_at.desc`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });
    const logs = await res.json();
    renderHistory(logs);
    updateCleanTimerFromLogs(logs);
  } catch (err) {
    console.error("Error al cargar datos:", err);
  }
}

// Guardar registro en Supabase
async function saveEntry(entry) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/vape_logs`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(entry)
    });
    fetchLogs();
  } catch (err) {
    console.error("Error al guardar:", err);
  }
}

// Gestión del temporizador
let cleanSince = localStorage.getItem('cleanSince') || Date.now();

function updateCleanTimerFromLogs(logs) {
  const lastReset = logs.find(l => l.type === 'recaida');
  if (lastReset) {
    cleanSince = new Date(lastReset.created_at).getTime();
  }
}

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

document.getElementById('btn-reset-timer').addEventListener('click', () => {
  if (confirm("¿Seguro que quieres reiniciar el contador? Todo nuevo intento suma.")) {
    cleanSince = Date.now();
    localStorage.setItem('cleanSince', cleanSince);
    saveEntry({ type: 'recaida', note: 'Reinicio de contador' });
  }
});

// Botón de Urgencia web
document.getElementById('btn-craving').addEventListener('click', () => {
  saveEntry({
    type: 'urgencia',
    note: 'Brotes de urgencia registrados desde la web'
  });
  alert('¡Urgencia registrada! Inhala hondo 4 segundos y bebe agua.');
});

// Slider de ánimo
const moodSlider = document.getElementById('mood');
const moodVal = document.getElementById('mood-value');
moodSlider.addEventListener('input', (e) => moodVal.innerText = e.target.value);

// Formulario manual
document.getElementById('tracker-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const mood = moodSlider.value;
  const bpm = document.getElementById('heart-rate').value;
  const notes = document.getElementById('notes').value;

  saveEntry({
    type: 'estado',
    mood: Number(mood),
    bpm: bpm ? Number(bpm) : null,
    note: notes
  });

  document.getElementById('notes').value = '';
  document.getElementById('heart-rate').value = '';
});

// Renderizar historial
function renderHistory(entries) {
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  entries.slice(0, 15).forEach(item => {
    const li = document.createElement('li');
    li.className = `history-item ${item.type === 'urgencia' ? 'craving' : ''}`;
    const dateObj = new Date(item.created_at);
    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = dateObj.toLocaleDateString();

    if (item.type === 'urgencia') {
      li.innerHTML = `<strong>⚠️ Urgencia</strong> ${item.bpm ? `| ❤️ ${item.bpm} bpm` : ''} - ${date} ${time}<br><small>${item.note || ''}</small>`;
    } else if (item.type === 'recaida') {
      li.innerHTML = `<strong>🔄 Reinicio</strong> - ${date} ${time}`;
    } else {
      li.innerHTML = `<strong>Ánimo: ${item.mood}/10</strong> ${item.bpm ? `| ❤️ ${item.bpm} bpm` : ''} - ${time}<br><small>${item.note || 'Sin notas'}</small>`;
    }
    list.appendChild(li);
  });
}

// Carga inicial y refresco cada 10 segundos
fetchLogs();
setInterval(fetchLogs, 10000);