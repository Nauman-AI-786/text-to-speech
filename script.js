// ===== GLOBAL VARIABLES =====
const synth = window.speechSynthesis;

// DOM Elements
const textInput = document.getElementById('textInput');
const languageSelect = document.getElementById('languageSelect');
const genderButtons = document.querySelectorAll('.gender-btn');
const voiceSearch = document.getElementById('voiceSearch');
const voiceSelect = document.getElementById('voiceSelect');
const previewBtn = document.getElementById('previewBtn');
const speedRange = document.getElementById('speedRange');
const pitchRange = document.getElementById('pitchRange');
const speedValue = document.getElementById('speedValue');
const pitchValue = document.getElementById('pitchValue');
const autoplayCheck = document.getElementById('autoplayCheck');
const formatButtons = document.querySelectorAll('.format-btn');
const fileImport = document.getElementById('fileImport');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const generateBtn = document.getElementById('generateBtn');
const stopBtn = document.getElementById('stopBtn');
const themeToggle = document.getElementById('themeToggle');
const charDisplay = document.getElementById('charDisplay');
const lineDisplay = document.getElementById('lineDisplay');
const charCount2 = document.getElementById('charCount2');
const wordCount = document.getElementById('wordCount');
const status = document.getElementById('status');
const resultsList = document.getElementById('resultsList');
const resultsCount = document.querySelector('.results-count');

// State Variables
let voices = [];
let allVoices = [];
let selectedGender = 'all';
let selectedFormat = 'mp3';
let currentUtterance = null;
let isGenerating = false;
let generatedAudios = [];

// Voice Database (with gender info)
const voiceDatabase = {
  'en-US': [
    { name: 'Google US English', gender: 'female' },
    { name: 'Google US English', gender: 'male' },
  ],
  'hi-IN': [
    { name: 'Google हिन्दी', gender: 'female' },
    { name: 'Google हिन्दी', gender: 'male' },
  ],
  'ur-PK': [
    { name: 'Google اردو', gender: 'female' },
    { name: 'Google اردو', gender: 'male' },
  ],
};

// ===== INITIALIZATION =====
function init() {
  loadTheme();
  populateVoices();
  setupEventListeners();
  updateCharCount();
}

// ===== THEME MANAGEMENT =====
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  }
}

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
});

// ===== VOICE MANAGEMENT =====
function populateVoices() {
  voices = synth.getVoices();
  if (voices.length > 0) {
    updateVoiceList();
  } else {
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        voices = synth.getVoices();
        updateVoiceList();
      };
    }
  }
}

