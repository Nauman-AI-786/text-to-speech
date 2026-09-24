

/* =========================================================
   AI VOICE STUDIO
   Premium text-to-speech JavaScript
   Browser SpeechSynthesis + optional Puter provider
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    Array.from(parent.querySelectorAll(selector));

  const storage = {
    get(key, fallback = null) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Private browsing ya blocked storage mein app phir bhi kaam karegi.
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore storage errors.
      }
    }
  };

  const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatDate() {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date());
  }

  async function copyToClipboard(text) {
    if (!text) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback neeche use hoga.
    }

    try {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      helper.style.pointerEvents = "none";

      document.body.appendChild(helper);
      helper.focus();
      helper.select();

      const copied = document.execCommand("copy");
      helper.remove();

      return copied;
    } catch {
      return false;
    }
  }

  function downloadBlob(blob, filename) {
    if (!blob || !blob.size) return false;

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 15000);

    return true;
  }

  function triggerUrlDownload(url, filename) {
    if (!url) return false;

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.target = "_blank";

    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;
  }

  /* ---------------------------------------------------------
     DOM references
     --------------------------------------------------------- */

  const textInput = $("#textInput");
  const languageSelect = $("#languageSelect");
  const voiceSearch = $("#voiceSearch");
  const voiceSelect = $("#voiceSelect");
  const voiceHelp = $("#voiceHelp");

  const themeToggle = $("#themeToggle");
  const themeIcon = $(".theme-icon");

  const previewBtn = $("#previewBtn");
  const speedRange = $("#speedRange");
  const pitchRange = $("#pitchRange");
  const speedValue = $("#speedValue");
  const pitchValue = $("#pitchValue");

  const fileImport = $("#fileImport");
  const copyBtn = $("#copyBtn");
  const clearBtn = $("#clearBtn");
  const generateBtn = $("#generateBtn");
  const stopBtn = $("#stopBtn");

  const charDisplay = $("#charDisplay");
  const charCount2 = $("#charCount2");
  const wordCount = $("#wordCount");
  const lineDisplay = $("#lineDisplay");

  const statusBox = $("#status");
  const statusIcon = $(".status-icon", statusBox);
  const statusText = $(".status-text", statusBox);

  const resultsList = $("#resultsList");
  const resultsCount = $(".results-count");

  const genderButtons = $$(".segment-button");

  /* ---------------------------------------------------------
     App state
     --------------------------------------------------------- */

  const speechSynth =
    "speechSynthesis" in window ? window.speechSynthesis : null;

  let browserVoices = [];
  let selectedGender = storage.get("voiceGender", "all");

  let isSpeaking = false;
  let currentRunId = 0;
  let currentProviderAudio = null;

  const generatedItems = [];

  const PREVIEW_TEXTS = {
    "ur-PK": "السلام علیکم! یہ منتخب آواز کا نمونہ ہے۔",
    "hi-IN": "नमस्ते! यह चुनी हुई आवाज़ का नमूना है।",
    "en-US": "Hello! This is a preview of the selected voice.",
    "en-GB": "Hello! This is a preview of the selected voice."
  };

  /*
   * Puter optional voices.
   * Yeh voices sirf tab show hongi jab Puter.js available ho.
   * Provider availability aur sign-in requirements provider par depend
   * karte hain.
   */
  const NATURAL_VOICES = [
    {
      id: "puter:openai:nova",
      label: "Nova · Natural female",
      gender: "female",
      provider: "openai",
      voice: "nova"
    },
    {
      id: "puter:openai:shimmer",
      label: "Shimmer · Natural female",
      gender: "female",
      provider: "openai",
      voice: "shimmer"
    },
    {
      id: "puter:openai:onyx",
      label: "Onyx · Natural male",
      gender: "male",
      provider: "openai",
      voice: "onyx"
    },
    {
      id: "puter:openai:echo",
      label: "Echo · Natural male",
      gender: "male",
      provider: "openai",
      voice: "echo"
    },
    {
      id: "puter:openai:alloy",
      label: "Alloy · Natural neutral",
      gender: "all",
      provider: "openai",
      voice: "alloy"
    },
    {
      id: "puter:elevenlabs:Rachel",
      label: "Rachel · Natural female",
      gender: "female",
      provider: "elevenlabs",
      voice: "Rachel"
    },
    {
      id: "puter:elevenlabs:Adam",
      label: "Adam · Natural male",
      gender: "male",
      provider: "elevenlabs",
      voice: "Adam"
    }
  ];

  /* ---------------------------------------------------------
     Status and feedback
     --------------------------------------------------------- */

  function setStatus(icon, message, type = "normal") {
    if (!statusBox) return;

    if (statusIcon) statusIcon.textContent = icon;
    if (statusText) statusText.textContent = message;

    statusBox.dataset.status = type;
  }

  function showToast(message, type = "normal") {
    let toast = $("#appToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "appToast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");

      Object.assign(toast.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "9999",
        maxWidth: "min(360px, calc(100vw - 36px))",
        padding: "13px 16px",
        color: "#ffffff",
        background: "#202542",
        borderRadius: "14px",
        boxShadow: "0 18px 45px rgba(0,0,0,.22)",
        fontSize: "13px",
        fontWeight: "700",
        opacity: "0",
        transform: "translateY(10px)",
        pointerEvents: "none",
        transition: "opacity .2s ease, transform .2s ease"
      });

      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.dataset.type = type;
    toast.style.background =
      type === "error"
        ? "#b4233c"
        : type === "success"
          ? "#087f5b"
          : "#202542";

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
    }, 3000);
  }

  /* ---------------------------------------------------------
     Theme
     --------------------------------------------------------- */

  function updateThemeButton() {
    const dark = document.body.classList.contains("dark-mode");

    if (themeIcon) {
      themeIcon.textContent = dark ? "☀" : "☾";
    }

    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        dark ? "Switch to light theme" : "Switch to dark theme"
      );

      themeToggle.title = dark
        ? "Switch to light theme"
        : "Switch to dark theme";
    }
  }

  function loadTheme() {
    const savedTheme = storage.get("theme", "light");

    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
    }

    updateThemeButton();
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-mode");

    storage.set("theme", isDark ? "dark" : "light");
    updateThemeButton();
  }

  /* ---------------------------------------------------------
     Puter provider helpers
     --------------------------------------------------------- */

  function puterReady() {
    return Boolean(
      window.puter &&
      window.puter.ai &&
      typeof window.puter.ai.txt2speech === "function"
    );
  }

  function getNaturalVoiceFromValue() {
    return (
      NATURAL_VOICES.find((voice) => voice.id === voiceSelect?.value) || null
    );
  }

  function getPuterOptions(naturalVoice) {
    if (!naturalVoice) return null;

    if (naturalVoice.provider === "elevenlabs") {
      return {
        provider: "elevenlabs",
        model: "eleven_multilingual_v2",
        voice: naturalVoice.voice
      };
    }

    return {
      provider: "openai",
      model: "gpt-4o-mini-tts",
      voice: naturalVoice.voice
    };
  }

  function getAudioSource(audio) {
    if (!audio) return "";

    return (
      audio.src ||
      audio.currentSrc ||
      audio.getAttribute?.("src") ||
      ""
    );
  }

  function stopProviderAudio() {
    if (!currentProviderAudio) return;

    try {
      currentProviderAudio.pause();
      currentProviderAudio.currentTime = 0;
    } catch {
      // Ignore audio cleanup errors.
    }

    currentProviderAudio = null;
  }

  /* ---------------------------------------------------------
     Browser voice handling
     --------------------------------------------------------- */

  function normalizeLanguage(language) {
    return String(language || "").replace("_", "-").toLowerCase();
  }

  function voiceMatchesLanguage(voice, language) {
    const voiceLanguage = normalizeLanguage(voice.lang);
    const selectedLanguage = normalizeLanguage(language);
    const baseLanguage = selectedLanguage.split("-")[0];

    return (
      voiceLanguage === selectedLanguage ||
      voiceLanguage.startsWith(`${baseLanguage}-`)
    );
  }

  function voiceMatchesGender(voice) {
    if (selectedGender === "all") return true;

    const name = String(voice.name || "").toLowerCase();

    if (selectedGender === "female") {
      return /\b(female|woman|girl|zira|susan|hazel|samantha|victoria|google uk english female)\b/i.test(
        name
      );
    }

    if (selectedGender === "male") {
      return /\b(male|man|boy|david|mark|daniel|alex|fred|google uk english male)\b/i.test(
        name
      );
    }

    return true;
  }

  function getFilteredBrowserVoices() {
    const selectedLanguage = languageSelect?.value || "en-US";
    const searchTerm = String(voiceSearch?.value || "")
      .trim()
      .toLowerCase();

    let list = browserVoices.filter((voice) =>
      voiceMatchesLanguage(voice, selectedLanguage)
    );

    if (selectedGender !== "all") {
      const genderFiltered = list.filter(voice =>
        voiceMatchesGender(voice)
      );

      /*
       * Agar browser voice names mein gender information nahi hai,
       * to empty list ke bajaye language voices show karte hain.
       */
      if (genderFiltered.length > 0) {
        list = genderFiltered;
      }
    }

    if (searchTerm) {
      list = list.filter((voice) =>
        `${voice.name} ${voice.lang}`.toLowerCase().includes(searchTerm)
      );
    }

    return list;
  }

  function getFilteredNaturalVoices() {
    if (!puterReady()) return [];

    const term = String(voiceSearch?.value || "")
      .trim()
      .toLowerCase();

    return NATURAL_VOICES.filter((voice) => {
      const genderOkay =
        selectedGender === "all" ||
        voice.gender === "all" ||
        voice.gender === selectedGender;

      const searchOkay =
        !term ||
        `${voice.label} ${voice.provider}`
          .toLowerCase()
          .includes(term);

      return genderOkay && searchOkay;
    });
  }

  function appendOption(group, label, value, data = {}) {
    const option = document.createElement("option");

    option.value = value;
    option.textContent = label;

    Object.entries(data).forEach(([key, itemValue]) => {
      option.dataset[key] = itemValue;
    });

    group.appendChild(option);
  }

  function updateVoiceHelp(browserCount, naturalCount) {
    if (!voiceHelp) return;

    const selectedLanguage = languageSelect?.value || "en-US";
    const languageName =
      languageSelect?.selectedOptions?.[0]?.textContent || selectedLanguage;

    if (browserCount === 0 && naturalCount === 0) {
      voiceHelp.textContent =
        `${languageName} ke liye voice nahi mili. Device language settings check karein ya doosri language try karein.`;
      return;
    }

    if (browserCount === 0 && naturalCount > 0) {
      voiceHelp.textContent =
        "Browser voice nahi mili. Available provider voice use ki ja sakti hai.";
      return;
    }

    if (naturalCount > 0) {
      voiceHelp.textContent =
        "Natural provider voice available hai. Provider sign-in ya availability apply ho sakti hai.";
      return;
    }

    voiceHelp.textContent =
      `${browserCount} browser voice available. Voice availability device par depend karti hai.`;
  }

  function updateVoiceList() {
    if (!voiceSelect) return;

    const previousValue = voiceSelect.value;
    const browserList = getFilteredBrowserVoices();
    const naturalList = getFilteredNaturalVoices();

    voiceSelect.innerHTML = "";

    if (naturalList.length > 0) {
      const group = document.createElement("optgroup");
      group.label = "Natural provider voices";

      naturalList.forEach((voice) => {
        appendOption(group, voice.label, voice.id, {
          source: "natural",
          provider: voice.provider
        });
      });

      voiceSelect.appendChild(group);
    }

    if (browserList.length > 0) {
      const group = document.createElement("optgroup");
      group.label = "Device browser voices";

      browserList.forEach((voice) => {
        appendOption(
          group,
          `${voice.name} (${voice.lang})`,
          voice.voiceURI || `${voice.name}-${voice.lang}`,
          {
            source: "browser",
            lang: voice.lang
          }
        );
      });

      voiceSelect.appendChild(group);
    }

    if (!naturalList.length && !browserList.length) {
      appendOption(
        voiceSelect,
        "Is language ki voice available nahi",
        ""
      );
    }

    const previousStillExists = Array.from(voiceSelect.options).some(
      (option) => option.value === previousValue
    );

    if (previousStillExists) {
      voiceSelect.value = previousValue;
    } else if (voiceSelect.options.length > 0) {
      voiceSelect.selectedIndex = 0;
    }

    updateVoiceHelp(browserList.length, naturalList.length);
    updateActionStates();
  }

  function loadBrowserVoices() {
    if (!speechSynth) {
      browserVoices = [];
      updateVoiceList();
      return;
    }

    const loadedVoices = speechSynth.getVoices();

    const uniqueVoices = new Map();

    loadedVoices.forEach((voice) => {
      const key = [
        voice.voiceURI,
        voice.name,
        voice.lang
      ]
        .join("|")
        .toLowerCase();

      if (!uniqueVoices.has(key)) {
        uniqueVoices.set(key, voice);
      }
    });

    browserVoices = Array.from(uniqueVoices.values()).sort((a, b) =>
      `${a.lang} ${a.name}`.localeCompare(`${b.lang} ${b.name}`)
    );

    updateVoiceList();
  }

  /* ---------------------------------------------------------
     Text counters and action states
     --------------------------------------------------------- */

  function getText() {
    return String(textInput?.value || "");
  }

  function getTrimmedText() {
    return getText().trim();
  }

  function updateCounters() {
    const text = getText();
    const trimmed = text.trim();

    const characters = text.length;
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const lines = text ? text.split(/\r?\n/).length : 0;

    if (charDisplay) charDisplay.textContent = String(characters);
    if (charCount2) charCount2.textContent = String(characters);
    if (wordCount) wordCount.textContent = String(words);
    if (lineDisplay) lineDisplay.textContent = String(lines);

    updateActionStates();
  }

  function hasSelectedVoice() {
    return Boolean(voiceSelect?.value);
  }

  function updateActionStates() {
    const hasText = Boolean(getTrimmedText());
    const hasVoice = hasSelectedVoice();

    if (generateBtn) {
      generateBtn.disabled = !hasText || isSpeaking;
    }

    if (previewBtn) {
      previewBtn.disabled = !hasVoice || isSpeaking;
    }

    if (stopBtn) {
      stopBtn.disabled = !isSpeaking;
    }
  }

  /* ---------------------------------------------------------
     Text splitting for browser voices
     --------------------------------------------------------- */

  function splitTextIntoChunks(text, maxLength = 220) {
    const cleanText = String(text || "").trim();

    if (!cleanText) return [];

    const sentenceParts =
      cleanText.match(/[^.!?۔؟!\n]+[.!?۔؟!\n]*/g) || [cleanText];

    const chunks = [];

    sentenceParts.forEach((part) => {
      let sentence = part.trim();

      while (sentence.length > maxLength) {
        let cut = sentence.lastIndexOf(" ", maxLength);

        if (cut < 60) {
          cut = maxLength;
        }

        chunks.push(sentence.slice(0, cut).trim());
        sentence = sentence.slice(cut).trim();
      }

      if (sentence) chunks.push(sentence);
    });

    return chunks.filter(Boolean);
  }

  function sliderToFactor(element, fallback = 1) {
    if (!element) return fallback;

    const value = Number(element.value);

    if (!Number.isFinite(value)) return fallback;

    return clamp(value / 100, 0.5, 2);
  }

  /* ---------------------------------------------------------
     Browser SpeechSynthesis playback
     --------------------------------------------------------- */

  function getSelectedBrowserVoice() {
    if (!voiceSelect) return null;

    const selectedValue = voiceSelect.value;

    return (
      browserVoices.find(
        (voice) =>
          voice.voiceURI === selectedValue ||
          `${voice.name}-${voice.lang}` === selectedValue
      ) || null
    );
  }

  function finishSpeaking(runId, message = "Audio playback complete") {
    if (runId !== currentRunId) return;

    isSpeaking = false;
    currentProviderAudio = null;

    updateActionStates();
    setStatus("✓", message, "success");
  }

  function speakWithBrowser(text, isPreview = false) {
    if (!speechSynth) {
      setStatus(
        "!",
        "Is browser mein SpeechSynthesis support nahi hai.",
        "error"
      );
      showToast(
        "Browser voice support available nahi hai.",
        "error"
      );
      return false;
    }

    const selectedVoice = getSelectedBrowserVoice();
    const chunks = splitTextIntoChunks(text);

    if (!chunks.length) {
      setStatus("!", "Pehle text likhein.", "error");
      return false;
    }

    const runId = ++currentRunId;

    speechSynth.cancel();
    stopProviderAudio();

    isSpeaking = true;
    updateActionStates();

    setStatus(
      "◉",
      isPreview ? "Voice preview chal raha hai..." : "Audio play ho raha hai..."
    );

    const rate = sliderToFactor(speedRange);
    const pitch = sliderToFactor(pitchRange);
    const language = languageSelect?.value || "en-US";

    let completed = 0;

    chunks.forEach((chunk) => {
      const utterance = new SpeechSynthesisUtterance(chunk);

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = language;
      }

      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1;

      utterance.onend = () => {
        if (runId !== currentRunId) return;

        completed += 1;

        if (completed >= chunks.length) {
          finishSpeaking(
            runId,
            isPreview
              ? "Voice preview complete"
              : "Browser audio playback complete"
          );
        }
      };

      utterance.onerror = (event) => {
        if (runId !== currentRunId) return;

        if (
          event.error === "canceled" ||
          event.error === "interrupted"
        ) {
          return;
        }

        isSpeaking = false;
        updateActionStates();

        setStatus(
          "!",
          `Browser voice error: ${event.error || "unknown error"}`,
          "error"
        );

        showToast(
          "Browser voice play nahi ho saki.",
          "error"
        );
      };

      speechSynth.speak(utterance);
    });

    /*
     * Kuch browsers cancel ke foran baad speech start nahi karte.
     * Yeh small recovery check hai.
     */
    setTimeout(() => {
      if (
        runId === currentRunId &&
        isSpeaking &&
        speechSynth.paused
      ) {
        try {
          speechSynth.resume();
        } catch {
          // Ignore resume errors.
        }
      }
    }, 150);

    return true;
  }

  /* ---------------------------------------------------------
     Optional Puter natural voice playback
     --------------------------------------------------------- */

  async function speakWithPuter(text, isPreview, naturalVoice) {
    if (!puterReady() || !naturalVoice) return null;

    const runId = ++currentRunId;

    speechSynth?.cancel();
    stopProviderAudio();

    isSpeaking = true;
    updateActionStates();

    setStatus(
      "◌",
      "Natural provider voice prepare ho rahi hai..."
    );

    try {
      const audio = await window.puter.ai.txt2speech(
        text.slice(0, 3000),
        getPuterOptions(naturalVoice)
      );

      if (runId !== currentRunId) {
        try {
          audio?.pause?.();
        } catch {
          // Ignore stale audio errors.
        }
        return null;
      }

      if (!audio || typeof audio.play !== "function") {
        throw new Error("Provider ne playable audio return nahi ki.");
      }

      currentProviderAudio = audio;

      const source = getAudioSource(audio);

      if (source) {
        audio.dataset.sourceUrl = source;
      }

      audio.onended = () => {
        finishSpeaking(
          runId,
          isPreview
            ? "Natural voice preview complete"
            : "Natural audio playback complete"
        );
      };

      audio.onerror = () => {
        if (runId !== currentRunId) return;

        isSpeaking = false;
        currentProviderAudio = null;
        updateActionStates();

        setStatus(
          "!",
          "Natural voice play nahi ho saki.",
          "error"
        );
      };

      await audio.play();

      setStatus(
        "●",
        isPreview
          ? "Natural voice preview chal raha hai..."
          : "Natural provider audio chal raha hai..."
      );

      return audio;
    } catch (error) {
      console.warn("Optional provider error:", error);

      if (runId !== currentRunId) return null;

      isSpeaking = false;
      currentProviderAudio = null;
      updateActionStates();

      setStatus(
        "!",
        "Natural voice unavailable hai. Browser voice use ki ja rahi hai.",
        "normal"
      );

      showToast(
        "Natural voice available nahi hui, browser voice use ho rahi hai.",
        "normal"
      );

      return null;
    }
  }

  async function speakSelected(text, isPreview = false) {
    const naturalVoice = getNaturalVoiceFromValue();

    if (naturalVoice && puterReady()) {
      const providerAudio = await speakWithPuter(
        text,
        isPreview,
        naturalVoice
      );

      if (providerAudio) {
        return {
          type: "provider",
          audio: providerAudio,
          sourceUrl: getAudioSource(providerAudio)
        };
      }
    }

    const browserStarted = speakWithBrowser(text, isPreview);

    return browserStarted
      ? {
          type: "browser",
          audio: null,
          sourceUrl: ""
        }
      : null;
  }

  function stopPlayback() {
    currentRunId += 1;

    try {
      speechSynth?.cancel();
    } catch {
      // Ignore speech cancellation errors.
    }

    stopProviderAudio();

    isSpeaking = false;
    updateActionStates();

    setStatus("■", "Audio playback stopped");
  }

  /* ---------------------------------------------------------
     Generated result cards
     --------------------------------------------------------- */

  function createButton(label, className, icon = "") {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;

    if (icon) {
      const iconElement = document.createElement("span");
      iconElement.setAttribute("aria-hidden", "true");
      iconElement.textContent = icon;
      button.appendChild(iconElement);
    }

    const textElement = document.createElement("span");
    textElement.textContent = label;
    button.appendChild(textElement);

    return button;
  }

  function updateResultsCount() {
    if (!resultsCount) return;

    const count = generatedItems.length;

    resultsCount.textContent =
      count === 0
        ? "No items yet"
        : `${count} ${count === 1 ? "item" : "items"}`;
  }

  function removeEmptyState() {
    const emptyState = $(".empty-state", resultsList);

    if (emptyState) {
      emptyState.remove();
    }
  }

  function restoreEmptyState() {
    if (!resultsList || generatedItems.length > 0) return;
    if ($(".empty-state", resultsList)) return;

    const empty = document.createElement("div");
    empty.className = "empty-state";

    const visual = document.createElement("div");
    visual.className = "empty-visual";
    visual.setAttribute("aria-hidden", "true");
    visual.textContent = "〰";

    const heading = document.createElement("h3");
    heading.textContent = "Your audio will appear here";

    const paragraph = document.createElement("p");
    paragraph.textContent =
      "Script likhein, voice select karein aur Generate audio press karein.";

    empty.append(visual, heading, paragraph);
    resultsList.appendChild(empty);
  }

  function attachAudioToCard(entry, audio) {
    if (!audio || !entry?.card) return;

    const source = getAudioSource(audio);

    if (!source) return;

    entry.audio = audio;
    entry.sourceUrl = source;
    entry.audioType = "provider";

    const existingAudio = $(".audio-player", entry.card);

    if (existingAudio) {
      existingAudio.remove();
    }

    const player = document.createElement("audio");
    player.className = "audio-player";
    player.controls = true;
    player.preload = "metadata";
    player.src = source;
    player.setAttribute("aria-label", "Generated audio player");

    const meta = $(".audio-card-meta", entry.card);

    if (meta) {
      entry.card.insertBefore(player, meta);
    } else {
      entry.card.appendChild(player);
    }

    entry.downloadButton.disabled = false;
    entry.downloadButton.title = "Download available provider audio";
  }

  function addResultCard(text, playbackResult = null) {
    if (!resultsList) return null;

    removeEmptyState();

    const entry = {
      id: `audio-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      createdAt: new Date(),
      audio: null,
      sourceUrl: "",
      audioType: playbackResult?.type || "browser",
      card: null,
      downloadButton: null
    };

    const card = document.createElement("article");
    card.className = "audio-card";
    card.dataset.id = entry.id;

    const textElement = document.createElement("div");
    textElement.className = "audio-card-text";
    textElement.textContent = text;
    textElement.title = text;

    const meta = document.createElement("div");
    meta.className = "audio-card-meta";

    const language = document.createElement("span");
    language.textContent =
      languageSelect?.selectedOptions?.[0]?.textContent ||
      languageSelect?.value ||
      "Voice";

    const date = document.createElement("span");
    date.textContent = formatDate();

    meta.append(language, date);

    const actions = document.createElement("div");
    actions.className = "audio-card-actions";

    const downloadButton = createButton(
      "Download MP3",
      "outline-button",
      "↓"
    );

    const copyButton = createButton(
      "Copy",
      "outline-button",
      "▣"
    );

    const removeButton = createButton(
      "Remove",
      "outline-button",
      "×"
    );

    downloadButton.disabled = true;
    downloadButton.title =
      "MP3 sirf real provider audio available hone par download hogi";

    entry.card = card;
    entry.downloadButton = downloadButton;

    downloadButton.addEventListener("click", () => {
      downloadEntry(entry);
    });

    copyButton.addEventListener("click", async () => {
      const copied = await copyToClipboard(entry.text);

      if (copied) {
        setStatus("✓", "Text copied to clipboard", "success");
        showToast("Text copied", "success");
      } else {
        setStatus("!", "Text copy nahi ho saka.", "error");
        showToast("Clipboard access available nahi hai.", "error");
      }
    });

    removeButton.addEventListener("click", () => {
      removeEntry(entry);
    });

    actions.append(downloadButton, copyButton, removeButton);
    card.append(textElement, meta, actions);
    resultsList.prepend(card);

    generatedItems.unshift(entry);
    updateResultsCount();

    if (playbackResult?.audio) {
      attachAudioToCard(entry, playbackResult.audio);
    }

    return entry;
  }

  function removeEntry(entry) {
    const index = generatedItems.indexOf(entry);

    if (index !== -1) {
      generatedItems.splice(index, 1);
    }

    if (entry.audio && entry.audio !== currentProviderAudio) {
      try {
        entry.audio.pause?.();
      } catch {
        // Ignore.
      }
    }

    entry.card?.remove();

    updateResultsCount();
    restoreEmptyState();
  }

  async function downloadEntry(entry) {
    if (!entry?.sourceUrl) {
      setStatus(
        "!",
        "Browser voice se direct MP3 export supported nahi hota. MP3 ke liye real provider audio available hona zaroori hai.",
        "error"
      );

      showToast(
        "Is result ke liye MP3 available nahi hai.",
        "error"
      );

      return;
    }

    const filename = `ai-voice-studio-${Date.now()}.mp3`;

    try {
      setStatus("◌", "MP3 download tayyar ho rahi hai...");

      const response = await fetch(entry.sourceUrl);

      if (!response.ok) {
        throw new Error(`Download request failed: ${response.status}`);
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("Empty audio file");
      }

      const downloaded = downloadBlob(blob, filename);

      if (!downloaded) {
        throw new Error("Download could not start");
      }

      setStatus("✓", "MP3 download start ho gayi", "success");
      showToast("MP3 download start ho gayi", "success");
    } catch (error) {
      console.warn("MP3 download error:", error);

      /*
       * Cross-origin provider files fetch nahi hone par direct URL
       * download attempt kiya jata hai. Fake MP3 generate nahi hoti.
       */
      const directDownload = triggerUrlDownload(
        entry.sourceUrl,
        filename
      );

      if (directDownload) {
        setStatus(
          "i",
          "Direct audio link open ki gayi. Agar download start na ho to audio player menu use karein."
        );
      } else {
        setStatus(
          "!",
          "MP3 download available nahi ho saki.",
          "error"
        );
      }
    }
  }

  /* ---------------------------------------------------------
     Main actions
     --------------------------------------------------------- */

  async function previewVoice() {
    if (isSpeaking) {
      setStatus("!", "Pehle current audio stop karein.", "error");
      return;
    }

    const previewText =
      PREVIEW_TEXTS[languageSelect?.value] ||
      PREVIEW_TEXTS["en-US"];

    await speakSelected(previewText, true);
  }

  async function generateAudio() {
    const text = getTrimmedText();

    if (!text) {
      setStatus("!", "Pehle text likhein.", "error");
      showToast("Generate karne ke liye text likhein.", "error");
      textInput?.focus();
      return;
    }

    if (text.length > 10000) {
      setStatus(
        "!",
        "Text maximum 10,000 characters ka ho sakta hai.",
        "error"
      );
      return;
    }

    if (isSpeaking) {
      setStatus("!", "Audio pehle se play ho raha hai.", "error");
      return;
    }

    saveSettings();

    const naturalVoiceSelected = Boolean(getNaturalVoiceFromValue());

    if (!naturalVoiceSelected && !getSelectedBrowserVoice()) {
      setStatus(
        "i",
        "Specific voice select nahi hui. Browser default voice use hogi."
      );
    }

    const result = await speakSelected(text, false);

    if (!result) return;

    const entry = addResultCard(text, result);

    if (result.audio && entry) {
      attachAudioToCard(entry, result.audio);
    }

    if (result.type === "browser") {
      setStatus(
        "●",
        "Browser audio play ho raha hai. Browser SpeechSynthesis direct MP3 export nahi karti."
      );
    }

    showToast("Audio result add ho gaya", "success");
  }

  /* ---------------------------------------------------------
     File import
     --------------------------------------------------------- */

  function importTextFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const isTextFile =
      file.type === "text/plain" ||
      file.name.toLowerCase().endsWith(".txt");

    if (!isTextFile) {
      setStatus(
        "!",
        "Sirf .txt text files supported hain.",
        "error"
      );
      showToast("Please .txt file select karein.", "error");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const content = String(reader.result || "").slice(0, 10000);

      if (textInput) {
        textInput.value = content;
        updateCounters();
        saveSettings();
      }

      setStatus("✓", "Text file successfully import ho gayi", "success");
      showToast("Text imported", "success");
    };

    reader.onerror = () => {
      setStatus(
        "!",
        "File read nahi ho saki.",
        "error"
      );
      showToast("File read nahi ho saki.", "error");
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  /* ---------------------------------------------------------
     Settings persistence
     --------------------------------------------------------- */

  function saveSettings() {
    storage.set("ttsText", getText());
    storage.set("ttsLanguage", languageSelect?.value || "en-US");
    storage.set("ttsSpeed", speedRange?.value || "100");
    storage.set("ttsPitch", pitchRange?.value || "100");
    storage.set("voiceGender", selectedGender);
    storage.set("ttsVoice", voiceSelect?.value || "");
  }

  function loadSettings() {
    const savedText = storage.get("ttsText", "");
    const savedLanguage = storage.get("ttsLanguage", "");
    const savedSpeed = storage.get("ttsSpeed", "");
    const savedPitch = storage.get("ttsPitch", "");
    const savedVoice = storage.get("ttsVoice", "");

    if (textInput && savedText) {
      textInput.value = savedText;
    }

    if (
      languageSelect &&
      savedLanguage &&
      Array.from(languageSelect.options).some(
        (option) => option.value === savedLanguage
      )
    ) {
      languageSelect.value = savedLanguage;
    }

    if (speedRange && savedSpeed) {
      speedRange.value = clamp(Number(savedSpeed), 50, 200);
    }

    if (pitchRange && savedPitch) {
      pitchRange.value = clamp(Number(savedPitch), 50, 200);
    }

    genderButtons.forEach((button) => {
      const isActive = button.dataset.gender === selectedGender;

      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    updateRangeLabels();

    /*
     * Voice list load hone ke baad saved voice restore hogi.
     */
    setTimeout(() => {
      if (
        voiceSelect &&
        savedVoice &&
        Array.from(voiceSelect.options).some(
          (option) => option.value === savedVoice
        )
      ) {
        voiceSelect.value = savedVoice;
      }

      updateActionStates();
    }, 250);
  }

  function updateRangeLabels() {
    if (speedValue && speedRange) {
      speedValue.textContent = `${speedRange.value}%`;
    }

    if (pitchValue && pitchRange) {
      pitchValue.textContent = `${pitchRange.value}%`;
    }
  }

  /* ---------------------------------------------------------
     Event listeners
     --------------------------------------------------------- */

  function setupEventListeners() {
    themeToggle?.addEventListener("click", toggleTheme);

    languageSelect?.addEventListener("change", () => {
      saveSettings();
      updateVoiceList();
      setStatus(
        "i",
        "Language change ho gayi. Available voices update ki ja rahi hain."
      );
    });

    voiceSearch?.addEventListener("input", updateVoiceList);

    voiceSelect?.addEventListener("change", () => {
      saveSettings();
      updateActionStates();
      setStatus("✓", "Voice select ho gayi", "success");
    });

    genderButtons.forEach((button) => {
      button.addEventListener("click", () => {
        selectedGender = button.dataset.gender || "all";
        storage.set("voiceGender", selectedGender);

        genderButtons.forEach((item) => {
          const active = item === button;

          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });

        updateVoiceList();
      });
    });

    speedRange?.addEventListener("input", () => {
      updateRangeLabels();
      saveSettings();
    });

    pitchRange?.addEventListener("input", () => {
      updateRangeLabels();
      saveSettings();
    });

    textInput?.addEventListener("input", () => {
      updateCounters();
      saveSettings();
    });

    previewBtn?.addEventListener("click", previewVoice);

    generateBtn?.addEventListener("click", generateAudio);

    stopBtn?.addEventListener("click", stopPlayback);

    clearBtn?.addEventListener("click", () => {
      stopPlayback();

      if (textInput) {
        textInput.value = "";
      }

      storage.remove("ttsText");
      updateCounters();

      setStatus("✦", "Text clear ho gaya");
      showToast("Text cleared", "success");
    });

    copyBtn?.addEventListener("click", async () => {
      const text = getText();

      if (!text) {
        setStatus("!", "Copy karne ke liye text likhein.", "error");
        return;
      }

      const copied = await copyToClipboard(text);

      if (copied) {
        setStatus("✓", "Text copied to clipboard", "success");
        showToast("Text copied", "success");
      } else {
        setStatus("!", "Text copy nahi ho saka.", "error");
        showToast("Clipboard permission available nahi hai.", "error");
      }
    });

    fileImport?.addEventListener("change", importTextFile);

    document.addEventListener("keydown", (event) => {
      const isTyping =
        event.target?.matches?.(
          "input, textarea, select, [contenteditable='true']"
        );

      if (
        event.ctrlKey &&
        event.key === "Enter" &&
        isTyping &&
        getTrimmedText()
      ) {
        event.preventDefault();
        generateAudio();
      }

      if (event.key === "Escape" && isSpeaking) {
        stopPlayback();
      }
    });

    window.addEventListener("beforeunload", () => {
      saveSettings();
      stopPlayback();

      generatedItems.forEach((entry) => {
        try {
          entry.audio?.pause?.();
        } catch {
          // Ignore cleanup errors.
        }
      });
    });

    window.addEventListener("error", (event) => {
      console.warn("AI Voice Studio error:", event.error || event.message);
    });

    window.addEventListener("unhandledrejection", (event) => {
      console.warn("AI Voice Studio async error:", event.reason);
    });
  }

  /* ---------------------------------------------------------
     Debug API
     --------------------------------------------------------- */

  function exposeDebugApi() {
    window.AIVoiceStudio = {
      getVoices: () => [...browserVoices],
      getSettings: () => ({
        language: languageSelect?.value || "",
        gender: selectedGender,
        voice: voiceSelect?.value || "",
        speed: speedRange?.value || "",
        pitch: pitchRange?.value || "",
        textLength: getText().length,
        providerAvailable: puterReady(),
        speaking: isSpeaking
      }),
      generateAudio,
      previewVoice,
      stopPlayback,
      updateVoiceList,
      clearResults: () => {
        generatedItems.slice().forEach(removeEntry);
      }
    };
  }

  /* ---------------------------------------------------------
     Initialization
     --------------------------------------------------------- */

  function initialize() {
    loadTheme();
    loadSettings();
    setupEventListeners();
    updateCounters();
    updateRangeLabels();
    updateResultsCount();

    if (!speechSynth) {
      setStatus(
        "!",
        "Is browser mein text-to-speech support available nahi hai.",
        "error"
      );
    }

    /*
     * Voices page load ke waqt ya kuch milliseconds baad available ho sakti hain.
     */
    loadBrowserVoices();

    if (speechSynth) {
      speechSynth.addEventListener(
        "voiceschanged",
        loadBrowserVoices
      );
    }

    /*
     * Puter script defer ke saath load hoti hai. Is liye kuch time baad
     * voice list dobara refresh karte hain agar provider available ho.
     */
    setTimeout(updateVoiceList, 500);
    setTimeout(updateVoiceList, 1500);

    exposeDebugApi();
    updateActionStates();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }
})();

