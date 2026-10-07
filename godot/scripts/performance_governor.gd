class_name J90PerformanceGovernor
extends Node

signal quality_changed(mode: StringName, metrics: Dictionary)

const MODE_FULL: StringName = &"full"
const MODE_ADAPTIVE: StringName = &"adaptive"

const SAMPLE_LERP: float = 0.08
const PRESSURE_THRESHOLD: float = 1.18
const RECOVER_THRESHOLD: float = 0.82
const DEGRADE_FRAMES: int = 36
const RECOVER_FRAMES: int = 120
const COOLDOWN_FRAMES: int = 180

var _initialized: bool = false
var _mode: StringName = MODE_FULL
var _target_fps: int = 60
var _target_ms: float = 16.6667
var _ema_ms: float = 16.6667
var _slow_frames: int = 0
var _stable_frames: int = 0
var _work_ms: float = 16.6667
var _cooldown: int = 0
var _secondary_fx_enabled: bool = true

func initialize() -> void:
    if _initialized:
        return
    _initialized = true

    var refresh := DisplayServer.screen_get_refresh_rate()
    if refresh >= 120.0:
        _target_fps = 120
    elif refresh >= 90.0:
        _target_fps = 90
    else:
        _target_fps = 60

    if HardwareDetector.is_lite():
        _target_fps = 60

    _target_ms = 1000.0 / float(_target_fps)
    Engine.max_fps = _target_fps
    _apply_groups(true)
    _emit_metrics()

func _process(delta: float) -> void:
    if not _initialized or delta <= 0.0:
        return

    var frame_ms := minf(delta * 1000.0, 250.0)
    _work_ms = minf(maxf(0.0, Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0), 250.0)
    _ema_ms = lerpf(_ema_ms, maxf(frame_ms, _work_ms), SAMPLE_LERP)

    if _cooldown > 0:
        _cooldown -= 1

    if HardwareDetector.is_lite():
        if _secondary_fx_enabled:
            _secondary_fx_enabled = false
            _apply_groups(false)
            quality_changed.emit(&"lite", metrics())
        return

    if _work_ms > _target_ms * PRESSURE_THRESHOLD:
        _slow_frames += 1
        _stable_frames = 0
    elif _work_ms < _target_ms * RECOVER_THRESHOLD:
        _stable_frames += 1
        _slow_frames = 0
    else:
        _slow_frames = 0
        _stable_frames = 0

    if _slow_frames >= DEGRADE_FRAMES and _cooldown == 0 and _secondary_fx_enabled:
        _secondary_fx_enabled = false
        _mode = MODE_ADAPTIVE
        _apply_groups(false)
        _cooldown = COOLDOWN_FRAMES
        quality_changed.emit(&"adaptive", metrics())

    if _stable_frames >= RECOVER_FRAMES and _cooldown == 0 and not _secondary_fx_enabled:
        _secondary_fx_enabled = true
        _mode = MODE_FULL
        _apply_groups(true)
        _cooldown = COOLDOWN_FRAMES
        quality_changed.emit(&"full", metrics())

    if Engine.get_process_frames() % 30 == 0:
        _emit_metrics()

func metrics() -> Dictionary:
    return {
        "mode": String(_mode),
        "target_fps": _target_fps,
        "target_frame_ms": _target_ms,
        "frame_ms_ema": _ema_ms,
        "secondary_fx": _secondary_fx_enabled,
        "renderer": RenderingServer.get_current_rendering_method(),
        "driver": RenderingServer.get_current_rendering_driver_name(),
        "lite": HardwareDetector.is_lite()
    }

func _emit_metrics() -> void:
    quality_changed.emit(_mode, metrics())

func _apply_groups(enabled: bool) -> void:
    var tree := get_tree()
    if tree == null:
        return

    for group_name in [&"secondary_fx", &"expensive_shadows"]:
        for node: Node in tree.get_nodes_in_group(group_name):
            node.set_process(enabled)
            node.set_physics_process(enabled)
