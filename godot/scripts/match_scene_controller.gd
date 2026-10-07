class_name J90MatchSceneController
extends Node

signal match_scene_opened(context: Dictionary)
signal match_scene_closed(result: Dictionary)

const MATCH_SCENE := "res://scenes/match.tscn"
const MANAGER_SCENE := "res://scenes/main.tscn"

var _pending_context: Dictionary = {}
var _active: bool = false
var _scene_changed_callable := Callable(self, "_on_scene_changed")

func initialize() -> void:
    var tree := get_tree()
    if not tree.scene_changed.is_connected(_scene_changed_callable):
        tree.scene_changed.connect(_scene_changed_callable)

func enter_match(context: Dictionary) -> Error:
    if _active:
        return ERR_BUSY
    _pending_context = context.duplicate(true)
    _active = true
    var err := get_tree().change_scene_to_file(MATCH_SCENE)
    if err != OK:
        _active = false
        _pending_context.clear()
    return err

func take_pending_context() -> Dictionary:
    return _pending_context.duplicate(true)

func finish_match(result: Dictionary) -> Error:
    if not _active:
        return ERR_UNCONFIGURED
    _active = false
    _pending_context.clear()
    match_scene_closed.emit(result.duplicate(true))
    return get_tree().change_scene_to_file(MANAGER_SCENE)

func is_match_active() -> bool:
    return _active

func _on_scene_changed() -> void:
    if not _active:
        return
    var scene := get_tree().current_scene
    if scene and scene.scene_file_path == MATCH_SCENE:
        match_scene_opened.emit(_pending_context.duplicate(true))

func _exit_tree() -> void:
    var tree := get_tree()
    if tree and tree.scene_changed.is_connected(_scene_changed_callable):
        tree.scene_changed.disconnect(_scene_changed_callable)
    _pending_context.clear()
    _active = false