function updateVoiceList() {
  voiceSelect.innerHTML = '';
  const selectedLang = languageSelect.value;
  
  const filteredVoices = voices.filter(voice => 
    voice.lang.startsWith(selectedLang.split('-')[0])
  );

  const genderFilteredVoices = filteredVoices.filter(voice => {
    if (selectedGender === 'all') return true;
    if (selectedGender === 'male') return voice.name.includes('male') || !voice.name.includes('female');
    if (selectedGender === 'female') return voice.name.includes('female') || voice.name.includes('woman');
    return true;
  });

  if (genderFilteredVoices.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'No voices available for this selection';
    voiceSelect.appendChild(option);
    return;
  }

  genderFilteredVoices.forEach((voice, index) => {
    const option = document.createElement('option');
    option.textContent = `${voice.name} (${voice.lang})`;
    option.value = voice.name;
    voiceSelect.appendChild(option);
  });
}

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
  // Language Change
  languageSelect.addEventListener('change', () => {
    updateVoiceList();
    updateCharCount();
  });

  // Gender Filter
  genderButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      genderButtons.forEach(b => b.classList.remove('active'));
      e.target.closest('.gender-btn').classList.add('active');
      selectedGender = e.target.closest('.gender-btn').dataset.gender;
      updateVoiceList();
    });
  });


  // Format Selection
  formatButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      formatButtons.forEach(b => b.classList.remove('active'));
      e.target.closest('.format-btn').classList.add('active');
      selectedFormat = e.target.closest('.format-btn').dataset.format;
    });
  });

  // Speed Range
  speedRange.addEventListener('input', (e) => {
    speedValue.textContent = e.target.value + '%';
  });

  // Pitch Range
  pitchRange.addEventListener('input', (e) => {
    pitchValue.textContent = e.target.value + '%';
  });

  // Text Input Events
  textInput.addEventListener('input', updateCharCount);
  textInput.addEventListener('input', updateWordCount);

  // Clear Button
  clearBtn.addEventListener('click', () => {
    textInput.value = '';
    updateCharCount();
    updateWordCount();
    setStatus('✨', 'Text cleared');
  });

  // Copy Button
  copyBtn.addEventListener('click', () => {
    if (textInput.value) {
      navigator.clipboard.writeText(textInput.value).then(() => {
        setStatus('✅', 'Text copied to clipboard!');
        setTimeout(() => setStatus('✨', 'Ready to generate audio'), 2000);
      });
    }
  });

  // Preview Voice
  previewBtn.addEventListener('click', previewVoice);

  // Generate Button
  generateBtn.addEventListener('click', generateAudio);

  // Stop Button
  stopBtn.addEventListener('click', stopGeneration);

  // File Import
  fileImport.addEventListener('change', importFile);

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter' && textInput.value) {
      generateAudio();
    }
    if (e.key === 'Escape' && isGenerating) {
      stopGeneration();
    }
  });
}

// ===== TEXT UPDATES =====
function updateCharCount() {
  const text = textInput.value;
  const chars = text.length;
  const lines = text === '' ? 0 : text.split('\n').length;

  charDisplay.textContent = chars;
  lineDisplay.textContent = lines;
  charCount2.textContent = chars;

  // Update button states
  generateBtn.disabled = chars === 0;
  previewBtn.disabled = chars === 0;
}

function updateWordCount() {
  const text = textInput.value;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  wordCount.textContent = words;
}

// ===== PREVIEW VOICE =====
function previewVoice() {
  if (isGenerating || synth.speaking) {
    setStatus('❌', 'Speech in progress!');
    return;
  }

  const previewText = "Hello! This is a preview of the selected voice.";
  speakText(previewText, true);
  setStatus('🔊', 'Previewing voice...');
}

// ===== GENERATE AUDIO =====
function generateAudio() {
  const text = textInput.value.trim();
  if (!text) { setStatus('❌', 'Pehle text likhein!'); return; }
  if (synth.speaking) { setStatus('❌', 'Pehle wali speech chal rahi hai!'); return; }

  isGenerating = true;
  stopBtn.disabled = false;
  setStatus('🔊', 'Aap ka text play ho raha hai...');

  speakText(text, false);
  addResultCard(text);          // history ke liye (neeche FIX 3)
}

function speakText(text, isPreview = false) {
  synth.cancel();               // pehle cancel

  const utter = new SpeechSynthesisUtterance(text);
  const v = getSelectedVoice(); // FIX 4 wala helper
  if (v) { utter.voice = v; utter.lang = v.lang; }

  const rate  = parseInt(speedRange.value) / 100;
  const pitch = parseInt(pitchRange.value) / 100;
  utter.rate  = Math.min(2, Math.max(0.5, 1 + rate));
  utter.pitch = Math.min(2, Math.max(0,   1 + pitch));
  utter.volume = 1;

  utter.onstart = () => { if (!isPreview) stopBtn.disabled = false; };
  utter.onend   = () => { isGenerating = false; stopBtn.disabled = true;
                          if (!isPreview) setStatus('✅', 'Done!'); };
  utter.onerror = (e) => { isGenerating = false;
                           setStatus('❌', 'Voice error: ' + e.error); };

  setTimeout(() => synth.speak(utter), 100); // delay zaroori hai
}


  async function downloadAudio(text) {
  const voiceMap = {
    'en-US': 'Joanna', 'en-GB': 'Amy',  'hi-IN': 'Aditi',
    'ur-PK': 'Aditi',  'ar-SA': 'Zeina','fr-FR': 'Celine',
    'de-DE': 'Marlene','es-ES': 'Conchita','it-IT': 'Carla',
    'ja-JP': 'Mizuki','ko-KR': 'Seoyeon','ru-RU': 'Tatyana',
    'pt-BR': 'Vitoria','zh-CN': 'Zhiyu'
  };
  const voice = voiceMap[languageSelect.value] || 'Joanna';

  setStatus('⏳', 'Download tayyar ho raha hai...');
  try {
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text.slice(0, 3000))}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API failed');
    const blob = await res.blob();

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `speech-${Date.now()}.mp3`;
    a.click();
    setStatus('✅', 'Download ho gaya!');
  } catch (err) {
    console.error(err);
    setStatus('❌', 'Download fail — internet check karein');
  }
  }
