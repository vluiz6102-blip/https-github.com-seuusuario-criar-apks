class_name J90StadiumManager
extends Node

signal stadium_changed(stadium: J90StadiumResource)

var current: J90StadiumResource
var _cache: Dictionary = {}

func register(stadium: J90StadiumResource) -> void:
    if stadium == null or stadium.stadium_id == &"":
        return
    _cache[String(stadium.stadium_id)] = stadium

func resolve(stadium_id: StringName) -> J90StadiumResource:
    return _cache.get(String(stadium_id)) as J90StadiumResource

func apply_stadium(stadium_id: StringName, camera: Camera2D) -> bool:
    var stadium := resolve(stadium_id)
    if stadium == null:
        return false

    current = stadium
    if camera != null:
        _apply_camera(camera, stadium.camera_config)
    stadium_changed.emit(stadium)
    return true

func _apply_camera(camera: Camera2D, config: J90StadiumCameraConfig) -> void:
    if config == null:
        return

    camera.zoom = Vector2.ONE * config.zoom
    camera.position_smoothing_enabled = config.smooth_damp > 0.0
    camera.position_smoothing_speed = _smoothing_speed(config.smooth_damp)
    camera.offset = Vector2(0.0, config.vertical_offset)

func _smoothing_speed(smooth_damp: float) -> float:
    return lerpf(2.0, 18.0, 1.0 - clampf(smooth_damp, 0.0, 1.0))

func _exit_tree() -> void:
    _cache.clear()
    current = null
