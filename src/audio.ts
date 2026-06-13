let audio: HTMLAudioElement | null = null;
let currentSrc = '';
const DEFAULT_VOLUME = 0.28;
let currentVolume = DEFAULT_VOLUME;

export function initBackgroundMusic(src = '/sounds/lofi-ambient.mp3') {
  if (audio && currentSrc === src) return;

  if (audio) {
    audio.pause();
    audio.src = '';
  }

  audio = new Audio();
  audio.loop = true;
  audio.volume = currentVolume;
  audio.src = src;
  currentSrc = src;
  audio.load();

  audio.addEventListener('error', () => {
    console.warn(
      `[Parkour Vibes] Could not load background music from "${src}". ` +
      `Make sure a track exists at public/sounds/lofi-ambient.mp3`
    );
    audio = null;
  });
}

export function playBackgroundMusic() {
  if (!audio) {
    initBackgroundMusic();
  }
  if (!audio) return;

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Autoplay blocked until user gesture — expected on first load.
    });
  }
}

export function pauseBackgroundMusic() {
  audio?.pause();
}

export function toggleBackgroundMusic() {
  if (!audio) {
    initBackgroundMusic();
  }
  if (!audio) return;

  if (audio.paused) {
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

export function disposeBackgroundMusic() {
  if (audio) {
    audio.pause();
    audio.src = '';
    audio = null;
    currentSrc = '';
  }
}
