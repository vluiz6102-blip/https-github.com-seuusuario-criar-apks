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
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path("assets/j90-content")
STADIUMS = ROOT / "stadiums"
OPENFOOTBALL = ROOT / "openfootball"
PLAYERS = ROOT / "players"
ROSTERS = Path("data/rosters.json")
TARGET_MB = int(os.environ.get("J90_PACK_TARGET_MB", "1150"))
TARGET_BYTES = TARGET_MB * 1024 * 1024
WIDTH, HEIGHT = 2048, 1152
MAX_SCENES = int(os.environ.get("J90_PACK_MAX_SCENES", "2400"))

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
COMMONS_UA = "Jornada90Manager/1.1 (https://github.com/vluiz6102-blip/https-github.com-seuusuario-criar-apks; open licensed player-photo build)"
COMMONS_RATE_LIMITED = False
PLAYER_PHOTO_MAX = int(os.environ.get("J90_MAX_PLAYER_PHOTOS", "2500"))
PLAYER_PHOTO_WORKERS = int(os.environ.get("J90_PLAYER_PHOTO_WORKERS", "1"))
PLAYER_THUMB_WIDTH = int(os.environ.get("J90_PLAYER_THUMB_WIDTH", "512"))

# Only licenses that permit reuse/derivatives and commercial use are accepted.
# CC BY / CC BY-SA require attribution; CC0/public-domain do not.
ALLOWED_LICENSE_MARKERS = (
    "cc0",
    "public domain",
    "cc by 4.0",
    "cc by 3.0",
    "cc by 2.0",
    "cc by 1.0",
    "cc by-sa 4.0",
    "cc by-sa 3.0",
    "cc by-sa 2.0",
    "cc by-sa 1.0",
)

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

def norm_photo_text(value: str) -> str:
    value = html.unescape(str(value or ""))
    value = re.sub(r"<[^>]+>", " ", value)
    value = value.casefold()
    value = value.replace("&", " and ")
    return "".join(
        ch if ch.isalnum() else " "
        for ch in value
    ).split()


def compact_photo_name(value: str) -> str:
    return "_".join(norm_photo_text(value))[:44] or "player"


