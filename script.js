const synth = window.speechSynthesis;

// Element references
const textInput = document.getElementById('textInput');
const voiceSelect = document.getElementById('voiceSelect');
const rateRange = document.getElementById('rateRange');
const pitchRange = document.getElementById('pitchRange');
const volumeRange = document.getElementById('volumeRange');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const volumeValue = document.getElementById('volumeValue');
const charCount = document.getElementById('charCount');
const status = document.getElementById('status');
const speakBtn = document.getElementById('speakBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const themeToggle = document.getElementById('themeToggle');

let voices = [];
let currentUtterance = null;

// ===== VOICE SETUP =====
function populateVoiceList() {
  voices = synth.getVoices();
  voiceSelect.innerHTML = '';

  voices.forEach((voice, i) => {
    const option = document.createElement('option');
    option.textContent = `${voice.name} (${voice.lang})`;
    option.value = i;
    voiceSelect.appendChild(option);
  });
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}

// ===== CHARACTER COUNT =====
textInput.addEventListener('input', () => {
  const count = textInput.value.length;
  charCount.textContent = count;

  if (count === 0) {
    speakBtn.disabled = false;
    speakBtn.textContent = '🔊 Speak';
  }
});

// ===== RANGE SLIDERS =====
rateRange.addEventListener('input', () => {
  rateValue.textContent = rateRange.value + 'x';
});

pitchRange.addEventListener('input', () => {
  pitchValue.textContent = pitchRange.value;
});

volumeRange.addEventListener('input', () => {
  volumeValue.textContent = Math.round(volumeRange.value * 100) + '%';
});

// ===== STATUS MESSAGE =====
function setStatus(message, type = 'info') {
  status.textContent = message;
  status.style.color = type === 'error' ? '#ff6b6b' : '#667eea';
}

// ===== SPEAK FUNCTION =====
function speak() {
  if (synth.speaking) {
    setStatus('❌ Speech already in progress!', 'error');
    return;
  }

  if (textInput.value.trim() === '') {
    setStatus('❌ Please enter text first!', 'error');
    return;
  }

  currentUtterance = new SpeechSynthesisUtterance(textInput.value);
  const selectedVoice = voices[voiceSelect.value];

  currentUtterance.voice = selectedVoice;
  currentUtterance.rate = parseFloat(rateRange.value);
  currentUtterance.pitch = parseFloat(pitchRange.value);
  currentUtterance.volume = parseFloat(volumeRange.value);

  // Event listeners
  currentUtterance.onstart = () => {
    setStatus('🎤 Speaking...');
    speakBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
  };

  currentUtterance.onend = () => {
    setStatus('✅ Done!');
    resetButtons();
  };

  currentUtterance.onerror = (event) => {
    setStatus(`❌ Error: ${event.error}`, 'error');
    resetButtons();
  };

  synth.speak(currentUtterance);
}

// ===== PAUSE FUNCTION =====
function pause() {
  if (synth.speaking && !synth.paused) {
    synth.pause();
    setStatus('⏸️ Paused');
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
  }
}

// ===== RESUME FUNCTION =====
function resume() {
  if (synth.paused) {
    synth.resume();
    setStatus('🎤 Resumed...');
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
  }
}

// ===== STOP FUNCTION =====
function stop() {
  synth.cancel();
  setStatus('⏹️ Stopped');
  resetButtons();
}

// ===== RESET BUTTONS =====
function resetButtons() {
  speakBtn.disabled = false;
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
  stopBtn.disabled = true;
}

// ===== THEME TOGGLE =====
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
}

// Load saved theme
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  }
}

// ===== EVENT LISTENERS =====
speakBtn.addEventListener('click', speak);
pauseBtn.addEventListener('click', pause);
resumeBtn.addEventListener('click', resume);
stopBtn.addEventListener('click', stop);
themeToggle.addEventListener('click', toggleTheme);

// Initialize
loadTheme();
setStatus('Ready!');
