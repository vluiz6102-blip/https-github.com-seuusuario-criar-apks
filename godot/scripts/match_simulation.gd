class_name J90MatchSimulation
extends Node

signal snapshot_ready(snapshot: Dictionary)
signal match_completed(result: Dictionary)

const HIGH_HZ := 60.0
const LITE_HZ := 30.0
const MATCH_AI_SCRIPT: Script = preload("res://scripts/match_tactics_ai.gd")
const MATCH_EVENTS_SCRIPT: Script = preload("res://scripts/match_event_manager.gd")
const HOME_POSITIONS := [
    Vector2(0.07, 0.50),
    Vector2(0.22, 0.20), Vector2(0.22, 0.40), Vector2(0.22, 0.60), Vector2(0.22, 0.80),
    Vector2(0.42, 0.28), Vector2(0.42, 0.72),
    Vector2(0.58, 0.18), Vector2(0.58, 0.50), Vector2(0.58, 0.82),
    Vector2(0.78, 0.50)
]
const AWAY_POSITIONS := [
    Vector2(0.93, 0.50),
    Vector2(0.78, 0.20), Vector2(0.78, 0.40), Vector2(0.78, 0.60), Vector2(0.78, 0.80),
    Vector2(0.58, 0.28), Vector2(0.58, 0.72),
    Vector2(0.42, 0.18), Vector2(0.42, 0.50), Vector2(0.42, 0.82),
    Vector2(0.22, 0.50)
]

@export var duration_seconds: float = 90.0
@export var home_team: StringName = &"home"
@export var away_team: StringName = &"away"

var _active: bool = false
var _elapsed: float = 0.0
var _accumulator: float = 0.0
var _step: float = 1.0 / HIGH_HZ
var _home_score: int = 0
var _away_score: int = 0
var _ai: RefCounted
var _events: Node

var _state: Dictionary = {
    "home_score": 0,
    "away_score": 0,
    "elapsed": 0.0,
    "players": [],
    "opp_players": [],
    "ball": Vector2(0.5, 0.5)
}

func _ready() -> void:
    _ai = MATCH_AI_SCRIPT.new()
    _events = MATCH_EVENTS_SCRIPT.new()
    add_child(_events)

func start(context: Dictionary = {}) -> void:
    _active = true
    _elapsed = 0.0
    _accumulator = 0.0
    _home_score = 0
    _away_score = 0
    duration_seconds = maxf(60.0, float(context.get("duration_seconds", duration_seconds)))
    home_team = StringName(str(context.get("home_team", home_team)))
    away_team = StringName(str(context.get("away_team", away_team)))
    _step = 1.0 / (LITE_HZ if HardwareDetector.is_lite() else HIGH_HZ)

    _events.start_match(int(context.get("seed", Time.get_unix_time_from_system())))
    _state["home_score"] = 0
    _state["away_score"] = 0
    _state["elapsed"] = 0.0
    _state["players"] = _build_players(HOME_POSITIONS, home_team)
    _state["opp_players"] = _build_players(AWAY_POSITIONS, away_team)
    _state["ball"] = Vector2(0.5, 0.5)
    snapshot_ready.emit(get_snapshot())

func stop() -> void:
    _active = false
    if _events:
        _events.stop_match()

func get_snapshot() -> Dictionary:
    return _state.duplicate(true)

func _physics_process(delta: float) -> void:
    if not _active:
        return
    _accumulator += minf(delta, 0.10)
    while _accumulator >= _step:
        _accumulator -= _step
        _fixed_tick(_step)

func _fixed_tick(dt: float) -> void:
    _elapsed += dt
    var fatigue := minf(1.0, _elapsed / maxf(1.0, duration_seconds))

    _ai.update_team_state({
        "score_diff": _home_score - _away_score,
        "minute": _elapsed / 60.0,
        "opponent_formation": "4-2-3-1",
        "fatigue_avg": fatigue
    })

    _events.evaluate_context({
        "minute": _elapsed / 60.0,
        "weather": "clear",
        "pitch": "normal",
        "tension": clampf(
            absf(_home_score - _away_score) * 0.15 + fatigue * 0.25,
            0.0, 1.0
        ),
        "classic": false,
        "home_crowd": 0.65,
        "last_foul": false
    })

    var ball: Vector2 = _state["ball"]
    var drift := Vector2(
        sin(_elapsed * 0.8) * 0.0018,
        cos(_elapsed * 0.67) * 0.0015
    )
    ball.x = clampf(ball.x + drift.x, 0.05, 0.95)
    ball.y = clampf(ball.y + drift.y, 0.08, 0.92)
    _state["ball"] = ball
    _advance_players(fatigue, dt)

    _state["home_score"] = _home_score
    _state["away_score"] = _away_score
    _state["elapsed"] = _elapsed
    snapshot_ready.emit(get_snapshot())

    if _elapsed >= duration_seconds:
        _active = false
        _events.stop_match()
        match_completed.emit({
            "home_team": home_team,
            "away_team": away_team,
            "home_score": _home_score,
            "away_score": _away_score,
            "duration": _elapsed
        })

func _build_players(positions: Array[Vector2], team: StringName) -> Array[Dictionary]:
    var result: Array[Dictionary] = []
    for i in positions.size():
        result.append({
            "id": "%s_%02d" % [String(team), i + 1],
            "number": i + 1,
            "x": positions[i].x,
            "y": positions[i].y,
            "team": team
        })
    return result

func _advance_players(fatigue: float, dt: float) -> void:
    for player: Dictionary in _state["players"]:
        var base := Vector2(float(player["x"]), float(player["y"]))
        var phase := float(player["number"]) * 0.37 + _elapsed * 0.6
        var target := base + Vector2(
            sin(phase) * (0.010 - fatigue * 0.003),
            cos(phase * 0.8) * (0.008 - fatigue * 0.002)
        )
        player["x"] = clampf(lerpf(base.x, target.x, minf(1.0, dt * 3.0)), 0.04, 0.94)
        player["y"] = clampf(lerpf(base.y, target.y, minf(1.0, dt * 3.0)), 0.08, 0.92)

    for player: Dictionary in _state["opp_players"]:
        var base := Vector2(float(player["x"]), float(player["y"]))
        var phase := float(player["number"]) * 0.31 + _elapsed * 0.54
        var target := base + Vector2(
            cos(phase) * (0.010 - fatigue * 0.003),
            sin(phase * 0.76) * (0.008 - fatigue * 0.002)
        )
        player["x"] = clampf(lerpf(base.x, target.x, minf(1.0, dt * 3.0)), 0.06, 0.96)
        player["y"] = clampf(lerpf(base.y, target.y, minf(1.0, dt * 3.0)), 0.08, 0.92)

func _exit_tree() -> void:
    stop()
