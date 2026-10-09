#!/usr/bin/env python3
"""Build compact playable leagues from dcaribou/transfermarkt-datasets (CC0)."""
from __future__ import annotations
import csv, datetime as dt, gzip, io, json, math, re, urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "game-source" / "web"
OUTPUT = WEB / "src" / "realFootballData.json"
PUBLIC = WEB / "public"
BASE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data"
URLS = {n: f"{BASE}/{n}.csv.gz" for n in ("competitions", "clubs", "players")}
SNAPSHOT = dt.date(2026, 7, 6)

def load_csv(name: str) -> list[dict[str, str]]:
    request = urllib.request.Request(URLS[name], headers={"User-Agent":"Jornada90-CC0-import/1.0"})
    error = None
    for _ in range(4):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                payload = response.read()
            with gzip.GzipFile(fileobj=io.BytesIO(payload)) as stream:
                return list(csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline="")))
        except Exception as exc:
            error = exc
    raise RuntimeError(f"Falha ao baixar a tabela CC0 {name}: {error}")

def val(row, *keys):
    for key in keys:
        value = (row.get(key) or "").strip()
        if value:
            return value
    return ""

def num(row, *keys):
    try:
        return int(float(val(row, *keys) or "0"))
    except ValueError:
        return 0

def year(value):
    m = re.search(r"(?:19|20)\d{2}", value or "")
    return int(m.group(0)) if m else 0

def current(row):
    y = year(val(row, "last_season", "season"))
    return y == 0 or y >= 2024

def league(row):
    kind = " ".join([val(row,"type","competition_type"), val(row,"sub_type","competition_sub_type"), val(row,"name","competition_name")]).lower().replace("_"," ").replace("-"," ")
    if any(word in kind for word in ("cup", "champions league", "world cup", "qualifying", "friendly", "super cup")):
        return False
    return any(word in kind for word in ("first tier", "1st tier", "league", "division"))

def pos(row):
    raw = (val(row,"position") + " " + val(row,"sub_position")).lower()
    if "goalkeeper" in raw or "keeper" in raw or raw.strip() == "gk": return "GK"
    if any(w in raw for w in ("defender","centre back","center back","full back","wing back","sweeper")): return "DEF"
    if any(w in raw for w in ("midfield","winger","wing")): return "MID"
    if any(w in raw for w in ("attack","forward","striker")): return "FWD"
    return {"gk":"GK","df":"DEF","d":"DEF","mf":"MID","m":"MID","fw":"FWD","f":"FWD"}.get(val(row,"position").lower(),"MID")

def attrs(value, position, age, pid):
    overall = 58 + 10 * math.log10(max(value, 1) / 100_000) if value > 0 else 54
    if age and age < 22: overall += 1.5
    if age > 31: overall -= min(4, (age - 31) * 0.7)
    overall += ((pid * 17) % 7 - 3) * 0.25
    overall = max(42, min(94, round(overall)))
    shapes = {"GK":(-3,-2,1,3,-16,2), "DEF":(-1,-1,-2,7,-6,2), "MID":(1,3,6,-2,-1,3), "FWD":(5,2,-1,-11,7,1)}
    names=("pace","technique","passing","defending","finishing","stamina")
    return {n:max(35,min(96,round(overall+d))) for n,d in zip(names,shapes[position])}

