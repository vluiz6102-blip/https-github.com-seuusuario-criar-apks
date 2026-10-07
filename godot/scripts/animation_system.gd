class_name J90AnimationController
extends Node

const DEFAULT_DURATION: float = 0.18

func pop_in(node: CanvasItem, duration: float = DEFAULT_DURATION) -> Tween:
    if not is_instance_valid(node):
        return null
    node.modulate.a = 0.0
    node.scale = Vector2(0.94, 0.94)
    var tween: Tween = node.create_tween()
    tween.set_parallel(true)
    tween.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
    tween.tween_property(node, "modulate:a", 1.0, duration)
    tween.tween_property(node, "scale", Vector2.ONE, duration)
    return tween

func press(node: Control, duration: float = 0.10) -> Tween:
    if not is_instance_valid(node):
        return null
    var base_scale: Vector2 = node.scale
    var tween: Tween = node.create_tween()
    tween.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
    tween.tween_property(node, "scale", base_scale * 0.96, duration * 0.45)
    tween.tween_property(node, "scale", base_scale, duration * 0.55)
    return tween

func slide_in(node: Control, from_x: float, duration: float = 0.22) -> Tween:
    if not is_instance_valid(node):
        return null
    var target: Vector2 = node.position
    node.position.x = from_x
    node.modulate.a = 0.0
    var tween: Tween = node.create_tween()
    tween.set_parallel(true)
    tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
    tween.tween_property(node, "position", target, duration)
    tween.tween_property(node, "modulate:a", 1.0, duration * 0.85)
    return tween

func pulse(node: CanvasItem, amount: float = 0.035, duration: float = 0.24) -> Tween:
    if not is_instance_valid(node):
        return null
    var base_scale: Vector2 = node.scale
    var tween: Tween = node.create_tween()
    tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
    tween.tween_property(node, "scale", base_scale * (1.0 + amount), duration * 0.5)
    tween.tween_property(node, "scale", base_scale, duration * 0.5)
    return tween

func shake(node: Control, amplitude: float = 2.0, duration: float = 0.18) -> Tween:
    if not is_instance_valid(node):
        return null
    var base: Vector2 = node.position
    var tween: Tween = node.create_tween()
    tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
    tween.tween_property(node, "position", base + Vector2(amplitude, 0), duration / 4.0)
    tween.tween_property(node, "position", base - Vector2(amplitude, 0), duration / 4.0)
    tween.tween_property(node, "position", base + Vector2(amplitude * 0.5, 0), duration / 4.0)
    tween.tween_property(node, "position", base, duration / 4.0)
    return tween
