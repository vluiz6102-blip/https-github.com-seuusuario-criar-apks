type CatalogTrack = { title?: string; artist?: string; audioFile?: string | null; src?: string | null };
type MusicTrack = { title: string; artist: string; src: string };

type AudioModule = string;
const importedAudio = {
  ...import.meta.glob("../assets/audio/*.{mp3,m4a,aac,ogg,wav,webm}", { eager: true, query: "?url", import: "default" }) as Record<string, AudioModule>,
  ...import.meta.glob("./assets/audio/*.{mp3,m4a,aac,ogg,wav,webm}", { eager: true, query: "?url", import: "default" }) as Record<string, AudioModule>
};

let audioContext: AudioContext | null = null;
let tracks: MusicTrack[] = [];
let currentIndex = 0;
let currentAudio: HTMLAudioElement | null = null;
let musicWanted = false;
let volume = 0.28;
let loadingPlaylist: Promise<void> | null = null;
let onPlayerChange: (() => void) | null = null;
let failedTrackAttempts = 0;
let audioUnlocked = false;
let playlistStatus: "loading" | "ready" | "empty" = "loading";

function getAudioContext(): AudioContext | null {
  const AudioCtor = window.AudioContext;
  if (!AudioCtor) return null;
  audioContext ??= new AudioCtor();
  return audioContext;
}

function normalizeFileName(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.(mp3|m4a|aac|ogg|wav|webm)$/i, "")
    .replace(/^\s*\d{1,3}\s*[-_. )]+/, "")
    .replace(/[^a-z0-9]+/g, "");
}

function resolveTrackFile(track: CatalogTrack, index: number, files: Array<[string, string]>): string | null {
  if (track.audioFile) {
    return publicMusicUrl(track.audioFile);
  }

  const titleKey = normalizeFileName(track.title ?? "");
  const artistKey = normalizeFileName(track.artist ?? "");
  const exact = files.find(([path]) => {
    const fileKey = normalizeFileName(path.split("/").pop() ?? "");
    return fileKey === titleKey || (titleKey.length > 4 && fileKey.includes(titleKey));
  });
  if (exact) return exact[1];

  const artistMatch = files.find(([path]) => {
    const fileKey = normalizeFileName(path.split("/").pop() ?? "");
    return titleKey.length > 4 && artistKey.length > 3 && fileKey.includes(titleKey) && fileKey.includes(artistKey);
  });
  if (artistMatch) return artistMatch[1];

  // Se os 80 arquivos estiverem numerados na mesma ordem do catálogo, usa essa ordem.
  if (files.length === 80) return files[index]?.[1] ?? null;
  return null;
}

