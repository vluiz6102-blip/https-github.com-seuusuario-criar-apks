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
            var home := main.get_node_or_null("HomeShell")
            if home == null:
                failures.append("HOME_SHELL_MISSING")
            elif home.get_child_count() < 6:
                failures.append("HOME_NOT_INITIALIZED")
            main.queue_free()
            await process_frame
    
    if match_scene != null:
        var match := match_scene.instantiate()
        if match == null:
            failures.append("MATCH_SCENE_INSTANTIATE_FAILED")
        else:
            root.add_child(match)
            var simulation := match.get_node_or_null("Simulation")
            if simulation == null:
                failures.append("MATCH_SIMULATION_MISSING")
            else:
                simulation.start({"duration_seconds": 90.0, "home_team": &"Smoke Home", "away_team": &"Smoke Away", "seed": 90})
                var snapshot: Dictionary = simulation.get_snapshot()
                if snapshot.get("players", []).size() != 11:
                    failures.append("MATCH_HOME_PLAYER_COUNT_INVALID")
                if snapshot.get("opp_players", []).size() != 11:
                    failures.append("MATCH_AWAY_PLAYER_COUNT_INVALID")
                if not snapshot.has("duration_seconds"):
                    failures.append("MATCH_DURATION_MISSING")
            match.queue_free()
            await process_frame

    if failures.is_empty():
        print("J90_NEXTGEN_SMOKE=OK")
        quit(0)
        return

    for failure: String in failures:
        push_error(failure)
    quit(1)
