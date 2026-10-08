/* Jornada 90 performance monitor, disabled by default.
 * Enable explicitly with J90Perf.enable() from CDP/dev builds or ?j90perf=1.
 * No production sampling starts unless explicitly enabled.
 */
(function () {
  'use strict';

  if (window.J90Perf && window.J90Perf.version === '1.0') return;

  var MAX_SAMPLES = 4096;
  var state = {
    enabled: false,
    startedAt: 0,
    lastFrameAt: 0,
    frames: 0,
    frameTimes: [],
    longTasks: 0,
    longTaskMs: 0,
    domSampleAt: 0,
    dom: null,
    rafId: 0,
    observer: null
  };

  function push(list, value) {
    if (!Number.isFinite(value)) return;
    list.push(value);
    if (list.length > MAX_SAMPLES) list.shift();
  }

  function percentile(list, p) {
    if (!list.length) return 0;
    var a = list.slice().sort(function (x, y) { return x - y; });
    var index = Math.min(a.length - 1, Math.max(0, Math.ceil(p * a.length) - 1));
    return Number(a[index].toFixed(3));
  }

  function sampleDom(now) {
    if (now - state.domSampleAt < 750) return;
    state.domSampleAt = now;
    var all = document.getElementsByTagName('*');
    var visible = 0;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.contentVisibility === 'hidden' || style.opacity === '0') continue;
      var rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) visible++;
    }

    var animations = 0;
    try {
      if (typeof document.getAnimations === 'function') {
        animations = document.getAnimations({ subtree: true }).filter(function (animation) {
          return animation.playState === 'running';
        }).length;
      }
    } catch (_) {}

    var canvases = [];
    try {
      document.querySelectorAll('canvas').forEach(function (canvas) {
        var rect = canvas.getBoundingClientRect();
        canvases.push({
          width: Number(canvas.width || 0),
          height: Number(canvas.height || 0),
          cssWidth: Number(rect.width.toFixed(2)),
          cssHeight: Number(rect.height.toFixed(2))
        });
      });
    } catch (_) {}

    state.dom = {
      total: all.length,
      visible: visible,
      cssAnimationsActive: animations,
      canvases: canvases,
      dpr: Number(window.devicePixelRatio || 1)
    };
  }

  function frame(now) {
    if (!state.enabled) return;
    if (!state.startedAt) state.startedAt = now;
    if (state.lastFrameAt) push(state.frameTimes, now - state.lastFrameAt);
    state.lastFrameAt = now;
    state.frames++;
    sampleDom(now);
    state.rafId = requestAnimationFrame(frame);
  }

  function observeLongTasks() {
    if (!('PerformanceObserver' in window)) return;
    try {
      state.observer = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          state.longTasks++;
          state.longTaskMs += Number(entry.duration || 0);
        });
      });
      state.observer.observe({ type: 'longtask', buffered: true });
    } catch (_) {
      state.observer = null;
    }
  }

  function start() {
    if (state.enabled) return;
    state.enabled = true;
    state.startedAt = performance.now();
    state.lastFrameAt = 0;
    state.frames = 0;
    state.frameTimes.length = 0;
    state.longTasks = 0;
    state.longTaskMs = 0;
    state.domSampleAt = 0;
    state.dom = null;
    observeLongTasks();
    state.rafId = requestAnimationFrame(frame);
  }

  function stop() {
    state.enabled = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;
    if (state.observer) {
      try { state.observer.disconnect(); } catch (_) {}
      state.observer = null;
    }
  }

  function snapshot() {
    var now = performance.now();
    var elapsedMs = Math.max(0, now - (state.startedAt || now));
    var avg = state.frameTimes.length
      ? state.frameTimes.reduce(function (sum, n) { return sum + n; }, 0) / state.frameTimes.length
      : 0;
    return {
      version: '1.0',
      enabled: state.enabled,
      timeOrigin: Number(performance.timeOrigin || 0),
      elapsedMs: Number(elapsedMs.toFixed(1)),
      frames: state.frames,
      fps: elapsedMs > 250 ? Number((state.frames * 1000 / elapsedMs).toFixed(2)) : 0,
      frameTimeMs: {
        avg: Number(avg.toFixed(3)),
        p50: percentile(state.frameTimes, 0.50),
        p95: percentile(state.frameTimes, 0.95),
        p99: percentile(state.frameTimes, 0.99)
      },
      longTasks: {
        count: state.longTasks,
        totalMs: Number(state.longTaskMs.toFixed(2))
      },
      dom: state.dom || {
        total: document.getElementsByTagName('*').length,
        visible: 0,
        cssAnimationsActive: 0,
        canvases: [],
        dpr: Number(window.devicePixelRatio || 1)
      }
    };
  }

  window.J90Perf = {
    version: '1.0',
    enable: start,
    disable: stop,
    start: start,
    stop: stop,
    snapshot: snapshot,
    isEnabled: function () { return !!state.enabled; }
  };

  try {
    if (/[?&]j90perf=1(?:&|$)/.test(location.search) || sessionStorage.getItem('J90Perf') === '1') {
      start();
    }
  } catch (_) {}
})();