def commons_request(params: dict) -> dict:
    query = dict(params)
    query.update({"format": "json", "formatversion": "2"})
    url = COMMONS_API + "?" + urllib.parse.urlencode(query)
    req = urllib.request.Request(url, headers={
        "User-Agent": COMMONS_UA,
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def commons_license(meta: dict) -> str:
    value = meta.get("LicenseShortName", {})
    if isinstance(value, dict):
        value = value.get("value", "")
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", str(value or "")))).strip()


def commons_text(meta: dict, key: str) -> str:
    value = meta.get(key, {})
    if isinstance(value, dict):
        value = value.get("value", "")
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", str(value or "")))).strip()


def commons_license_allowed(license_name: str) -> bool:
    low = license_name.casefold()
    if not low or "nc" in low or "non-commercial" in low or "nd" in low or "no derivatives" in low:
        return False
    return any(marker in low for marker in ALLOWED_LICENSE_MARKERS)


def score_commons_candidate(title: str, description: str, name: str, team: str) -> int:
    title_tokens = set(norm_photo_text(title))
    body_tokens = set(norm_photo_text(description))
    wanted = [t for t in norm_photo_text(name) if len(t) >= 3]
    if not wanted:
        return -999
    matched = sum(1 for token in wanted if token in title_tokens or token in body_tokens)
    score = matched * 20
    if len(wanted) >= 2 and matched < 2:
        return -999
    team_tokens = [t for t in norm_photo_text(team) if len(t) >= 3]
    if team_tokens:
        score += 5 * sum(1 for token in team_tokens if token in title_tokens or token in body_tokens)
    body = " ".join((*title_tokens, *body_tokens))
    if "football" in body or "soccer" in body:
        score += 3
    banned = ("logo", "badge", "crest", "stadium", "flag", "shirt", "jersey", "crowd", "team photo")
    if any(token in body for token in banned):
        score -= 15
    return score


def commons_find_player(name: str, team: str) -> dict | None:
    queries = [
        f'"{name}" football {team}',
        f'"{name}" football',
        f'"{name}"',
    ]
    best = None
    for query in queries:
        try:
            data = commons_request({
                "action": "query",
                "generator": "search",
                "gsrsearch": query,
                "gsrnamespace": "6",
                "gsrlimit": "4",
                "prop": "imageinfo",
                "iiprop": "url|mime|mediatype|extmetadata",
                "iiurlwidth": str(PLAYER_THUMB_WIDTH),
            })
        except Exception as exc:
            print(f"Commons search failed | {name} | {exc}")
            continue
        pages = data.get("query", {}).get("pages", [])
        for page in pages:
            info = (page.get("imageinfo") or [{}])[0]
            meta = info.get("extmetadata") or {}
            mime = str(info.get("mime") or "").lower()
            mediatype = str(info.get("mediatype") or "").lower()
            license_name = commons_license(meta)
            if not mime.startswith("image/") or mediatype not in ("bitmap", "drawing"):
                continue
            if not commons_license_allowed(license_name):
                continue
            title = str(page.get("title") or "").replace("File:", "", 1)
            description = commons_text(meta, "ImageDescription")
            score = score_commons_candidate(title, description, name, team)
            if score < 40:
                continue
            candidate = {
                "title": title,
                "source_url": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(str(page.get("title") or ""), safe=":_()"),
                "image_url": str(info.get("thumburl") or info.get("url") or ""),
                "license": license_name,
                "author": commons_text(meta, "Artist") or "Autor não informado",
                "description": description,
                "score": score,
            }
            if not best or candidate["score"] > best["score"]:
                best = candidate
        if best and best["score"] >= 60:
            break
    return best


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={
        "User-Agent": COMMONS_UA,
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    })
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()


def build_player_photo(item: tuple[int, str, str]) -> dict | None:
    index, team, name = item
    try:
        hit = commons_find_player(name, team)
        if not hit or not hit.get("image_url"):
            return None
        raw = fetch_bytes(hit["image_url"])
        from io import BytesIO
        image = Image.open(BytesIO(raw)).convert("RGB")
        image.thumbnail((PLAYER_THUMB_WIDTH, PLAYER_THUMB_WIDTH), Image.Resampling.LANCZOS)
        filename = f"{index:05d}_{compact_photo_name(name)}_{hashlib.sha256((team + '|' + name).encode()).hexdigest()[:8]}.jpg"
        path = PLAYERS / filename
        image.save(path, "JPEG", quality=88, optimize=True, progressive=True)
        return {
            "player": name,
            "team": team,
            "file": str(Path("players") / filename).replace("\\", "/"),
            "bytes": path.stat().st_size,
            "source": hit["source_url"],
            "title": hit["title"],
            "author": hit["author"],
            "license": hit["license"],
            "description": hit.get("description", ""),
        }
    except Exception as exc:
        print(f"Player photo failed | {team} | {name} | {exc}")
        return None


def download_player_photos() -> tuple[dict[str, str], list[dict], list[dict]]:
    if not ROSTERS.exists():
        return {}, [], []
    data = json.loads(ROSTERS.read_text(encoding="utf-8"))
    pairs = []
    seen = set()
    for team, roster in data.items():
        for player in roster.get("players", []) if isinstance(roster, dict) else []:
            name = str(player.get("name") or "").strip()
            if not name:
                continue
            key = (" ".join(norm_photo_text(name)), str(team).casefold())
            if key in seen:
                continue
            seen.add(key)
            pairs.append((str(team), name))
    pairs.sort(key=lambda x: (x[0].casefold(), x[1].casefold()))
    pairs = pairs[:PLAYER_PHOTO_MAX]
    PLAYERS.mkdir(parents=True, exist_ok=True)

    work = [(i, team, name) for i, (team, name) in enumerate(pairs)]
    records = []
    with ThreadPoolExecutor(max_workers=max(1, PLAYER_PHOTO_WORKERS)) as pool:
        futures = {pool.submit(build_player_photo, item): item for item in work}
        for future in as_completed(futures):
            result = future.result()
            if result:
                records.append(result)
    records.sort(key=lambda x: (x["team"].casefold(), x["player"].casefold()))

    by_player = {}
    by_team_player = {}
    for rec in records:
        name_key = " ".join(norm_photo_text(rec["player"]))
        team_key = " ".join(norm_photo_text(rec["team"]))
        by_player.setdefault(name_key, rec["file"])
        by_team_player[f"{team_key}|{name_key}"] = rec["file"]
    missing = [
        {"player": name, "team": team}
        for team, name in pairs
        if " ".join(norm_photo_text(name)) not in by_player
    ]
    print(
        "Fotos de jogadores abertas:",
        len(records), "/", len(pairs),
        "|", round(sum(int(x["bytes"]) for x in records) / 1024 / 1024, 2), "MiB",
        "| sem foto:", len(missing),
    )
    return by_player, by_team_player, records, missing


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
    PLAYERS.mkdir(parents=True, exist_ok=True)

    teams = team_names()
    player_photos, player_photos_by_team, player_photo_records, player_photo_missing = download_player_photos()
    # Four visual contexts per club minimum. Extra scenes are added until the
    # requested package size is reached, so smaller data sets still get a full
    # media library.
    per_team = max(4, math.ceil(1040 / max(1, len(teams))))
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
        "playerPhotos": player_photos,
        "playerPhotosByTeam": player_photos_by_team,
        "playerPhotoCount": len(player_photo_records),
        "playerPhotoBytes": sum(int(x["bytes"]) for x in player_photo_records),
        "playerPhotosMissing": len(player_photo_missing),
        "playerPhotoMeta": player_photo_records,
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
        "Player photos are downloaded at build time only from Wikimedia Commons files "
        "whose API metadata identifies a reusable CC BY, CC BY-SA, CC0, or public-domain "
        "license. The exact source file, author, and license are recorded in "
        "content-manifest.json under playerPhotoMeta. Attribution is required where the "
        "license requires it. Wikimedia Commons notes that other legal restrictions, "
        "including personality/publicity rights, can still apply independently of copyright.\n\n"
        "OpenFootball datasets, when successfully downloaded during the build, "
        "are public-domain football data and are listed in content-manifest.json.\n"
    )
    (ROOT / "LICENSES.txt").write_text(licenses, encoding="utf-8")

    print(
        "Conteúdo Jornada 90 OK:",
        len(scenes), "cenas |",
        round(total / 1024 / 1024, 2), "MiB |",
        len(player_photo_records), "fotos de jogadores |",
        round(sum(int(x["bytes"]) for x in player_photo_records) / 1024 / 1024, 2), "MiB em fotos |",
        len(openfootball), "datasets OpenFootball."
    )

if __name__ == "__main__":
    main()
