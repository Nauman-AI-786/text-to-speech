// ===== AI VOICE STUDIO - script.js =====
(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    const synth = window.speechSynthesis;
    const $ = (id) => document.getElementById(id);

    // ===== DOM ELEMENTS =====
    const textInput = $('textInput');
    const languageSelect = $('languageSelect');
    const genderButtons = document.querySelectorAll('.gender-btn');
    const voiceSearch = $('voiceSearch');
    const voiceSelect = $('voiceSelect');
    const previewBtn = $('previewBtn');
    const speedRange = $('speedRange');
    const pitchRange = $('pitchRange');
    const speedValue = $('speedValue');
    const pitchValue = $('pitchValue');
    const autoplayCheck = $('autoplayCheck');
    const formatButtons = document.querySelectorAll('.format-btn');
    const fileImport = $('fileImport');
    const clearBtn = $('clearBtn');
    const copyBtn = $('copyBtn');
    const generateBtn = $('generateBtn');
    const stopBtn = $('stopBtn');
    const themeToggle = $('themeToggle');
    const charDisplay = $('charDisplay');
    const lineDisplay = $('lineDisplay');
    const charCount2 = $('charCount2');
    const wordCount = $('wordCount');
    const statusBox = $('status');
    const resultsList = $('resultsList');
    const resultsCount = document.querySelector('.results-count');

    // ===== STATE =====
    let voices = [];
    let selectedGender = 'all';
    let selectedFormat = 'mp3';
    let isGenerating = false;
    let generatedAudios = [];

    const previewTexts = {
      'en-US': 'Hello! This is a preview of the selected voice.',
      'en-GB': 'Hello! This is a preview of the selected voice.',
      'hi-IN': 'नमस्ते! यह चुनी हुई आवाज़ का नमूना है।',
      'ur-PK': 'السلام علیکم! یہ منتخب آواز کا نمونہ ہے۔'
    };

    // ===== NATURAL VOICES (Puter.js, free) =====
    const NATURAL_VOICES = [
      { id: 'puter:elevenlabs:21m00Tcm4TlvDq8ikWAM', label: 'Rachel (Natural, Female)', gender: 'female', provider: 'elevenlabs', voice: '21m00Tcm4TlvDq8ikWAM' },
      { id: 'puter:elevenlabs:pNInz6obpgDQGcFmaJgB', label: 'Adam (Natural, Male)', gender: 'male', provider: 'elevenlabs', voice: 'pNInz6obpgDQGcFmaJgB' },
      { id: 'puter:openai:nova', label: 'Nova (Natural, Female)', gender: 'female', provider: 'openai', voice: 'nova' },
      { id: 'puter:openai:shimmer', label: 'Shimmer (Natural, Female)', gender: 'female', provider: 'openai', voice: 'shimmer' },
      { id: 'puter:openai:onyx', label: 'Onyx (Natural, Male)', gender: 'male', provider: 'openai', voice: 'onyx' },
      { id: 'puter:openai:echo', label: 'Echo (Natural, Male)', gender: 'male', provider: 'openai', voice: 'echo' },
      { id: 'puter:openai:alloy', label: 'Alloy (Natural, Neutral)', gender: 'all', provider: 'openai', voice: 'alloy' }
    ];
    let currentAudio = null;

    function puterReady() {
      return typeof puter !== 'undefined' && puter.ai && puter.ai.txt2speech;
    }
    function getNaturalSelected() {
      return NATURAL_VOICES.find(n => n.id === voiceSelect.value) || null;
    }
    function naturalOptions(nv) {
      return nv.provider === 'openai'
        ? { provider: 'openai', model: 'gpt-4o-mini-tts', voice: nv.voice }
        : { provider: 'elevenlabs', model: 'eleven_multilingual_v2', voice: nv.voice };
    }
    function stopNatural() {
      if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
    }

    // ===== STATUS =====
    function setStatus(icon, message) {
      if (!statusBox) return;
      const i = statusBox.querySelector('.status-icon');
      const t = statusBox.querySelector('.status-text');
      if (i) i.textContent = icon;
      if (t) t.textContent = message;
    }

    // ===== THEME =====
    function loadTheme() {
      let saved = null;
      try { saved = localStorage.getItem('theme'); } catch (e) {}
      if (saved === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
      }
    }

    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
      themeToggle.textContent = isDark ? '☀️' : '🌙';
    });

    // ===== VOICES =====
    function populateVoices() {
      voices = synth.getVoices();
      updateVoiceList();
      synth.onvoiceschanged = () => {
        voices = synth.getVoices();
        updateVoiceList();
      };
    }

    function updateVoiceList() {
      const lang = languageSelect.value;
      const base = lang.split('-')[0];
      const norm = (l) => l.replace('_', '-');

      let list = voices.filter(v => norm(v.lang) === lang);
      if (!list.length) list = voices.filter(v => norm(v.lang).startsWith(base));

      if (selectedGender !== 'all') {
        const re = selectedGender === 'female' ? /\b(female|woman)\b/i : /\bmale\b/i;
        const g = list.filter(v => re.test(v.name));
        if (g.length) list = g; // naam mein gender na ho to sab dikhao
      }

      const term = voiceSearch.value.trim().toLowerCase();
      if (term) list = list.filter(v => (v.name + ' ' + v.lang).toLowerCase().includes(term));

      const prev = voiceSelect.value;
      voiceSelect.innerHTML = '';

      const nat = puterReady() ? NATURAL_VOICES.filter(n =>
        (selectedGender === 'all' || n.gender === 'all' || n.gender === selectedGender) &&
        (!term || n.label.toLowerCase().includes(term))) : [];

      if (nat.length) {
        const g = document.createElement('optgroup');
        g.label = '✨ Natural voices (Puter)';
        nat.forEach(n => {
          const o = document.createElement('option');
          o.textContent = n.label;
          o.value = n.id;
          g.appendChild(o);
        });
        voiceSelect.appendChild(g);
      }

      if (list.length) {
        const g = document.createElement('optgroup');
        g.label = '📱 Device voices';
        list.forEach(v => {
          const o = document.createElement('option');
          o.textContent = `${v.name} (${v.lang})`;
          o.value = v.voiceURI;
          g.appendChild(o);
        });
        voiceSelect.appendChild(g);
      } else if (!nat.length) {
        const o = document.createElement('option');
        o.textContent = 'Is selection ki koi voice nahi mili';
        o.value = '';
        voiceSelect.appendChild(o);
      }

      if (prev && Array.from(voiceSelect.options).some(o => o.value === prev)) voiceSelect.value = prev;
    }

    function getSelectedVoice() {
      return voices.find(v => v.voiceURI === voiceSelect.value) || null;
    }

    // ===== SPEAKING =====
    // Slider ki range -50..50 ho ya 50..200, dono ke liye theek kaam karta hai
    function sliderFactor(el) {
      const v = parseInt(el.value, 10);
      const min = parseInt(el.min, 10);
      return min < 0 ? 1 + v / 100 : v / 100;
    }

    function splitText(text) {
      const sentences = text.match(/[^.!?۔\n]+[.!?۔]*/g) || [text];
      const out = [];
      sentences.forEach(s => {
        s = s.trim();
        while (s.length > 220) {
          let cut = s.lastIndexOf(' ', 220);
          if (cut < 50) cut = 220;
          out.push(s.slice(0, cut));
          s = s.slice(cut).trim();
        }
        if (s) out.push(s);
      });
      return out;
    }

    async function speakNatural(text, isPreview, nv) {
      synth.cancel();
      stopNatural();
      try {
        setStatus('⏳', 'Natural awaaz ban rahi hai (Puter sign-in maang sakta hai)...');
        const audio = await puter.ai.txt2speech(text.slice(0, 3000), naturalOptions(nv));
        currentAudio = audio;
        audio.playbackRate = Math.min(2, Math.max(0.5, sliderFactor(speedRange)));
        audio.onended = () => {
          isGenerating = false;
          stopBtn.disabled = true;
          setStatus('✅', isPreview ? 'Preview complete' : 'Done!');
        };
        await audio.play();
        stopBtn.disabled = false;
        setStatus('🔊', 'Natural awaaz chal rahi hai...');
      } catch (err) {
        console.warn('Natural voice fail:', err);
        setStatus('⚠️', 'Natural awaaz nahi chali, device awaaz use ho rahi hai');
        speakBrowser(text, isPreview);
      }
    }

    function speakText(text, isPreview) {
      const nv = getNaturalSelected();
      if (nv && puterReady()) return speakNatural(text, isPreview, nv);
      stopNatural();
      speakBrowser(text, isPreview);
    }

    function speakBrowser(text, isPreview) {
      synth.cancel();
      const chunks = splitText(text);
      if (!chunks.length) return;

      const v = getSelectedVoice();
      const rate = Math.min(2, Math.max(0.5, sliderFactor(speedRange)));
      const pitch = Math.min(2, Math.max(0, sliderFactor(pitchRange)));

      // cancel ke foran baad speak karne se Chrome kabhi ruk jata hai
      setTimeout(() => {
        chunks.forEach((c, i) => {
          const u = new SpeechSynthesisUtterance(c);
          if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = languageSelect.value; }
          u.rate = rate;
          u.pitch = pitch;
          u.volume = 1;

          if (i === 0 && !isPreview) u.onstart = () => { stopBtn.disabled = false; };
          if (i === chunks.length - 1) {
            u.onend = () => {
              isGenerating = false;
              stopBtn.disabled = true;
              setStatus('✅', isPreview ? 'Preview complete' : 'Done!');
            };
          }
          u.onerror = (e) => {
            if (e.error === 'canceled' || e.error === 'interrupted') return;
            isGenerating = false;
            stopBtn.disabled = true;
            setStatus('❌', 'Voice error: ' + e.error);
          };
          synth.speak(u);
        });
      }, 100);
    }

    function previewVoice() {
      if (isGenerating) { setStatus('❌', 'Speech in progress!'); return; }
      speakText(previewTexts[languageSelect.value] || previewTexts['en-US'], true);
      setStatus('🔊', 'Previewing voice...');
    }

    function generateAudio() {
      const text = textInput.value.trim();
      if (!text) { setStatus('❌', 'Pehle text likhein!'); return; }

      isGenerating = true;
      stopBtn.disabled = false;
      setStatus('🔊', 'Aap ka text play ho raha hai...');

      speakText(text, false);
      addResultCard(text);
    }

    function stopGeneration() {
      synth.cancel();
      stopNatural();
      isGenerating = false;
      generateBtn.disabled = textInput.value.length === 0;
      stopBtn.disabled = true;
      setStatus('⏹️', 'Generation stopped');
    }

    // ===== DOWNLOAD MP3 =====
    function triggerDownload(href) {
      const a = document.createElement('a');
      a.href = href;
      a.download = `speech-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    // Pehla raasta: Puter.js (ElevenLabs, free, user-pays). Fail ho to false return karta hai
    async function downloadWithPuter(text) {
      if (typeof puter === 'undefined' || !puter.ai || !puter.ai.txt2speech) return false;
      try {
        setStatus('⏳', 'Awaaz ban rahi hai (Puter sign-in maang sakta hai)...');
        const nv = getNaturalSelected() || NATURAL_VOICES.find(n => n.gender === (selectedGender === 'male' ? 'male' : 'female') && n.provider === 'elevenlabs');
        const audio = await puter.ai.txt2speech(text.slice(0, 3000), naturalOptions(nv));
        const src = audio && (audio.src || audio.currentSrc);
        if (!src) return false;

        let href = src;
        try {
          const res = await fetch(src);
          const blob = await res.blob();
          if (blob.size > 1000) href = URL.createObjectURL(blob);
        } catch (e) { /* seedha src se download try hoga */ }

        triggerDownload(href);
        setStatus('✅', 'Download ho gaya!');
        return true;
      } catch (err) {
        console.warn('Puter fail:', err);
        return false;
      }
    }

    async function downloadAudio(text) {
      if (await downloadWithPuter(text)) return;
      setStatus('⏳', 'Backup tareeqa try ho raha hai...');

      const voiceMap = {
        'en-US': 'Joanna', 'en-GB': 'Amy', 'hi-IN': 'Aditi', 'ur-PK': 'Aditi',
        'ar-SA': 'Zeina', 'fr-FR': 'Celine', 'de-DE': 'Marlene', 'es-ES': 'Conchita',
        'it-IT': 'Carla', 'ja-JP': 'Mizuki', 'ko-KR': 'Seoyeon', 'ru-RU': 'Tatyana',
        'pt-BR': 'Vitoria', 'zh-CN': 'Zhiyu'
      };
      const voice = voiceMap[languageSelect.value] || 'Joanna';
      const clean = text.slice(0, 3000);

      const api = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(clean)}`;
      const sources = [
        api,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(api)}`,
        `https://corsproxy.io/?${encodeURIComponent(api)}`
      ];

      setStatus('⏳', text.length > 3000
        ? 'Download tayyar ho raha hai (sirf pehle 3000 characters)...'
        : 'Download tayyar ho raha hai...');

      for (const url of sources) {
        try {
          const res = await fetch(url);
          if (!res.ok) { console.warn('Fail:', url, res.status); continue; }

          const blob = await res.blob();
          if (blob.size < 1000) { console.warn('Chhoti file:', url); continue; }

          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `speech-${Date.now()}.mp3`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 10000);

          setStatus('✅', 'Download ho gaya!');
          return;
        } catch (err) {
          console.warn('Error:', url, err.message);
        }
      }
      setStatus('❌', 'Download fail ho gaya. Thori der baad dobara try karein.');
    }

    // ===== RESULT CARDS =====
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function updateResultsDisplay() {
      if (!resultsCount) return;
      const count = generatedAudios.length;
      resultsCount.textContent = count > 0
        ? `${count} generated ${count === 1 ? 'item' : 'items'}`
        : 'No generated items yet';
    }

    function addResultCard(text) {
      const card = document.createElement('div');
      card.className = 'audio-card';
      card.innerHTML = `
        <div class="audio-text">${escapeHtml(text.substring(0, 120))}</div>
        <div class="audio-actions">
          <button class="btn btn-secondary btn-download" style="flex:1;"><span>⬇️</span> Download MP3</button>
          <button class="btn btn-secondary btn-copy-text" style="flex:1;"><span>📋</span> Copy</button>
          <button class="btn btn-secondary btn-remove" style="flex:1;"><span>🗑️</span> Remove</button>
        </div>`;

      const entry = { text };

      card.querySelector('.btn-download').addEventListener('click', () => downloadAudio(text));
      card.querySelector('.btn-copy-text').addEventListener('click', () => {
        navigator.clipboard.writeText(text)
          .then(() => setStatus('✅', 'Text copied!'))
          .catch(() => setStatus('❌', 'Copy nahi ho saka'));
      });
      card.querySelector('.btn-remove').addEventListener('click', () => {
        card.remove();
        generatedAudios = generatedAudios.filter(i => i !== entry);
        updateResultsDisplay();
      });

      if (resultsList.querySelector('.empty-state')) resultsList.innerHTML = '';
      resultsList.appendChild(card);
      generatedAudios.push(entry);
      updateResultsDisplay();
    }

    // ===== TEXT COUNTERS =====
    function updateCharCount() {
      const text = textInput.value;
      const chars = text.length;
      charDisplay.textContent = chars;
      lineDisplay.textContent = text === '' ? 0 : text.split('\n').length;
      charCount2.textContent = chars;
      generateBtn.disabled = chars === 0;
      previewBtn.disabled = chars === 0;
    }

    function updateWordCount() {
      const t = textInput.value.trim();
      wordCount.textContent = t === '' ? 0 : t.split(/\s+/).length;
    }

    // ===== FILE IMPORT =====
    function importFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.txt')) {
        setStatus('❌', 'Only .txt files are supported');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        textInput.value = ev.target.result;
        updateCharCount();
        updateWordCount();
        setStatus('📁', 'File imported successfully!');
      };
      reader.readAsText(file);
    }

    // ===== LOCAL STORAGE =====
    function saveToLocalStorage() {
      try {
        localStorage.setItem('ttsText', textInput.value);
        localStorage.setItem('selectedLanguage', languageSelect.value);
        localStorage.setItem('selectedFormat', selectedFormat);
      } catch (e) {}
    }

    function loadFromLocalStorage() {
      try {
        const savedText = localStorage.getItem('ttsText');
        const savedLanguage = localStorage.getItem('selectedLanguage');
        const savedFormat = localStorage.getItem('selectedFormat');
        if (savedText) textInput.value = savedText;
        if (savedLanguage) languageSelect.value = savedLanguage;
        if (savedFormat) {
          selectedFormat = savedFormat;
          formatButtons.forEach(b => b.classList.toggle('active', b.dataset.format === savedFormat));
        }
      } catch (e) {}
    }

    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
      languageSelect.addEventListener('change', updateVoiceList);
      voiceSearch.addEventListener('input', updateVoiceList);

      genderButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          genderButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedGender = btn.dataset.gender;
          updateVoiceList();
        });
      });

      formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          formatButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedFormat = btn.dataset.format;
        });
      });

      speedRange.addEventListener('input', (e) => { speedValue.textContent = e.target.value + '%'; });
      pitchRange.addEventListener('input', (e) => { pitchValue.textContent = e.target.value + '%'; });

      textInput.addEventListener('input', () => { updateCharCount(); updateWordCount(); });

      clearBtn.addEventListener('click', () => {
        textInput.value = '';
        updateCharCount();
        updateWordCount();
        setStatus('✨', 'Text cleared');
      });

      copyBtn.addEventListener('click', () => {
        if (!textInput.value) return;
        navigator.clipboard.writeText(textInput.value).then(() => {
          setStatus('✅', 'Text copied to clipboard!');
          setTimeout(() => setStatus('✨', 'Ready to generate audio'), 2000);
        }).catch(() => setStatus('❌', 'Copy nahi ho saka'));
      });

      previewBtn.addEventListener('click', previewVoice);
      generateBtn.addEventListener('click', generateAudio);
      stopBtn.addEventListener('click', stopGeneration);
      fileImport.addEventListener('change', importFile);

      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter' && textInput.value) generateAudio();
        if (e.key === 'Escape' && isGenerating) stopGeneration();
      });

      window.addEventListener('beforeunload', saveToLocalStorage);

      window.addEventListener('error', (e) => console.error('Error occurred:', e.error));
      window.addEventListener('unhandledrejection', (e) => console.error('Unhandled rejection:', e.reason));
    }

    // ===== INIT =====
    loadTheme();
    loadFromLocalStorage();
    populateVoices();
    setupEventListeners();
    updateCharCount();
    updateWordCount();
    updateResultsDisplay();
    stopBtn.disabled = true;

    // Debugging ke liye (browser console mein AIVoiceStudio.getVoices())
    window.AIVoiceStudio = {
      getVoices: () => voices,
      generateAudio,
      stopGeneration,
      setStatus,
      getSettings: () => ({
        language: languageSelect.value,
        format: selectedFormat,
        speed: speedRange.value,
        pitch: pitchRange.value,
        gender: selectedGender,
        autoplay: autoplayCheck ? autoplayCheck.checked : false
      })
    };
  });
})();
