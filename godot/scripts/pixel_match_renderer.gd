class_name J90PixelMatchRenderer
extends Node2D

const LOGICAL_SIZE := Vector2(320.0, 180.0)
const PLAYER_SIZE := Vector2(7.0, 9.0)

var _previous: Dictionary = {}
var _current: Dictionary = {}
var _render_alpha: float = 1.0
var _match_duration: float = 90.0
var _visual_time: float = 0.0

func _ready() -> void:
    texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
    z_index = 10
    queue_redraw()

func apply_snapshot(snapshot: Dictionary) -> void:
    _previous = _current.duplicate(true)
    _current = snapshot.duplicate(true)
    _match_duration = maxf(1.0, float(_current.get("duration_seconds", _current.get("duration", 90.0))))
    _render_alpha = 0.0
    queue_redraw()

func _process(delta: float) -> void:
    _visual_time += delta
    var hz := 30.0 if HardwareDetector.is_lite() else 60.0
    var step := 1.0 / hz
    _render_alpha = minf(1.0, _render_alpha + delta / step)
    queue_redraw()

func _draw() -> void:
    draw_rect(Rect2(Vector2.ZERO, LOGICAL_SIZE), Color("#102018"))
    _draw_pitch()
    _draw_players(_previous.get("players", []), _current.get("players", []), true)
    _draw_players(_previous.get("opp_players", []), _current.get("opp_players", []), false)
    _draw_ball()
    _draw_clock()

func _draw_pitch() -> void:
    draw_rect(Rect2(9, 19, 302, 142), Color("#3d9b5a"))
    for y in range(11):
        for x in range(20):
            var c := Color("#3a9557") if ((x + y) & 1) == 0 else Color("#43a35f")
            draw_rect(Rect2(9 + x * 15, 19 + y * 13, 15, 13), c)

    var line := Color("#e5f1df")
    draw_rect(Rect2(12, 22, 296, 136), line, false, 1.0)
    draw_line(Vector2(160, 22), Vector2(160, 158), line, 1.0, false)
    draw_circle(Vector2(160, 90), 22, line, false, 1.0)
    draw_circle(Vector2(160, 90), 2, line)
    draw_rect(Rect2(12, 54, 41, 72), line, false, 1.0)
    draw_rect(Rect2(267, 54, 41, 72), line, false, 1.0)
    draw_rect(Rect2(6, 71, 6, 38), line)
    draw_rect(Rect2(308, 71, 6, 38), line)

func _draw_players(old_players: Array, new_players: Array, home: bool) -> void:
    var old_by_id: Dictionary = {}
    for p: Dictionary in old_players:
        old_by_id[str(p.get("id", ""))] = p

    for p: Dictionary in new_players:
        var id := str(p.get("id", ""))
        var old: Dictionary = old_by_id.get(id, p)
        var px := lerpf(float(old.get("x", 0.5)), float(p.get("x", 0.5)), _render_alpha) * 320.0
        var py := lerpf(float(old.get("y", 0.5)), float(p.get("y", 0.5)), _render_alpha) * 180.0
        var phase := float(p.get("number", 1)) * 0.37 + _visual_time * (1.8 if home else 1.65)
        var bob := sin(phase) * 0.65
        var squash := 1.0 + sin(phase * 1.7) * 0.035
        var direction := 1.0 if home else -1.0
        var pos := Vector2(roundf(px), roundf(py + bob))

        var shadow := Rect2(
            pos + Vector2(-3, 4),
            Vector2(6 + absf(squash - 1.0) * 2.0, 2)
        )
        draw_rect(shadow, Color("#173326"))

        var primary := Color("#dfe8ee") if home else Color("#26384a")
        var secondary := Color("#174ea6") if home else Color("#e8c547")
        var body_size := Vector2(PLAYER_SIZE.x * squash, PLAYER_SIZE.y)
        draw_rect(Rect2(pos - body_size * 0.5, body_size), primary)
        var stripe_x := pos.x - 3.0
        draw_rect(Rect2(Vector2(stripe_x, pos.y - 1.0), Vector2(6, 3)), secondary)
        var head_x := pos.x - 2.5
        draw_rect(Rect2(Vector2(head_x, pos.y - 6.0), Vector2(5, 5)), Color("#b97855"))

func _draw_ball() -> void:
    var old_ball: Vector2 = _previous.get("ball", Vector2(0.5, 0.5))
    var new_ball: Vector2 = _current.get("ball", Vector2(0.5, 0.5))
    var ball := old_ball.lerp(new_ball, _render_alpha)
    ball.x = clampf(ball.x, 0.02, 0.98)
    ball.y = clampf(ball.y, 0.03, 0.97)

    var kick := absf(sin(_visual_time * 5.5))
    var sx := 1.0 + kick * 0.16
    var sy := 1.0 - kick * 0.08
    var p := Vector2(roundf(ball.x * 320.0), roundf(ball.y * 180.0))
    draw_rect(Rect2(p + Vector2(-3, 3), Vector2(6, 2)), Color("#173326"))
    draw_rect(
        Rect2(p - Vector2(2.0 * sx, 2.0 * sy), Vector2(5.0 * sx, 5.0 * sy)),
        Color("#f8f7ee")
    )
    draw_rect(Rect2(p - Vector2(1, 1), Vector2(2, 2)), Color("#222222"))

func _draw_clock() -> void:
    var elapsed := float(_current.get("elapsed", 0.0))
    draw_rect(Rect2(74, 7, 62, 5), Color("#1c2621"))
    var progress := clampf(elapsed / _match_duration, 0.0, 1.0)
    var fill_width := 15.0 + progress * 44.0
    draw_rect(Rect2(77, 8, minf(fill_width, 59.0), 2), Color("#d8c15f"))
    var shown := "%02d:%02d" % [int(elapsed) / 60, int(elapsed) % 60]
    draw_string(ThemeDB.fallback_font, Vector2(184, 12), shown, HORIZONTAL_ALIGNMENT_LEFT, 60, 7, Color("#e5f1df"))
