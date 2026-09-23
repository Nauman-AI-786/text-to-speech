const synth = window.speechSynthesis;
let voices = [];
let currentUtterance = null;
let isPaused = false;

// Elements
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

// Load saved text
const savedText = localStorage.getItem('tts_last_text');
if (savedText) textInput.value = savedText;
updateCharCount();

// Theme
const savedTheme = localStorage.getItem('tts_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('tts_theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// Voices
function loadVoices() {
  voices = synth.getVoices();
  voiceSelect.innerHTML = '';

  // Prefer Urdu / Hindi first
  const preferred = voices.filter(v => 
    v.lang.includes('ur') || v.lang.includes('hi') || v.lang.includes('en')
  );
  const others = voices.filter(v => 
    !v.lang.includes('ur') && !v.lang.includes('hi') && !v.lang.includes('en')
  );
  const ordered = [...preferred, ...others];

  ordered.forEach((voice, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${voice.name} (${voice.lang})`;
    
    // Default select first Urdu or Hindi
    if (i === 0 || voice.lang.includes('ur') || voice.lang.includes('hi')) {
      option.selected = true;
    }
    voiceSelect.appendChild(option);
  });
}

loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

// Character count + save
function updateCharCount() {
  const len = textInput.value.length;
  charCount.textContent = len;
  localStorage.setItem('tts_last_text', textInput.value);
}

textInput.addEventListener('input', updateCharCount);

// Sliders
rateRange.addEventListener('input', () => {
  rateValue.textContent = parseFloat(rateRange.value).toFixed(1) + 'x';
});
pitchRange.addEventListener('input', () => {
  pitchValue.textContent = parseFloat(pitchRange.value).toFixed(1);
});
volumeRange.addEventListener('input', () => {
  volumeValue.textContent = Math.round(volumeRange.value * 100) + '%';
});

// Button states
function setSpeakingState(speaking) {
  speakBtn.disabled = speaking;
  pauseBtn.disabled = !speaking || isPaused;
  resumeBtn.disabled = !speaking || !isPaused;
  stopBtn.disabled = !speaking;
}

function setStatus(msg, type = '') {
  status.textContent = msg;
  status.className = 'status ' + type;
}

// Speak
speakBtn.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (!text) {
    setStatus('Pehle text likhein!', 'error');
    return;
  }

  // Stop any previous
  synth.cancel();
  isPaused = false;

  const utterance = new SpeechSynthesisUtterance(text);
  const selectedIndex = voiceSelect.value;
  const ordered = [...voices.filter(v => v.lang.includes('ur') || v.lang.includes('hi') || v.lang.includes('en')), 
                   ...voices.filter(v => !v.lang.includes('ur') && !v.lang.includes('hi') && !v.lang.includes('en'))];
  
  if (ordered[selectedIndex]) {
    utterance.voice = ordered[selectedIndex];
  }

  utterance.rate = parseFloat(rateRange.value);
  utterance.pitch = parseFloat(pitchRange.value);
  utterance.volume = parseFloat(volumeRange.value);

  utterance.onstart = () => {
    setSpeakingState(true);
    setStatus('Speaking...', 'speaking');
  };

  utterance.onend = () => {
    setSpeakingState(false);
    isPaused = false;
    setStatus('Completed ✓');
  };

  utterance.onerror = (e) => {
    setSpeakingState(false);
    setStatus('Error: ' + e.error, 'error');
  };

  currentUtterance = utterance;
  synth.speak(utterance);
});

// Pause
pauseBtn.addEventListener('click', () => {
  if (synth.speaking && !synth.paused) {
    synth.pause();
    isPaused = true;
    setSpeakingState(true);
    setStatus('Paused');
  }
});

// Resume
resumeBtn.addEventListener('click', () => {
  if (synth.paused) {
    synth.resume();
    isPaused = false;
    setSpeakingState(true);
    setStatus('Speaking...', 'speaking');
  }
});

// Stop
stopBtn.addEventListener('click', () => {
  synth.cancel();
  isPaused = false;
  setSpeakingState(false);
  setStatus('Stopped');
});

// Keyboard shortcut
textInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    speakBtn.click();
  }
});
