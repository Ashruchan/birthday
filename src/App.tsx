/// <reference types="react" />
import { useState, useEffect, useRef, ChangeEvent, JSX } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Heart, 
  Pencil, 
  Share2, 
  Check, 
  RefreshCw, 
  ChevronDown, 
  Plus, 
  Maximize2, 
  Coffee, 
  Smile, 
  MapPin, 
  Compass, 
  Calendar,
  X,
  Play,
  Pause,
  Music,
  Sliders,
  Upload
} from "lucide-react";

// --- LO-FI AMBIENT AUDIO SYNTHESISER ---
// Creates real-time nostalgic tape hiss, wow & flutter pitch wobble, 
// and gentle slow-attack Rhodes-like major/minor 7th chords.
class LoFiSynth {
  private ctx: AudioContext | null = null;
  private lfo: OscillatorNode | null = null;
  private nodes: AudioNode[] = [];
  public isPlaying = false;
  private schedulerTimer: any = null;
  private activeOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];

  constructor() {}

  start(onPlayStateChange: (playing: boolean) => void) {
    if (this.isPlaying) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isPlaying = true;
      onPlayStateChange(true);

      // Master volume and warm low-fi tape filter
      const masterGain = this.ctx.createGain();
      masterGain.gain.value = 0.35; // Soft ambient volume

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 750; // Focused radio/tape bandpass
      bandpass.Q.value = 0.9;

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 1400; // Shave off harsh digital highs

      // Master audio chain
      masterGain.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(this.ctx.destination);

      // 1. White Noise and Sparse Crackle (Hiss + Record dust)
      const bufferSize = this.ctx.sampleRate * 2.5; // 2.5 seconds loop
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const channelData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Continuous soft white tape hiss
        let value = (Math.random() * 2 - 1) * 0.012;

        // Sparse dust pop / scratchy vinyl clicks
        if (Math.random() < 0.00018) {
          const clickHeight = Math.random() > 0.5 ? 0.25 : -0.25;
          value += clickHeight;
        }
        channelData[i] = value;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.value = 0.5;

      noiseSource.connect(noiseGain);
      noiseGain.connect(lowpass);
      noiseSource.start(0);
      this.nodes.push(noiseSource);

      // 2. Wow and Flutter LFO (Imitates mechanical belt speed fluctuations)
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 4.2; // 4.2 Hz wobble rate
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.18; // Pitch modulation depth

      lfo.connect(lfoGain);
      lfo.start(0);
      this.lfo = lfo;

      // 3. Ambient chord loop (Chamber scale Rhodes progression)
      // Progression: Fmaj7 -> Em7 -> Dm7 -> Cmaj7 (Very warm, slightly melancholic)
      const progressions = [
        [174.61, 261.63, 329.63, 440.00], // Fmaj7 (F3, C4, E4, A4)
        [164.81, 246.94, 293.66, 392.00], // Em7 (E3, B3, D4, G4)
        [146.83, 220.00, 261.63, 349.23], // Dm7 (D3, A3, C4, F4)
        [130.81, 196.00, 246.94, 329.63], // Cmaj7 (C3, G3, B3, E4)
      ];

      let chordIdx = 0;
      const playNext = () => {
        if (!this.isPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = progressions[chordIdx];
        const duration = 6.5; // Seconds per chord transition

        notes.forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          osc.type = "triangle"; // Smooth, mellow fundamental wave
          osc.frequency.value = freq;

          // Connect tape wobble LFO to pitch
          lfoGain.connect(osc.frequency);

          const noteGain = this.ctx.createGain();
          // Slow organic attack and release envelope
          noteGain.gain.setValueAtTime(0, now);
          noteGain.gain.linearRampToValueAtTime(0.12, now + 2.0); // 2 seconds fade in
          noteGain.gain.setValueAtTime(0.12, now + 4.0);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration - 0.2); // Gentle release

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(now);
          osc.stop(now + duration);

          this.activeOscillators.push({ osc, gain: noteGain });
        });

        chordIdx = (chordIdx + 1) % progressions.length;
        this.schedulerTimer = setTimeout(playNext, (duration - 1.2) * 1000);
      };

      playNext();
    } catch (err) {
      console.error("Audio activation failed", err);
      onPlayStateChange(false);
    }
  }

  stop(onPlayStateChange: (playing: boolean) => void) {
    this.isPlaying = false;
    onPlayStateChange(false);
    if (this.schedulerTimer) clearTimeout(this.schedulerTimer);

    try {
      this.activeOscillators.forEach(({ osc }) => {
        try { osc.stop(); } catch (e) {}
      });
      this.nodes.forEach((n: any) => {
        try { n.stop(); } catch (e) {}
      });
      if (this.lfo) {
        try { this.lfo.stop(); } catch (e) {}
      }
      if (this.ctx) {
        this.ctx.close();
      }
    } catch (err) {
      console.error("Audio cleanup failed", err);
    }

    this.ctx = null;
    this.lfo = null;
    this.nodes = [];
    this.activeOscillators = [];
  }
}

