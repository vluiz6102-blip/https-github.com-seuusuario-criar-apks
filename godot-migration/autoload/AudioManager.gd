extends Node
class_name AudioManager

## Jornada 90 Manager - Audio Service Locator / Autoload
## SFX são disparados somente por eventos. Nunca chame play_sfx() dentro de
## _process()/_physics_process().
##
## Garantias:
## - limite global de vozes;
## - pool fixo de AudioStreamPlayer;
## - anti-duplicação por evento + frame;
## - cooldown opcional por tipo de evento;
## - roubo determinístico da voz menos importante quando o pool está cheio.

signal sfx_started(event_id: String, voice_index: int)
signal sfx_rejected(event_id: String, reason: String)

@export var max_sfx_voices := 12
@export var default_event_cooldown_ms := 80

var _voices: Array[AudioStreamPlayer] = []
var _voice_priority: PackedFloat32Array
var _last_event_frame: Dictionary = {}
var _last_event_time: Dictionary = {}
var _serial := 0


func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    max_sfx_voices = clampi(max_sfx_voices, 4, 24)
    _voice_priority.resize(max_sfx_voices)

    for i in max_sfx_voices:
        var player := AudioStreamPlayer.new()
        player.name = "SFXVoice_%02d" % i
        player.bus = &"SFX"
        add_child(player)
        _voices.append(player)


func play_sfx(
    stream: AudioStream,
    event_id: String,
    volume_db := 0.0,
    pitch_scale := 1.0,
    priority := 0.5,
    cooldown_ms := -1
) -> bool:
    if stream == null:
        sfx_rejected.emit(event_id, "stream_null")
        return false

    var normalized_id := event_id.strip_edges()
    if normalized_id.is_empty():
        normalized_id = "sfx_%d" % _serial
        _serial += 1

    var frame := Engine.get_process_frames()
    if int(_last_event_frame.get(normalized_id, -1)) == frame:
        sfx_rejected.emit(normalized_id, "duplicate_same_frame")
        return false

    var now := Time.get_ticks_msec()
    var effective_cooldown := default_event_cooldown_ms if cooldown_ms < 0 else max(0, cooldown_ms)

    var last_time := int(_last_event_time.get(normalized_id, -2147483648))
    if effective_cooldown > 0 and now - last_time < effective_cooldown:
        sfx_rejected.emit(normalized_id, "event_cooldown")
        return false

    var voice_index := _acquire_voice(float(priority))
    if voice_index < 0:
        sfx_rejected.emit(normalized_id, "voice_pool_full")
        return false

    var player := _voices[voice_index]
    player.stop()
    player.stream = stream
    player.volume_db = clampf(volume_db, -60.0, 6.0)
    player.pitch_scale = clampf(pitch_scale, 0.5, 2.0)

    _voice_priority[voice_index] = clampf(float(priority), 0.0, 1.0)
    _last_event_frame[normalized_id] = frame
    _last_event_time[normalized_id] = now

    player.play()
    sfx_started.emit(normalized_id, voice_index)
    return true


func _acquire_voice(priority: float) -> int:
    # Primeiro usa uma voz parada.
    for i in _voices.size():
        if not _voices[i].playing:
            return i

    # Pool cheio: só rouba uma voz se o novo evento possuir prioridade maior.
    var lowest_index := -1
    var lowest_priority := INF

    for i in _voices.size():
        if _voice_priority[i] < lowest_priority:
            lowest_priority = _voice_priority[i]
            lowest_index = i

    if lowest_index >= 0 and priority > lowest_priority:
        return lowest_index

    return -1


func stop_all_sfx() -> void:
    for player in _voices:
        player.stop()


func clear_event_memory() -> void:
    _last_event_frame.clear()
    _last_event_time.clear()


func voice_count() -> int:
    return _voices.size()


func active_voice_count() -> int:
    var count := 0
    for player in _voices:
        if player.playing:
            count += 1
    return count
