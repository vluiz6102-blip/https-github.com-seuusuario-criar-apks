(function () {
  "use strict";
  if (window.__J90_OPEN_SOURCE_GAME_LAUNCHER__) return;
  window.__J90_OPEN_SOURCE_GAME_LAUNCHER__ = true;

  function install() {
    if (document.getElementById("j90-open-source-match-button")) return;

    var style = document.createElement("style");
    style.textContent =
      "#j90-open-source-match-button{position:fixed;right:calc(12px + env(safe-area-inset-right,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147483646;border:1px solid rgba(255,255,255,.3);border-radius:999px;background:#123a2a;color:#fff;padding:12px 16px;font:800 13px system-ui,sans-serif;box-shadow:0 5px 24px rgba(0,0,0,.32);touch-action:manipulation}#j90-open-source-match-overlay[hidden]{display:none!important}#j90-open-source-match-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;background:#07110d;color:#fff;font-family:system-ui,sans-serif}#j90-open-source-match-overlay .j90-match-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;background:#10261d;border-bottom:1px solid #315241}#j90-open-source-match-overlay .j90-match-title{font-size:14px;font-weight:800;min-width:0}#j90-open-source-match-overlay .j90-match-close{flex:none;border:0;border-radius:10px;background:#e6eee8;color:#102016;padding:10px 12px;font-weight:800}#j90-open-source-match-overlay iframe{display:block;flex:1;width:100%;height:100%;min-height:0;border:0;background:#07110d}";
    document.head.appendChild(style);

    var button = document.createElement("button");
    button.id = "j90-open-source-match-button";
    button.type = "button";
    button.textContent = "Partida 2D";
    button.setAttribute("aria-label", "Abrir motor de partidas 2D");

    var overlay = document.createElement("div");
    overlay.id = "j90-open-source-match-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Motor de partidas 2D");

    var bar = document.createElement("header");
    bar.className = "j90-match-bar";
    var title = document.createElement("strong");
    title.className = "j90-match-title";
    title.textContent = "Motor de partidas 2D";
    var close = document.createElement("button");
    close.className = "j90-match-close";
    close.type = "button";
    close.textContent = "Voltar à carreira";
    bar.appendChild(title);
    bar.appendChild(close);

    var frame = document.createElement("iframe");
    frame.title = "Partida 2D do soccer-js";
    frame.loading = "lazy";
    frame.src = "about:blank";
    frame.allow = "fullscreen";
    overlay.appendChild(bar);
    overlay.appendChild(frame);
    document.body.appendChild(button);
    document.body.appendChild(overlay);

    function hide() {
      overlay.hidden = true;
      frame.src = "about:blank";
      document.documentElement.style.overflow = "";
      button.focus();
    }
    function show() {
      overlay.hidden = false;
      document.documentElement.style.overflow = "hidden";
      frame.src = new URL("open-source-games/soccer-js/", document.baseURI).href;
      close.focus();
    }
    button.addEventListener("click", show);
    close.addEventListener("click", hide);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !overlay.hidden) hide();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
