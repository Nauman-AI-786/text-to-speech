const synth = window.speechSynthesis;

// DOM Elements
const textInput = document.getElementById('textInput');
const voiceSelect = document.getElementById('voiceSelect');
const rateRange = document.getElementById('rateRange');
const pitchRange = document.getElementById('pitchRange');
const volumeRange = document.getElementById('volumeRange');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const volumeValue = document.getElementById('volumeValue');
const charCount = document.getElementById('charCount');
const charCount2 = document.getElementById('charCount2');
const wordCount = document.getElementById('wordCount');
const statusBar = document.querySelector('.status-bar');
const speakBtn = document.getElementById('speakBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const themeToggle = document.getElementById('themeToggle');
const infoBtn = document.getElementById('infoBtn');
const infoModal = document.getElementById('infoModal');
const modalClose = document.querySelector('.modal-close');

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

  if (voices.length === 0) {
    voiceSelect.innerHTML = '<option>No voices available</option>';
  }
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}

// ===== CHARACTER & WORD COUNT =====
function updateCounts() {
  const text = textInput.value;
  const chars = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  charCount.textContent = chars;
  charCount2.textContent = chars;
  wordCount.textContent = words;
}

textInput.addEventListener('input', updateCounts);

// ===== RANGE SLIDERS =====
rateRange.addEventListener('input', () => {
  rateValue.textContent = (parseFloat(rateRange.value)).toFixed(1) + 'x';
});

pitchRange.addEventListener('input', () => {
  pitchValue.textContent = (parseFloat(pitchRange.value)).toFixed(1);
});

volumeRange.addEventListener('input', () => {
  volumeValue.textContent = Math.round(parseFloat(volumeRange.value) * 100) + '%';
});

// ===== STATUS UPDATES =====
function setStatus(icon, message) {
  statusBar.querySelector('.status-icon').textContent = icon;
  statusBar.querySelector('.status-text').textContent = message;
}

// ===== MAIN SPEAK FUNCTION =====
function speak() {
  if (synth.speaking) {
    setStatus('❌', 'Speech already in progress!');
    return;
  }

  if (textInput.value.trim() === '') {
    setStatus('❌', 'Please enter text first!');
    return;
  }

  currentUtterance = new SpeechSynthesisUtterance(textInput.value);
  const selectedVoice = voices[voiceSelect.value];

  currentUtterance.voice = selectedVoice;
  currentUtterance.rate = parseFloat(rateRange.value);
  currentUtterance.pitch = parseFloat(pitchRange.value);
  currentUtterance.volume = parseFloat(volumeRange.value);

  // Event Listeners
  currentUtterance.onstart = () => {
    setStatus('🎤', 'Speaking now...');
    speakBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
  };

  currentUtterance.onpause = () => {
    setStatus('⏸️', 'Paused');
  };

  currentUtterance.onresume = () => {
    setStatus('▶️', 'Resumed');
  };

  currentUtterance.onend = () => {
    setStatus('✅', 'Done! Ready for more.');
    resetButtons();
  };

  currentUtterance.onerror = (event) => {
    setStatus('❌', `Error: ${event.error}`);
    resetButtons();
  };

  synth.speak(currentUtterance);
}

// ===== PAUSE FUNCTION =====
function pause() {
  if (synth.speaking && !synth.paused) {
    synth.pause();
    setStatus('⏸️', 'Paused');
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
  }
}

// ===== RESUME FUNCTION =====
function resume() {
  if (synth.paused) {
    synth.resume();
    setStatus('▶️', 'Resumed');
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
  }
}

// ===== STOP FUNCTION =====
function stop() {
  synth.cancel();
  setStatus('⏹️', 'Stopped');
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

// ===== LOAD SAVED THEME =====
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  }
}

// ===== MODAL FUNCTIONS =====
function openModal() {
  infoModal.classList.add('active');
}

function closeModal() {
  infoModal.classList.remove('active');
}

// ===== EVENT LISTENERS =====
speakBtn.addEventListener('click', speak);
pauseBtn.addEventListener('click', pause);
resumeBtn.addEventListener('click', resume);
stopBtn.addEventListener('click', stop);
themeToggle.addEventListener('click', toggleTheme);
infoBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);

// Close modal when clicking outside
infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    closeModal();
  }
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  // Spacebar to speak
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    if (!synth.speaking) {
      speak();
    }
  }
  // Escape to stop
  if (e.code === 'Escape' && synth.speaking) {
    stop();
  }
});

// ===== INITIALIZE =====
loadTheme();
setStatus('✨', 'Ready to speak!');