// --- INTERFACES ---
interface DiaryState {
  friendName: string;
  senderName: string;
  insideJokeTitle: string;
  insideJokeText: string;
  ritualTitle: string;
  ritualText: string;
  roughPatchTitle: string;
  roughPatchText: string;
  milestoneTitle: string;
  milestoneText: string;
  finalLetter: string;
}

const DEFAULT_STATE: DiaryState = {
  friendName: "Sanjana",
  senderName: "Ashru",
  insideJokeTitle: "the infinite \"wud?\" echo",
  insideJokeText: "We ask each other 'wud?' so many times a day that it has basically become our primary language. It doesn't matter if we're both busy or if absolutely nothing is happening. It's our own comfortable way of saying 'I'm still here' in the chat, over and over.",
  ritualTitle: "a legendary yapper on the line",
  ritualText: "Every single time you call, you immediately launch into yapping about everything—school, family, or the tiniest micro-drama of the morning. You are an elite, world-class yapper, and honestly, just listening to you piece the day together is one of my favorite daily rituals.",
  roughPatchTitle: "when things went quiet",
  roughPatchText: "There was a stretch where you pulled back and didn't really feel like talking. Instead of forcing it, we just let the space exist. We didn't panic, didn't rush, and quietly found our way back. That was when I realized what we have is incredibly real.",
  milestoneTitle: "365 days of chaotic song-shares",
  milestoneText: "We met randomly in a Discord server on 28/5/2025. A year later, we're still here—sharing countless song recommendations, talking about favorite characters, getting annoyed over completely silly debates, and me finding new ways to piss you off just because your annoyed face is the funniest thing ever.",
  finalLetter: "I didn't expect two random people who met on a random Discord server on a random day to end up this close a year later. Having you in my corner makes the chaotic noise of everyday life feel a little more human. Thank you for the yapping, for letting me annoy you, and for always being you. I'm really glad it happened. I'm really glad it's you."
};

