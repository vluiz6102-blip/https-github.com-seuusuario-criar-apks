#!/usr/bin/env python3
"""Prepare the licensed Godot base for a clean, data-safe Jornada 90 APK build.

The upstream game source is a pinned submodule. This script only changes build
workspace files: display branding, generated fictional squads/crests, and an
Android export preset. It does not rewrite the main branch of the original J90.
"""
from __future__ import annotations

import json
import shutil
import struct
import sys
import zlib
from pathlib import Path

FIRST_NAMES = [
    "Lucas", "Mateus", "Gabriel", "Rafael", "Bruno", "Caio", "Davi",
    "Enzo", "Felipe", "Gustavo", "Henrique", "Igor", "João", "Leandro",
    "Marcos", "Nicolas", "Otávio", "Pedro", "Renan", "Samuel", "Thiago",
    "Vitor", "André", "Eduardo", "Diego", "Murilo", "Cauã", "Danilo",
    "Heitor", "Luan", "Marcelo", "Yuri",
]
SURNAMES = [
    "Almeida", "Barbosa", "Campos", "Cardoso", "Carvalho", "Castro",
    "Costa", "Dias", "Duarte", "Fernandes", "Ferreira", "Freitas",
    "Gomes", "Lima", "Lopes", "Machado", "Martins", "Mendes", "Monteiro",
    "Moreira", "Nascimento", "Neves", "Nogueira", "Oliveira", "Pereira",
    "Pinto", "Ramos", "Reis", "Ribeiro", "Rocha", "Santos", "Silva",
    "Souza", "Teixeira", "Vieira", "Xavier", "Moraes", "Azevedo",
    "Borges", "Moura", "Andrade", "Farias", "Macedo", "Paiva", "Queiroz",
    "Rezende", "Tavares", "Viana",
]
CLUB_NAMES = [
    "Aurora FC", "Atlético do Vale", "União Serrana", "Estrela do Sul",
    "Real Horizonte", "Porto Verde", "Ferroviário Azul", "Vila Nova do Sol",
    "Nacional da Serra", "Esporte Clube Litorâneo", "Guardiões FC",
    "Esportivo Central", "Monte Claro FC", "Riacho Grande", "Alvorada AC",
    "Minas do Norte", "Grêmio das Águas", "Santa Aurora", "Rubro Vale",
    "Azulão do Oeste", "Atlético Mirante", "Operário do Campo",
    "Costa Dourada", "União das Palmeiras", "Pioneiros FC",
    "Vale Real", "Independente da Mata", "Nova Esperança FC",
    "Desportivo Imperial", "Coração Serrano", "Estrela do Cerrado",
    "Clube da Ponte", "São Bento das Colinas", "Atlético Bravio",
    "Juventude do Porto", "Cruz do Sul FC", "Esquadrão Verde",
    "Lagoa Alta", "Fortaleza do Vale", "Santo Bosque", "Vento Sul FC",
    "Campo Novo Atlético",
]
CITIES = [
    "Nova Aurora", "Vale Sereno", "Serra Clara", "Porto Dourado",
    "Horizonte", "Campo Verde", "Lago Azul", "Vila do Sol",
    "Monte Belo", "Costa Nova", "Santa Luz", "Centro Alto",
    "Pedra Branca", "Riacho Novo", "Alvorada", "Mata Serena",
    "Palmeiral", "Flor do Vale", "Rio Claro", "Oeste Novo",
    "Mirante", "Campo Alto", "Baía Clara", "Nova Serra",
    "Pioneira", "Vale Real", "Mata Nova", "Esperança",
    "Imperial", "Colina Azul", "Cerrado Novo", "Ponte Alta",
    "Bento Verde", "Bravio", "Porto Novo", "Cruz Alta",
    "Verdejante", "Lagoa Nova", "Fortaleza Nova", "Bosque Alto",
    "Vento Claro", "Campo Novo",
]
POSITIONS = [
    "GK", "GK", "GK", "CB", "CB", "CB", "CB", "LB", "RB", "CDM", "CDM",
    "CM", "CM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST", "ST", "CF",
]
NATIONALITIES = ["BR", "AR", "UY", "CL", "CO", "PT", "ES", "FR", "DE", "NG"]
TIERS = ["C", "C", "B", "C", "D", "B", "C", "A", "C", "Y", "B"]

