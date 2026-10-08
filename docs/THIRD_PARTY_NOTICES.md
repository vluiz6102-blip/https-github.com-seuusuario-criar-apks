# Third-party notices

Jornada 90 uses/adapts selected open-source football-engine techniques in src/j90-open-match-engine.js.

## haeretici/soccer-js

Repository: https://github.com/haeretici/soccer-js
License: MIT
Copyright (c) 2026 Thiago Campos Viana

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Selected areas reviewed for adaptation include marking, match-rule helpers,
set-piece playbooks, first-touch behavior, steering, pass-safety and
deterministic simulation.

## cfpperche/2d-soccer-ai

Repository: https://github.com/cfpperche/2d-soccer-ai
License: MIT
Copyright (c) 2026 cfpperche

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Selected ideas reviewed for adaptation include lightweight 11v11 behavior,
broadcast-oriented presentation, replay-friendly state handling and
procedural match feedback.

## muksiturrahman/football-championship

Repository: https://github.com/muksiturrahman/football-championship
README states "MIT License". The repository currently does not expose a
standalone LICENSE file through its root tree. Therefore no source files from
this repository were copied into Jornada 90. Its documented match-state,
formation, stamina and touch-control ideas were used only as independent
design references.

## openfootmanager/openfootmanager

Repository: https://github.com/openfootmanager/openfootmanager
License: GPLv3.

No GPL source files are copied into Jornada 90. Manager features associated
with this reference, such as staff, contracts, inbox/news, player
development and local persistence, are implemented independently in the
Jornada 90 architecture.

## vfxper/fm26

Repository: https://github.com/vfxper/fm26

The migration work in Jornada 90 is being performed under the user's stated
authorization from the FM26 author. The repository itself currently uses a
placeholder license field rather than a defined OSI license, so this notice
records the authorization premise separately from an assumed permissive
license.
