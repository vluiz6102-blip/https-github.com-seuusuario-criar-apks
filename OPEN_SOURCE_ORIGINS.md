# Implementation origins and licenses

## Management and career foundation

The current career-management application still contains code from [Openfoot Manager](https://github.com/openfootmanager/openfootmanager), pinned from commit `90b05fdb50a7865e19f087e0b0447bdcc272bc0f`. The original GPLv3 license and required copyright notices remain in `LICENSE.md` and the source tree.

This means the current project is **not yet a fully clean-room rewrite**. Its Openfoot-derived management code cannot legally be presented as wholly original or have required license notices erased. Replacing all of that code would require a much larger, tested rewrite of career management, saves, finances, transfers, simulations, package loading, and related systems.

## Original 2D match view

`src/components/match/BallMatchPitch.tsx` is a new Canvas 2D renderer written for Maia Soccer Manager. It draws a top-down pitch, animated team dots, and a ball driven by the current match snapshot. It uses no imported match-engine code, sprites, or third-party match assets.

The Android build removes inherited demo engines and logos from the staged application. The older `soccer-js` prototype was removed from the current source tree and is no longer a runtime dependency. Its original MIT notice was present in the historical version that contained that code.

## Database packs

- The club and national-team data packs include records derived from Rising Transfers under CC BY 4.0; attribution and the license link remain in each pack's README.
- OpenFootball source data used for league/team records is identified as CC0 1.0.
- Some club-pack roster slots are generated, not verified real-player records. See each database README for coverage and provenance.

Required notices are kept in the source/package documentation rather than presented as promotional branding in the match UI.
