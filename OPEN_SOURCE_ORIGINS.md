# Open-source game sources

## Main project: Openfoot Manager
- Source repository: https://github.com/openfootmanager/openfootmanager
- Pinned commit: 90b05fdb50a7865e19f087e0b0447bdcc272bc0f
- Location: repository root
- License and copyright notice: the original LICENSE.md and upstream notices are preserved.

This project supplies the priority feature set: career/club management, squad and player data, contracts and transfers, finances, scouting, training, inbox/news, and match workflows.

## Secondary project: soccer-js
- Source repository: https://github.com/haeretici/soccer-js
- Pinned commit: 38970e0dade0865078c9e84bc1ecfd72aaa02fde
- Location: public/open-source-games/soccer-js/
- License and copyright notice: the original MIT LICENSE and upstream notices are preserved.

The secondary project is a complete separate 2D match mode. The original upstream source files are retained byte-for-byte. Integration is provided by files under integration/ and a separate Tauri mobile build config; those additions do not patch upstream source files.

The upstream Openfoot Manager .github/workflows directory is replaced by one project-specific validation workflow so unrelated upstream CI jobs do not run in this repository. Other upstream .github files remain present.
