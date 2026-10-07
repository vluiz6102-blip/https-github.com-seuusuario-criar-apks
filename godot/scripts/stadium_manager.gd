class_name J90StadiumManager
extends Node

signal stadium_changed(stadium: Resource)

var current: Resource
var _cache: Dictionary = {}

func register(stadium: Resource) -> void:
    if stadium == null:
        return
    var stadium_id := StringName(str(stadium.get("stadium_id", "")))
    if stadium_id == &"":
        return
    _cache[String(stadium_id)] = stadium

func resolve(stadium_id: StringName) -> Resource:
    return _cache.get(String(stadium_id)) as Resource

func apply_stadium(stadium_id: StringName, camera: Camera2D) -> bool:
    var stadium: Resource = resolve(stadium_id)
    if stadium == null:
        return false

    current = stadium
    if camera != null:
        _apply_camera(camera, stadium.get("camera_config") as Resource)
    stadium_changed.emit(stadium)
    return true

func _apply_camera(camera: Camera2D, config: Resource) -> void:
    if config == null:
        return

    camera.zoom = Vector2.ONE * float(config.get("zoom", 1.0))
    var smooth_damp := clampf(float(config.get("smooth_damp", 0.18)), 0.0, 1.0)
    camera.position_smoothing_enabled = smooth_damp > 0.0
    camera.position_smoothing_speed = _smoothing_speed(smooth_damp)
    camera.offset = Vector2(0.0, float(config.get("vertical_offset", 0.0)))

func _smoothing_speed(smooth_damp: float) -> float:
    return lerpf(2.0, 18.0, 1.0 - clampf(smooth_damp, 0.0, 1.0))

func _exit_tree() -> void:
    _cache.clear()
    current = null
