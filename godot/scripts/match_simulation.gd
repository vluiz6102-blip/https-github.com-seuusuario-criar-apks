class_name J90MatchSimulation
extends Node

signal snapshot_ready(snapshot: Dictionary)
signal match_completed(result: Dictionary)

const HIGH_HZ := 60.0
const LITE_HZ := 30.0

@export var duration_seconds: float = 90.0
@export var home_team: StringName = &"home"
@export var away_team: StringName = &"away"

var _active: bool = false
var _elapsed: float = 0.0
var _accumulator: float = 0.0
var _step: float = 1.0 / HIGH_HZ
var _home_score: int = 0
var _away_score: int = 0
var _ai := J90MatchTacticsAI.new()
var _events: J90MatchEventManager
var _state: Dictionary = {
    "home_score": 0,
    "away_score": 0,
    "elapsed": 0.0,
    "players": [],
    "ball": Vector2(0.5, 0.5)
}

func _ready() -> void:
    _events = J90MatchEventManager.new()
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

    _ai.update_team_state({
        "score_diff": _home_score - _away_score,
        "minute": _elapsed / 60.0,
        "opponent_formation": "4-2-3-1",
        "fatigue_avg": minf(1.0, _elapsed / maxf(1.0, duration_seconds))
    })

    _events.evaluate_context({
        "minute": _elapsed / 60.0,
        "weather": "clear",
        "pitch": "normal",
        "tension": clampf(
            absf(_home_score - _away_score) * 0.15 +
            _elapsed / maxf(1.0, duration_seconds) * 0.25, 0.0, 1.0
        ),
        "classic": false,
        "home_crowd": 0.65,
        "last_foul": false
    })

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

func _exit_tree() -> void:
    stop()
