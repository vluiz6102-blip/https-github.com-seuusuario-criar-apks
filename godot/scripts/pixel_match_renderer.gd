class_name J90PixelMatchRenderer
extends Node2D

const LOGICAL_SIZE := Vector2(320.0, 180.0)

var _previous: Dictionary = {"elapsed": 0.0, "ball": Vector2(0.5, 0.5)}
var _current: Dictionary = {"elapsed": 0.0, "ball": Vector2(0.5, 0.5)}
var _render_alpha: float = 0.0

func _ready() -> void:
    texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
    queue_redraw()

func apply_snapshot(snapshot: Dictionary) -> void:
    _previous = _current.duplicate(true)
    _current = snapshot.duplicate(true)
    _render_alpha = 0.0
    queue_redraw()

func _process(delta: float) -> void:
    var step := 1.0 / (30.0 if HardwareDetector.is_lite() else 60.0)
    _render_alpha = minf(1.0, _render_alpha + delta / step)
    queue_redraw()

func _draw() -> void:
    draw_rect(Rect2(Vector2.ZERO, LOGICAL_SIZE), Color("#102018"))
    _draw_pitch()
    _draw_ball()
    _draw_debug_hud()

func _draw_pitch() -> void:
    draw_rect(Rect2(9, 19, 302, 142), Color("#3d9b5a"))

    for y in range(11):
        for x in range(20):
            var c := Color("#3a9557") if ((x + y) & 1) == 0 else Color("#43a35f")
            draw_rect(Rect2(9 + x * 15, 19 + y * 13, 15, 13), c)

    var line := Color("#e5f1df")
    draw_rect(Rect2(12, 22, 296, 136), line, false, 1.0)
    draw_line(Vector2(160, 22), Vector2(160, 158), line, 1.0, false)
    draw_rect(Rect2(12, 54, 41, 72), line, false, 1.0)
    draw_rect(Rect2(267, 54, 41, 72), line, false, 1.0)
    draw_rect(Rect2(6, 71, 6, 38), line)
    draw_rect(Rect2(308, 71, 6, 38), line)

func _draw_ball() -> void:
    var old_ball: Vector2 = _previous.get("ball", Vector2(0.5, 0.5))
    var new_ball: Vector2 = _current.get("ball", Vector2(0.5, 0.5))
    var ball := old_ball.lerp(new_ball, _render_alpha)
    ball.x = clampf(ball.x, 0.02, 0.98)
    ball.y = clampf(ball.y, 0.03, 0.97)

    var p := Vector2(roundf(ball.x * 320.0), roundf(ball.y * 180.0))
    draw_rect(Rect2(p - Vector2(2, 2), Vector2(5, 5)), Color("#f8f7ee"))
    draw_rect(Rect2(p - Vector2(1, 1), Vector2(2, 2)), Color("#222222"))

func _draw_debug_hud() -> void:
    var elapsed := float(_current.get("elapsed", 0.0))
    draw_rect(Rect2(74, 7, 62, 5), Color("#1c2621"))
    draw_rect(Rect2(77, 8, 15, 2), Color("#d8c15f"))
    var shown := "%02d:%02d" % [int(elapsed) / 60, int(elapsed) % 60]
    draw_string(ThemeDB.fallback_font, Vector2(184, 12), shown, HORIZONTAL_ALIGNMENT_LEFT, 60, 7, Color("#e5f1df"))