function getSelectedVoice() {
  const name = voiceSelect.value;
  return voices.find(v => v.name === name) || voices[0];
}

// ===== SPEAK TEXT =====
function speakText(text, isPreview = false) {
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  const v = getSelectedVoice();          // ✅ NAYA helper use karta hai
  if (v) { utter.voice = v; utter.lang = v.lang; }

  const rate  = parseInt(speedRange.value) / 100;
  const pitch = parseInt(pitchRange.value) / 100;
  utter.rate  = Math.min(2, Math.max(0.5, 1 + rate));
  utter.pitch = Math.min(2, Math.max(0,   1 + pitch));
  utter.volume = 1;

  utter.onstart = () => { if (!isPreview) stopBtn.disabled = false; };
  utter.onend   = () => { isGenerating = false; stopBtn.disabled = true;
                          if (!isPreview) setStatus('✅', 'Done!'); };
  utter.onerror = (e) => { isGenerating = false;
                           setStatus('❌', 'Voice error: ' + e.error); };

  setTimeout(() => synth.speak(utter), 100);
}
// ===== CREATE AUDIO BLOB =====
function createAudioBlob(text) {
  // Simulating audio generation - in real scenario, use Web Audio API or backend
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Create a simple waveform visualization
  canvas.width = 800;
  canvas.height = 100;
  
  ctx.fillStyle = '#667eea';
  for (let i = 0; i < canvas.width; i++) {
    const y = Math.random() * canvas.height;
    ctx.fillRect(i, canvas.height / 2 - y / 2, 1, y);
  }
  
  return canvas.toDataURL('image/png');
}

// ===== ADD RESULT CARD =====
function addResultCard(text) {
  const card = document.createElement('div');
  card.className = 'audio-card';
  card.innerHTML = `
    <div class="audio-text">${escapeHtml(text.substring(0, 120))}</div>
    <div class="audio-actions">
      <button class="btn btn-secondary btn-download" style="flex:1;">
        <span>⬇️</span> Download MP3
      </button>
      <button class="btn btn-secondary btn-copy-text" style="flex:1;">
        <span>📋</span> Copy
      </button>
      <button class="btn btn-secondary btn-remove" style="flex:1;">
        <span>🗑️</span> Remove
      </button>
    </div>`;

  card.querySelector('.btn-download').addEventListener('click', () => downloadAudio(text));
  card.querySelector('.btn-copy-text').addEventListener('click', () =>
    navigator.clipboard.writeText(text).then(() => setStatus('✅', 'Text copied!')));
  card.querySelector('.btn-remove').addEventListener('click', () => {
    card.remove();
    generatedAudios = generatedAudios.filter(i => i.text !== text);
    updateResultsDisplay();
  });

  if (resultsList.querySelector('.empty-state')) resultsList.innerHTML = '';
  resultsList.appendChild(card);
  generatedAudios.push({ text });
  updateResultsDisplay();
}

// ===== UPDATE RESULTS DISPLAY =====
function updateResultsDisplay() {
  const count = generatedAudios.length;
  resultsCount.textContent = count > 0 
    ? `${count} generated ${count === 1 ? 'item' : 'items'}`
    : 'No generated items yet';
}

