extends SceneTree

const REQUIRED := [
    "res://scripts/performance_governor.gd",
    "res://scripts/animation_system.gd",
    "res://scripts/home_shell.gd",
    "res://scripts/pixel_match_renderer.gd",
    "res://scripts/match_simulation.gd"
]

func _initialize() -> void:
    var failures: PackedStringArray = []

    for path: String in REQUIRED:
        if load(path) == null:
            failures.append("LOAD_FAILED:" + path)

    var main_scene: PackedScene = load("res://scenes/main.tscn")
    var match_scene: PackedScene = load("res://scenes/match.tscn")
    if main_scene == null:
        failures.append("MAIN_SCENE_LOAD_FAILED")
    if match_scene == null:
        failures.append("MATCH_SCENE_LOAD_FAILED")

    if str(ProjectSettings.get_setting("rendering/renderer/rendering_method", "")) != "mobile":
        failures.append("MOBILE_RENDERER_NOT_PRIMARY")

    if str(ProjectSettings.get_setting("renderer/rendering_method.mobile", "")) != "mobile":
        failures.append("MOBILE_RENDERER_MODE_MISSING")

    if str(ProjectSettings.get_setting("rendering/rendering_device/driver.android", "")) != "vulkan":
        failures.append("ANDROID_VULKAN_PRIMARY_MISSING")

    if bool(ProjectSettings.get_setting(
        "rendering/rendering_device/fallback_to_opengl3", false
    )) != true:
        failures.append("OPENGL_FALLBACK_MISSING")

    if bool(ProjectSettings.get_setting(
        "textures/vram_compression/import_etc2_astc", false
    )) != true:
        failures.append("ETC2_ASTC_COMPRESSION_MISSING")

    if int(ProjectSettings.get_setting("physics/common/physics_ticks_per_second", 0)) != 60:
        failures.append("BASE_PHYSICS_60HZ_MISSING")

    if main_scene != null:
        var main := main_scene.instantiate()
        if main == null:
            failures.append("MAIN_SCENE_INSTANTIATE_FAILED")
        else:
            var home := main.get_node_or_null("HomeShell")
            if home == null:
                failures.append("HOME_SHELL_MISSING")
            main.free()

    if failures.is_empty():
        print("J90_NEXTGEN_SMOKE=OK")
        quit(0)
        return

    for failure: String in failures:
        push_error(failure)
    quit(1)
