/* Jornada 90 - continuous asset-based soundscape
 * Runtime file generated into www/ by scripts/build.mjs.
 * No environmental animal/traffic/rain sounds are synthesized here.
 */
(() => {
  'use strict';

  const ASSETS = Object.freeze(__J90_AUDIO_MANIFEST__);
  const ROOT = 'assets/audio/';
  const MAX_CONTINUOUS = 7;
  const MAX_EVENTS = 4;
  const loopBuffers = new Map();
  const FADE = 2.8;

  const ambienceState = window.ambienceState || {
    timeOfDay: 'afternoon',
    weather: 'clear',
    rainIntensity: 0,
    windIntensity: 0.25,
    matchDay: false,
    minutesToMatch: null,
    recentResult: 'neutral',
    menuActive: true
  };
  window.ambienceState = ambienceState;

  const quality = () => (j90FrameRate <= 30 || document.body.classList.contains('j90-low-quality') || window.__J90_PERF?.hardLow) ? 'low' : 'high';

  let graph = null;
  let generation = 0;
  let eventTimer = null;
  let stateTimer = null;
  const buffers = new Map();
  const failed = new Set();
  const continuous = new Map();
  let startPromise = null;
  const events = new Set();
  const cooldown = new Map();
  const lastEventAsset = new Map();

  function assetList(category) {
    return Array.isArray(ASSETS[category]) ? ASSETS[category] : [];
  }

  function assetPath(file) {
    return ROOT + file;
  }

  function hasAsset(file) {
    return !!file && Object.values(ASSETS).some(list => Array.isArray(list) && list.includes(file));
  }

  function candidates(category) {
    return assetList(category).filter(file => !failed.has(file));
  }

  function pick(category, avoidLast = true) {
    const list = candidates(category);
    if (!list.length) return null;
    const last = lastEventAsset.get(category);
    let pool = avoidLast && list.length > 1 ? list.filter(x => x !== last) : list;
    if (!pool.length) pool = list;
    const file = pool[Math.floor(Math.random() * pool.length)];
    lastEventAsset.set(category, file);
    return file;
  }

  function rememberFailure(file) {
    if (file) failed.add(file);
  }

  function fadeParam(param, target, seconds = FADE) {
    if (!param || !AC) return;
    const now = AC.currentTime;
    try {
      param.cancelScheduledValues(now);
      const from = Math.max(0.0001, param.value || 0.0001);
      param.setValueAtTime(from, now);
      param.exponentialRampToValueAtTime(Math.max(0.0001, target), now + Math.max(.05, seconds));
    } catch {
      try {
        param.setValueAtTime(Math.max(0.0001, target), now + Math.max(.05, seconds));
      } catch {}
    }
  }

  function connectSpatial(node, near = false, pan = 0, depth = 0) {
    if (!AC || !node) return node;
    if (audioMode === 'immersive' && near && AC.createPanner) {
      const p = AC.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'inverse';
      p.refDistance = 1.5;
      p.maxDistance = 14;
      p.rolloffFactor = .7;
      const x = pan * 2.2;
      const z = Math.max(.8, 3.4 - Math.abs(depth));
      if (p.positionX) {
        p.positionX.setValueAtTime(x, AC.currentTime);
        p.positionY.setValueAtTime(depth, AC.currentTime);
        p.positionZ.setValueAtTime(z, AC.currentTime);
      } else {
        p.setPosition(x, depth, z);
      }
      node.connect(p);
      return p;
    }
    if (audioMode !== 'mono' && AC.createStereoPanner) {
      const p = AC.createStereoPanner();
      p.pan.setValueAtTime(audioMode === 'stereo' ? pan * .72 : pan, AC.currentTime);
      node.connect(p);
      return p;
    }
    return node;
  }

  function buildGraph() {
    if (!AC || !audioCompressor) return null;
    if (graph) return graph;

    try { audioBus?.disconnect(); } catch {}
    const sfx = AC.createGain();
    const soundscape = AC.createGain();
    const music = AC.createGain();

    sfx.gain.setValueAtTime(.95, AC.currentTime);
    soundscape.gain.setValueAtTime(.82, AC.currentTime);
    music.gain.setValueAtTime(.0001, AC.currentTime);

    sfx.connect(audioCompressor);
    soundscape.connect(audioCompressor);
    music.connect(audioCompressor);

    audioBus = sfx;

    graph = {
      master: audioCompressor,
      sfx,
      soundscape,
      music
    };
    return graph;
  }

  function makeLoopSafe(buffer) {
    if (!buffer || !AC || buffer.duration < 4) return buffer;
    if (loopBuffers.has(buffer)) return loopBuffers.get(buffer);
    const fadeSeconds = Math.min(1.6, Math.max(.45, buffer.duration * .08));
    const frames = Math.max(1, Math.floor(fadeSeconds * buffer.sampleRate));
    const out = AC.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = out.getChannelData(ch);
      dst.set(src);
      for (let i = 0; i < frames; i++) {
        const t = i / Math.max(1, frames - 1);
        const a = Math.cos(t * Math.PI * .5);
        const b = Math.sin(t * Math.PI * .5);
        const head = src[i];
        const tail = src[src.length - frames + i];
        dst[i] = head * a + tail * b;
        dst[src.length - frames + i] = tail * a + head * b;
      }
    }
    loopBuffers.set(buffer, out);
    return out;
  }

  async function loadBuffer(file) {
    if (!file || !AC || !hasAsset(file)) return null;
    if (buffers.has(file)) return buffers.get(file);
    if (failed.has(file)) return null;

    const promise = fetch(assetPath(file), { cache: 'force-cache' })
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(data => AC.decodeAudioData(data))
      .then(buffer => {
        // Keep the real source asset, but do not retain multi-minute decoded PCM.
        // Long ambience beds are reduced to a crossfaded runtime loop, which avoids
        // hundreds of MB of resident audio memory on mobile WebView.
        if (!buffer || buffer.duration <= 55) return buffer;
        const seconds = Math.min(45, buffer.duration - 0.5);
        const frames = Math.max(1, Math.floor(seconds * buffer.sampleRate));
        const maxStart = Math.max(0, buffer.length - frames);
        const start = Math.min(maxStart, Math.floor(buffer.length * 0.18));
        const out = AC.createBuffer(buffer.numberOfChannels, frames, buffer.sampleRate);
        const fadeFrames = Math.min(Math.floor(buffer.sampleRate * 1.5), Math.floor(frames / 8));
        for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
          const src = buffer.getChannelData(ch);
          const dst = out.getChannelData(ch);
          for (let i = 0; i < frames; i++) dst[i] = src[start + i];
          for (let i = 0; i < fadeFrames; i++) {
            const t = i / Math.max(1, fadeFrames - 1);
            const a = Math.cos(t * Math.PI * 0.5);
            const b = Math.sin(t * Math.PI * 0.5);
            const head = dst[i];
            const tail = dst[frames - fadeFrames + i];
            dst[i] = head * a + tail * b;
            dst[frames - fadeFrames + i] = tail * a + head * b;
          }
        }
        return out;
      })
      .catch(err => {
        rememberFailure(file);
        return null;
      });

    buffers.set(file, promise);
    const result = await promise;
    if (!result) buffers.delete(file);
    return result;
  }

  function categoryConfig() {
    const rain = Math.max(0, Math.min(1, ambienceState.rainIntensity));
    const wind = Math.max(.05, Math.min(1, ambienceState.windIntensity));
    const cloudy = ambienceState.weather === 'cloudy';
    const lightRain = ambienceState.weather === 'lightRain';
    const heavyRain = ambienceState.weather === 'heavyRain';
    const evening = ambienceState.timeOfDay === 'sunset' || ambienceState.timeOfDay === 'evening';

    return {
      wind: .045 + wind * .075,
      trees: .035 + wind * .055,
      leaves: .018 + wind * .042,
      neighborhood: .026 + (lightRain || heavyRain ? .018 : 0),
      stadium: ambienceState.matchDay ? .04 : .012,
      rain: lightRain ? .065 : heavyRain ? .095 : 0,
      rainLeaves: lightRain ? .032 : heavyRain ? .05 : 0,
      birds: ambienceState.weather === 'clear' ? (evening ? .018 : .035) : lightRain ? .006 : 0,
      insects: evening && ambienceState.weather !== 'heavyRain' ? .016 : 0,
      crowd: ambienceState.matchDay
        ? ambienceState.minutesToMatch != null && ambienceState.minutesToMatch <= 45 ? .18 : .10
        : 0,
      cloudy,
      rain
    };
  }

  async function startLayer(name, category, gainTarget, opts = {}) {
    if (!graph || continuous.has(name) || !gainTarget || gainTarget < .001) return;
    const file = pick(category, false);
    if (!file) return;

    const buffer = await loadBuffer(file);
    if (!buffer || !graph || continuous.size >= MAX_CONTINUOUS) return;
    const loopBuffer = makeLoopSafe(buffer);

    const source = AC.createBufferSource();
    const gain = AC.createGain();
    source.buffer = loopBuffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = loopBuffer.duration;

    const fade = opts.fade ?? FADE;
    gain.gain.setValueAtTime(.0001, AC.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001, gainTarget), AC.currentTime + fade);

    source.connect(gain);
    const spatial = audioMode === 'immersive' && /^(wind|birdsBed|crowd|car)$/.test(name);
    const pan = typeof opts.pan === 'number' ? opts.pan : ({wind:-.28,birdsBed:.55,crowd:.12,car:(Math.random()*1.4-.7)}[name] || 0);
    const out = connectSpatial(gain, spatial || !!opts.near, pan, opts.depth || 0);
    out.connect(graph.soundscape);

    const record = { name, category, file, source, gain, out, target: gainTarget, buffer: loopBuffer };
    continuous.set(name, record);

    source.onended = () => {
      continuous.delete(name);
      try { source.disconnect(); gain.disconnect(); if (out !== gain) out.disconnect(); } catch {}
    };

    source.start();
  }

  function stopLayer(name, fade = FADE) {
    const rec = continuous.get(name);
    if (!rec) return;
    continuous.delete(name);

    const now = AC.currentTime;
    try {
      rec.gain.cancelScheduledValues(now);
      rec.gain.setValueAtTime(Math.max(.0001, rec.gain.value || .0001), now);
      rec.gain.exponentialRampToValueAtTime(.0001, now + fade);
      rec.source.stop(now + fade + .08);
    } catch {
      try { rec.source.stop(); } catch {}
    }
  }

  function updateLayer(name, target, fade = 1.8) {
    const rec = continuous.get(name);
    if (!rec) return;
    rec.target = target;
    fadeParam(rec.gain.gain, target, fade);
  }

  function startOrUpdate(name, category, target) {
    if (target >= .001) {
      if (continuous.has(name)) updateLayer(name, target);
      else startLayer(name, category, target);
    } else {
      stopLayer(name);
    }
  }

  function syncContinuous() {
    if (!graph || !ambienceState.menuActive) return;
    const c = categoryConfig();
    const q = quality();
    const baseLayers = ambienceState.matchDay
      ? [
          ['wind','wind',c.wind * .62],
          ['leaves','leaves',c.leaves * .5],
          ['stadium','stadium',q === 'low' ? c.stadium * .9 : c.stadium],
          ['crowd','crowd',c.crowd],
          ...(c.rain > 0 ? [['rain','rain',c.rain * .65]] : [])
        ]
      : ambienceState.weather === 'lightRain' || ambienceState.weather === 'heavyRain'
        ? [
            ['wind','wind',c.wind],
            ['trees','trees',c.trees],
            ['leaves','leaves',c.leaves],
            ['neighborhood','neighborhood',c.neighborhood],
            ['rain','rain',c.rain],
            ['rainLeaves','rainLeaves',q === 'low' ? c.rainLeaves * .65 : c.rainLeaves]
          ]
        : [
            ['wind','wind',c.wind],
            ['trees','trees',c.trees],
            ['leaves','leaves',c.leaves],
            ['neighborhood','neighborhood',c.neighborhood],
            ['stadium','stadium',q === 'low' ? c.stadium * .7 : c.stadium],
            ['birdsBed','birdsBed',q === 'low' ? c.birds * .7 : c.birds],
            ['insects','insects',c.insects]
          ];
    const activeLayers = q === 'low' ? baseLayers.filter(x => !['insects','birdsBed','rainLeaves'].includes(x[0])).slice(0, 5) : baseLayers;
    const wanted = new Set(activeLayers.map(x => x[0]));
    continuous.forEach((_, name) => { if (!wanted.has(name)) stopLayer(name); });
    activeLayers.forEach(([name, category, target]) => startOrUpdate(name, category, target));
  }

  function playEvent(category, level, opts = {}) {
    if (!graph || !ambienceState.menuActive || events.size >= MAX_EVENTS) return;
    const nowMs = performance.now();
    const cd = opts.cooldown ?? 12000;
    const last = cooldown.get(category) || 0;
    if (nowMs - last < cd) return;

    const file = pick(category);
    if (!file) return;
    cooldown.set(category, nowMs);

    loadBuffer(file).then(buffer => {
      if (!buffer || !graph || !ambienceState.menuActive || events.size >= MAX_EVENTS) return;

      const source = AC.createBufferSource();
      const gain = AC.createGain();
      const duration = Math.max(0.15, buffer.duration);
      const offset = duration > 1.4 ? Math.random() * Math.min(1.8, duration - .15) : 0;
      source.buffer = buffer;
      source.connect(gain);

      const pan = typeof opts.pan === 'number' ? opts.pan : (Math.random() * 1.6 - .8);
      const out = connectSpatial(gain, !!opts.near, pan, opts.depth || (Math.random() * 1.5 - .75));
      out.connect(graph.soundscape);

      const peak = Math.max(.0001, level * (qFactor(opts.category || category)));
      gain.gain.setValueAtTime(.0001, AC.currentTime);
      gain.gain.exponentialRampToValueAtTime(peak, AC.currentTime + .045);
      gain.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + duration);

      const rec = { source, gain, out, category, file };
      events.add(rec);
      source.onended = () => {
        events.delete(rec);
        try { source.disconnect(); gain.disconnect(); if (out !== gain) out.disconnect(); } catch {}
      };

      try { source.start(AC.currentTime, offset); } catch {
        events.delete(rec);
        try { source.disconnect(); gain.disconnect(); if (out !== gain) out.disconnect(); } catch {}
      }
    });
  }

  function qFactor(category) {
    return quality() === 'low' && /bird|dog|car|bus|horn|vendor|chant|drum/.test(category) ? .62 : 1;
  }

  function eventStep() {
    if (!graph || !ambienceState.menuActive) return;
    const c = categoryConfig();
    const candidates = [];

    if (ambienceState.weather === 'clear') {
      if (Math.random() < .52) candidates.push(['birdEvent', .028, { near: Math.random() < .35, cooldown: 19000 }]);
      if (Math.random() < .16) candidates.push(['dog', .025, { cooldown: 32000, near: false, depth: -1 }]);
      if (Math.random() < .34) candidates.push(['car', .024, { cooldown: 15000, near: true }]);
      if (Math.random() < .09) candidates.push(['bus', .025, { cooldown: 38000 }]);
      if (Math.random() < .08) candidates.push(['horn', .016, { cooldown: 42000 }]);
      if (Math.random() < .08) candidates.push(['branch', .022, { cooldown: 26000 }]);
    } else if (ambienceState.weather === 'lightRain') {
      if (Math.random() < .07) candidates.push(['birdEvent', .012, { cooldown: 42000 }]);
      if (Math.random() < .28) candidates.push(['car', .028, { cooldown: 13000, near: true }]);
      if (Math.random() < .08) candidates.push(['drops', .02, { cooldown: 17000 }]);
      if (Math.random() < .03) candidates.push(['thunder', .025, { cooldown: 60000 }]);
    } else if (ambienceState.weather === 'heavyRain') {
      if (Math.random() < .24) candidates.push(['gust', .035, { cooldown: 22000 }]);
      if (Math.random() < .05) candidates.push(['thunder', .028, { cooldown: 65000 }]);
      if (Math.random() < .12) candidates.push(['drops', .018, { cooldown: 24000 }]);
    } else if (ambienceState.weather === 'cloudy') {
      if (Math.random() < .22) candidates.push(['birdEvent', .016, { cooldown: 28000 }]);
      if (Math.random() < .30) candidates.push(['car', .024, { cooldown: 16000, near: true }]);
      if (Math.random() < .12) candidates.push(['dog', .02, { cooldown: 34000 }]);
      if (Math.random() < .08) candidates.push(['gust', .024, { cooldown: 25000 }]);
    }

    if (ambienceState.matchDay) {
      candidates.push(['traffic', .022, { cooldown: 17000 }]);
      if (ambienceState.minutesToMatch != null && ambienceState.minutesToMatch <= 45) {
        candidates.push(['vendor', .018, { cooldown: 30000 }]);
        candidates.push(['chant', .018, { cooldown: 38000 }]);
        if (Math.random() < .3) candidates.push(['drum', .015, { cooldown: 48000 }]);
        if (Math.random() < .16) candidates.push(['stadiumEvent', .02, { cooldown: 42000 }]);
      }
    }

    const usable = candidates.filter(([cat]) => candidatesForEvent(cat).length);
    if (usable.length) {
      const selected = usable[Math.floor(Math.random() * usable.length)];
      playEvent(selected[0], selected[1], selected[2]);
    }

    eventTimer = setTimeout(eventStep, quality() === 'low' ? 9000 + Math.random() * 8000 : 6000 + Math.random() * 7000);
  }

  const EVENT_MAP = {
    birdEvent: 'birdEvents',
    dog: 'dog',
    car: 'car',
    bus: 'bus',
    horn: 'horn',
    branch: 'branch',
    drops: 'drops',
    thunder: 'thunder',
    gust: 'gust',
    traffic: 'traffic',
    vendor: 'vendor',
    chant: 'chant',
    drum: 'drum',
    stadiumEvent: 'stadiumEvents'
  };

  function candidatesForEvent(eventName) {
    return assetList(EVENT_MAP[eventName] || eventName).filter(file => !failed.has(file));
  }

  function clearEvents() {
    events.forEach(rec => {
      try { rec.gain.gain.cancelScheduledValues(AC.currentTime); rec.gain.gain.setValueAtTime(Math.max(.0001, rec.gain.gain.value || .0001), AC.currentTime); rec.gain.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + .35); rec.source.stop(AC.currentTime + .4); } catch {}
    });
    events.clear();
  }

  function stopAll(fade = .8) {
    generation++;
    if (eventTimer) clearTimeout(eventTimer);
    if (stateTimer) clearTimeout(stateTimer);
    eventTimer = stateTimer = null;
    clearEvents();
    continuous.forEach((_, name) => stopLayer(name, fade));
  }

  function autoWeather() {
    const dayKey=(Number(S?.year)||2026)*37+(Number(S?.r)||0)*17+(Number(S?.club?.tier)||0)*5;
    const slot=Math.floor(Date.now()/75000);
    const raw=Math.abs(Math.sin((dayKey+slot*11)*12.9898)*43758.5453)%1;
    const weather=raw<.55?'clear':raw<.78?'cloudy':raw<.94?'lightRain':'heavyRain';
    ambienceState.weather=weather;
    ambienceState.rainIntensity=weather==='heavyRain'?.92:weather==='lightRain'?.42:0;
  }
  function stateTick() {
    if (!ambienceState.menuActive) return;
    autoWeather();
    syncWorldState();
    stateTimer=setTimeout(stateTick,75000);
  }
  function syncWorldState() {
    autoWeather();
    const now = menuTime;
    if (now < .18) ambienceState.timeOfDay = 'afternoon';
    else if (now < .58) ambienceState.timeOfDay = 'sunset';
    else if (now < .82) ambienceState.timeOfDay = 'evening';
    else ambienceState.timeOfDay = 'night';

    ambienceState.matchDay = !!(S && ['match','comp','wc'].includes(S.phase));
    ambienceState.minutesToMatch = ambienceState.matchDay ? 0 : null;
    if (S?.phase === 'post' && S.last) {
      const home = S.last.h === S.club.n;
      const my = home ? S.last.gh : S.last.ga;
      const op = home ? S.last.ga : S.last.gh;
      ambienceState.recentResult = my > op ? 'win' : my < op ? 'loss' : 'draw';
    }

    const windBase = ambienceState.weather === 'heavyRain' ? .72 :
      ambienceState.weather === 'lightRain' ? .45 :
      ambienceState.weather === 'cloudy' ? .34 : .25;
    ambienceState.windIntensity = Math.max(.05, Math.min(1, windBase));

    updateJ90MenuEnvironment();
    syncContinuous();
  }

  function updateJ90MenuEnvironmentAssetAware() {
    const roots = document.querySelectorAll('.stadiumScene');
    if (!roots.length) return;
    const night = ambienceState.timeOfDay === 'night';
    const rain = ambienceState.rainIntensity;
    roots.forEach(root => {
      root.style.setProperty('--j90-sun', String(night ? .28 : .72 - rain * .24));
      root.style.setProperty('--j90-horizon', String(.11 + (night ? .02 : .18)));
      root.style.setProperty('--j90-lights', String(.025 + (night ? .25 : .08)));
      root.style.setProperty('--j90-clouds', String(.05 + rain * .2 + (ambienceState.weather === 'cloudy' ? .1 : 0)));
      root.style.setProperty('--j90-ambient', String(.72 + (1 - rain) * .28));
      root.style.setProperty('--j90-rain', String(rain));

      let rainLayer = root.querySelector('.j90RainLayer');
      if (!rainLayer) {
        rainLayer = document.createElement('div');
        rainLayer.className = 'j90RainLayer';
        rainLayer.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 16; i++) {
          const drop = document.createElement('i');
          drop.style.setProperty('--x', (i * 6.7 + Math.random() * 5) + '%');
          drop.style.setProperty('--d', (-Math.random() * 2.8) + 's');
          drop.style.setProperty('--t', (0.65 + Math.random() * .55) + 's');
          rainLayer.appendChild(drop);
        }
        root.appendChild(rainLayer);
      }
    });
  }

  function setWeather(weather, rainIntensity) {
    const allowed = ['clear','cloudy','lightRain','heavyRain'];
    ambienceState.weather = allowed.includes(weather) ? weather : 'clear';
    ambienceState.rainIntensity =
      ambienceState.weather === 'heavyRain' ? Math.max(.75, Math.min(1, rainIntensity ?? 1)) :
      ambienceState.weather === 'lightRain' ? Math.max(.18, Math.min(.65, rainIntensity ?? .4)) :
      ambienceState.weather === 'cloudy' ? 0 : 0;

    if (ambienceState.weather === 'clear') ambienceState.rainIntensity = 0;

    syncWorldState();
  }

  async function start() {
    ambienceState.menuActive = true;
    if (!audioOK) return;

    // render() can run repeatedly while the menu is open. Never tear down and
    // rebuild the audio graph for every UI render, and never launch overlapping
    // buffer/decode/start operations.
    if (graph && (eventTimer || stateTimer || continuous.size)) return;
    if (startPromise) return startPromise;

    startPromise = (async () => {
      const c = await unlockAudio();
      if (!c) return;
      buildGraph();
      if (!graph) return;

      generation++;
      stopAll(.35);
      syncWorldState();
      if (!eventTimer) eventTimer = setTimeout(eventStep, 3500);
      if (!stateTimer) stateTimer = setTimeout(stateTick, 75000);
    })();

    try {
      await startPromise;
    } finally {
      startPromise = null;
    }
  }

  function stop() {
    ambienceState.menuActive = false;
    stopAll(1.1);
  }

  function pause() {
    stopAll(.8);
    try { if (AC?.state === 'running') AC.suspend(); } catch {}
  }

  async function resume() {
    ambienceState.menuActive = true;
    try { if (AC?.state === 'suspended') await AC.resume(); } catch {}
    await start();
  }

  function debugScenario(name) {
    const map = {
      clear: ['clear', 0],
      cloudy: ['cloudy', 0],
      lightRain: ['lightRain', .4],
      heavyRain: ['heavyRain', .9],
      match: ['clear', 0],
      preMatch: ['clear', 0]
    };
    if (!map[name]) return false;
    setWeather(map[name][0], map[name][1]);
    if (name === 'match') {
      ambienceState.matchDay = true;
      ambienceState.minutesToMatch = 180;
    }
    if (name === 'preMatch') {
      ambienceState.matchDay = true;
      ambienceState.minutesToMatch = 30;
    }
    syncContinuous();
    return true;
  }

  function snapshot() {
    const base = typeof j90PerfSnapshot === 'function' ? j90PerfSnapshot() : {};
    return Object.assign({}, base, {
      weather: ambienceState.weather,
      rainIntensity: ambienceState.rainIntensity,
      windIntensity: ambienceState.windIntensity,
      continuousLayers: Array.from(continuous.keys()),
      activeEvents: events.size,
      activeAudioSources: continuous.size + events.size,
      soundscapeNodes: continuous.size + events.size,
      loadedAudioBuffers: Array.from(buffers.keys()).filter(k => buffers.get(k) instanceof Promise || buffers.get(k)),
      failedAudioAssets: Array.from(failed),
      audioContextState: AC?.state || 'unavailable',
      quality: quality()
    });
  }

  function installRainStyle() {
    if (document.getElementById('j90-rain-style')) return;
    const style = document.createElement('style');
    style.id = 'j90-rain-style';
    style.textContent = '.j90RainLayer{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1;opacity:var(--j90-rain,0);transition:opacity 2.8s ease}.j90RainLayer i{position:absolute;left:var(--x);top:-12%;width:1px;height:42px;background:linear-gradient(180deg,transparent,rgba(205,225,235,.5));transform:rotate(12deg);animation:j90RainFall var(--t) linear infinite;animation-delay:var(--d)}@keyframes j90RainFall{from{transform:translate3d(0,-12vh,0) rotate(12deg)}to{transform:translate3d(-12vw,125vh,0) rotate(12deg)}}';
    document.head.appendChild(style);
  }

  function installVisibilityHooks() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause();
      else if (introStep === 0 && audioOK) resume();
    }, { passive: true });

    window.addEventListener('pagehide', pause, { passive: true });
    window.addEventListener('pageshow', () => {
      if (!document.hidden && introStep === 0 && audioOK) resume();
    }, { passive: true });
  }

  window.ambienceState = ambienceState;
  window.J90Ambience = {
    start,
    stop,
    pause,
    resume,
    setWeather,
    debugScenario,
    snapshot,
    state: ambienceState
  };

  window.J90Perf = window.J90Perf || {};
  const oldSnapshot = window.J90Perf.snapshot;
  window.J90Perf.snapshot = snapshot;

  window.j90SoundscapeStart = start;
  window.j90SoundscapeStop = stop;
  window.j90SyncSoundscape = () => {
    if (introStep === 0 && audioOK) start();
    else stop();
  };
  window.updateJ90MenuEnvironment = updateJ90MenuEnvironmentAssetAware;

  installRainStyle();
  installVisibilityHooks();

  // Remove any legacy procedural soundscape sources created by the inline script.
  try {
    if (j90SoundscapeTimer) clearTimeout(j90SoundscapeTimer);
    if (j90SoundscapeWind) { j90SoundscapeWind.stop(); j90SoundscapeWind.disconnect(); }
    j90SoundscapeNodes?.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch {} });
    j90SoundscapeNodes = [];
    j90SoundscapeWind = null;
    j90SoundscapeBus?.disconnect();
    j90SoundscapeBus = null;
  } catch {}

  if (introStep === 0 && audioOK) {
    setTimeout(() => start(), 0);
  }
})();