// ===== STOP GENERATION =====
function stopGeneration() {
  synth.cancel();
  isGenerating = false;
  generateBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus('⏹️', 'Generation stopped');
}

// ===== FILE IMPORT =====
function importFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target.result;
    textInput.value = content;
    updateCharCount();
    updateWordCount();
    setStatus('📁', 'File imported successfully!');
  };

  if (file.type === 'text/plain') {
    reader.readAsText(file);
  } else {
    setStatus('❌', 'Only .txt files are supported');
  }
}

// ===== STATUS MANAGEMENT =====
function setStatus(icon, message) {
  status.querySelector('.status-icon').textContent = icon;
  status.querySelector('.status-text').textContent = message;
}

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== LOCAL STORAGE =====
function saveToLocalStorage() {
  localStorage.setItem('ttsText', textInput.value);
  localStorage.setItem('selectedLanguage', languageSelect.value);
  localStorage.setItem('selectedFormat', selectedFormat);
}

function loadFromLocalStorage() {
  const savedText = localStorage.getItem('ttsText');
  const savedLanguage = localStorage.getItem('selectedLanguage');
  const savedFormat = localStorage.getItem('selectedFormat');

  if (savedText) textInput.value = savedText;
  if (savedLanguage) languageSelect.value = savedLanguage;
  if (savedFormat) selectedFormat = savedFormat;

  updateCharCount();
}

// Save before leaving
window.addEventListener('beforeunload', saveToLocalStorage);

// ===== ANALYTICS TRACKING =====
function trackEvent(eventName, details) {
  console.log(`Event: ${eventName}`, details);
  // Send to analytics service if available
}

// Track generation
generateBtn.addEventListener('click', () => {
  trackEvent('audio_generated', {
    language: languageSelect.value,
    textLength: textInput.value.length,
    format: selectedFormat
  });
});

// ===== INITIALIZATION ON PAGE LOAD =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Auto-load saved data
loadFromLocalStorage();

// ===== ADDITIONAL FEATURES =====

// Copy to Clipboard Utility
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

// Share Audio
function shareAudio(audioUrl, text) {
  if (navigator.share) {
    navigator.share({
      title: 'Check out this audio!',
      text: text.substring(0, 50) + '...',
      url: audioUrl
    }).catch(err => console.log('Share failed:', err));
  } else {
    alert('Share not supported on this device');
  }
}

// Voice Rate Presets
const ratePresets = {
  slow: -50,
  normal: 0,
  fast: 50
};

// Add keyboard shortcuts info
console.log('%cAI Voice Studio Shortcuts:', 'font-size: 14px; font-weight: bold; color: #667eea;');
console.log('%cCtrl + Enter: Generate Audio', 'font-size: 12px;');
console.log('%cEsc: Stop Generation', 'font-size: 12px;');

// ===== PERFORMANCE OPTIMIZATION =====
// Debounce voice search
let searchTimeout;
voiceSearch.addEventListener('input', function(e) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const searchTerm = e.target.value.toLowerCase();
    Array.from(voiceSelect.options).forEach(option => {
      option.style.display = option.textContent.toLowerCase().includes(searchTerm) 
        ? 'block' 
        : 'none';
    });
  }, 300);
});

// ===== ERROR HANDLING =====
window.addEventListener('error', (event) => {
  console.error('Error occurred:', event.error);
  setStatus('❌', 'An error occurred. Please try again.');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  setStatus('❌', 'An error occurred. Please try again.');
});

// ===== EXPORT FUNCTIONS FOR DEBUGGING =====
window.AIVoiceStudio = {
  getVoices: () => voices,
  generateAudio: generateAudio,
  stopGeneration: stopGeneration,
  setStatus: setStatus,
  getSettings: () => ({
    language: languageSelect.value,
    format: selectedFormat,
    speed: speedRange.value,
    pitch: pitchRange.value,
    gender: selectedGender,
    autoplay: autoplayCheck.checked
  })
};
