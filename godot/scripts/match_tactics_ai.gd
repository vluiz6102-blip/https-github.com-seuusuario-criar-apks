class_name J90MatchTacticsAI
extends RefCounted

signal tactical_state_changed(state: Dictionary)

const ACTIONS: PackedStringArray = [
    "pass_short", "pass_progressive", "through_ball", "cross",
    "switch_play", "carry", "dribble", "shot", "backpass", "clearance"
]

var mentality: String = "balanced"
var line_height: float = 0.52
var compactness: float = 0.62
var press_intensity: float = 0.50
var width: float = 0.52

func decide_player_action(ctx: Dictionary) -> Dictionary:
    var attrs: Dictionary = ctx.get("attributes", {})
    var fatigue: float = clampf(float(ctx.get("fatigue", 0.0)), 0.0, 1.0)
    var pressure: float = clampf(float(ctx.get("pressure", 0.0)), 0.0, 1.0)
    var visibility: float = clampf(float(ctx.get("visibility", 1.0)), 0.0, 1.0)
    var zone_risk: float = clampf(float(ctx.get("zone_risk", 0.5)), 0.0, 1.0)
    var body_angle: float = float(ctx.get("body_angle", 0.0))
    var options: float = clampf(float(ctx.get("visible_pass_options", 0.5)), 0.0, 1.0)
    var role: String = str(ctx.get("role", "MID")).to_upper()
    var scores: Dictionary = {}

    for action: String in ACTIONS:
        scores[action] = 0.01

    _score_passing(scores, attrs, pressure, visibility, body_angle, options, zone_risk, role)
    _score_progression(scores, attrs, pressure, fatigue, zone_risk, role)
    _score_dribble(scores, attrs, pressure, fatigue, zone_risk, body_angle, role)
    _score_shot(scores, attrs, pressure, fatigue, zone_risk, body_angle, role)
    _score_retention(scores, attrs, pressure, fatigue, visibility, role)

    var best_action: String = "pass_short"
    var best_score: float = -INF
    for action: String in scores:
        var score: float = float(scores[action])
        if score > best_score:
            best_score = score
            best_action = action

    return {
        "action": best_action,
        "utility": best_score,
        "scores": scores,
        "mental_state": mentality
    }

func update_team_state(ctx: Dictionary) -> void:
    var score_diff: int = int(ctx.get("score_diff", 0))
    var minute: float = float(ctx.get("minute", 0.0))
    var opponent_formation: String = str(ctx.get("opponent_formation", "4-2-3-1"))
    var fatigue_avg: float = clampf(float(ctx.get("fatigue_avg", 0.0)), 0.0, 1.0)

    if minute >= 78.0 and score_diff < 0:
        mentality = "all_out_attack"
        line_height = 0.72
        press_intensity = 0.82
        width = 0.68
    elif minute >= 82.0 and score_diff > 0:
        mentality = "protect_lead"
        line_height = 0.32
        press_intensity = 0.38
        compactness = 0.82
    elif fatigue_avg > 0.72:
        mentality = "manage_energy"
        press_intensity = 0.35
        line_height = 0.44
    else:
        mentality = "balanced"

    if opponent_formation.begins_with("3-"):
        width = clampf(width + 0.08, 0.30, 0.82)
    if opponent_formation.begins_with("4-3-3"):
        compactness = clampf(compactness + 0.06, 0.35, 0.90)

    tactical_state_changed.emit(state())

func substitution_recommendations(players: Array[Dictionary]) -> Array[Dictionary]:
    var out: Array[Dictionary] = []
    for player: Dictionary in players:
        var fatigue: float = clampf(float(player.get("fatigue", 0.0)), 0.0, 1.0)
        var yellow: bool = bool(player.get("yellow_card", false))
        var impact: float = float(player.get("impact", 0.5))
        var urgency: float = fatigue * 0.65 + (0.25 if yellow else 0.0) + (0.10 if impact < 0.25 else 0.0)
        if urgency >= 0.68:
            out.append({"player_id": player.get("id", ""), "urgency": urgency})

    out.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
        return float(a["urgency"]) > float(b["urgency"])
    )
    return out

