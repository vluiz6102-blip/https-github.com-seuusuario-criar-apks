class_name J90AudioManager
extends Node

const DEFAULT_POOL_SIZE: int = 8
const EVENT_DEDUPE_MS: int = 120

@export var pool_size: int = DEFAULT_POOL_SIZE
@export var max_voices: int = DEFAULT_POOL_SIZE

var _players: Array[AudioStreamPlayer] = []
var _last_event_ms: Dictionary = {}
var _serial: int = 0
var _initialized: bool = false

func initialize() -> void:
    if _initialized:
        return
    _initialized = true
    pool_size = maxi(1, pool_size)
    max_voices = clampi(max_voices, 1, pool_size)
    _build_pool()

func play_sfx(stream: AudioStream, event_id: StringName, volume_db: float = 0.0) -> bool:
    if stream == null:
        return false
    var now_ms: int = Time.get_ticks_msec()
    var key: String = String(event_id)
    var previous_ms: int = int(_last_event_ms.get(key, -999999))
    if now_ms - previous_ms < EVENT_DEDUPE_MS:
        return false
    _last_event_ms[key] = now_ms

    var active_count: int = 0
    for player: AudioStreamPlayer in _players:
        if player.playing:
            active_count += 1
    if active_count >= max_voices:
        return false

    var player := _get_idle_player()
    if player == null:
        return false

    player.stream = stream
    player.volume_db = volume_db
    player.set_meta("j90_voice_serial", _serial)
    _serial += 1
    player.play()
    return true

func stop_all() -> void:
    for player: AudioStreamPlayer in _players:
        player.stop()

func _build_pool() -> void:
    for player: AudioStreamPlayer in _players:
        if is_instance_valid(player):
            player.queue_free()
    _players.clear()

    for i: int in pool_size:
        var player := AudioStreamPlayer.new()
        player.name = "SFXVoice_%02d" % i
        player.bus = &"SFX"
        add_child(player)
        _players.append(player)

func _get_idle_player() -> AudioStreamPlayer:
    for player: AudioStreamPlayer in _players:
        if not player.playing:
            return player
    return null

func _exit_tree() -> void:
    stop_all()
    _players.clear()
    _last_event_ms.clear()
