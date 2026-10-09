# Third-party notices

## OpenComputerFutbolSimulator

Jornada 90 uses and adapts the open-source game project [OpenComputerFutbolSimulator](https://github.com/antxiko/OpenComputerFutbolSimulator), pinned as a Git submodule in `game/`. Its source code is available under the MIT License. The upstream copyright and complete license text are retained at `game/LICENSE` in the source checkout and are copied beside the APK in the release archive.

The build preparation script changes the displayed game name, replaces the original club and player JSON data with generated fictional data, removes upstream club-logo files from the build workspace, and creates new fictional crests. The upstream project's data notice is not permission to redistribute its club/player datasets or branded media, so these are not packaged.

## Godot Engine

The game is built with the Godot Engine. Godot is open-source software; its license and copyright notices are available at https://godotengine.org/license.

## Jornada 90 changes

Project branding and data preparation for the Android build are provided by this repository. The upstream game's core simulation/UI code remains attributed to its original project.