func state() -> Dictionary:
    return {
        "mentality": mentality,
        "line_height": line_height,
        "compactness": compactness,
        "press_intensity": press_intensity,
        "width": width
    }

func _score_passing(scores: Dictionary, attrs: Dictionary, pressure: float, visibility: float, body_angle: float, options: float, zone_risk: float, role: String) -> void:
    var passing: float = _attr(attrs, "passing")
    var vision: float = _attr(attrs, "vision")
    var alignment: float = 1.0 - absf(body_angle) / PI
    scores["pass_short"] += passing * 0.42 + vision * 0.30 + options * 0.24 - pressure * 0.30
    scores["pass_progressive"] += passing * 0.34 + vision * 0.38 + alignment * 0.16 + (1.0 - pressure) * 0.18
    scores["through_ball"] += vision * 0.44 + passing * 0.24 + options * 0.20 - (1.0 - visibility) * 0.24
    scores["cross"] += passing * 0.27 + vision * 0.20 + (0.12 if role in ["MID", "ATT"] else 0.0) - zone_risk * 0.18
    scores["switch_play"] += passing * 0.30 + vision * 0.25 + (1.0 - pressure) * 0.20
    scores["backpass"] += pressure * 0.44 + zone_risk * 0.34

func _score_progression(scores: Dictionary, attrs: Dictionary, pressure: float, fatigue: float, zone_risk: float, role: String) -> void:
    var pace: float = _attr(attrs, "pace")
    var dribbling: float = _attr(attrs, "dribbling")
    var strength: float = _attr(attrs, "strength")
    scores["carry"] += pace * 0.24 + dribbling * 0.38 + strength * 0.12 - pressure * 0.28 - fatigue * 0.16
    scores["dribble"] += dribbling * 0.50 + pace * 0.18 - pressure * 0.34 - fatigue * 0.20
    scores["clearance"] += pressure * 0.44 + zone_risk * 0.48 + (0.12 if role == "DEF" else 0.0)

func _score_dribble(scores: Dictionary, attrs: Dictionary, pressure: float, fatigue: float, zone_risk: float, body_angle: float, role: String) -> void:
    var dribbling: float = _attr(attrs, "dribbling")
    var agility: float = _attr(attrs, "agility")
    var alignment: float = 1.0 - absf(body_angle) / PI
    scores["dribble"] += agility * 0.24 + alignment * 0.14 - zone_risk * 0.13
    scores["carry"] += agility * 0.16 + alignment * 0.12
    if role == "DEF":
        scores["dribble"] -= 0.08
        scores["backpass"] += 0.14

func _score_shot(scores: Dictionary, attrs: Dictionary, pressure: float, fatigue: float, zone_risk: float, body_angle: float, role: String) -> void:
    var finishing: float = _attr(attrs, "finishing")
    var composure: float = _attr(attrs, "composure")
    var alignment: float = 1.0 - absf(body_angle) / PI
    var shooting_zone: float = 1.0 - absf(zone_risk - 0.22)
    scores["shot"] += finishing * 0.46 + composure * 0.24 + alignment * 0.14 + shooting_zone * 0.20 - pressure * 0.28 - fatigue * 0.18
    if role == "GK":
        scores["shot"] *= 0.05

func _score_retention(scores: Dictionary, attrs: Dictionary, pressure: float, fatigue: float, visibility: float, role: String) -> void:
    var composure: float = _attr(attrs, "composure")
    var passing: float = _attr(attrs, "passing")
    scores["backpass"] += composure * 0.18 + pressure * 0.24 + (1.0 - visibility) * 0.18
    if role == "GK":
        scores["clearance"] += pressure * 0.45
        scores["backpass"] += passing * 0.22

func _attr(attrs: Dictionary, key: String) -> float:
    return clampf(float(attrs.get(key, 0.5)), 0.0, 1.0)
