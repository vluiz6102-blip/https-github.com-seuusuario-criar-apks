# Third-party notice: gball circular 2D renderer

Jornada 90 Manager includes an adapted circular Canvas 2D presentation pattern derived from:

https://github.com/davidgomes/gball

Repository: davidgomes/gball
Commit reviewed: 2026-10-08, default branch `main`

The gball README identifies the project as open source under the MIT License and describes its circular-player, Canvas 2D, physics-based football presentation.

Used in Jornada 90 Manager:
- circular player presentation
- circular player/ball rendering conventions
- lightweight Canvas 2D presentation ideas

Adaptations made for Jornada 90 Manager:
- integrated with the existing Jornada 90 match state and AI
- no external WebSocket/server dependency
- single shared application RAF
- Android/WebView-safe canvas sizing
- manager-specific tactics, events, replay, lifecycle and HUD integration
- Portuguese presentation and accessibility/comfort-oriented UI

No proprietary HaxBall source code, HaxBall assets, or HaxBall client files were copied.
