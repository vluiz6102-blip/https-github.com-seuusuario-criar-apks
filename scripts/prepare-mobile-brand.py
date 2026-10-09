#!/usr/bin/env python3
"""Apply only Jornada 90 branding to the upstream Gandula web application."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "game-source"
WEB = GAME / "web"


def replace_once(path: Path, old: str, new: str) -> None:
    if not path.is_file():
        raise SystemExit(f"Required upstream file is missing: {path}")
    content = path.read_text(encoding="utf-8")
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"Expected one branding token in {path}, found {count}: {old!r}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


def main() -> None:
    if not (GAME / "LICENSE").is_file() or not (WEB / "src" / "App.tsx").is_file():
        raise SystemExit("Gandula source is missing; checkout the submodule recursively.")

    replace_once(WEB / "index.html", "<title>Gandula</title>", "<title>Jornada 90</title>")
    replace_once(WEB / "src" / "App.tsx", "\n                Gandula\n", "\n                Jornada 90\n")
    replace_once(
        WEB / "src" / "components" / "GandulaSplash.tsx",
        "\n          Gandula\n",
        "\n          Jornada 90\n",
    )
    replace_once(
        WEB / "src" / "components" / "Footer.tsx",
        '      <span className="cursor">█</span>',
        '''      <span className="cursor">█</span>
      <Text c="dimmed" size="xs" mt="xs" ta="center">
        Jornada 90 personalizado por Victor Luiz · Base original Gandula © Felipe De Bene ·{" "}
        <a href="/GANDULA-LICENSE.txt" target="_blank" rel="noreferrer">licença MIT</a>.
      </Text>''',
    )

    public_dir = WEB / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(GAME / "LICENSE", public_dir / "GANDULA-LICENSE.txt")
    (public_dir / "J90-CREDITS.txt").write_text(
        "Jornada 90\n"
        "Marca e empacotamento Android: Victor Luiz.\n"
        "Base original do jogo: Gandula, por Felipe De Bene.\n"
        "Licença da base: MIT. Consulte GANDULA-LICENSE.txt.\n"
        "Código original: https://github.com/felipedbene/gandula\n",
        encoding="utf-8",
    )

    assert "Jornada 90" in (WEB / "index.html").read_text(encoding="utf-8")
    assert "Jornada 90" in (WEB / "src" / "App.tsx").read_text(encoding="utf-8")
    assert "Victor Luiz" in (WEB / "src" / "components" / "Footer.tsx").read_text(encoding="utf-8")
    print("BRANDING=OK; GAME_ENGINE=UNCHANGED; MIT_LICENSE_INCLUDED=OK")


if __name__ == "__main__":
    main()