def main():
    competitions = load_csv("competitions")
    clubs = load_csv("clubs")
    players = load_csv("players")
    comp_by_code = {}
    for row in competitions:
        code = val(row,"competition_code","domestic_league_code","competition_id")
        comp_id = val(row,"competition_id","competition_code","domestic_league_code")
        name = val(row,"name","competition_name")
        country = val(row,"country_name")
        if not code or not comp_id or not name or not country or not league(row): continue
        item = {"id":code,"name":name.strip(),"countryName":country.strip(),"countryCode":val(row,"country_code","country_id")}
        comp_by_code[code] = item
        comp_by_code[comp_id] = item
        domestic = val(row,"domestic_league_code")
        if domestic: comp_by_code[domestic] = item

    club_map = {}
    for row in clubs:
        source_id = num(row,"club_id")
        comp = comp_by_code.get(val(row,"domestic_competition_id","competition_id"))
        name = val(row,"name","club_name")
        if not source_id or not comp or not name or not current(row): continue
        club_map[source_id] = {
          "id":2_000_000+source_id, "sourceId":source_id, "name":name,
          "competitionId":comp["id"], "competitionName":comp["name"],
          "countryName":comp["countryName"], "countryCode":comp["countryCode"],
          "stadiumName":val(row,"stadium_name"), "stadiumCapacity":num(row,"stadium_seats"),
          "players":[]
        }
    if not club_map: raise RuntimeError("No se encontraram clubes ativos nas competições licenciadas.")

    for row in players:
        cid = num(row,"current_club_id")
        if cid not in club_map or not current(row): continue
        pid = num(row,"player_id")
        name = val(row,"name","player_name")
        if not pid or not name: continue
        value = num(row,"market_value_in_eur")
        birth = val(row,"date_of_birth")
        age = 27
        try:
            dob = dt.date.fromisoformat(birth[:10])
            age = max(15,min(48,SNAPSHOT.year-dob.year-((SNAPSHOT.month,SNAPSHOT.day)<(dob.month,dob.day))))
        except ValueError: pass
        position = pos(row)
        club_map[cid]["players"].append({
          "id":10_000_000+pid,"sourceId":pid,"name":name,"age":age,"position":position,
          "attributes":attrs(value,position,age,pid),"marketValueEUR":value,
          "citizenship":val(row,"country_of_citizenship"),"dateOfBirth":birth,
          "preferredFoot":val(row,"foot")
        })

    by_comp = defaultdict(list)
    for club in club_map.values():
        if len(club["players"]) >= 11: by_comp[club["competitionId"]].append(club)

    comp_meta = {v["id"]:v for v in comp_by_code.values()}
    result_comps = []
    for comp_id, entries in sorted(by_comp.items()):
        if len(entries) < 8: continue
        meta = comp_meta.get(comp_id)
        if not meta: meta = next((v for v in comp_by_code.values() if v["id"]==comp_id), None)
        if not meta: continue
        out_clubs = []
        for club in sorted(entries,key=lambda c:c["name"].casefold()):
            roster = sorted(club["players"],key=lambda p:(-p["marketValueEUR"],p["name"].casefold()))
            xi = []
            def take(position,count):
                xi.extend([p for p in roster if p["position"]==position and p not in xi][:count])
            take("GK",1); take("DEF",4); take("MID",3); take("FWD",3)
            for p in roster:
                if len(xi)>=11: break
                if p not in xi: xi.append(p)
            if len(xi)<11: continue
            xi_ids = [p["id"] for p in xi[:11]]
            team = {
              "id":club["id"], "name":club["name"], "roster":roster,
              "formation":"F433",
              "tactics":{"mentality":"Balanced","tempo":"Normal","pressing":"Medium","width":"Normal"},
              "starting_xi":xi_ids,"bench":[p["id"] for p in roster if p["id"] not in xi_ids][:7]
            }
            out_clubs.append({
              "id":club["id"],"sourceId":club["sourceId"],"name":club["name"],
              "competitionId":comp_id,"competitionName":meta["name"],"countryName":meta["countryName"],
              "countryCode":meta["countryCode"],"stadiumName":club["stadiumName"],
              "stadiumCapacity":club["stadiumCapacity"],
              "totalMarketValueEUR":sum(p["marketValueEUR"] for p in roster),
              "playerCount":len(roster),"players":roster,"team":team
            })
        if len(out_clubs)>=8:
            result_comps.append({"id":comp_id,"name":meta["name"],"countryName":meta["countryName"],"countryCode":meta["countryCode"],"clubs":out_clubs})

    club_ids = {c["id"] for comp in result_comps for c in comp["clubs"]}
    player_ids = {p["id"] for comp in result_comps for c in comp["clubs"] for p in c["players"]}
    if not result_comps: raise RuntimeError("Nenhuma liga tem pelo menos oito clubes com onze jogadores reais.")
    data = {
      "metadata":{
        "source":"dcaribou/transfermarkt-datasets","sourceUrl":"https://github.com/dcaribou/transfermarkt-datasets",
        "license":"CC0-1.0","datasetSnapshot":"2026-07-06",
        "marketValueNote":"O conjunto público avisa que as avaliações não foram atualizadas regularmente após 27/02/2026. Valores reportados, não cotação ao vivo.",
        "gameRatingNote":"GER e atributos são estimativas de jogo derivadas por fórmula do valor reportado, não notas oficiais.",
        "generatedAt":dt.datetime.now(dt.timezone.utc).isoformat()
      },
      "counts":{"competitions":len(result_comps),"clubs":len(club_ids),"players":len(player_ids)},
      "competitions":result_comps
    }
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    PUBLIC.mkdir(parents=True,exist_ok=True)
    notice=(
      "\n\nClubes, jogadores e valores de mercado: dcaribou/transfermarkt-datasets, licença CC0-1.0; snapshot 06/07/2026. "
      "A publicação informa que avaliações ficaram sem atualização regular após 27/02/2026. GER/atributos de jogo são estimativas.\n"
      "Música de fundo: relax_background1_0.ogg, por joaquinton, OpenGameArt.org, licença CC0. "
      "https://opengameart.org/content/relaxbackground1-0\n"
    )
    with (PUBLIC/"OPEN_SOURCE_LICENSES.txt").open("a",encoding="utf-8") as f: f.write(notice)
    print(f"REAL_FOOTBALL_READY competitions={data['counts']['competitions']} clubs={data['counts']['clubs']} players={data['counts']['players']} bytes={OUTPUT.stat().st_size}")

if __name__ == "__main__":
    main()
