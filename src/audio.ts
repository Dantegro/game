let audio: HTMLAudioElement | null = null;
let currentSrc = '';
let isPlaying = false;

const DEFAULT_VOLUME = 0.28; // nice chill lofi level (not too loud)
let currentVolume = DEFAULT_VOLUME;

export function initBackgroundMusic(src = '/sounds/lofi-ambient.mp3') {
  if (audio && currentSrc === src) return;

  // Clean up previous if switching tracks later
  if (audio) {
    audio.pause();
    audio.src = '';
  }

  audio = new Audio();
  audio.loop = true;
  audio.volume = currentVolume;
  audio.src = src;
  currentSrc = src;

  // Preload
  audio.load();

  // Graceful failure if file is missing (e.g. wrong filename or path)
  audio.addEventListener('error', () => {
    console.warn(
      `[Parkour Vibes] Could not load background music from "${src}". ` +
      `Make sure a track exists at public/sounds/lofi-ambient.mp3`
    );
    audio = null;
  });

  audio.addEventListener('play', () => {
    isPlaying = true;
  });

  audio.addEventListener('pause', () => {
    isPlaying = false;
  });
}

export function playBackgroundMusic() {
  if (!audio) {
    initBackgroundMusic();
  }
  if (!audio) return;

  // Some browsers require a user gesture – this should be called from a click handler.
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      // Autoplay was blocked – this is normal until a gesture happens.
      // The next user click (selection or start button) will usually succeed.
      console.debug('[Parkour Vibes] Music play blocked until user gesture:', err);
    });
  }
}

export function pauseBackgroundMusic() {
  if (audio) {
    audio.pause();
  }
  isPlaying = false;
}

export function toggleBackgroundMusic() {
  if (!audio) {
    initBackgroundMusic();
  }
  if (!audio) return;

  if (audio.paused || !isPlaying) {
    playBackgroundMusic();
  } else {
    pauseBackgroundMusic();
  }
}

export function setMusicVolume(volume: number) {
  currentVolume = Math.max(0, Math.min(1, volume));
  if (audio) {
    audio.volume = currentVolume;
  }
}

export function getMusicVolume(): number {
  return currentVolume;
}

export function isMusicPlaying(): boolean {
  return !!audio && isPlaying;
}

// Optional: allow changing the track at runtime (e.g. different lofi for menu vs in-game)
export function changeBackgroundMusic(newSrc: string) {
  const wasPlaying = isMusicPlaying();
  initBackgroundMusic(newSrc);
  if (wasPlaying) {
    playBackgroundMusic();
  }
}

// Cleanup for HMR / scene unload
export function disposeBackgroundMusic() {
  if (audio) {
    audio.pause();
    audio.src = '';
    audio = null;
    currentSrc = '';
    isPlaying = false;
  }
}