async function fetchMusicJson(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, { cache: "no-cache", signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function publicMusicUrl(path: string): string {
  const cleanPath = path.replace(/^\.\//, "").replace(/^\//, "");
  return new URL(cleanPath, new URL(import.meta.env.BASE_URL, document.baseURI)).toString();
}

async function loadPlaylist(): Promise<void> {
  if (loadingPlaylist) return loadingPlaylist;
  playlistStatus = "loading";
  notifyPlayer();
  loadingPlaylist = (async () => {
    try {
      const files = Object.entries(importedAudio).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
      const [playlistResult, catalogResult] = await Promise.allSettled([
        fetchMusicJson(publicMusicUrl("music/playlist.json")),
        fetchMusicJson(publicMusicUrl("music/curated-catalog.json"))
      ]);

      const configuredTracks: CatalogTrack[] = [];
      if (playlistResult.status === "fulfilled" && playlistResult.value.ok) {
        const playlist = await playlistResult.value.json() as { tracks?: CatalogTrack[] };
        if (Array.isArray(playlist.tracks)) configuredTracks.push(...playlist.tracks);
      }

      let catalogTracks: CatalogTrack[] = [];
      if (catalogResult.status === "fulfilled" && catalogResult.value.ok) {
        const catalog = await catalogResult.value.json() as { tracks?: CatalogTrack[] };
        if (Array.isArray(catalog.tracks)) catalogTracks = catalog.tracks;
      }

      const configured = configuredTracks
        .filter(track => Boolean(track.src || track.audioFile))
        .map(track => ({
          title: track.title || "Faixa local",
          artist: track.artist || "Playlist local",
          src: publicMusicUrl(track.src || track.audioFile || "")
        }));

      const imported = catalogTracks
        .map((track, index) => {
          const src = resolveTrackFile(track, index, files);
          return src && track.title ? { title: track.title, artist: track.artist ?? "", src } : null;
        })
        .filter((track): track is MusicTrack => track !== null);

      tracks = configured.length ? configured : imported;
      playlistStatus = tracks.length ? "ready" : "empty";
    } catch (error) {
      tracks = [];
      playlistStatus = "empty";
      console.warn("Não foi possível carregar a playlist local.", error);
    } finally {
      loadingPlaylist = null;
      notifyPlayer();
    }
  })();
  return loadingPlaylist;
}

function notifyPlayer(): void {
  onPlayerChange?.();
}

function unlockAudio(): void {
  if (!audioUnlocked) {
    audioUnlocked = true;
    const silentAudio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
    silentAudio.volume = 0;
    void silentAudio.play().then(() => silentAudio.pause()).catch(() => undefined);
  }
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") void ctx.resume().catch(() => undefined);
  if (musicWanted && !currentAudio && tracks.length) void playCurrentTrack();
}

document.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
document.addEventListener("keydown", unlockAudio, { once: true, capture: true });

async function playCurrentTrack(): Promise<void> {
  if (!musicWanted || !tracks.length) return;
  const track = tracks[currentIndex];
  if (!track) return;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }

  const audio = new Audio(track.src);
  audio.preload = "auto";
  audio.volume = volume;
  audio.addEventListener("ended", () => {
    if (currentAudio !== audio || !musicWanted) return;
    currentIndex = (currentIndex + 1) % tracks.length;
    void playCurrentTrack();
  }, { once: true });
  audio.addEventListener("error", () => {
    if (currentAudio !== audio) return;
    console.warn("Faixa local indisponível:", track.src);
    currentAudio = null;
    if (musicWanted && tracks.length > 1 && failedTrackAttempts < tracks.length) {
      failedTrackAttempts += 1;
      currentIndex = (currentIndex + 1) % tracks.length;
      void playCurrentTrack();
    } else {
      musicWanted = false;
      failedTrackAttempts = 0;
      notifyPlayer();
    }
  }, { once: true });

  currentAudio = audio;
  try {
    await audio.play();
    failedTrackAttempts = 0;
  } catch (error) {
    if (currentAudio === audio) currentAudio = null;
    console.debug("A reprodução será iniciada após uma interação do usuário.", error);
  }
  notifyPlayer();
}

export function startBackgroundMusic(): void {
  musicWanted = true;
  void loadPlaylist().then(() => {
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") void ctx.resume().catch(() => undefined);
    if (tracks.length && !currentAudio) void playCurrentTrack();
  });
}

export function stopBackgroundMusic(): void {
  musicWanted = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  notifyPlayer();
}

export function toggleMusicPlayback(): void {
  if (musicWanted && currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    musicWanted = false;
  } else {
    musicWanted = true;
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") void ctx.resume().catch(() => undefined);
    void loadPlaylist().then(() => {
      if (!currentAudio || currentAudio.ended) void playCurrentTrack();
      else void currentAudio.play().catch(error => console.debug("Reprodução aguardando interação.", error));
    });
  }
  notifyPlayer();
}

export function nextMusicTrack(): void {
  if (!tracks.length) return;
  currentIndex = (currentIndex + 1) % tracks.length;
  musicWanted = true;
  void playCurrentTrack();
}

export function setMusicVolume(value: number): void {
  volume = Math.max(0, Math.min(1, value));
  if (currentAudio) currentAudio.volume = volume;
}

export function setMusicPlayerChangeHandler(handler: (() => void) | null): void {
  onPlayerChange = handler;
}

export function renderMusicPlayer(): string {
  const track = tracks[currentIndex];
  const playing = Boolean(currentAudio && !currentAudio.paused);
  const title = track ? track.title : (playlistStatus === "loading" ? "Rádio Pulso 90" : "Playlist vazia");
  const artist = track?.artist || (playlistStatus === "loading" ? "Preparando biblioteca..." : "Nenhum áudio local encontrado");
  return '<div class="music-player" aria-label="Reprodutor de música">' +
    '<div class="music-player-info"><span class="music-player-live">RÁDIO P90</span><strong title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</strong><small>' + escapeHtml(artist) + '</small></div>' +
    '<div class="music-player-controls"><button type="button" data-music-action="toggle" aria-label="' + (playing ? "Pausar" : "Tocar") + '" title="' + (playing ? "Pausar" : "Tocar") + '">' + (playing ? "Ⅱ" : "▶") + '</button>' +
    '<button type="button" data-music-action="next" aria-label="Próxima faixa" title="Próxima faixa">»</button></div>' +
    '<label class="music-volume" title="Volume"><span>♪</span><input data-music-volume type="range" min="0" max="1" step="0.01" value="' + volume + '" aria-label="Volume da música"></label></div>';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

export function handleMusicPlayerAction(action: string): void {
  if (action === "toggle") toggleMusicPlayback();
  if (action === "next") nextMusicTrack();
}

export function playUiSound(kind: "tap" | "goal" = "tap"): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(kind === "goal" ? 660 : 520, now);
    if (kind === "goal") oscillator.frequency.exponentialRampToValueAtTime(990, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "goal" ? 0.12 : 0.035, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "goal" ? 0.28 : 0.09));
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + (kind === "goal" ? 0.3 : 0.11));
  } catch (error) {
    console.debug("Áudio indisponível neste dispositivo.", error);
  }
}
