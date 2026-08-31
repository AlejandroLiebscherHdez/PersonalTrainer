// Gestión del temporizador
let cleanSince = localStorage.getItem('cleanSince') || Date.now();
localStorage.setItem('cleanSince', cleanSince);

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
  if (confirm("¿Seguro que quieres reiniciar el contador? Todo comienzo cuenta.")) {
    cleanSince = Date.now();
    localStorage.setItem('cleanSince', cleanSince);
    saveEntry({ type: 'recaida', date: new Date().toISOString(), note: 'Reinicio de contador' });
    updateTimer();
  }
});

// Botón de Urgencia (Craving)
document.getElementById('btn-craving').addEventListener('click', () => {
  saveEntry({
    type: 'urgencia',
    date: new Date().toISOString(),
    note: 'Brotes de ganas de vapear superados/registrados'
  });
  alert('¡Urgencia registrada! Respira hondo, bebe un vaso de agua y mantén la calma.');
});

// Sincronizar valor visual del slider de ánimo
const moodSlider = document.getElementById('mood');
const moodVal = document.getElementById('mood-value');
moodSlider.addEventListener('input', (e) => moodVal.innerText = e.target.value);

// Formulario de estado y pulsaciones
document.getElementById('tracker-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const mood = moodSlider.value;
  const bpm = document.getElementById('heart-rate').value;
  const notes = document.getElementById('notes').value;

  saveEntry({
    type: 'estado',
    date: new Date().toISOString(),
    mood: mood,
    bpm: bpm || null,
    note: notes
  });

  document.getElementById('notes').value = '';
  document.getElementById('heart-rate').value = '';
});

// Guardar y renderizar registros en localStorage
function saveEntry(entry) {
  const entries = JSON.parse(localStorage.getItem('vapeLogs') || '[]');
  entries.unshift(entry);
  localStorage.setItem('vapeLogs', JSON.stringify(entries));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  const entries = JSON.parse(localStorage.getItem('vapeLogs') || '[]');
  list.innerHTML = '';

  entries.slice(0, 10).forEach(item => {
    const li = document.createElement('li');
    li.className = `history-item ${item.type === 'urgencia' ? 'craving' : ''}`;
    const time = new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(item.date).toLocaleDateString();

    if (item.type === 'urgencia') {
      li.innerHTML = `<strong>⚠️ Urgencia</strong> - ${date} ${time}<br><small>${item.note}</small>`;
    } else if (item.type === 'recaida') {
      li.innerHTML = `<strong>🔄 Reinicio</strong> - ${date} ${time}`;
    } else {
      li.innerHTML = `<strong>Ánimo: ${item.mood}/10</strong> ${item.bpm ? `| ${item.bpm} bpm` : ''} - ${time}<br><small>${item.note || 'Sin notas'}</small>`;
    }
    list.appendChild(li);
  });
}

renderHistory();