extends Node
class_name HardwareDetector

## Jornada 90 Manager
## Autoload: HardwareDetector
##
## Decide qualidade por capacidade real do aparelho. O ano do aparelho não é
## usado porque não existe uma API Android universal que exponha esse dado de
## forma confiável para GDScript.

signal profile_changed(profile: String, config: Dictionary)

const PROFILE_HIGH := "high_performance"
const PROFILE_LITE := "lite"
const RAM_LITE_BYTES := 3 * 1024 * 1024 * 1024

const HIGH_CONFIG := {
    "physics_hz": 60,
    "max_fps": 120,
    "target_refresh_hz": 120,
    "render_scale": 1.0,
    "logical_size": Vector2i(320, 180),
    "particles": true,
    "shadows": true,
    "post_fx": true,
    "secondary_fx": true,
    "texture_quality": "high"
}

const LITE_CONFIG := {
    "physics_hz": 30,
    "max_fps": 60,
    "target_refresh_hz": 60,
    "render_scale": 0.85,
    "logical_size": Vector2i(320, 180),
    "particles": false,
    "shadows": false,
    "post_fx": false,
    "secondary_fx": false,
    "texture_quality": "low"
}

var current_profile: String = ""
var hardware_info: Dictionary = {}
var current_config: Dictionary = {}


func _ready() -> void:
    call_deferred("detect_and_apply")


func detect_and_apply(force: bool = false) -> Dictionary:
    var detected := _collect_hardware()
    var next_profile := _choose_profile(detected)

    if not force and next_profile == current_profile and not current_config.is_empty():
        return get_status()

    current_profile = next_profile
    hardware_info = detected
    current_config = _build_config(next_profile)

    _apply_engine_limits(current_config)
    _apply_runtime_features(current_config)

    profile_changed.emit(current_profile, current_config.duplicate(true))
    return get_status()


func get_status() -> Dictionary:
    return {
        "profile": current_profile,
        "hardware": hardware_info.duplicate(true),
        "config": current_config.duplicate(true)
    }


func is_lite() -> bool:
    return current_profile == PROFILE_LITE


func is_high_performance() -> bool:
    return current_profile == PROFILE_HIGH


func _collect_hardware() -> Dictionary:
    var memory := OS.get_memory_info()
    var physical_ram := int(memory.get("physical", 0))

    var method := str(RenderingServer.get_current_rendering_method())
    var driver := str(RenderingServer.get_current_rendering_driver_name())

    var refresh_hz := 60.0
    var detected_refresh := DisplayServer.screen_get_refresh_rate()
    if detected_refresh > 0.0:
        refresh_hz = detected_refresh

    var cpu_cores := max(1, OS.get_processor_count())
    var vulkan_active := driver == "vulkan" and method != "gl_compatibility"

    return {
        "platform": OS.get_name(),
        "android": OS.get_name() == "Android",
        "ram_bytes": physical_ram,
        "ram_gib": snappedf(float(physical_ram) / 1073741824.0, 0.01) if physical_ram > 0 else 0.0,
        "cpu_cores": cpu_cores,
        "refresh_hz": refresh_hz,
        "rendering_method": method,
        "rendering_driver": driver,
        "vulkan_active": vulkan_active,
        "compatibility_active": method == "gl_compatibility"
    }


func _choose_profile(hw: Dictionary) -> String:
    var physical_ram := int(hw.get("ram_bytes", 0))
    var vulkan_active := bool(hw.get("vulkan_active", false))

    # Regra do produto: <3 GiB OU sem Vulkan => Lite.
    if (physical_ram > 0 and physical_ram < RAM_LITE_BYTES) or not vulkan_active:
        return PROFILE_LITE

    return PROFILE_HIGH


func _build_config(profile: String) -> Dictionary:
    return (HIGH_CONFIG if profile == PROFILE_HIGH else LITE_CONFIG).duplicate(true)


func _apply_engine_limits(config: Dictionary) -> void:
    Engine.physics_ticks_per_second = int(config.get("physics_hz", 60))

    var refresh := float(hardware_info.get("refresh_hz", 60.0))
    var requested_max := int(config.get("max_fps", 60))

    # Em High, não produzimos frames acima do que a tela consegue exibir.
    # Mantemos 60 como piso para telas comuns e permitimos 90/120 quando existe.
    if current_profile == PROFILE_HIGH and refresh > 60.0:
        requested_max = min(120, max(60, roundi(refresh)))

    Engine.max_fps = requested_max


func _apply_runtime_features(config: Dictionary) -> void:
    var tree := get_tree()
    if tree == null:
        return

    tree.call_group("quality_runtime", "apply_quality_profile", config)
    tree.call_group(
        "pixel_viewport",
        "apply_profile",
        config.get("logical_size", Vector2i(320, 180)),
        float(config.get("render_scale", 1.0))
    )


func apply_quality_to(node: Node) -> void:
    if current_config.is_empty():
        detect_and_apply()

    if is_instance_valid(node) and node.has_method("apply_quality_profile"):
        node.call("apply_quality_profile", current_config.duplicate(true))


func diagnostics_text() -> String:
    if hardware_info.is_empty():
        return "HardwareDetector: aguardando detecção."

    return "Jornada 90 %s | RAM %.2f GiB | CPU %d | %s/%s | %.0f Hz" % [
        current_profile,
        float(hardware_info.get("ram_gib", 0.0)),
        int(hardware_info.get("cpu_cores", 0)),
        str(hardware_info.get("rendering_method", "?")),
        str(hardware_info.get("rendering_driver", "?")),
        float(hardware_info.get("refresh_hz", 60.0))
    ]
