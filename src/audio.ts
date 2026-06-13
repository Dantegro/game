import type { } from "three"; // keep consistent with other modules if needed

/**
 * Background music system (lofi vibes for the menu + game world).
 *
 * A lofi track is present at public/sounds/lofi-ambient.mp3 (you added it).
 *
 * To replace or change the track:
 * 1. Put your new royalty-free lofi file in public/sounds/
 * 2. Name it lofi-ambient.mp3 (or update the default in initBackgroundMusic below).
 *
 * Supported formats: .mp3, .ogg, .wav (mp3 is widely supported).
 *
 * Recommended free sources (always verify the license for your use):
 * - https://pixabay.com/music/search/lofi/
 * - https://freesound.org (search lofi + creative commons)
 * - https://www.chosic.com/free-music/lofi/
 * - https://www.bensound.com
 *
 * For the "Vibe World" horror prototype, chill / dreamy / slightly melancholic lofi works great
 * (vinyl crackle, soft pads, distant melodies, light rain sounds, etc.).
 *
 * How it works in the game:
 *   - Music starts when you select "Open World" on the menu (user gesture → browser allows audio)
 *   - It continues looping while playing the 3D world
 *   - Press M anytime to toggle mute/unmute (menu or in-game)
 */

let audio: HTMLAudioElement | null = null;
let currentSrc = '';
let isPlaying = false;

const DEFAULT_VOLUME = 0.28; // nice chill lofi level (not too loud)

export function initBackgroundMusic(src = '/sounds/lofi-ambient.mp3') {
  if (audio && currentSrc === src) return;

  // Clean up previous if switching tracks later
  if (audio) {
    audio.pause();
    audio.src = '';
  }

  audio = new Audio();
  audio.loop = true;
  audio.volume = DEFAULT_VOLUME;
  audio.src = src;
  currentSrc = src;

  // Preload
  audio.load();

  // Graceful failure if file is missing (e.g. wrong filename or path)
  audio.addEventListener('error', () => {
    console.warn(
      `[Vibe World] Could not load background music from "${src}". ` +
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
      console.debug('[Vibe World] Music play blocked until user gesture:', err);
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
  if (audio) {
    audio.volume = Math.max(0, Math.min(1, volume));
  }
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
