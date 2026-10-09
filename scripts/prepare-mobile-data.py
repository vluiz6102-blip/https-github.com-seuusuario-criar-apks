#!/usr/bin/env python3
"""Replace upstream personal-use-only league data with fictional test data.

The upstream game code is kept untouched. This script only regenerates team JSON
before packaging, to avoid redistributing the upstream example database.
"""
from __future__ import annotations
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "game-source"
BASE = ROOT / "data" / "teams"
FIRST = [
    "Aurora Norte", "Deportivo Valverde", "Atlético Sierra", "Sporting del Mar",
    "Unión Estrella", "Real Horizonte", "Club Monte Azul", "Racing del Río",
    "Deportivo Solana", "Atlético Mirador", "Sporting Alameda", "Unión Costa Clara",
    "Club Viento Sur", "Deportivo Robledal", "Atlético Valle Verde", "Real Puerto Claro",
    "Sporting Las Brisas", "Unión del Prado", "Club Fuenteluz", "Deportivo Altavista",
]
SECOND = [
    "Aurora B", "Valverde B", "Sierra B", "Mar B", "Estrella B", "Horizonte B",
    "Monte Azul B", "Río B", "Solana B", "Mirador B", "Alameda B", "Costa Clara B",
    "Viento Sur B", "Robledal B", "Valle Verde B", "Puerto Claro B", "Las Brisas B",
    "Prado B", "Fuenteluz B", "Altavista B", "Deportivo Cumbre", "Atlético Laguna",
]
FIRST_NAMES = [
    "Alex", "Adrián", "Álvaro", "Andrés", "Antonio", "Bruno", "Carlos", "Daniel",
    "David", "Diego", "Eduardo", "Enzo", "Gabriel", "Hugo", "Iker", "Iván",
    "Javier", "Joel", "Leo", "Lucas", "Manuel", "Marcos", "Mario", "Mateo",
    "Miguel", "Nicolás", "Pablo", "Raúl", "Sergio", "Tomás", "Víctor", "Abel",
    "Aitor", "Biel", "César", "Damián", "Elías", "Fabián", "Gael", "Ian",
]
LAST_NAMES = [
    "Rivera", "Silva", "Moreno", "Navarro", "Torres", "Vega", "Castro", "Molina",
    "Ortega", "Rojas", "Santos", "Delgado", "Romero", "Medina", "Cabrera", "Vidal",
    "Serrano", "Fuentes", "Iglesias", "Cruz", "Reyes", "Paredes", "Méndez", "Luna",
    "Herrera", "Campos", "Flores", "Marín", "Núñez", "Peña", "Soler", "Suárez",
    "Acosta", "León", "Cano", "Gil", "Arias", "Benítez", "Domínguez", "Calvo",
    "Prieto", "Sáez", "Moya", "Pastor", "Bravo", "Márquez", "Gallego", "Pascual",
]
POSITIONS = ["GK", "RB", "CB", "CB", "LB", "CDM", "CM", "CM", "CAM", "RW", "LW", "ST",
             "GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "RW", "LW", "ST", "CF", "CB", "CM", "ST"]

def slug(value: str) -> str:
    value = value.lower().replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u").replace("ñ","n")
    return re.sub(r"[^a-z0-9]+", "_", value).strip("_")

def player_name(index: int) -> str:
    return FIRST_NAMES[index % len(FIRST_NAMES)] + " " + LAST_NAMES[(index // len(FIRST_NAMES)) % len(LAST_NAMES)]

def build_team(name: str, division: str, number: int, player_count: int) -> dict:
    team_id = ("j90p" if division == "primera" else "j90s") + f"{number:02d}"
    players = []
    for i in range(player_count):
        age = 18 + ((number * 3 + i * 7) % 17)
        tier = ["C", "C", "B", "D", "B", "A", "Y"][((number + i) % 7)]
        salary = {"S": 1800000, "A": 850000, "B": 320000, "C": 150000, "D": 80000, "Y": 50000}[tier]
        players.append({
            "id": f"{team_id}_p{i+1:03d}",
            "name": player_name((number * 31 + i) % (len(FIRST_NAMES) * len(LAST_NAMES))),
            "birth_date": {"year": 2026 - age, "month": 1 + ((i * 5) % 12), "day": 1 + ((i * 7) % 27)},
            "nationality": "ES",
            "positions": [POSITIONS[i % len(POSITIONS)]],
            "preferred_foot": ["R", "L", "B"][i % 3],
            "tier": tier,
            "potential_tier": "A" if tier in ("C", "Y", "B") else tier,
            "shirt_number": i + 1,
            "captain": i == 0,
            "traits": [],
            "overrides": {},
            "joined_year": 2024,
            "contract": {"until_year": 2028, "salary_eur_year": salary, "release_clause_eur": salary * 15}
        })
    return {
        "id": team_id,
        "name": name,
        "short_name": f"J{number:02d}",
        "city": f"Ciudad ficticia {number:02d}",
        "founded": 1940 + (number % 70),
        "stadium": {"name": f"Estadio {name}", "capacity": 8000 + number * 350},
        "colors": {"primary": "#2365A8" if number % 2 else "#B52B3A", "secondary": "#F4F4F4"},
        "division": division,
        "reputation": max(25, 85 - number),
        "signing_policy": "open",
        "manager": {
            "name": f"Entrenador ficticio {number:02d}", "nationality": "ES",
            "birth_year": 1970 + number % 22, "preferred_formation": "4-3-3",
            "preferred_style": "equilibrado"
        },
        "tactics_default": {"formation": "4-3-3", "mentality": "equilibrado",
                            "tempo": "normal", "pressing": "medio", "width": "ancho"},
        "finances": {"budget_transfers_eur": 3000000 + number * 100000,
                     "wage_budget_eur_year": 12000000 + number * 500000,
                     "tv_revenue_eur_year": 6000000 + number * 250000},
        "players": players
    }

def main() -> None:
    if not (ROOT / "project.godot").is_file():
        raise SystemExit("Godot submodule not found; checkout with submodules enabled.")
    for division in ("primera", "segunda"):
        target = BASE / division
        target.mkdir(parents=True, exist_ok=True)
        for path in target.glob("*.json"):
            path.unlink()
    output_count = 0
    player_count = 0
    for division, names in (("primera", FIRST), ("segunda", SECOND)):
        target = BASE / division
        for number, name in enumerate(names, 1):
            # Keep 1,033 generated players in total for consistent smoke testing.
            count = 24 if division == "primera" else (25 if number <= 19 else 26)
            team = build_team(name, division, number if division == "primera" else number + 20, count)
            (target / f"{slug(team['name'])}.json").write_text(
                json.dumps(team, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            output_count += 1
            player_count += len(team["players"])
    assert output_count == 42, output_count
    assert player_count == 1033, player_count
    print(f"FICTIONAL_DATA_READY teams={output_count} players={player_count}")

if __name__ == "__main__":
    main()