COLORS = [
    ("#14532D", "#FDE047"), ("#1D4ED8", "#F8FAFC"),
    ("#991B1B", "#FDE68A"), ("#6D28D9", "#F5F3FF"),
    ("#0F766E", "#FDE047"), ("#9A3412", "#FED7AA"),
    ("#111827", "#F9FAFB"), ("#BE123C", "#FCE7F3"),
    ("#1E3A8A", "#93C5FD"), ("#365314", "#D9F99D"),
]


def rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    return (struct.pack(">I", len(payload)) + kind + payload +
            struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF))


def make_crest(path: Path, primary: str, secondary: str, seed: int) -> None:
    """Create a small, original fictional shield PNG using only stdlib."""
    width = height = 128
    c1, c2 = rgb(primary), rgb(secondary)
    border = (20, 24, 32)
    rows = []
    for y in range(height):
        row = bytearray()
        for x in range(width):
            taper = max(0, y - 72) // 2
            left, right = 16 + taper, 112 - taper
            inside = 10 <= y <= 118 and left <= x <= right
            if not inside:
                color = (0, 0, 0, 0)
            else:
                edge = x in (left, left + 1, right - 1, right) or y in (10, 11, 117, 118)
                if edge:
                    color = (*border, 255)
                elif ((x // (12 + (seed % 5))) + seed) % 2 == 0:
                    color = (*c1, 255)
                else:
                    color = (*c2, 255)
                # A bright central stripe gives each invented crest its own look.
                if 59 <= x <= 68 and 28 <= y <= 91:
                    color = (*c2, 255) if seed % 2 == 0 else (*c1, 255)
            row.extend(color)
        rows.append(b"\x00" + bytes(row))
    raw = b"".join(rows)
    ihdr = struct.pack(">2I5B", width, height, 8, 6, 0, 0, 0)
    data = (b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr) +
            png_chunk(b"IDAT", zlib.compress(raw, level=9)) +
            png_chunk(b"IEND", b""))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def player_record(team_idx: int, player_idx: int, club_id: str) -> dict:
    first = FIRST_NAMES[(team_idx * 11 + player_idx * 7) % len(FIRST_NAMES)]
    last = SURNAMES[(team_idx * 17 + player_idx * 13) % len(SURNAMES)]
    # A small suffix keeps every generated name distinct across the whole DB.
    name = f"{first} {last} {team_idx + 1:02d}{player_idx + 1:02d}"
    age = 17 + ((team_idx * 3 + player_idx * 2) % 18)
    birth_year = 2026 - age
    tier = TIERS[(team_idx * 3 + player_idx * 5) % len(TIERS)]
    tier_rank = {"D": 1, "Y": 1, "C": 2, "B": 3, "A": 4, "S": 5}
    potential = tier if tier_rank[tier] >= 4 or age >= 29 else (
        "A" if age < 23 and tier_rank[tier] <= 3 else tier
    )
    salary = {"D": 90_000, "Y": 75_000, "C": 220_000,
              "B": 600_000, "A": 1_800_000, "S": 4_000_000}[tier]
    return {
        "id": f"{club_id}_p{player_idx + 1:03d}",
        "name": name,
        "birth_date": {"year": birth_year, "month": (player_idx % 12) + 1,
                       "day": (player_idx % 27) + 1},
        "nationality": NATIONALITIES[(team_idx + player_idx * 3) % len(NATIONALITIES)],
        "positions": [POSITIONS[player_idx]],
        "preferred_foot": "L" if player_idx % 5 == 0 else "R",
        "tier": tier,
        "potential_tier": potential,
        "shirt_number": player_idx + 1,
        "captain": player_idx == 4,
        "traits": (["leader"] if player_idx == 4 else
                   (["pace"] if player_idx % 6 == 0 else [])),
        "overrides": {},
        "joined_year": max(2010, birth_year + 16),
        "contract": {
            "until_year": 2027 + ((team_idx + player_idx) % 4),
            "salary_eur_year": salary,
            "release_clause_eur": salary * 8,
        },
    }


def team_record(index: int) -> dict:
    division = "primera" if index < 20 else "segunda"
    tier_index = (index * 7 + 2) % len(COLORS)
    primary, secondary = COLORS[tier_index]
    club_id = f"j90_{'pr' if division == 'primera' else 'se'}_{index + 1:02d}"
    city = CITIES[index]
    reputation = max(25, min(88, 84 - (index % 20) * 3))
    players = [player_record(index, i, club_id) for i in range(len(POSITIONS))]
    return {
        "_data_notice": "Fictional test data generated for Jornada 90; no real club or player roster.",
        "id": club_id,
        "name": CLUB_NAMES[index],
        "short_name": f"J{index + 1:02d}",
        "city": city,
        "founded": 1910 + ((index * 7) % 105),
        "stadium": {"name": f"Arena {city}", "capacity": 8000 + (index * 1379 % 50000)},
        "colors": {"primary": primary, "secondary": secondary},
        "division": division,
        "reputation": reputation,
        "signing_policy": "open",
        "manager": {
            "name": f"Treinador {index + 1:02d}",
            "nationality": "BR",
            "birth_year": 1970 + (index % 22),
            "preferred_formation": ["4-3-3", "4-2-3-1", "4-4-2"][index % 3],
            "preferred_style": ["equilibrado", "posesion", "contraataque"][index % 3],
        },
        "tactics_default": {
            "formation": ["4-3-3", "4-2-3-1", "4-4-2"][index % 3],
            "mentality": "equilibrado",
            "tempo": "normal",
            "pressing": "medio",
            "width": "ancho" if index % 2 == 0 else "equilibrado",
        },
        "finances": {
            "budget_transfers_eur": 500_000 + (index % 10) * 350_000,
            "wage_budget_eur_year": 8_000_000 + (index % 12) * 1_750_000,
            "tv_revenue_eur_year": 3_000_000 + (index % 10) * 1_200_000,
        },
        "players": players,
    }


ANDROID_PRESET = r"""

[preset.3]

name="Android"
platform="Android"
runnable=true
advanced_options=false
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter="tools/*, *.uid, *.gdignore, .github/*"
export_path="build/Jornada90.apk"
patches=PackedStringArray()
encryption_include_filters=""
encryption_exclude_filters=""
seed=0
encrypt_pck=false
encrypt_directory=false
script_export_mode=2

[preset.3.options]

custom_template/debug=""
custom_template/release=""
gradle_build/use_gradle_build=true
gradle_build/export_format=0
gradle_build/min_sdk="24"
gradle_build/target_sdk="35"
architectures/armeabi-v7a=true
architectures/arm64-v8a=true
architectures/x86=false
architectures/x86_64=false
version/code=1
version/name="1.0.0"
package/unique_name="com.jornada90.manager"
package/name="Jornada 90"
package/signed=true
package/app_category=2
package/retain_data_on_uninstall=false
package/exclude_from_recents=false
package/show_in_android_tv=false
package/show_in_app_library=true
package/show_as_launcher_app=false
launcher_icons/main_192x192=""
launcher_icons/adaptive_foreground_432x432=""
launcher_icons/adaptive_background_432x432=""
graphics/opengl_debug=false
screen/immersive_mode=true
screen/support_small=true
screen/support_normal=true
screen/support_large=true
screen/support_xlarge=true
"""


def prepare(project: Path) -> None:
    project = project.resolve()
    if not (project / "project.godot").is_file():
        raise SystemExit(f"Godot project not found: {project}")

    # Replace brand and build description without rewriting the game's systems.
    project_file = project / "project.godot"
    text = project_file.read_text(encoding="utf-8")
    text = text.replace('config/name="OpenComputerFutbolSimulator"',
                        'config/name="Jornada 90"')
    text = text.replace(
        'config/description="Simulador híbrido de La Liga española (manager + motor de partido 2D). Primera y Segunda, 20 temporadas (2026-2046)."',
        'config/description="Jornada 90: gestão de clube, temporadas e partidas de futebol em 2D."'
    )
    if 'config/icon="res://icon.svg"' not in text:
        text = text.replace('config/name="Jornada 90"\n',
                            'config/name="Jornada 90"\nconfig/icon="res://icon.svg"\n', 1)
    project_file.write_text(text, encoding="utf-8")

    menu = project / "scripts/ui/main_menu.gd"
    if menu.is_file():
        menu_text = menu.read_text(encoding="utf-8")
        menu_text = menu_text.replace(
            'title.text = "OpenComputerFutbolSimulator"',
            'title.text = "Jornada 90"'
        )
        menu_text = menu_text.replace(
            'subtitle.text = "Simulador de La Liga · 20 temporadas"',
            'subtitle.text = "Manager de futebol · carreira e partidas 2D"'
        )
        menu.write_text(menu_text, encoding="utf-8")

    # Remove the original dataset and branded club crests from the build copy.
    data_root = project / "data/teams"
    for division in ("primera", "segunda"):
        folder = data_root / division
        folder.mkdir(parents=True, exist_ok=True)
        for path in folder.glob("*.json"):
            path.unlink()
    scraped = data_root / "_scraped"
    if scraped.exists():
        shutil.rmtree(scraped)

    logos = project / "assets/logos"
    if logos.exists():
        shutil.rmtree(logos)

    logo_dir = project / "assets/logos"
    for i in range(42):
        record = team_record(i)
        team_id = record["id"]
        (data_root / record["division"] / f"{team_id}.json").write_text(
            json.dumps(record, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8"
        )
        colors = record["colors"]
        make_crest(logo_dir / f"{team_id}.png", colors["primary"],
                   colors["secondary"], i)

    # New J90 launcher mark, generated as vector rather than reusing upstream art.
    icon = project / "icon.svg"
    icon.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">'
        '<rect width="128" height="128" rx="24" fill="#0b1f16"/>'
        '<path d="M24 25H104V77Q64 120 24 77Z" fill="#16a34a" stroke="#facc15" stroke-width="5"/>'
        '<path d="M36 39H92V72Q64 101 36 72Z" fill="#f8fafc"/>'
        '<path d="M45 48L64 39L83 48L79 70L64 83L49 70Z" fill="#166534" stroke="#111827" stroke-width="2"/>'
        '<text x="64" y="111" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="#facc15">J90</text>'
        '</svg>\n',
        encoding="utf-8"
    )

    preset = project / "export_presets.cfg"
    preset_text = preset.read_text(encoding="utf-8") if preset.exists() else ""
    if 'name="Android"' not in preset_text:
        preset.write_text(preset_text.rstrip() + "\n" + ANDROID_PRESET.lstrip(),
                          encoding="utf-8")

    # Fail fast if any source team JSON or crest survives the clean build prep.
    all_files = [p for d in ("primera", "segunda") for p in (data_root / d).glob("*.json")]
    ids: set[str] = set()
    players: set[str] = set()
    count = 0
    for path in all_files:
        item = json.loads(path.read_text(encoding="utf-8"))
        if not item["id"].startswith("j90_"):
            raise SystemExit(f"Non-fictional team remains: {path}")
        if item["id"] in ids:
            raise SystemExit(f"Duplicate team ID: {item['id']}")
        ids.add(item["id"])
        if len(item["players"]) != 22:
            raise SystemExit(f"Expected 22 players in {path}, found {len(item['players'])}")
        for player in item["players"]:
            if not player["id"].startswith(item["id"] + "_p"):
                raise SystemExit(f"Bad player ID: {player['id']}")
            if player["id"] in players:
                raise SystemExit(f"Duplicate player ID: {player['id']}")
            players.add(player["id"])
            count += 1
        if not (logo_dir / f"{item['id']}.png").is_file():
            raise SystemExit(f"Missing fictional crest for {item['id']}")

    if len(all_files) != 42 or len(ids) != 42 or count != 924:
        raise SystemExit(f"Unexpected generated database: {len(ids)} teams, {count} players")
    print("J90 data check passed: 42 fictional clubs, 924 fictional players, 42 original crests.")
    print("Upstream branded team data and original club logos removed from the build workspace.")


if __name__ == "__main__":
    project_arg = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("game")
    prepare(project_arg)
