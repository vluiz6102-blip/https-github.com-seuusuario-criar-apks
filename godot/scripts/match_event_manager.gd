class_name J90MatchEventManager
extends Node

signal event_triggered(event_id: StringName, payload: Dictionary)
signal match_paused(reason: StringName)
signal referee_decision(decision: Dictionary)
signal weather_effect_changed(modifiers: Dictionary)

const MAX_EVENT_HISTORY: int = 32

var _rng := RandomNumberGenerator.new()
var _cooldowns: Dictionary = {}
var _history: Array[Dictionary] = []
var _match_active: bool = false
var _last_weather_key: String = ""
var _last_weather_modifiers: Dictionary = {}

func start_match(seed_value: int = 0) -> void:
    _rng.seed = seed_value if seed_value != 0 else Time.get_unix_time_from_system()
    _cooldowns.clear()
    _history.clear()
    _last_weather_key = ""
    _last_weather_modifiers.clear()
    _match_active = true

func stop_match() -> void:
    _match_active = false
    _cooldowns.clear()
    _last_weather_key = ""

func evaluate_context(ctx: Dictionary) -> void:
    if not _match_active:
        return

    var minute: float = float(ctx.get("minute", 0.0))
    var weather: String = str(ctx.get("weather", "clear"))
    var pitch: String = str(ctx.get("pitch", "normal"))
    var tension: float = clampf(float(ctx.get("tension", 0.5)), 0.0, 1.0)
    var classic: bool = bool(ctx.get("classic", false))
    var home_noise: float = clampf(float(ctx.get("home_crowd", 0.5)), 0.0, 1.0)

    var weather_key := weather + "|" + pitch
    if weather_key != _last_weather_key:
        _last_weather_key = weather_key
        _last_weather_modifiers = _weather_modifiers(weather, pitch)
        weather_effect_changed.emit(_last_weather_modifiers.duplicate())
    
    _try_situational_event(minute, tension, classic)
    _try_referee_pressure(ctx, tension, home_noise)
    _try_stoppage(minute, tension)

func record_action_event(event_id: StringName, payload: Dictionary, cooldown_seconds: float = 0.0) -> bool:
    if not _match_active:
        return false

    var now: float = Time.get_ticks_msec() / 1000.0
    var key: String = String(event_id)
    var last: float = float(_cooldowns.get(key, -INF))
    if cooldown_seconds > 0.0 and now - last < cooldown_seconds:
        return false

    _cooldowns[key] = now
    _history.push_back({
        "id": event_id,
        "at": now,
        "payload": payload.duplicate(true)
    })
    if _history.size() > MAX_EVENT_HISTORY:
        _history.pop_front()

    event_triggered.emit(event_id, payload)
    return true

func current_weather_modifiers() -> Dictionary:
    return _last_weather_modifiers.duplicate(true)

func history() -> Array[Dictionary]:
    return _history.duplicate(true)

func _weather_modifiers(weather: String, pitch: String) -> Dictionary:
    var ball_speed: float = 1.0
    var friction: float = 1.0
    var stamina_drain: float = 1.0

    match weather:
        "rain":
            ball_speed = 0.92
            friction = 1.14
            stamina_drain = 1.08
        "heavy_rain":
            ball_speed = 0.84
            friction = 1.28
            stamina_drain = 1.18
        "heat":
            stamina_drain = 1.16

    if pitch == "heavy":
        friction *= 1.15
        stamina_drain *= 1.12

    return {
        "ball_speed_multiplier": ball_speed,
        "friction_multiplier": friction,
        "stamina_drain_multiplier": stamina_drain
    }

func _try_situational_event(minute: float, tension: float, classic: bool) -> void:
    if minute < 10.0:
        return

    var chance: float = 0.0012 + tension * 0.0020 + (0.0020 if classic else 0.0)
    if _rng.randf() > chance:
        return

    var roll: float = _rng.randf()
    if roll < 0.30:
        record_action_event(&"crowd_pressure", {"strength": 0.7 + tension * 0.3}, 18.0)
    elif roll < 0.55:
        record_action_event(&"touchline_confusion", {"strength": tension}, 22.0)
    elif roll < 0.72:
        record_action_event(&"pitch_intrusion", {}, 999.0)
        match_paused.emit(&"pitch_intrusion")
    else:
        record_action_event(&"floodlight_failure", {"duration": 2.0 + _rng.randf() * 4.0}, 999.0)
        match_paused.emit(&"floodlight_failure")

func _try_referee_pressure(ctx: Dictionary, tension: float, home_noise: float) -> void:
    if tension < 0.65 or home_noise < 0.65:
        return
    if not bool(ctx.get("last_foul", false)) or _rng.randf() > 0.05:
        return

    referee_decision.emit({
        "type": "advantage_check",
        "home_pressure": home_noise,
        "bias": clampf((home_noise - 0.5) * 0.10, -0.10, 0.10),
        "confidence": clampf(0.72 + tension * 0.2, 0.0, 1.0)
    })

func _try_stoppage(minute: float, tension: float) -> void:
    if minute < 85.0 or tension < 0.75:
        return
    if _rng.randf() < 0.012:
        record_action_event(&"late_time_wasting_check", {"minute": minute}, 8.0)

func _exit_tree() -> void:
    stop_match()
    _history.clear()
    _cooldowns.clear()
