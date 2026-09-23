import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Copy, Moon, Pause, Play, RotateCcw, Square, Sun, Trash2, Volume2, VolumeX } from 'lucide-react';

type SpeechStatus = 'ready' | 'speaking' | 'paused' | 'stopped' | 'error';

type BrowserVoice = SpeechSynthesisVoice;

const sampleText =
  'Good ideas deserve room to breathe. Write a sentence here, then press play to hear it in your browser.';

function Home() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<BrowserVoice[]>([]);
  const [selectedVoiceKey, setSelectedVoiceKey] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [status, setStatus] = useState<SpeechStatus>('ready');
  const [statusMessage, setStatusMessage] = useState('Ready when you are');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<BrowserVoice[]>([]);

  const loadVoices = useCallback(() => {
    // Some browsers return an empty list on the first call and populate it later.
    const nextVoices = window.speechSynthesis.getVoices();
    if (nextVoices.length > 0) {
      voicesRef.current = nextVoices;
      setVoices(nextVoices);
      setSelectedVoiceKey((current) => {
        if (current && nextVoices.some((voice) => voiceKey(voice) === current)) return current;
        const preferred = nextVoices.find((voice) => voice.default) ?? nextVoices[0];
        return preferred ? voiceKey(preferred) : '';
      });
    }
  }, []);

  useEffect(() => {
    const synthesisAvailable =
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window;
    setIsSupported(synthesisAvailable);
    if (!synthesisAvailable) {
      setStatus('error');
      setStatusMessage('Speech is not supported in this browser');
      return;
    }

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    };
  }, [loadVoices]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('clearvoice-theme');
    const dark = storedTheme === 'dark';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const selectedVoice = useMemo(
    () => voices.find((voice) => voiceKey(voice) === selectedVoiceKey),
    [selectedVoiceKey, voices],
  );
  const hasText = text.trim().length > 0;
  const isSpeaking = status === 'speaking';
  const isPaused = status === 'paused';
  const isActive = isSpeaking || isPaused;
  const voiceLoading = isSupported && voices.length === 0;
  const statusLabel = !isSupported
    ? 'Unavailable'
    : status === 'speaking'
      ? 'Speaking'
      : status === 'paused'
        ? 'Paused'
        : status === 'stopped'
          ? 'Stopped'
          : status === 'error'
            ? 'Unavailable'
            : 'Ready';

  const toggleTheme = () => {
    setIsDark((current) => {
      const next = !current;
      document.documentElement.classList.toggle('dark', next);
      window.localStorage.setItem('clearvoice-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const stopSpeaking = useCallback(() => {
    if (!isSupported) return;
    // cancel() immediately clears the browser speech queue and any active utterance.
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus('stopped');
    setStatusMessage('Stopped');
  }, [isSupported]);

  const playSpeaking = () => {
    if (!isSupported) {
      setStatus('error');
      setStatusMessage('Speech is not supported in this browser');
      return;
    }
    if (!hasText) {
      setStatus('error');
      setStatusMessage('Add some text before pressing play');
      return;
    }

    // Stop first so Play always starts a fresh, predictable reading.
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => {
      if (utteranceRef.current !== utterance) return;
      setStatus('speaking');
      setStatusMessage('Speaking now');
    };
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setStatus('ready');
      setStatusMessage('Finished reading');
    };
    utterance.onerror = (event) => {
      // "canceled" is expected when Stop or a fresh Play clears the queue.
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setStatus('error');
      setStatusMessage('Speech could not be started');
    };
    utteranceRef.current = utterance;
    setStatus('speaking');
    setStatusMessage('Starting…');
    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeaking = () => {
    if (!isSupported || !isSpeaking) return;
    window.speechSynthesis.pause();
    setStatus('paused');
    setStatusMessage('Paused');
  };

  const resumeSpeaking = () => {
    if (!isSupported || !isPaused) return;
    window.speechSynthesis.resume();
    setStatus('speaking');
    setStatusMessage('Speaking now');
  };

  const clearText = () => {
    if (isActive) stopSpeaking();
    setText('');
    setCopyFeedback('');
    setStatus('ready');
    setStatusMessage('Ready when you are');
  };

  const useSample = () => {
    if (isActive) stopSpeaking();
    setText(sampleText);
    setStatus('ready');
    setStatusMessage('Sample loaded');
  };

  const copyText = async () => {
    if (!text) return;

    try {
      // Clipboard access is kept local to the browser; no text is sent anywhere.
      await navigator.clipboard.writeText(text);
      setCopyFeedback('Copied');
    } catch {
      const fallback = document.createElement('textarea');
      fallback.value = text;
      fallback.setAttribute('readonly', '');
      fallback.style.position = 'fixed';
      fallback.style.opacity = '0';
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      fallback.remove();
      setCopyFeedback('Copied');
    }
  };

  return (
    <main className="studio-page">
      <div className="page-grid" aria-hidden="true" />
      <div className="studio-shell">
        <header className="fade-up flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="wave-mark" aria-hidden="true"><span className="wave-line" /></div>
            <div>
              <div className="display-font text-[15px] font-extrabold tracking-[-0.03em]">clearvoice</div>
              <div className="eyebrow mt-0.5">browser speech studio</div>
            </div>
          </div>
          <button
            type="button"
            className="action-button quiet-button !rounded-full !p-2.5"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            data-testid="button-toggle-theme"
          >
            {isDark ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
          </button>
        </header>

        <section className="fade-up fade-up-delay-1 mb-8 mt-14 max-w-2xl md:mt-20">
          <div className="eyebrow mb-4">A quiet place for your words</div>
          <h1 className="display-font text-balance text-[clamp(2.45rem,7vw,5.15rem)] font-extrabold leading-[0.98] tracking-[-0.065em]">
            Hear what you<br /><span className="text-[hsl(var(--primary))]">mean to say.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground">
            Paste a passage, choose a voice, and listen. Clearvoice runs entirely in your browser — your words stay yours.
          </p>
        </section>

        {!isSupported && (
          <div className="fade-up mb-5 flex items-start gap-3 rounded-xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]" role="alert" data-testid="alert-unsupported">
            <VolumeX size={18} className="mt-0.5 shrink-0" />
            <div><strong>This browser cannot speak text.</strong><div className="mt-0.5 opacity-80">Try the latest version of Chrome, Safari, Edge, or Firefox.</div></div>
          </div>
        )}

        <section className="fade-up fade-up-delay-2 glass-panel overflow-hidden rounded-[20px]" aria-label="Text editor">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-7">
            <div className="flex items-center gap-2.5">
              <span className={`status-dot ${isSpeaking ? 'is-speaking' : isPaused ? 'is-paused' : status === 'error' ? 'is-error' : ''}`} />
              <span className="text-sm font-semibold" data-testid="status-speech">{statusLabel}</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground" data-testid="text-character-count">
              {text.length.toLocaleString()} / 5,000
            </span>
          </div>
          <div className="px-5 pb-3 pt-2 sm:px-7">
            <textarea
              value={text}
              maxLength={5000}
              onChange={(event) => {
                setText(event.target.value);
                if (status === 'error' && event.target.value.trim()) {
                  setStatus('ready');
                  setStatusMessage('Ready when you are');
                }
              }}
              placeholder="Type or paste something you want to hear…"
              className="voice-textarea w-full text-[16px] sm:text-[17px]"
              aria-label="Text to read aloud"
              data-testid="input-speech-text"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-3.5 sm:px-7">
            <button type="button" className="action-button quiet-button !border-0 !bg-transparent !px-0 text-muted-foreground hover:!bg-transparent hover:!text-foreground" onClick={useSample} data-testid="button-use-sample">
              <RotateCcw size={14} /> Try a sample
            </button>
            <div className="flex items-center gap-4">
              <button type="button" className="action-button quiet-button !border-0 !bg-transparent !px-0 text-muted-foreground hover:!bg-transparent hover:!text-foreground" onClick={copyText} disabled={!text} data-testid="button-copy-text">
                <Copy size={14} /> {copyFeedback || 'Copy text'}
              </button>
              <button type="button" className="action-button quiet-button !border-0 !bg-transparent !px-0 text-muted-foreground hover:!bg-transparent hover:!text-[hsl(var(--destructive))]" onClick={clearText} disabled={!text && !isActive} data-testid="button-clear-text">
                <Trash2 size={14} /> Clear
              </button>
            </div>
          </div>
        </section>

        <section className="fade-up fade-up-delay-3 control-surface mt-4 rounded-[18px] p-5 sm:p-6" aria-label="Speech controls">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:gap-10">
            <div>
              <label htmlFor="voice-select" className="eyebrow mb-2 block">Voice</label>
              <div className="relative">
                <select
                  id="voice-select"
                  className="select-field"
                  value={selectedVoiceKey}
                  onChange={(event) => setSelectedVoiceKey(event.target.value)}
                  disabled={!isSupported || voiceLoading}
                  data-testid="select-voice"
                >
                  {voiceLoading && <option value="">Finding voices…</option>}
                  {!voiceLoading && voices.length === 0 && <option value="">Default browser voice</option>}
                  {voices.map((voice) => (
                    <option value={voiceKey(voice)} key={voiceKey(voice)}>{voice.name} — {voice.lang}</option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Volume2 size={13} /> {voiceLoading ? 'Voices are loading from your browser' : `${voices.length || 1} voice${voices.length === 1 ? '' : 's'} available`}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <RangeControl label="Speed" value={rate} min={0.5} max={2} step={0.1} display={`${rate.toFixed(1)}×`} onChange={setRate} testId="input-speed" />
              <RangeControl label="Pitch" value={pitch} min={0.5} max={2} step={0.1} display={`${pitch.toFixed(1)}×`} onChange={setPitch} testId="input-pitch" />
              <RangeControl label="Volume" value={volume} min={0} max={1} step={0.05} display={`${Math.round(volume * 100)}%`} onChange={setVolume} testId="input-volume" />
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-2.5 border-t border-border/70 pt-5">
            <button type="button" className="action-button primary-button min-w-[106px]" onClick={playSpeaking} disabled={!isSupported || !hasText} data-testid="button-play">
              <Play size={16} fill="currentColor" /> Play
            </button>
            <button type="button" className="action-button quiet-button" onClick={pauseSpeaking} disabled={!isSupported || !isSpeaking} data-testid="button-pause">
              <Pause size={16} fill="currentColor" /> Pause
            </button>
            <button type="button" className="action-button quiet-button" onClick={resumeSpeaking} disabled={!isSupported || !isPaused} data-testid="button-resume">
              <Play size={16} fill="currentColor" /> Resume
            </button>
            <button type="button" className="action-button danger-button ml-auto" onClick={stopSpeaking} disabled={!isSupported || !isActive} data-testid="button-stop">
              <Square size={14} fill="currentColor" /> Stop
            </button>
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-2 pb-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Private by default. No account, no upload, no setup.</span>
          <span className="font-mono tracking-wide">Web Speech API / local only</span>
        </footer>
      </div>
    </main>
  );
}

function voiceKey(voice: BrowserVoice) {
  return `${voice.name}::${voice.lang}::${voice.voiceURI}`;
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
  testId: string;
}) {
  const progress = `${((value - min) / (max - min)) * 100}%`;
  return (
    <label className="block">
      <span className="eyebrow mb-3 flex items-center justify-between">
        {label}<strong className="font-mono text-[11px] font-normal normal-case tracking-normal text-foreground">{display}</strong>
      </span>
      <input
        type="range"
        className="range-input"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--range-progress': progress } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        data-testid={testId}
      />
    </label>
  );
}

export default Home;
