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
import html
import json
import math
import os
import re
import shutil
import urllib.request
import urllib.parse
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path("assets/j90-content")
STADIUMS = ROOT / "stadiums"
OPENFOOTBALL = ROOT / "openfootball"
ROSTERS = Path("data/rosters.json")
TARGET_MB = int(os.environ.get("J90_PACK_TARGET_MB", "1150"))
TARGET_BYTES = TARGET_MB * 1024 * 1024
TECH_TARGET_BYTES = 500 * 1024 * 1024
STADIUM_TARGET_BYTES = max(200 * 1024 * 1024, TARGET_BYTES - TECH_TARGET_BYTES)
WIDTH, HEIGHT = 2048, 1152
MAX_SCENES = int(os.environ.get("J90_PACK_MAX_SCENES", "2400"))


VARIANTS = [
    ("afternoon", (92, 111, 142), (222, 151, 83), (16, 34, 47)),
    ("golden", (64, 91, 126), (244, 178, 76), (10, 29, 35)),
    ("sunset", (56, 56, 112), (234, 107, 70), (15, 19, 36)),
    ("twilight", (38, 43, 83), (128, 95, 147), (9, 14, 28)),
    ("night", (12, 24, 43), (30, 53, 82), (6, 10, 18)),
    ("cloudy", (71, 82, 91), (141, 149, 153), (17, 25, 31)),
    ("rain", (47, 67, 87), (86, 101, 121), (10, 17, 24)),
    ("storm", (29, 39, 58), (61, 58, 82), (7, 11, 19)),
    ("matchday", (76, 92, 123), (238, 160, 74), (12, 28, 32)),
    ("training", (71, 106, 126), (202, 181, 101), (14, 39, 34)),
    ("academy", (49, 91, 108), (174, 180, 103), (12, 36, 29)),
    ("press", (54, 59, 92), (215, 126, 78), (13, 18, 29)),
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

    if variant == "training":
        for i in range(8):
            x = 250 + i * 195
            y = pitch_top + 80 + (i % 2) * 65
            draw.rectangle((x, y, x + 26, y + 26), outline=(245, 216, 127, 115), width=4)
    elif variant == "academy":
        for i in range(5):
            x = 360 + i * 250
            y = pitch_top + 40
            draw.line((x, y, x, y + 115), fill=(235, 235, 226, 100), width=3)
            draw.line((x, y, x + 100, y + 60), fill=(235, 235, 226, 100), width=3)
    elif variant == "press":
        for i in range(9):
            x = 480 + i * 125
            y = horizon_y + 78
            draw.ellipse((x, y, x + 18, y + 18), fill=(11, 16, 21, 190))
            draw.line((x + 9, y + 18, x + 9, y + 58), fill=(11, 16, 21, 190), width=6)
    elif variant == "matchday":
        for i in range(12):
            x = 180 + i * 140
            y = horizon_y - 30 + (i % 3) * 18
            draw.polygon([(x, y), (x + 14, y + 5), (x + 8, y + 45), (x - 5, y + 38)],
                         fill=(220, 229, 235, 52))

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


def build_team_intelligence(teams: list[str]) -> dict:
    profiles = {}
    roster_data = {}
    if ROSTERS.exists():
        try:
            roster_data = json.loads(ROSTERS.read_text(encoding="utf-8"))
        except Exception:
            roster_data = {}
    for index, team in enumerate(teams):
        roster = roster_data.get(team, {}) if isinstance(roster_data, dict) else {}
        players = roster.get("players", []) if isinstance(roster, dict) else []
        ovrs = [int(p.get("ovr") or 70) for p in players if isinstance(p, dict)]
        avg = sum(ovrs) / max(1, len(ovrs))
        seed = stable_seed("ai", team, str(index))
        def stat(offset, lo=20, hi=95):
            return int(lo + rng_value(seed, offset) * (hi - lo))
        quality = max(0.0, min(1.0, (avg - 55) / 40))
        profiles[team] = {
            "version": 1,
            "team": team,
            "squadRating": round(avg, 2),
            "style": ["posse", "transicao", "pressao", "reativo"][index % 4],
            "attributes": {
                "attack": int(48 + quality * 40 + rng_value(seed, 11) * 12),
                "defense": int(45 + quality * 42 + rng_value(seed, 12) * 10),
                "pressing": stat(13, 35, 95),
                "tempo": stat(14, 35, 92),
                "width": stat(15, 30, 90),
                "directness": stat(16, 25, 90),
                "buildUp": stat(17, 30, 95),
                "transition": stat(18, 35, 96),
                "setPieces": stat(19, 30, 92),
                "discipline": stat(20, 50, 96),
                "adaptability": stat(21, 40, 95),
                "homeBoost": stat(22, 0, 12),
            },
            "decisionRules": {
                "leadProtect": round(0.52 + rng_value(seed, 31) * 0.32, 3),
                "chaseEqualizer": round(0.56 + rng_value(seed, 32) * 0.36, 3),
                "lateGameRisk": round(0.38 + rng_value(seed, 33) * 0.48, 3),
                "fatigueSensitivity": round(0.25 + rng_value(seed, 34) * 0.55, 3),
            },
        }
    return profiles


def generate_animation_atlas(path: Path, seed: int, label: str) -> int:
    # 8x4 / 32 frames, 256x256 por frame. O pack oferece mais movimento
    # enquanto o runtime reproduz as imagens a 60 fps e carrega somente um atlas.
    from PIL import ImageChops
    tile = 256
    cols, rows, frames = 8, 4, 32
    size = (tile * cols, tile * rows)
    base = Image.new("RGB", size, (12, 30, 24))
    draw = ImageDraw.Draw(base)
    for frame in range(frames):
        ox = (frame % cols) * tile
        oy = (frame // cols) * tile
        phase = frame / max(1, frames - 1)
        wave = math.sin(phase * math.tau)
        sky = (46 + int(22 * phase), 68 + int(24 * phase), 95 + int(24 * phase))
        draw.rectangle((ox, oy, ox + tile, oy + tile), fill=sky)
        draw.rectangle((ox, oy + 122, ox + tile, oy + tile), fill=(16, 71, 40))
        draw.polygon([(ox+18, oy+135), (ox+64, oy+100), (ox+192, oy+100), (ox+238, oy+135),
                      (ox+224, oy+170), (ox+32, oy+170)], fill=(18, 27, 34))
        for band in range(4):
            yy = oy + 110 + band * 16
            shift = int(wave * (2 + band))
            for seat in range(10):
                xx = ox + 30 + seat * 20 + shift
                light = 80 + ((seat + frame + band) % 4) * 28
                draw.rectangle((xx, yy, xx + 9, yy + 3), fill=(230, 204, 145, min(170, light)))
        for band in range(7):
            yy = oy + 130 + band * 18
            draw.line((ox+4, yy, ox+tile-4, yy + int(wave*4)), fill=(26, 94, 51), width=5)
        draw.line((ox + tile//2, oy + 130, ox + tile//2, oy + tile - 4), fill=(224, 232, 214), width=2)
        draw.arc((ox+78, oy+153, ox+178, oy+253), 180, 360, fill=(224,232,214), width=2)
        px1 = ox + 54 + int((tile - 108) * phase)
        py1 = oy + 188 + int(math.sin(phase * math.tau + seed * .00001) * 18)
        px2 = ox + 198 - int((tile - 108) * phase)
        py2 = oy + 205 + int(math.cos(phase * math.tau + seed * .000013) * 14)
        for px, py, jersey in ((px1, py1, (226, 179, 78)), (px2, py2, (235, 235, 235))):
            draw.ellipse((px-10, py-26, px+10, py-6), fill=jersey)
            draw.ellipse((px-7, py-10, px+7, py+5), fill=(120, 83, 58))
            leg = int(math.sin(phase * math.tau + px*.02) * 7)
            draw.line((px-5, py+4, px-10+leg, py+18), fill=jersey, width=4)
            draw.line((px+5, py+4, px+10-leg, py+18), fill=jersey, width=4)
        bx = ox + 128 + int(math.sin(phase * math.tau) * 82)
        by = oy + 182 + int(math.cos(phase * math.tau) * 30)
        draw.ellipse((bx-6, by-6, bx+6, by+6), fill=(247, 244, 222))
        for trail in range(3):
            tx = bx - int((trail + 1) * 12 * (1 + .2 * math.sin(phase * math.tau)))
            draw.ellipse((tx-2, by-2, tx+2, by+2), fill=(247, 244, 222))
        flag_x = ox + 24
        flag_y = oy + 54 + int(wave * 5)
        draw.line((flag_x, oy+18, flag_x, flag_y), fill=(12, 17, 21), width=3)
        draw.polygon([(flag_x, oy+20), (flag_x+36+int(wave*8), oy+30+int(wave*4)),
                      (flag_x, oy+42)], fill=(218, 169, 78))
        glow_x = ox + 156 + int(wave * 34)
        draw.ellipse((glow_x-9, oy+42, glow_x+9, oy+60), fill=(255, 236, 184, 150))
    noise = Image.effect_noise(size, 10).convert("RGB")
    base = ImageChops.blend(base, noise, 0.04)
    base.save(path, "PNG", optimize=False, compress_level=1)
    return path.stat().st_size

def build_tech_pack(teams: list[str]) -> dict:
    tech_root = ROOT / "technology"
    animations = tech_root / "animations"
    ai_root = tech_root / "ai"
    animations.mkdir(parents=True, exist_ok=True)
    ai_root.mkdir(parents=True, exist_ok=True)

    intelligence = build_team_intelligence(teams)
    ai_path = ai_root / "team-intelligence.json"
    ai_path.write_text(json.dumps({
        "version": 1,
        "purpose": "Offline deterministic tactical intelligence and adaptive match behavior",
        "teams": intelligence,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

      # 500 MiB is reserved for real frame atlases. They are generated once at
    # build time and consumed lazily, keeping decoded memory near zero.
    animation_target = TECH_TARGET_BYTES
    animation_total = 0
    ai_bytes = ai_path.stat().st_size
    manifest = []
    index = 0
    while animation_total < animation_target and index < 700:
        team = teams[index % max(1, len(teams))] if teams else "Jornada 90"
        path = animations / f"atlas_{index:03d}_{slug(team)}.png"
        size = generate_animation_atlas(path, stable_seed("atlas", team, str(index)), team)
        animation_total += size
        manifest.append({
            "file": str(path.relative_to(ROOT)).replace("\\", "/"),
            "bytes": size,
            "team": team,
            "frames": 32,
            "grid": "8x4",
            "cols": 8,
            "rows": 4,
            "frameRate": 60,
            "lazy": True,
        })
        index += 1
        if index % 10 == 0:
            print("Tecnologia:", index, "atlases |", round(animation_total / 1024 / 1024, 1), "MiB")
    if animation_total < animation_target:
        raise SystemExit("Não foi possível gerar o pacote de tecnologia de 500 MiB.")
    animation_manifest = tech_root / "animation-manifest.json"
    animation_manifest.write_text(json.dumps({
        "version": 1,
        "frameRate": 60,
        "framesPerAtlas": 32,
        "grid": "8x4",
        "interpolation": "linear",
        "atlases": manifest,
        "totalBytes": animation_total,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return {
        "targetBytes": TECH_TARGET_BYTES,
        "generatedBytes": ai_bytes + animation_total,
        "animationBytes": animation_total,
        "animationAtlases": len(manifest),
        "aiBytes": ai_bytes,
        "teamIntelligence": str(ai_path.relative_to(ROOT)).replace("\\", "/"),
        "animationManifest": str(animation_manifest.relative_to(ROOT)).replace("\\", "/"),
    }


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
    tech = build_tech_pack(teams)
    # Four visual contexts per club minimum. Extra scenes are added until the
    # requested package size is reached, so smaller data sets still get a full
    # media library.
    per_team = max(4, math.ceil(1040 / max(1, len(teams))))
    scenes = []
    total = 0

    print("Times para o pacote:", len(teams), "| estádios:", round(STADIUM_TARGET_BYTES/1024/1024), "MiB | tecnologia:", round(TECH_TARGET_BYTES/1024/1024), "MiB")
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
        if total >= STADIUM_TARGET_BYTES or len(scenes) >= MAX_SCENES:
            break

    # Fill the remaining byte budget with more genuine visual variants, not
    # empty/random binary padding.
    bonus_index = 0
    while total < STADIUM_TARGET_BYTES and len(scenes) < MAX_SCENES:
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

    if total < STADIUM_TARGET_BYTES:
        raise SystemExit(f"Não foi possível atingir a meta de estádios ({STADIUM_TARGET_BYTES / 1024 / 1024:.0f} MiB) dentro do limite de {MAX_SCENES} cenas.")

    by_team: dict[str, list[str]] = {}
    for scene in scenes:
        by_team.setdefault(scene["team"], []).append(scene["file"])

    openfootball = download_openfootball()

    manifest = {
        "version": 2,
        "targetBytes": TARGET_BYTES,
        "generatedBytes": total + tech["generatedBytes"],
        "sceneCount": len(scenes),
        "teamsCovered": len(by_team),
        "byTeam": by_team,
        "scenes": scenes,
        "openFootball": openfootball,
        "technology": {
            "targetBytes": tech["targetBytes"],
            "generatedBytes": tech["generatedBytes"],
            "animationBytes": tech["animationBytes"],
            "animationAtlases": tech["animationAtlases"],
            "aiBytes": tech["aiBytes"],
        },
        "teamIntelligence": tech["teamIntelligence"],
        "animationManifest": tech["animationManifest"],
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
        "Stadium atmosphere plates are original procedural artwork generated at build time.\n"
        "Technology/animations are generated frame atlases used lazily by the runtime.\n"
        "Team intelligence is deterministic offline data derived from the real roster set.\n"
        "No player photographs are downloaded, embedded, or referenced by this build.\n"
    )
    (ROOT / "CONTENT-LICENSES.txt").write_text(licenses, encoding="utf-8")

    total_generated = total + tech["generatedBytes"]
    if total_generated < TARGET_BYTES:
        raise SystemExit(
            f"Conteúdo total abaixo da meta: {total_generated / 1024 / 1024:.1f} MiB < {TARGET_MB} MiB"
        )

    print(
        "Conteúdo Jornada 90 OK:",
        len(scenes), "cenas |",
        round(total / 1024 / 1024, 2), "MiB estádios |",
        round(tech["generatedBytes"] / 1024 / 1024, 2), "MiB tecnologia |",
        tech["animationAtlases"], "atlases de animação |",
        tech["aiBytes"], "bytes inteligência |",
        len(openfootball), "datasets OpenFootball."
    )

if __name__ == "__main__":
    main()