export default function App() {
  const [diary, setDiary] = useState<DiaryState>(DEFAULT_STATE);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isCandleLit, setIsCandleLit] = useState(true);
  const [wishRevealed, setWishRevealed] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activePolaroid, setActivePolaroid] = useState<number | null>(null);

  // Customizable music variables
  const [volume, setVolume] = useState(0.4);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isTapeMenuOpen, setIsTapeMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Handle HTML5 Audio initialization and tracking
  useEffect(() => {
    const audio = new Audio();
    audio.src = "/src/assets/music.mp3";
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    const onPlay = () => setIsAudioPlaying(true);
    const onPause = () => setIsAudioPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const onError = () => {
      console.log("Audio failed to load from:", audio.src);
      setAudioError("Track 'music.mp3' not uploaded or ready yet. Add/overwrite your song inside 'src/assets/music.mp3' in the codebase to play!");
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("error", onError);
    };
  }, []);

  // Synchronize volume slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Parse custom details from URL hash if available (enables easy serverless sharing!)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#data=")) {
        try {
          const base64Data = hash.substring(6);
          // Safely decode UTF-8 string from Base64
          const decodedJSON = decodeURIComponent(
            escape(atob(base64Data))
          );
          const parsedData = JSON.parse(decodedJSON);
          // Validate structure
          const validated: DiaryState = {
            friendName: parsedData.friendName || DEFAULT_STATE.friendName,
            senderName: parsedData.senderName || DEFAULT_STATE.senderName,
            insideJokeTitle: parsedData.insideJokeTitle || DEFAULT_STATE.insideJokeTitle,
            insideJokeText: parsedData.insideJokeText || DEFAULT_STATE.insideJokeText,
            ritualTitle: parsedData.ritualTitle || DEFAULT_STATE.ritualTitle,
            ritualText: parsedData.ritualText || DEFAULT_STATE.ritualText,
            roughPatchTitle: parsedData.roughPatchTitle || DEFAULT_STATE.roughPatchTitle,
            roughPatchText: parsedData.roughPatchText || DEFAULT_STATE.roughPatchText,
            milestoneTitle: parsedData.milestoneTitle || DEFAULT_STATE.milestoneTitle,
            milestoneText: parsedData.milestoneText || DEFAULT_STATE.milestoneText,
            finalLetter: parsedData.finalLetter || DEFAULT_STATE.finalLetter,
          };
          setDiary(validated);
        } catch (e) {
          console.error("Failed to parse shared diary data from hash", e);
        }
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Monitor scroll progress to trigger golden-to-night gradient morphing
  useEffect(() => {
    const handleScroll = () => {
      const el = pageContainerRef.current;
      if (!el) return;
      const totalHeight = el.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;
      const progress = Math.min(Math.max(window.scrollY / totalHeight, 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleTogglePlay = async () => {
    setAudioError(null);
    if (!audioRef.current) return;

    if (isAudioPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
        setIsAudioPlaying(true);
      } catch (err) {
        console.error("Custom audio play failed:", err);
        setAudioError("Track 'music.mp3' not uploaded or ready yet. Add/overwrite your song inside 'src/assets/music.mp3' in the codebase to play!");
        setIsAudioPlaying(false);
      }
    }
  };

  const handleScrubChange = (e: ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const blowOutCandle = () => {
    setIsCandleLit(false);
    setTimeout(() => {
      setWishRevealed(true);
    }, 800);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Define interpolated colors for the day-to-night background progression
  // Using exact Artistic Flair palette hex values:
  // #fdfaf1 (warm cream) -> #ecdcb0 (golden ochre) -> #4a5d4e (soft sage) -> #0b110d (near-black forest)
  const getBackgroundColor = () => {
    if (scrollProgress < 0.3) {
      // Transition from #fdfaf1 (253, 250, 241) to #ecdcb0 (236, 220, 176)
      const ratio = scrollProgress / 0.3;
      const r = Math.round(253 - (253 - 236) * ratio);
      const g = Math.round(250 - (250 - 220) * ratio);
      const b = Math.round(241 - (241 - 176) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (scrollProgress < 0.7) {
      // Transition from #ecdcb0 (236, 220, 176) to #4a5d4e (74, 93, 78)
      const ratio = (scrollProgress - 0.3) / 0.4;
      const r = Math.round(236 - (236 - 74) * ratio);
      const g = Math.round(220 - (220 - 93) * ratio);
      const b = Math.round(176 - (176 - 78) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Transition from #4a5d4e (74, 93, 78) to #0b110d (11, 17, 13)
      const ratio = (scrollProgress - 0.7) / 0.3;
      const r = Math.round(74 - (74 - 11) * ratio);
      const g = Math.round(93 - (93 - 17) * ratio);
      const b = Math.round(78 - (78 - 13) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Text colors based on scroll depth
  const isDarkBg = scrollProgress > 0.55;

  return (
    <div 
      ref={pageContainerRef}
      id="root-container"
      className="grain-bg scanlines min-h-screen transition-all duration-700 select-none overflow-x-hidden pb-32"
      style={{ backgroundColor: getBackgroundColor() }}
    >
      {/* Delicate Artistic Border Frame Overlay */}
      <div className="fixed inset-0 pointer-events-none border-[8px] sm:border-[12px] border-[#0b110d]/25 dark:border-[#fdfaf1]/10 mix-blend-overlay z-40" />

      {/* Dynamic Scroll Indicator - Sun/Moon sinking in the background */}
      <div className="fixed top-4 right-4 sm:top-8 sm:right-8 z-50 flex flex-col items-end gap-2">
        {/* Simple Audio Player Trigger - Cassette Box */}
        <button
          id="audio-cassette-btn"
          onClick={() => setIsTapeMenuOpen(!isTapeMenuOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-all duration-300 backdrop-blur-md shadow-sm cursor-pointer ${
            isDarkBg 
              ? "bg-stone-900/40 border-stone-700/50 text-amber-200/85 hover:bg-stone-900/65" 
              : "bg-amber-100/50 border-amber-800/20 text-amber-900 hover:bg-amber-100/80"
          }`}
          title="Nostalgic Ambient Cassette"
        >
          {isAudioPlaying ? (
            <>
              <Volume2 className="w-3.5 h-3.5 animate-bounce" />
              <span className="font-scribble text-sm animate-pulse">
                music playing...
              </span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 opacity-60" />
              <span className="font-scribble text-sm text-stone-500">silent tape</span>
            </>
          )}
        </button>

        {/* --- EXPANDABLE SKEUOMORPHIC CASSETTE TAPE DECK PANEL --- */}
        <AnimatePresence>
          {isTapeMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-80 bg-[#fbf8f0] dark:bg-stone-900 border border-amber-900/20 dark:border-stone-800 rounded-2xl shadow-2xl p-4 select-text font-mono text-xs text-stone-800 dark:text-stone-200"
            >
              <div className="flex items-center justify-between border-b border-amber-900/10 dark:border-stone-800 pb-2 mb-3">
                <span className="font-bold text-[10px] tracking-wider uppercase text-amber-900/60 dark:text-stone-400 flex items-center gap-1">
                  <Music className="w-3 h-3 text-amber-600" />
                  Visual Tape Deck
                </span>
                <button 
                  onClick={() => setIsTapeMenuOpen(false)}
                  className="p-1 rounded hover:bg-amber-900/5 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Physical Cassette Illustration */}
              <div className="w-full h-24 bg-stone-200 dark:bg-stone-955 border border-stone-300 dark:border-stone-800 rounded-lg relative overflow-hidden flex flex-col justify-between p-2 shadow-inner mb-3">
                {/* Vintage details */}
                <div className="flex justify-between items-center text-[8px] opacity-40 font-bold px-1 select-none">
                  <span>A-SIDE</span>
                  <span>NR [ DOLBY ]</span>
                </div>

                {/* Cassette Center Window with Spindles */}
                <div className="w-3/4 h-10 mx-auto bg-stone-300 dark:bg-stone-900 border border-stone-400 dark:border-stone-800 rounded-md relative flex items-center justify-between px-6 shadow-inner overflow-hidden select-none">
                  {/* Left Spindle */}
                  <motion.div 
                    animate={isAudioPlaying ? { rotate: 360 } : {}}
                    transition={isAudioPlaying ? { ease: "linear", duration: 4, repeat: Infinity } : {}}
                    className="w-6 h-6 rounded-full border-4 border-dashed border-stone-600 dark:border-stone-400 flex items-center justify-center relative"
                  >
                    <div className="w-2 h-2 rounded-full bg-stone-700 dark:bg-stone-300" />
                  </motion.div>

                  {/* Tape Wound visual */}
                  <div className="absolute left-14 right-14 top-1/2 -translate-y-1/2 h-1 bg-amber-950/20 dark:bg-amber-200/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-800/60 transition-all duration-300"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>

                  {/* Right Spindle */}
                  <motion.div 
                    animate={isAudioPlaying ? { rotate: 360 } : {}}
                    transition={isAudioPlaying ? { ease: "linear", duration: 4, repeat: Infinity } : {}}
                    className="w-6 h-6 rounded-full border-4 border-dashed border-stone-600 dark:border-stone-400 flex items-center justify-center relative"
                  >
                    <div className="w-2 h-2 rounded-full bg-stone-700 dark:bg-stone-300" />
                  </motion.div>
                </div>

                {/* Cassette Title Label */}
                <div className="w-full text-center text-[10px] bg-white/70 dark:bg-stone-800/70 border border-stone-300/40 py-0.5 rounded font-handwritten tracking-wide truncate max-w-full px-2 text-stone-700 dark:text-stone-300">
                  music.mp3
                </div>
              </div>

              {/* Error messages if any */}
              {audioError && (
                <div className="p-2 mb-3 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-600 dark:text-red-400 leading-normal select-text">
                  {audioError}
                </div>
              )}

              {/* Controls bar */}
              <div className="space-y-3">
                {/* Scrubber */}
                <div className="space-y-1">
                  <input 
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleScrubChange}
                    className="w-full accent-amber-600 bg-stone-200 dark:bg-stone-800 h-1 rounded-full cursor-pointer appearance-none"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Play/Pause physical round key */}
                  <button
                    onClick={handleTogglePlay}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:scale-105 active:scale-95 transition cursor-pointer"
                  >
                    {isAudioPlaying ? (
                      <Pause className="w-4 h-4 fill-white text-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    )}
                  </button>

                  {/* Volume Slider Block */}
                  <div className="flex-1 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-stone-400" />
                    <input 
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-600 bg-stone-200 dark:bg-stone-800 h-1 rounded-full cursor-pointer appearance-none"
                    />
                  </div>
                </div>

                <div className="border-t border-dashed border-stone-200 dark:border-stone-800 pt-3 mt-1 text-center">
                  <p className="text-[9px] text-stone-400 dark:text-stone-500 leading-relaxed font-mono">
                    *Note: Place your song file inside your project codebase by overwriting the file <span className="font-bold text-amber-600">/src/assets/music.mp3</span> to play your personal soundtrack!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sinking Sun/Moon Sky Progress Bar */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-2 pointer-events-none">
        <span className={`text-[10px] font-mono tracking-widest uppercase vertical-text ${isDarkBg ? "text-stone-500" : "text-amber-800/40"}`}>
          daybreak
        </span>
        <div className={`w-0.5 h-32 rounded-full relative overflow-hidden ${isDarkBg ? "bg-stone-800" : "bg-amber-800/10"}`}>
          <div 
            className="absolute left-0 top-0 w-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>
        <span className={`text-[10px] font-mono tracking-widest uppercase vertical-text ${isDarkBg ? "text-stone-300" : "text-amber-900/30"}`}>
          midnight
        </span>
      </div>

      {/* Main Column Wrapper */}
      <main className="max-w-xl mx-auto px-6 pt-24 md:pt-36 flex flex-col items-center">
        
        {/* --- SECTION 1: THE OPENING (CHUNKY OVERLAPPING TYPOGRAPHY) --- */}
        <section id="section-opening" className="w-full min-h-[80vh] flex flex-col justify-center relative select-none">
          {/* Subtle Year Marker */}
          <span className={`font-mono text-xs tracking-widest uppercase mb-4 transition-colors duration-500 ${
            isDarkBg ? "text-amber-200/50" : "text-amber-900/50"
          }`}>
            [ secret-visual-diary.log ]
          </span>

          {/* Sincere handwritten subtitle */}
          <p className="font-serif-tactile italic text-2xl text-[#854d0e] opacity-90 mb-4 select-none">
            Another lap around the sun.
          </p>

          {/* Chunky Overlapping Display Title */}
          <div className="relative mb-16 select-none cursor-default py-4">
            <h1 className="font-display text-[12vw] sm:text-7xl md:text-8xl font-black leading-[0.85] tracking-tighter text-[#c2410c] mix-blend-multiply opacity-90 transform -rotate-3 select-none uppercase">
              {diary.friendName}
            </h1>
            
            <h1 className="font-instrument italic text-[7.5vw] sm:text-5xl md:text-6xl text-[#854d0e]/95 absolute bottom-[-4vw] sm:bottom-[-2rem] left-[4vw] sm:left-8 rotate-2 select-none pointer-events-none">
              is another year older.
            </h1>

            {/* Scribbled ring around the name using SVG */}
            <svg className="absolute -inset-x-4 -inset-y-6 w-[110%] h-[150%] pointer-events-none opacity-40 text-amber-700" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M5,50 C10,15 90,5 95,45 C98,75 20,95 8,75 C2,65 30,35 85,25" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="mt-12 max-w-sm">
            <p className={`font-serif-tactile text-md md:text-lg leading-relaxed italic transition-colors duration-500 ${
              isDarkBg ? "text-stone-300" : "text-stone-700"
            }`}>
              I made this little scrap-canvas for you. A physical record of things that usually only sit in chat logs or memory cells. Scroll through it when the world gets too noisy.
            </p>
          </div>

          {/* Downward arrow scribble indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-70">
            <span className={`text-[10px] font-mono tracking-widest uppercase ${isDarkBg ? "text-stone-500" : "text-amber-950/40"}`}>
              scroll down
            </span>
            <ChevronDown className={`w-4 h-4 animate-bounce ${isDarkBg ? "text-stone-400" : "text-amber-900"}`} />
          </div>
        </section>


        {/* --- SECTION 2: INSIDE JOKES & STORY BEATS (GOLDEN HOUR / TRANSITIONAL) --- */}
        <section id="story-beats" className="w-full flex flex-col gap-24 py-16">
          
          {/* Story Beat 1: The Inside Joke (Diner Table Polaroid) */}
          <div className="w-full flex flex-col relative">
            <div className={`absolute -left-4 top-1/2 -translate-y-1/2 font-scribble text-6xl text-amber-800/10 select-none pointer-events-none rotate-12`}>
              01
            </div>

            {/* Polaroid Stacked Memories */}
            <div className="relative w-full max-w-[340px] mx-auto h-[380px] sm:h-[400px]">
              {/* Back Polaroid Card (Image 2) */}
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 12, zIndex: 30 }}
                transition={{ type: "spring", stiffness: 200 }}
                onClick={() => setActivePolaroid(2)}
                className="absolute top-4 left-6 w-[250px] bg-white p-4 pb-12 shadow-xl transform rotate-6 border-b-[35px] border-white ring-1 ring-black/5 cursor-pointer z-0 transition-shadow"
              >
                <div className="aspect-square w-full bg-stone-200 overflow-hidden relative border border-stone-100">
                  <img 
                    src="/src/assets/images/WhatsApp Image 2026-07-21 at 11.55.33 AM (1).jpeg" 
                    alt="Sanjana candid photo" 
                    className="w-full h-full object-cover saturate-105 brightness-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-amber-500/5 mix-blend-multiply pointer-events-none" />
                </div>
                <div className="absolute bottom-[-28px] left-0 right-0 text-center">
                  <span className="font-handwritten text-sm text-zinc-600 block leading-none">
                    "making faces"
                  </span>
                </div>
              </motion.div>

              {/* Front Polaroid Card (Image 1) */}
              <motion.div 
                whileHover={{ scale: 1.05, rotate: -4, zIndex: 30 }}
                transition={{ type: "spring", stiffness: 200 }}
                onClick={() => setActivePolaroid(1)}
                className="absolute top-2 left-0 w-[260px] bg-white p-4 pb-12 shadow-2xl transform -rotate-3 border-b-[35px] border-white ring-1 ring-black/5 cursor-pointer z-10 hover:shadow-3xl"
              >
                {/* Paper Tape Effect */}
                <div className="tape absolute -top-4 left-1/3 w-24 h-5 rotate-12 pointer-events-none" />

                <div className="aspect-square w-full bg-stone-200 overflow-hidden relative border border-stone-100">
                  <img 
                    src="/src/assets/images/WhatsApp Image 2026-07-21 at 11.55.32 AM.jpeg" 
                    alt="Sanjana smiling photo" 
                    className="w-full h-full object-cover saturate-110 sepia-[5%] brightness-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </div>
                <div className="absolute bottom-[-28px] left-0 right-0 text-center">
                  <span className="font-handwritten text-sm text-zinc-700 block leading-none font-bold">
                    "{diary.insideJokeTitle}"
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Accompanying diary writing text with artistic details */}
            <div className="w-full max-w-sm mx-auto mt-6 relative">
              <svg className="absolute -left-12 -top-16 w-32 h-20 pointer-events-none opacity-20 text-[#c2410c]" viewBox="0 0 100 50">
                <path d="M5,25 Q15,5 30,25 T55,25 T80,25 T95,5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className={`font-mono text-[9px] tracking-[0.2em] uppercase mb-1.5 block transition-colors duration-500 ${
                isDarkBg ? "text-amber-200/50" : "text-amber-950/40"
              }`}>
                Fragment 01 // The Joke
              </span>
              <h3 className={`font-display text-xl font-extrabold tracking-tight mb-2 transition-colors duration-500 ${
                isDarkBg ? "text-amber-200" : "text-amber-950"
              }`}>
                The Bus Sentience Argument
              </h3>
              <p className={`font-serif-tactile text-md leading-relaxed transition-colors duration-500 ${
                isDarkBg ? "text-stone-300" : "text-stone-800"
              }`}>
                {diary.insideJokeText}
              </p>
              <div className="absolute -bottom-8 right-0 text-[70px] md:text-[85px] font-black text-black/5 dark:text-white/5 tracking-widest uppercase pointer-events-none select-none font-display">
                ALWAYS
              </div>
            </div>
          </div>


          {/* Story Beat 2: Running Ritual ("One More Block") */}
          <div className="w-full flex flex-col relative">
            <div className={`absolute -right-4 top-1/2 -translate-y-1/2 font-scribble text-6xl text-amber-800/10 select-none pointer-events-none -rotate-12`}>
              02
            </div>

            {/* Polaroid Stacked Memories */}
            <div className="relative w-full max-w-[340px] mx-auto h-[380px] sm:h-[400px]">
              {/* Back Polaroid Card (Image 4) */}
              <motion.div 
                whileHover={{ scale: 1.05, rotate: -8, zIndex: 30 }}
                transition={{ type: "spring", stiffness: 200 }}
                onClick={() => setActivePolaroid(4)}
                className="absolute top-4 left-0 w-[250px] bg-white p-4 pb-12 shadow-xl transform -rotate-6 border-b-[35px] border-white ring-1 ring-black/5 cursor-pointer z-0 transition-shadow"
              >
                <div className="aspect-square w-full bg-stone-300 overflow-hidden relative border border-stone-200">
                  <img 
                    src="/src/assets/images/WhatsApp Image 2026-07-21 at 11.55.33 AM (2).jpeg" 
                    alt="Sanjana traditional look" 
                    className="w-full h-full object-cover saturate-105 brightness-95"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-amber-600/5 mix-blend-color pointer-events-none" />
                </div>
                <div className="absolute bottom-[-28px] left-0 right-0 text-center">
                  <span className="font-handwritten text-sm text-zinc-600 block leading-none">
                    "traditional vibe"
                  </span>
                </div>
              </motion.div>

              {/* Front Polaroid Card (Image 3) */}
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 6, zIndex: 30 }}
                transition={{ type: "spring", stiffness: 200 }}
                onClick={() => setActivePolaroid(3)}
                className="absolute top-2 right-0 w-[260px] bg-white p-4 pb-12 shadow-2xl transform rotate-3 border-b-[35px] border-white ring-1 ring-black/5 cursor-pointer z-10 hover:shadow-3xl"
              >
                {/* Double tape effect */}
                <div className="tape absolute -top-5 right-12 w-20 h-5 -rotate-6 pointer-events-none" />

                <div className="aspect-square w-full bg-stone-300 overflow-hidden relative border border-stone-200">
                  <img 
                    src="/src/assets/images/WhatsApp Image 2026-07-21 at 11.55.33 AM.jpeg" 
                    alt="Sanjana selfie" 
                    className="w-full h-full object-cover saturate-105 brightness-95"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute bottom-[-28px] left-0 right-0 text-center">
                  <span className="font-handwritten text-sm text-zinc-700 block leading-none font-bold">
                    "{diary.ritualTitle}"
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Accompanying diary writing text */}
            <div className="w-full max-w-sm mx-auto mt-6 relative">
              <span className={`font-mono text-[9px] tracking-[0.2em] uppercase mb-1.5 block transition-colors duration-500 ${
                isDarkBg ? "text-amber-200/50" : "text-amber-950/40"
              }`}>
                Fragment 02 // The Ritual
              </span>
              <h3 className={`font-display text-xl font-extrabold tracking-tight mb-2 transition-colors duration-500 ${
                isDarkBg ? "text-amber-200" : "text-stone-900"
              }`}>
                We Walk in Circles
              </h3>
              <p className={`font-serif-tactile text-md leading-relaxed transition-colors duration-500 ${
                isDarkBg ? "text-stone-300" : "text-stone-800"
              }`}>
                {diary.ritualText}
              </p>
              <div className="absolute -bottom-10 left-0 text-[70px] md:text-[85px] font-black text-black/5 dark:text-white/5 tracking-widest uppercase pointer-events-none select-none font-display">
                TOGETHER
              </div>
            </div>
          </div>


          {/* Story Beat 3: Rough Patch (Muted Dark Green/Sage transition) */}
          <div className="w-full flex flex-col relative pt-12">
            <div className={`absolute -left-4 top-1/2 -translate-y-1/2 font-scribble text-6xl text-stone-500/10 select-none pointer-events-none rotate-45`}>
              03
            </div>

            {/* Polaroid Photo 3 */}
            <motion.div 
              whileHover={{ scale: 1.03, rotate: 3 }}
              transition={{ type: "spring", stiffness: 250 }}
              onClick={() => setActivePolaroid(5)}
              className="w-full max-w-[320px] mx-auto bg-white p-5 shadow-2xl transform rotate-1 border-b-[45px] border-white ring-1 ring-black/5 relative cursor-pointer z-10"
            >
              {/* Tape effect */}
              <div className="tape bg-stone-900/80 border border-stone-800/20 absolute -top-4 left-1/4 w-24 h-6 -rotate-3 pointer-events-none" />

              <div className="aspect-square w-full bg-stone-900 overflow-hidden relative border border-stone-800">
                <img 
                  src="/src/assets/images/WhatsApp Image 2026-07-21 at 11.55.34 AM.jpeg" 
                  alt="Sanjana camera selfie" 
                  className="w-full h-full object-cover opacity-95 saturate-100 contrast-100"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-teal-950/10 mix-blend-color-burn pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Classic Polaroid Bottom Label Area */}
              <div className="absolute bottom-[-36px] left-0 right-0 text-center">
                <span className="font-handwritten text-xl text-zinc-700 block leading-none">
                  "{diary.roughPatchTitle}"
                </span>
                <span className="font-mono text-[8px] text-zinc-400 uppercase tracking-widest mt-1 block">
                  [ Fragment 03 ]
                </span>
              </div>
            </motion.div>

            {/* Accompanying diary writing text */}
            <div className="w-full max-w-sm mx-auto mt-6 relative">
              <span className={`font-mono text-[9px] tracking-[0.2em] uppercase mb-1.5 block transition-colors duration-500 ${
                isDarkBg ? "text-amber-200/50" : "text-amber-950/40"
              }`}>
                Fragment 03 // Overcoming
              </span>
              <h3 className={`font-display text-xl font-extrabold tracking-tight mb-2 transition-colors duration-500 ${
                isDarkBg ? "text-stone-200" : "text-stone-900"
              }`}>
                Sitting in the Dark
              </h3>
              <p className={`font-serif-tactile text-md leading-relaxed transition-colors duration-500 ${
                isDarkBg ? "text-stone-300" : "text-stone-700"
              }`}>
                {diary.roughPatchText}
              </p>
              <div className="absolute -bottom-10 right-0 text-[70px] md:text-[85px] font-black text-black/5 dark:text-white/5 tracking-widest uppercase pointer-events-none select-none font-display">
                BELONG
              </div>
            </div>
          </div>


          {/* Story Beat 4: One-Year Mark / Milestone */}
          <div className="w-full flex flex-col relative pt-12">
            <div className="w-full max-w-sm mx-auto bg-amber-950/20 border border-amber-950/10 dark:border-stone-800/30 p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm select-none">
              
              {/* Custom floating sketch star doodles inside box */}
              <div className="absolute top-4 right-4 text-amber-500/20 pointer-events-none animate-pulse">
                <Sparkles className="w-6 h-6" />
              </div>

              <span className="font-mono text-[10px] tracking-widest text-amber-600/70 uppercase">
                [ milestone marking ]
              </span>
              
              <h4 className={`font-display text-xl font-bold mt-1 mb-3 transition-colors duration-500 ${
                isDarkBg ? "text-amber-200" : "text-stone-900"
              }`}>
                {diary.milestoneTitle}
              </h4>

              <p className={`font-serif-tactile text-md leading-relaxed italic transition-colors duration-500 ${
                isDarkBg ? "text-stone-300" : "text-stone-800"
              }`}>
                "{diary.milestoneText}"
              </p>

              {/* Hand-drawn tiny scribble heart at the bottom */}
              <div className="flex justify-end mt-4">
                <Heart className="w-4 h-4 text-amber-600/60 fill-amber-600/10" />
              </div>
            </div>
          </div>

        </section>


        {/* --- SECTION 3: THE CLOSING (WHISPER QUIET / DEEP MIDNIGHT GREEN) --- */}
        <section id="closing-letter" className="w-full min-h-screen flex flex-col justify-center py-16 relative">
          
          <div className="w-full max-w-sm mx-auto relative z-10">
            {/* Tiny indicator */}
            <span className="font-mono text-[9px] tracking-widest text-stone-500 uppercase block mb-4">
              [ letter_09_signed.md ]
            </span>

            {/* Overlapping greeting */}
            <div className="relative mb-6 select-none">
              <h2 className="font-instrument italic text-5xl text-stone-200 leading-none">
                To {diary.friendName},
              </h2>
            </div>

            {/* Genuine, plainspoken letter body */}
            <div className="font-serif-tactile text-md md:text-lg text-stone-300 leading-relaxed space-y-6">
              <p>
                {diary.finalLetter}
              </p>
            </div>

            {/* Signature & Rough scribble underline */}
            <div className="mt-12 flex flex-col items-end">
              <span className="font-handwritten text-2xl text-amber-200">
                — {diary.senderName}
              </span>
              <span className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mt-1">
                with genuine fondness
              </span>
              
              {/* Doodle scribble underline */}
              <svg className="w-32 h-4 text-amber-700/60 mt-1 pointer-events-none" viewBox="0 0 100 10">
                <path d="M5,2 Q45,8 95,2 Q50,6 5,4 Q50,3 90,8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>


          {/* --- INTERACTIVE BIRTHDAY CANDLE / DELIGHTFUL EXTRA --- */}
          <div className="mt-28 w-full max-w-xs mx-auto flex flex-col items-center justify-center bg-stone-900/40 border border-stone-800/40 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden select-none">
            <h4 className="font-mono text-[10px] tracking-wider uppercase text-amber-400/60 mb-6 text-center">
              [ sensory wish-maker ]
            </h4>

            {/* Candle visual element */}
            <div className="relative h-28 flex flex-col items-center justify-end mb-4">
              <AnimatePresence>
                {isCandleLit ? (
                  /* Candle Flame */
                  <motion.div
                    key="flame"
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ 
                      opacity: 1, 
                      scale: [1, 1.1, 0.9, 1.05, 1],
                      y: [0, -2, 1, -1, 0],
                      rotate: [-1, 2, -2, 1, 0]
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.2, 
                      y: -20,
                      transition: { duration: 0.6, ease: "easeOut" } 
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.8,
                      ease: "easeInOut"
                    }}
                    className="absolute bottom-12 w-4 h-8 bg-gradient-to-t from-amber-500 via-orange-400 to-yellow-100 rounded-full blur-[1px] shadow-[0_0_15px_rgba(245,158,11,0.6)] cursor-pointer origin-bottom"
                    onClick={blowOutCandle}
                    title="Click or tap to blow out candle"
                  >
                    {/* Inner flame core */}
                    <div className="absolute bottom-1 left-1.5 w-1 h-3 bg-white/80 rounded-full" />
                  </motion.div>
                ) : (
                  /* Floating Smoke Puff */
                  <motion.div
                    key="smoke"
                    initial={{ opacity: 0.7, y: -10, scale: 0.6 }}
                    animate={{ opacity: 0, y: -60, scale: 1.6, rotate: 15 }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    className="absolute bottom-14 font-scribble text-sm text-stone-400 select-none pointer-events-none"
                  >
                    *puff*
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Candle Stick */}
              <div className="w-4 h-12 bg-gradient-to-r from-teal-700 to-teal-800 rounded-md relative shadow-inner">
                {/* Wax stripes */}
                <div className="absolute top-2 w-full h-1 bg-amber-200/20 rotate-12" />
                <div className="absolute top-5 w-full h-1 bg-amber-200/20 rotate-12" />
                <div className="absolute top-8 w-full h-1 bg-amber-200/20 rotate-12" />
                {/* Wick */}
                <div className="absolute -top-1.5 left-1.5 w-0.5 h-1.5 bg-stone-700" />
              </div>
            </div>

            {/* Tap prompt */}
            <AnimatePresence mode="wait">
              {isCandleLit ? (
                <motion.button
                  key="lit-state"
                  onClick={blowOutCandle}
                  className="font-handwritten text-lg text-stone-300 hover:text-amber-200 transition-colors cursor-pointer select-none"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  tap the flame to make a wish.
                </motion.button>
              ) : (
                <motion.div
                  key="wish-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <p className="font-handwritten text-xl text-amber-200 select-none">
                    wish registered.
                  </p>
                  <p className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mt-1">
                    have a beautiful year, {diary.friendName}.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </section>

      </main>


      {/* --- FLOATING LIGHTBOX LAYER FOR MEMORY POLAROIDS --- */}
      <AnimatePresence>
        {activePolaroid !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePolaroid(null)}
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 cursor-zoom-out select-none"
          >
            <motion.div
              initial={{ scale: 0.9, rotate: -3 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.9, rotate: 2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-amber-50 p-5 pb-12 rounded-sm shadow-2xl max-w-sm w-full border border-stone-300 relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setActivePolaroid(null)}
                className="absolute top-3 right-3 p-1 rounded-full bg-stone-900/10 text-stone-800 hover:bg-stone-900/20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="aspect-square w-full bg-stone-300 overflow-hidden border border-stone-200 relative">
                <img 
                  src={
                    activePolaroid === 1 
                      ? "/src/assets/images/WhatsApp Image 2026-07-21 at 11.55.32 AM.jpeg"
                      : activePolaroid === 2
                      ? "/src/assets/images/WhatsApp Image 2026-07-21 at 11.55.33 AM (1).jpeg"
                      : activePolaroid === 3
                      ? "/src/assets/images/WhatsApp Image 2026-07-21 at 11.55.33 AM.jpeg"
                      : activePolaroid === 4
                      ? "/src/assets/images/WhatsApp Image 2026-07-21 at 11.55.33 AM (2).jpeg"
                      : "/src/assets/images/WhatsApp Image 2026-07-21 at 11.55.34 AM.jpeg"
                  } 
                  alt="Expanded Memory" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Expand text */}
              <p className="font-handwritten text-xl text-amber-950/90 text-center mt-5 leading-tight">
                {activePolaroid === 1 || activePolaroid === 2
                  ? diary.insideJokeTitle
                  : activePolaroid === 3 || activePolaroid === 4
                  ? diary.ritualTitle
                  : diary.roughPatchTitle}
              </p>
              
              <p className="font-serif-tactile text-xs text-stone-600 px-2 mt-3 leading-relaxed text-center">
                {activePolaroid === 1 || activePolaroid === 2
                  ? diary.insideJokeText
                  : activePolaroid === 3 || activePolaroid === 4
                  ? diary.ritualText
                  : diary.roughPatchText}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
