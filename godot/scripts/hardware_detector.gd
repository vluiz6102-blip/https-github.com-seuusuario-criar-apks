class_name J90HardwareDetector
extends Node

signal profile_changed(profile: Dictionary)

enum Profile { HIGH_PERFORMANCE, LITE }

const MIN_RAM_HIGH_BYTES: int = 3 * 1024 * 1024 * 1024
const MIN_VULKAN_MAJOR: int = 1
const MIN_VULKAN_MINOR: int = 2
const HIGH_PHYSICS_HZ: int = 60
const LITE_PHYSICS_HZ: int = 30

var _profile: Profile = Profile.HIGH_PERFORMANCE
var _initialized: bool = false
var _info: Dictionary = {}

func initialize() -> void:
    if _initialized:
        return
    _initialized = true
    _info = _probe()
    _profile = _select_profile(_info)
    _apply(_profile)
    profile_changed.emit(profile())

func profile() -> Dictionary:
    return {
        "name": "lite" if _profile == Profile.LITE else "high-performance",
        "ram_bytes": int(_info.get("ram_bytes", 0)),
        "ram_gb": float(_info.get("ram_bytes", 0)) / 1073741824.0,
        "cpu_cores": int(_info.get("cpu_cores", 1)),
        "renderer": str(_info.get("renderer", "")),
        "driver": str(_info.get("driver", "")),
        "gpu": str(_info.get("gpu", "")),
        "api_version": str(_info.get("api_version", "")),
        "has_vulkan_1_2": bool(_info.get("has_vulkan_1_2", false))
    }

func is_lite() -> bool:
    return _profile == Profile.LITE

func _probe() -> Dictionary:
    var mem: Dictionary = OS.get_memory_info()
    var ram_bytes: int = int(mem.get("physical", 0))
    var api_version: String = RenderingServer.get_video_adapter_api_version()
    var gpu: String = RenderingServer.get_video_adapter_name()
    var renderer: String = RenderingServer.get_current_rendering_method()
    var driver: String = RenderingServer.get_current_rendering_driver_name()
    var cores: int = maxi(1, OS.get_processor_count())

    return {
        "ram_bytes": ram_bytes,
        "cpu_cores": cores,
        "renderer": renderer,
        "driver": driver,
        "gpu": gpu,
        "api_version": api_version,
        "has_vulkan_1_2": driver == "vulkan" and _version_at_least_1_2(api_version)
    }

func _version_at_least_1_2(version: String) -> bool:
    var clean := version.strip_edges()
    var parts := clean.split(".")
    if parts.size() < 2:
        return false
    var major := parts[0].to_int()
    var minor := parts[1].to_int()
    return major > MIN_VULKAN_MAJOR or (
        major == MIN_VULKAN_MAJOR and minor >= MIN_VULKAN_MINOR
    )

func _select_profile(info: Dictionary) -> Profile:
    var ram_bytes: int = int(info.get("ram_bytes", 0))
    var cores: int = int(info.get("cpu_cores", 1))
    var has_vulkan: bool = bool(info.get("has_vulkan_1_2", false))
    var current_renderer: String = str(info.get("renderer", ""))

    if ram_bytes > 0 and ram_bytes < MIN_RAM_HIGH_BYTES:
        return Profile.LITE
    if current_renderer == "gl_compatibility":
        return Profile.LITE
    if not has_vulkan:
        return Profile.LITE
    if cores <= 4:
        return Profile.LITE
    return Profile.HIGH_PERFORMANCE

func _apply(profile_id: Profile) -> void:
    Engine.physics_ticks_per_second = (
        LITE_PHYSICS_HZ if profile_id == Profile.LITE else HIGH_PHYSICS_HZ
    )
    Engine.max_fps = 60 if profile_id == Profile.LITE else _target_refresh_cap()
    ProjectSettings.set_setting("rendering/2d/snap/snap_2d_transforms_to_pixel", true)
    ProjectSettings.set_setting("rendering/2d/snap/snap_2d_vertices_to_pixel", true)
    _set_group_processing("secondary_fx", profile_id != Profile.LITE)
    _set_group_processing("expensive_shadows", profile_id != Profile.LITE)

func _target_refresh_cap() -> int:
    var refresh: float = DisplayServer.screen_get_refresh_rate()
    if refresh <= 0.0:
        return 60
    if refresh >= 120.0:
        return 120
    if refresh >= 90.0:
        return 90
    return 60

func _set_group_processing(group_name: StringName, enabled: bool) -> void:
    for node: Node in get_tree().get_nodes_in_group(group_name):
        node.set_process(enabled)
        node.set_physics_process(enabled)
