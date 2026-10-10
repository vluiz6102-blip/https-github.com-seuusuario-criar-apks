# Maia Soccer Manager (MSM)

**Maia Soccer Manager** is a football management game focused on career mode, squad building, transfers, tactics, and match simulation.

## Game direction

- **Squad and transfer management:** build a team, negotiate transfers and contracts, and develop players.
- **Career management:** progress through seasons, manage finances, and follow competitions.
- **2D retro match mode:** an original Canvas 2D pitch of animated player dots and a ball is built into the live-match screen.
- **Mobile-first release work:** Android ARM64 builds are validated through GitHub Actions.

## Database packs

The database packs include 152 clubs, 8 competitions, 48 national teams and 4,707 **fictional player records**. Names, ages, positions, ratings, potential and values are generated specifically for the game. The packs do not contain a real-player database and do not claim to reproduce official rosters.

## Build and tests

Requirements: Node.js 24, Rust, and the Tauri 2 prerequisites for your platform.

```bash
npm ci
npm run validate:club-world
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml --workspace
```

The Android CI workflow validates the original player packs, tests the frontend and Rust simulation, excludes the retired external match demo from the Android bundle, and produces a signed debug APK for sideload testing. A debug-signed artifact is not a Play Store release.

## Credits and licenses

Created for **Maia Soccer Manager**. In-game creator credit: **Victor Luiz**.

This repository contains open-source components and third-party datasets. Their original copyright notices, license files, and required data attribution are preserved. See [OPEN_SOURCE_ORIGINS.md](OPEN_SOURCE_ORIGINS.md), [LICENSE.md](LICENSE.md), and the source-specific license files before redistributing or publishing a release.
