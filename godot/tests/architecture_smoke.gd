extends SceneTree

const REQUIRED := [
    "res://scripts/bootstrap.gd",
    "res://scripts/hardware_detector.gd",
    "res://scripts/performance_governor.gd",
    "res://scripts/animation_system.gd",
    "res://scripts/home_shell.gd",
    "res://scripts/audio_manager.gd",
    "res://scripts/asset_streamer.gd",
    "res://scripts/stadium_camera_config.gd",
    "res://scripts/stadium_resource.gd",
    "res://scripts/stadium_manager.gd",
    "res://scripts/match_tactics_ai.gd",
    "res://scripts/transfer_market_ai.gd",
    "res://scripts/match_event_manager.gd",
    "res://scripts/match_scene_controller.gd",
    "res://scripts/match_scene.gd",
    "res://scripts/match_simulation.gd",
    "res://scripts/pixel_match_renderer.gd",
    "res://scripts/monetization_manager.gd"
]

func _initialize() -> void:
    var failures: PackedStringArray = []

    for path: String in REQUIRED:
        var script: Script = load(path)
        if script == null:
            failures.append("LOAD_FAILED:" + path)

    var main_scene: PackedScene = load("res://scenes/main.tscn")
    var match_scene: PackedScene = load("res://scenes/match.tscn")
    if main_scene == null:
        failures.append("MAIN_SCENE_LOAD_FAILED")
    if match_scene == null:
        failures.append("MATCH_SCENE_LOAD_FAILED")

    if int(ProjectSettings.get_setting("display/window/handheld/orientation", -1)) != 1:
        failures.append("PORTRAIT_NOT_LOCKED")

    if str(ProjectSettings.get_setting("display/window/stretch/mode", "")) != "viewport":
        failures.append("PIXEL_VIEWPORT_MISSING")

    if str(ProjectSettings.get_setting("display/window/stretch/scale_mode", "")) != "integer":
        failures.append("INTEGER_SCALE_MISSING")

    if str(ProjectSettings.get_setting("rendering/renderer/rendering_method", "")) != "mobile":
        failures.append("MOBILE_RENDERER_NOT_PRIMARY")

    if str(ProjectSettings.get_setting("rendering/rendering_device/driver.android", "")) != "vulkan":
        failures.append("ANDROID_VULKAN_PRIMARY_MISSING")

    if bool(ProjectSettings.get_setting(
        "rendering/rendering_device/fallback_to_opengl3", false
    )) != true:
        failures.append("OPENGL_FALLBACK_MISSING")


    if int(ProjectSettings.get_setting("physics/common/physics_ticks_per_second", 0)) != 60:
        failures.append("BASE_PHYSICS_60HZ_MISSING")

    if main_scene != null:
        var main := main_scene.instantiate()
        if main == null:
            failures.append("MAIN_SCENE_INSTANTIATE_FAILED")
        else:
            root.add_child(main)
            if main.get_node_or_null("HomeShell") == null:
                failures.append("HOME_SHELL_MISSING")
            main.queue_free()
            await process_frame

    if failures.is_empty():
        print("J90_GODOT_ARCHITECTURE=OK")
        quit(0)
        return

    for failure: String in failures:
        push_error(failure)
    quit(1)
