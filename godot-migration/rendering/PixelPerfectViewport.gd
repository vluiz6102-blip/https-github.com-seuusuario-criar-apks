extends Node
class_name PixelPerfectViewport

## Controlador do viewport lógico 8-bit.
## Use como filho de um SubViewport e coloque o SubViewport no grupo
## "pixel_viewport". O HardwareDetector chamará apply_internal_resolution().

@export var logical_size := Vector2i(320, 180)
@export var integer_scaling := true

func _ready() -> void:
	add_to_group("pixel_viewport")
	_apply_current()


func _apply_current() -> void:
	var viewport := get_parent()
	if viewport is Viewport:
		viewport.size = logical_size
		viewport.size_2d_override = logical_size
		viewport.size_2d_override_stretch = true


func apply_internal_resolution(size: Vector2i) -> void:
	var viewport := get_parent()
	if not viewport is Viewport:
		return

	var target := Vector2i(max(1, size.x), max(1, size.y))
	viewport.size = target
	viewport.size_2d_override = logical_size
	viewport.size_2d_override_stretch = true


func force_nearest_filter(root: Node) -> void:
	if not is_instance_valid(root):
		return

	for node in root.find_children("*", "", true, false):
		if node is Sprite2D:
			var sprite := node as Sprite2D
			if sprite.texture:
				sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		elif node is TextureRect:
			var rect := node as TextureRect
			rect.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		elif node is Control:
			var control := node as Control
			control.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
