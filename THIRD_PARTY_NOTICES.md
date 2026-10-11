# Third-party software notices

## Original game content

The UI, game-state implementation, transfer and training rules, five-minute text match engine, world-directory presentation, fictional career fillers and generated career events in this branch are written for Maia Soccer Manager. The app does not bundle an external game's match engine, official crests, official kits, player photographs or licensed club imagery.

## Curated football facts

`src/data/world-database.ts` contains a limited hand-curated set of factual names, clubs, stadiums, manager assignments and linked news items. These are identified in the data file with source URLs. The database is intentionally incomplete; it is not a complete world roster dump. Player ratings, potential and market-value numbers are gameplay estimates created for the simulation, not official performance statistics or valuations. News items about player moves or footwear partnerships generated during a career are fictional game events, not real-world claims.

## Technical dependencies

The project is built with standard software components, including React, Vite, TypeScript, Tauri and transitive npm/Rust dependencies. These tools are not presented as game content and remain under their own copyright and license terms. Preserve the license texts and notices required by a particular dependency when distributing source or binaries. The full license texts are provided by the dependency packages and their source distributions; this file does not replace those terms.

This is a technical compliance pointer, not an in-game credits screen. It does not erase or replace any notice required by a specific dependency.
