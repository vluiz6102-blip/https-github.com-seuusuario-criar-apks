extends Node
class_name HardwareDetector

## Jornada 90 - detector de hardware e perfil de performance.
## Autoload recomendado: HardwareDetector.
##
## A decisão é por capacidade observável. Em Android, o nome do SoC não é
## uma fonte confiável em todas as versões, então usamos RAM física, driver
## de renderização ativo e contagem de CPUs. O próprio Godot pode fazer
## fallback de Mobile/Forward+ para Compatibility quando necessário.

signal profile_changed(profile: String, config: Dictionary)

const PROFILE_HIGH := "high_performance"
const PROFILE_LITE := "lite"

const RAM_LITE_BYTES := 3 * 1024 * 1024 * 1024
const MAX_CACHED_PROFILE := "j90/performance_profile"

const HIGH_CONFIG := {
	"physics_hz": 60,
	"max_fps": 120,
	"target_refresh_hz": 120,
	"render_scale": 1.0,
	"internal_viewport": Vector2i(320, 180),
	"particles": true,
	"shadows": true,
	"post_fx": true,
	"secondary_fx": true,
	"pixel_perfect": true,
	"texture_quality": "high"
}

const LITE_CONFIG := {
	"physics_hz": 30,
	"max_fps": 60,
	"target_refresh_hz": 60,
	"render_scale": 0.85,
	"internal_viewport": Vector2i(256, 144),
	"particles": false,
	"shadows": false,
	"post_fx": false,
	"secondary_fx": false,
	"pixel_perfect": true,
	"texture_quality": "low"
}

var current_profile: String = ""
var hardware_info: Dictionary = {}
var current_config: Dictionary = {}


func _ready() -> void:
	call_deferred("detect_and_apply")


func detect_and_apply(force: bool = false) -> Dictionary:
	var detected := _collect_hardware()

	# Cache não substitui a detecção atual. Ele serve apenas para diagnóstico
	# e comparação entre versões do jogo.
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

	var method := "unknown"
	var driver := "unknown"
	if RenderingServer:
		method = str(RenderingServer.get_current_rendering_method())
		driver = str(RenderingServer.get_current_rendering_driver_name())

	var refresh := 60.0
	if DisplayServer:
		var detected_refresh := DisplayServer.screen_get_refresh_rate()
		if detected_refresh > 0.0:
			refresh = detected_refresh

	var cores := max(1, OS.get_processor_count())
	var android := OS.get_name() == "Android"

	# "sem Vulkan" é avaliado pelo driver efetivamente utilizado.
	# Isso é mais seguro que tentar adivinhar extensões do fabricante.
	var vulkan_active := driver == "vulkan" and method != "gl_compatibility"
	var compatibility_active := method == "gl_compatibility"

	return {
		"platform": OS.get_name(),
		"android": android,
		"ram_bytes": physical_ram,
		"ram_gib": snapped(float(physical_ram) / float(1024 * 1024 * 1024), 0.01) if physical_ram > 0 else 0.0,
		"cpu_cores": cores,
		"refresh_hz": refresh,
		"rendering_method": method,
		"rendering_driver": driver,
		"vulkan_active": vulkan_active,
		"compatibility_active": compatibility_active
	}


func _choose_profile(hw: Dictionary) -> String:
	var ram_bytes := int(hw.get("ram_bytes", 0))
	var vulkan_active := bool(hw.get("vulkan_active", false))

	# Regra pedida: < 3 GB de RAM OU ausência de Vulkan => Lite.
	# RAM desconhecida não força Lite sozinha.
	if (ram_bytes > 0 and ram_bytes < RAM_LITE_BYTES) or not vulkan_active:
		return PROFILE_LITE

	return PROFILE_HIGH


func _build_config(profile: String) -> Dictionary:
	var source: Dictionary = HIGH_CONFIG if profile == PROFILE_HIGH else LITE_CONFIG
	return source.duplicate(true)


func _apply_engine_limits(config: Dictionary) -> void:
	Engine.physics_ticks_per_second = int(config.get("physics_hz", 30))
	Engine.max_fps = int(config.get("max_fps", 60))

	# V-Sync continua sob controle do projeto. O limite acima evita que o
	# jogo tente produzir frames acima do perfil escolhido.
	ProjectSettings.set_setting(
		"application/run/main_scene",
		ProjectSettings.get_setting("application/run/main_scene", "")
	)


func _apply_runtime_features(config: Dictionary) -> void:
	# Nós gráficos implementam:
	#   func apply_quality_profile(config: Dictionary) -> void
	#
	# Isso evita que HardwareDetector conheça partículas, sombras ou pós-FX
	# concretos. A troca é feita por grupos e é segura entre cenas.
	var tree := get_tree()
	if tree:
		tree.call_group("quality_runtime", "apply_quality_profile", config)

	# SubViewport pixel-perfect. A cena de jogo pode expor um SubViewport no
	# grupo "pixel_viewport" para receber a resolução interna automaticamente.
	tree.call_group("pixel_viewport", "apply_internal_resolution", config.get("internal_viewport", Vector2i(320, 180)))


func apply_quality_to(node: Node) -> void:
	if current_config.is_empty():
		detect_and_apply()

	if is_instance_valid(node) and node.has_method("apply_quality_profile"):
		node.call("apply_quality_profile", current_config.duplicate(true))


func apply_internal_resolution(viewport: Viewport, base_size: Vector2i = Vector2i(320, 180)) -> void:
	if not is_instance_valid(viewport):
		return

	var scale := float(current_config.get("render_scale", 1.0))
	var size := Vector2i(
		max(1, roundi(float(base_size.x) * scale)),
		max(1, roundi(float(base_size.y) * scale))
	)

	# Para pixel art, a janela não é redimensionada. Apenas a resolução interna
	# muda. O stretch mantém a grade lógica e evita sub-pixel jitter.
	viewport.size = size
	viewport.size_2d_override = base_size
	viewport.size_2d_override_stretch = true


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
