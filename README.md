# Maia Soccer Manager (MSM)

**Maia Soccer Manager** is a football management game focused on career mode, squad building, transfers, tactics, and match simulation.

## Game direction

- **Squad and transfer management:** build a team, negotiate transfers and contracts, and develop players.
- **Career management:** progress through seasons, manage finances, and follow competitions.
- **2D retro match mode:** an experimental isometric match engine is packaged separately while integration with the career flow is developed.
- **Mobile-first release work:** Android ARM64 builds are validated through GitHub Actions.

## Database packs

The repository includes separate example packs for club football and the 2026 national teams. The club pack contains 152 clubs and 3,344 squad slots; 549 records are real players drawn from the attributed source dataset and the remaining records are generated to complete squads. It is **not** a fully verified official roster for every club.

The national-team pack contains 1,363 player records across 48 teams, based on the Rising Transfers dataset.

## Build and tests

Requirements: Node.js 24, Rust, and the Tauri 2 prerequisites for your platform.

```bash
npm ci
npm run validate:club-world
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml --workspace
```

The Android CI workflow packages the 2D match engine, runs frontend and Rust tests, validates the database packs, and produces a signed debug APK for sideload testing. A debug-signed artifact is not a Play Store release.

## Credits and licenses

Created for **Maia Soccer Manager**. In-game creator credit: **Victor Luiz**.

This repository contains open-source components and third-party datasets. Their original copyright notices, license files, and required data attribution are preserved. See [OPEN_SOURCE_ORIGINS.md](OPEN_SOURCE_ORIGINS.md), [LICENSE.md](LICENSE.md), and the source-specific license files before redistributing or publishing a release.
