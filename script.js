// script.js - aap ke maujooda index.html ke liye (design ko chhue baghair)
(function () {
  const synth = window.speechSynthesis;
  const $ = (id) => document.getElementById(id);

  const textInput = $('text-input');
  const voiceSelect = $('voice-select');
  const rate = $('rate');
  const pitch = $('pitch');
  const speakBtn = $('speak-btn');
  const stopBtn = $('stop-btn');
  const statusEl = $('status');
  const charCount = $('char-count');
  const rateValue = $('rate-value');
  const pitchValue = $('pitch-value');
  const themeBtn = $('toggle-theme');

  let voices = [];

  const setStatus = (msg) => { statusEl.textContent = msg; };

  // ----- Saved settings -----
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  if (!synth) {
    setStatus('Is browser mein text to speech support nahi hai.');
    speakBtn.disabled = true;
    return;
  }

  // ----- Voices -----
  function langRank(v) {
    const l = v.lang.toLowerCase();
    if (l.startsWith('ur')) return 0;
    if (l.startsWith('hi')) return 1;
    if (l.startsWith('en')) return 2;
    return 3;
  }

  function populateVoiceList() {
    const list = synth.getVoices();
    if (!list.length) return;
    voices = list.slice().sort((a, b) =>
      langRank(a) - langRank(b) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));

    const saved = store.get('tts_voice');
    voiceSelect.innerHTML = '';
    voices.forEach((v) => {
      const o = document.createElement('option');
      o.textContent = `${v.name} (${v.lang})`;
      o.value = v.voiceURI;
      voiceSelect.appendChild(o);
    });

    const pick = voices.find(v => v.voiceURI === saved) || voices.find(v => v.default) || voices[0];
    if (pick) voiceSelect.value = pick.voiceURI;
  }

  populateVoiceList();
  synth.onvoiceschanged = populateVoiceList;
  // Android Chrome par voices der se aati hain
  let tries = 0;
  const poll = setInterval(() => {
    if (voices.length || ++tries > 20) return clearInterval(poll);
    populateVoiceList();
  }, 300);

  voiceSelect.addEventListener('change', () => store.set('tts_voice', voiceSelect.value));

  // ----- Rate / Pitch -----
  function showValues() {
    rateValue.textContent = parseFloat(rate.value).toFixed(1);
    pitchValue.textContent = parseFloat(pitch.value).toFixed(1);
  }
  const savedRate = store.get('tts_rate');
  const savedPitch = store.get('tts_pitch');
  if (savedRate) rate.value = savedRate;
  if (savedPitch) pitch.value = savedPitch;
  showValues();

  rate.addEventListener('input', () => { showValues(); store.set('tts_rate', rate.value); });
  pitch.addEventListener('input', () => { showValues(); store.set('tts_pitch', pitch.value); });

  // ----- Character count -----
  function updateCount() {
    charCount.textContent = `${textInput.value.length} characters`;
  }
  textInput.addEventListener('input', updateCount);
  updateCount();

  // ----- Speak -----
  function splitText(text) {
    const parts = text.match(/[^.!?۔\n]+[.!?۔]*/g) || [text];
    const out = [];
    parts.forEach((p) => {
      p = p.trim();
      while (p.length > 220) {
        let cut = p.lastIndexOf(' ', 220);
        if (cut < 50) cut = 220;
        out.push(p.slice(0, cut));
        p = p.slice(cut).trim();
      }
      if (p) out.push(p);
    });
    return out;
  }

  function speak() {
    const text = textInput.value.trim();
    if (!text) { setStatus('Pehle text likhein.'); return; }
    if (!voices.length) { setStatus('Is device mein koi voice nahi mili.'); return; }

    synth.cancel(); // purani awaaz ruk kar nayi shuru
    const voice = voices.find(v => v.voiceURI === voiceSelect.value) || null;
    const chunks = splitText(text);

    setTimeout(() => {
      chunks.forEach((c, i) => {
        const u = new SpeechSynthesisUtterance(c);
        if (voice) { u.voice = voice; u.lang = voice.lang; }
        u.rate = parseFloat(rate.value);
        u.pitch = parseFloat(pitch.value);
        if (i === 0) u.onstart = () => setStatus('Speaking...');
        if (i === chunks.length - 1) u.onend = () => setStatus('Done speaking.');
        u.onerror = (e) => {
          if (e.error === 'canceled' || e.error === 'interrupted') return;
          setStatus('Error occurred: ' + e.error);
        };
        synth.speak(u);
      });
    }, 100);
  }

  speakBtn.addEventListener('click', speak);

  stopBtn.addEventListener('click', () => {
    synth.cancel();
    setStatus('Speech stopped.');
  });

  // ----- Theme button -----
  // Note: yeh body par "light" class lagata/hatata hai. Colors style.css ke CSS se aate hain.
  if (themeBtn) {
    if (store.get('tts_theme') === 'light') {
      document.body.classList.add('light');
      themeBtn.textContent = '☀️';
    }
    themeBtn.addEventListener('click', () => {
      const light = document.body.classList.toggle('light');
      themeBtn.textContent = light ? '☀️' : '🌙';
      store.set('tts_theme', light ? 'light' : 'dark');
    });
  }
})();
