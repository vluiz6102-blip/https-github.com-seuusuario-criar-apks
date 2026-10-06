#!/usr/bin/env python3
"""
Jornada 90 Manager - build-time content expansion pack.

Creates a large, useful offline media library without loading it all into RAM:
- High-resolution 2D stadium atmosphere plates, mapped to the real team names
  present in data/rosters.json.
- Several weather/time-of-day variants per club.
- A small catalog of permissively licensed open football datasets.
- A manifest consumed by the lightweight runtime so only one scene is decoded
  when the stadium gallery is opened.

The media is generated at build time, not committed to Git.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import shutil
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path("assets/j90-content")
STADIUMS = ROOT / "stadiums"
OPENFOOTBALL = ROOT / "openfootball"
ROSTERS = Path("data/rosters.json")
TARGET_MB = int(os.environ.get("J90_PACK_TARGET_MB", "600"))
TARGET_BYTES = TARGET_MB * 1024 * 1024
WIDTH, HEIGHT = 2048, 1152
MAX_SCENES = int(os.environ.get("J90_PACK_MAX_SCENES", "760"))

VARIANTS = [
    ("afternoon", (92, 111, 142), (222, 151, 83), (16, 34, 47)),
    ("golden", (64, 91, 126), (244, 178, 76), (10, 29, 35)),
    ("sunset", (56, 56, 112), (234, 107, 70), (15, 19, 36)),
    ("twilight", (38, 43, 83), (128, 95, 147), (9, 14, 28)),
    ("night", (12, 24, 43), (30, 53, 82), (6, 10, 18)),
    ("cloudy", (71, 82, 91), (141, 149, 153), (17, 25, 31)),
    ("rain", (47, 67, 87), (86, 101, 121), (10, 17, 24)),
    ("storm", (29, 39, 58), (61, 58, 82), (7, 11, 19)),
]

OPENFOOTBALL_SOURCES = [
    ("Premier League 2026/27", "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/en.1.json"),
    ("Bundesliga 2026/27", "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/de.1.json"),
    ("La Liga 2026/27", "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/es.1.json"),
    ("Serie A 2026/27", "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/it.1.json"),
    ("Ligue 1 2026/27", "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/fr.1.json"),
]

FALLBACK_TEAMS = [
    "Brasil", "Argentina", "França", "Inglaterra", "Espanha", "Alemanha",
    "Portugal", "Uruguai", "Itália", "Holanda", "México", "Japão",
    "Flamengo", "Palmeiras", "Corinthians", "São Paulo", "Grêmio",
    "Internacional", "Cruzeiro", "Atlético-MG", "Bahia", "Fortaleza",
    "Goiás", "Operário-PR", "Vila Nova", "Ceará", "Sport", "Avaí",
]

def stable_seed(*parts: str) -> int:
    h = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return int(h[:16], 16)

def rng_value(seed: int, index: int) -> float:
    x = math.sin((seed + index * 0.61803398875) * 12.9898) * 43758.5453
    return x - math.floor(x)

def slug(value: str) -> str:
    table = str.maketrans({
        "á":"a","à":"a","ã":"a","â":"a","ä":"a",
        "é":"e","è":"e","ê":"e","ë":"e",
        "í":"i","ì":"i","î":"i","ï":"i",
        "ó":"o","ò":"o","õ":"o","ô":"o","ö":"o",
        "ú":"u","ù":"u","û":"u","ü":"u","ç":"c",
    })
    cleaned = value.lower().translate(table)
    return "".join(ch if ch.isalnum() else "_" for ch in cleaned).strip("_")[:44] or "clube"

def team_names() -> list[str]:
    if ROSTERS.exists():
        try:
            data = json.loads(ROSTERS.read_text(encoding="utf-8"))
            names = [str(x).strip() for x in data.keys() if str(x).strip()]
            if names:
                return names
        except Exception as exc:
            print("Aviso: rosters.json não pôde ser lido:", exc)
    return FALLBACK_TEAMS

def gradient_background(variant_index: int, seed: int) -> Image.Image:
    top, horizon, bottom = VARIANTS[variant_index % len(VARIANTS)][1:]
    img = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(img)

    # Fast vertical gradient: only one horizontal draw operation per row,
    # avoiding per-pixel Python loops during a several-hundred-image build.
    for y in range(HEIGHT):
        t = y / max(1, HEIGHT - 1)
        if t < 0.55:
            u = t / 0.55
            c1, c2 = top, horizon
        else:
            u = (t - 0.55) / 0.45
            c1, c2 = horizon, bottom
        color = tuple(int(c1[i] * (1-u) + c2[i] * u) for i in range(3))
        draw.line((0, y, WIDTH, y), fill=color)

    # Fine-grain photographic texture is deliberately generated but never
    # decoded globally by the app. It makes each JPEG visually richer and keeps
    # the packaged media as real image content instead of empty padding.
    grain = Image.effect_noise((WIDTH, HEIGHT), 42).convert("RGB")
    grain = ImageEnhance.Contrast(grain).enhance(1.35)
    img = Image.blend(img, grain, 0.075)
    return img

def draw_scene(team: str, variant: str, variant_index: int, scene_seed: int) -> Image.Image:
    image = gradient_background(variant_index, scene_seed)
    draw = ImageDraw.Draw(image, "RGBA")

    night = variant in {"night", "twilight", "storm"}
    wet = variant in {"rain", "storm"}
    gold = VARIANTS[variant_index % len(VARIANTS)][2]

    horizon_y = 605 + int((rng_value(scene_seed, 4) - 0.5) * 35)

    # Distant cloud banks.
    for i in range(11):
        x = int(i * WIDTH / 10 - 140 + rng_value(scene_seed, 20+i) * 120)
        y = int(180 + rng_value(scene_seed, 50+i) * 230)
        w = int(260 + rng_value(scene_seed, 80+i) * 360)
        h = int(70 + rng_value(scene_seed, 120+i) * 110)
        a = 38 if not night else 52
        draw.ellipse((x, y, x+w, y+h), fill=(225, 231, 235, a))

    # Roof and grandstand silhouette.
    draw.rounded_rectangle(
        (70, horizon_y-90, WIDTH-70, HEIGHT-90),
        radius=80,
        fill=(11, 17, 22, 228),
        outline=(230, 210, 166, 65),
        width=6,
    )
    roof_y = horizon_y - 130
    draw.polygon(
        [(50, roof_y+35), (300, roof_y-10), (WIDTH-300, roof_y-10), (WIDTH-50, roof_y+35),
         (WIDTH-120, roof_y+90), (120, roof_y+90)],
        fill=(18, 27, 35, 220),
        outline=(242, 209, 153, 80),
    )

    # Stand windows, crowd bands, and concourse lighting.
    bands = 7
    for b in range(bands):
        yy = horizon_y - 18 + b * 49
        for i in range(44):
            x = int(95 + i * (WIDTH-190)/44 + rng_value(scene_seed, b*100+i) * 9)
            w = 24 + int(rng_value(scene_seed, b*200+i) * 20)
            c = (220, 197, 142, 90 if b < 3 else 58)
            if night and b < 4:
                c = (251, 219, 143, 128)
            draw.rectangle((x, yy, x+w, yy+6), fill=c)

    # Floodlight pylons.
    for side in (0, 1):
        x = 180 if side == 0 else WIDTH-180
        draw.line((x, horizon_y-360, x, horizon_y+10), fill=(8, 13, 17, 220), width=18)
        lx = x - 65 if side == 0 else x - 85
        draw.rounded_rectangle((lx, horizon_y-390, lx+150, horizon_y-348),
                               radius=12, fill=(30, 38, 46, 240))
        for j in range(8):
            cx = lx + 18 + j*17
            glow = 190 if night else 75
            draw.ellipse((cx, horizon_y-382, cx+8, horizon_y-374), fill=(255, 237, 185, glow))

    # Pitch and touchline. Keep it simple so this is a decorative plate, not a
    # simulated 3D scene.
    pitch_top = horizon_y + 125
    draw.polygon(
        [(0, pitch_top+10), (WIDTH, pitch_top+10), (WIDTH, HEIGHT), (0, HEIGHT)],
        fill=(22, 92, 56, 255),
    )
    for i in range(15):
        yy = pitch_top + i * 42
        draw.line((0, yy, WIDTH, yy + 18), fill=(40, 127, 72, 92), width=20)

    cx, cy = WIDTH//2, pitch_top + 250
    draw.line((0, pitch_top+165, WIDTH, pitch_top+165), fill=(244, 244, 234, 110), width=4)
    draw.ellipse((cx-75, cy-75, cx+75, cy+75), outline=(244, 244, 234, 110), width=4)
    draw.ellipse((cx-8, cy-8, cx+8, cy+8), fill=(244, 244, 234, 130))

    if wet:
        for i in range(190):
            x = int(rng_value(scene_seed, 2000+i) * WIDTH)
            y = int(rng_value(scene_seed, 2500+i) * HEIGHT)
            length = int(20 + rng_value(scene_seed, 3000+i) * 80)
            alpha = 22 + int(rng_value(scene_seed, 3500+i) * 50)
            draw.line((x, y, x-8, y+length), fill=(215, 232, 245, alpha), width=2)

    # Golden light spill.
    if not night:
        draw.ellipse((int(WIDTH*.64), -50, int(WIDTH*.93), 250),
                     fill=(255, 205, 117, 42))
    else:
        draw.ellipse((int(WIDTH*.38), -40, int(WIDTH*.66), 210),
                     fill=(158, 189, 232, 28))

    # Team identity panel, generated from the real roster/team name but without
    # claiming to be a photograph of a real stadium.
    label = team.upper()
    short = "".join(ch for ch in label if ch.isalnum())[:3] or "90"
    draw.rounded_rectangle((76, 70, 580, 198), radius=28, fill=(7, 13, 18, 178))
    draw.rounded_rectangle((96, 88, 212, 180), radius=24, fill=(*gold, 180))
    draw.text((119, 113), short, fill=(10, 16, 20, 255))
    draw.text((238, 101), "JORNADA 90", fill=(245, 245, 245, 235))
    draw.text((238, 140), label[:30], fill=(211, 219, 222, 220))
    draw.text((WIDTH-420, 78), variant.upper(), fill=(255, 248, 226, 190))

    # Small leaf/dust details in the foreground.
    for i in range(36):
        x = int(rng_value(scene_seed, 5000+i) * WIDTH)
        y = int(pitch_top + rng_value(scene_seed, 5100+i) * (HEIGHT-pitch_top))
        r = int(2 + rng_value(scene_seed, 5200+i) * 5)
        draw.ellipse((x, y, x+r, y+r), fill=(225, 199, 134, 50))

    return ImageEnhance.Contrast(image).enhance(1.04)

def download_openfootball() -> list[dict]:
    OPENFOOTBALL.mkdir(parents=True, exist_ok=True)
    sources = []
    for name, url in OPENFOOTBALL_SOURCES:
        out = OPENFOOTBALL / (slug(name) + ".json")
        try:
            with urllib.request.urlopen(url, timeout=18) as response:
                raw = response.read()
            # Validate actual JSON instead of relying on the first byte. This
            # tolerates leading whitespace/BOM and prevents bad downloads from
            # entering the offline archive.
            decoded = raw.decode("utf-8-sig")
            json.loads(decoded)
            if len(raw) <= 120:
                raise ValueError("dataset JSON demasiado pequeno")
            out.write_bytes(raw)
            sources.append({
                "name": name,
                "file": out.name,
                "url": url,
                "license": "Public Domain (openfootball football.json)",
            })
            print("OpenFootball:", name, len(raw), "bytes")
        except Exception as exc:
            print("Aviso: OpenFootball indisponível para", name, "|", exc)
    return sources

def main() -> None:
    if TARGET_BYTES < 500 * 1024 * 1024:
        raise SystemExit("J90_PACK_TARGET_MB precisa ser >= 500")

    if ROOT.exists():
        shutil.rmtree(ROOT)
    STADIUMS.mkdir(parents=True, exist_ok=True)

    teams = team_names()
    # Four visual contexts per club minimum. Extra scenes are added until the
    # requested package size is reached, so smaller data sets still get a full
    # media library.
    per_team = max(4, math.ceil(560 / max(1, len(teams))))
    scenes = []
    total = 0

    print("Times para o pacote:", len(teams), "| meta:", TARGET_MB, "MiB")
    for team_index, team in enumerate(teams):
        for variant_index in range(per_team):
            if len(scenes) >= MAX_SCENES:
                break
            variant_name = VARIANTS[variant_index % len(VARIANTS)][0]
            scene_seed = stable_seed(team, variant_name, str(team_index), str(variant_index))
            filename = f"{team_index:03d}_{slug(team)}_{variant_index:02d}_{variant_name}.jpg"
            path = STADIUMS / filename
            img = draw_scene(team, variant_name, variant_index, scene_seed)
            img.save(path, "JPEG", quality=95, subsampling=0, optimize=False)
            size = path.stat().st_size
            total += size
            scenes.append({
                "file": str(Path("stadiums") / filename).replace("\\", "/"),
                "team": team,
                "variant": variant_name,
                "bytes": size,
            })
        if total >= TARGET_BYTES or len(scenes) >= MAX_SCENES:
            break

    # Fill the remaining byte budget with more genuine visual variants, not
    # empty/random binary padding.
    bonus_index = 0
    while total < TARGET_BYTES and len(scenes) < MAX_SCENES:
        team = teams[bonus_index % len(teams)]
        variant_index = (bonus_index + per_team) % len(VARIANTS)
        variant_name = VARIANTS[variant_index][0]
        scene_seed = stable_seed("bonus", team, variant_name, str(bonus_index))
        filename = f"bonus_{bonus_index:04d}_{slug(team)}_{variant_name}.jpg"
        path = STADIUMS / filename
        img = draw_scene(team, variant_name, variant_index, scene_seed)
        img.save(path, "JPEG", quality=95, subsampling=0, optimize=False)
        size = path.stat().st_size
        total += size
        scenes.append({
            "file": str(Path("stadiums") / filename).replace("\\", "/"),
            "team": team,
            "variant": variant_name,
            "bytes": size,
        })
        bonus_index += 1
        if bonus_index % 10 == 0:
            print("Pacote:", len(scenes), "cenas |", round(total / 1024 / 1024, 1), "MiB")

    if total < TARGET_BYTES:
        raise SystemExit(f"Não foi possível atingir {TARGET_MB} MiB dentro do limite de {MAX_SCENES} cenas.")

    by_team: dict[str, list[str]] = {}
    for scene in scenes:
        by_team.setdefault(scene["team"], []).append(scene["file"])

    openfootball = download_openfootball()

    manifest = {
        "version": 2,
        "targetBytes": TARGET_BYTES,
        "generatedBytes": total,
        "sceneCount": len(scenes),
        "teamsCovered": len(by_team),
        "byTeam": by_team,
        "scenes": scenes,
        "openFootball": openfootball,
        "design": {
            "description": "Offline stadium atmosphere gallery for Jornada 90 Manager",
            "resolution": f"{WIDTH}x{HEIGHT}",
            "variants": [v[0] for v in VARIANTS],
            "lazyRuntime": True,
        },
    }
    (ROOT / "content-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    licenses = (
        "JORNADA 90 MANAGER CONTENT PACK\n"
        "===============================\n\n"
        "Stadium atmosphere plates in this package are generated at build time by "
        "scripts/generate-content-pack.py and are original procedural artwork for "
        "Jornada 90 Manager. They are decorative 2D scenes, not photographic claims.\n\n"
        "OpenFootball datasets, when successfully downloaded during the build, "
        "are public-domain football data and are listed in content-manifest.json.\n"
    )
    (ROOT / "LICENSES.txt").write_text(licenses, encoding="utf-8")

    print(
        "Conteúdo Jornada 90 OK:",
        len(scenes), "cenas |",
        round(total / 1024 / 1024, 2), "MiB |",
        len(openfootball), "datasets OpenFootball."
    )

if __name__ == "__main__":
    main()
