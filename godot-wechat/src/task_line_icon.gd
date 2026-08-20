extends Control

var icon_key: String = "clock"
var stroke_color: Color = Color("f8dfac")
var stroke_width: float = 1.6

func _ready() -> void:
    mouse_filter = Control.MOUSE_FILTER_IGNORE
    queue_redraw()

func configure(key: String, color: Color = Color("f8dfac"), width: float = 1.6) -> void:
    icon_key = key
    stroke_color = color
    stroke_width = width
    queue_redraw()

func _draw() -> void:
    var side: float = minf(size.x, size.y)
    if side <= 0.0:
        return
    var origin: Vector2 = (size - Vector2(side, side)) * 0.5
    var scale_value: float = side / 32.0

    match icon_key:
        "clipboard":
            _draw_clipboard(origin, scale_value)
        "send":
            _draw_send(origin, scale_value)
        "hourglass":
            _draw_hourglass(origin, scale_value)
        "sparkles":
            _draw_sparkles(origin, scale_value)
        "money":
            _draw_money(origin, scale_value)
        "user-check":
            _draw_user_check(origin, scale_value)
        "play":
            _draw_play(origin, scale_value)
        "check":
            _draw_check(origin, scale_value)
        "alert":
            _draw_alert(origin, scale_value)
        "gift":
            _draw_gift(origin, scale_value)
        _:
            _draw_clock(origin, scale_value)

func _p(origin: Vector2, scale_value: float, x: float, y: float) -> Vector2:
    return origin + Vector2(x, y) * scale_value

func _line(origin: Vector2, scale_value: float, a: Vector2, b: Vector2) -> void:
    draw_line(
        _p(origin, scale_value, a.x, a.y),
        _p(origin, scale_value, b.x, b.y),
        stroke_color,
        maxf(1.0, stroke_width * scale_value),
        true
    )

func _draw_clock(origin: Vector2, scale_value: float) -> void:
    var center: Vector2 = _p(origin, scale_value, 16.0, 16.0)
    draw_arc(center, 10.0 * scale_value, 0.0, TAU, 32, stroke_color, maxf(1.0, stroke_width * scale_value), true)
    _line(origin, scale_value, Vector2(16, 10), Vector2(16, 16))
    _line(origin, scale_value, Vector2(16, 16), Vector2(21, 19))

func _draw_clipboard(origin: Vector2, scale_value: float) -> void:
    var rect: Rect2 = Rect2(_p(origin, scale_value, 8, 7), Vector2(16, 20) * scale_value)
    draw_rect(rect, stroke_color, false, maxf(1.0, stroke_width * scale_value), true)
    draw_rect(Rect2(_p(origin, scale_value, 12, 5), Vector2(8, 5) * scale_value), stroke_color, false, maxf(1.0, stroke_width * scale_value), true)
    _line(origin, scale_value, Vector2(12, 15), Vector2(20, 15))
    _line(origin, scale_value, Vector2(12, 20), Vector2(20, 20))

func _draw_send(origin: Vector2, scale_value: float) -> void:
    _line(origin, scale_value, Vector2(5, 15), Vector2(27, 6))
    _line(origin, scale_value, Vector2(27, 6), Vector2(20, 27))
    _line(origin, scale_value, Vector2(20, 27), Vector2(15, 18))
    _line(origin, scale_value, Vector2(15, 18), Vector2(5, 15))
    _line(origin, scale_value, Vector2(15, 18), Vector2(27, 6))

func _draw_hourglass(origin: Vector2, scale_value: float) -> void:
    _line(origin, scale_value, Vector2(9, 6), Vector2(23, 6))
    _line(origin, scale_value, Vector2(9, 26), Vector2(23, 26))
    _line(origin, scale_value, Vector2(10, 7), Vector2(10, 10))
    _line(origin, scale_value, Vector2(22, 7), Vector2(22, 10))
    _line(origin, scale_value, Vector2(10, 22), Vector2(10, 25))
    _line(origin, scale_value, Vector2(22, 22), Vector2(22, 25))
    _line(origin, scale_value, Vector2(10, 10), Vector2(16, 16))
    _line(origin, scale_value, Vector2(22, 10), Vector2(16, 16))
    _line(origin, scale_value, Vector2(16, 16), Vector2(10, 22))
    _line(origin, scale_value, Vector2(16, 16), Vector2(22, 22))

func _draw_sparkles(origin: Vector2, scale_value: float) -> void:
    _line(origin, scale_value, Vector2(16, 4), Vector2(16, 24))
    _line(origin, scale_value, Vector2(8, 14), Vector2(24, 14))
    _line(origin, scale_value, Vector2(11, 9), Vector2(21, 19))
    _line(origin, scale_value, Vector2(21, 9), Vector2(11, 19))
    _line(origin, scale_value, Vector2(25, 4), Vector2(25, 10))
    _line(origin, scale_value, Vector2(22, 7), Vector2(28, 7))

func _draw_money(origin: Vector2, scale_value: float) -> void:
    var center: Vector2 = _p(origin, scale_value, 16, 16)
    draw_arc(center, 10.5 * scale_value, 0.0, TAU, 32, stroke_color, maxf(1.0, stroke_width * scale_value), true)
    _line(origin, scale_value, Vector2(16, 9), Vector2(16, 23))
    _line(origin, scale_value, Vector2(12, 12), Vector2(20, 12))
    _line(origin, scale_value, Vector2(12, 20), Vector2(20, 20))
    _line(origin, scale_value, Vector2(12, 12), Vector2(20, 20))

func _draw_user_check(origin: Vector2, scale_value: float) -> void:
    draw_arc(_p(origin, scale_value, 12, 11), 5.0 * scale_value, 0.0, TAU, 24, stroke_color, maxf(1.0, stroke_width * scale_value), true)
    draw_arc(_p(origin, scale_value, 12, 27), 9.0 * scale_value, PI, TAU, 20, stroke_color, maxf(1.0, stroke_width * scale_value), true)
    _line(origin, scale_value, Vector2(20, 18), Vector2(23, 21))
    _line(origin, scale_value, Vector2(23, 21), Vector2(29, 14))

func _draw_play(origin: Vector2, scale_value: float) -> void:
    _line(origin, scale_value, Vector2(11, 7), Vector2(24, 16))
    _line(origin, scale_value, Vector2(24, 16), Vector2(11, 25))
    _line(origin, scale_value, Vector2(11, 25), Vector2(11, 7))

func _draw_check(origin: Vector2, scale_value: float) -> void:
    draw_arc(_p(origin, scale_value, 16, 16), 10.0 * scale_value, 0.0, TAU, 28, stroke_color, maxf(1.0, stroke_width * scale_value), true)
    _line(origin, scale_value, Vector2(10, 16), Vector2(14, 20))
    _line(origin, scale_value, Vector2(14, 20), Vector2(23, 11))

func _draw_alert(origin: Vector2, scale_value: float) -> void:
    _line(origin, scale_value, Vector2(16, 5), Vector2(28, 26))
    _line(origin, scale_value, Vector2(28, 26), Vector2(4, 26))
    _line(origin, scale_value, Vector2(4, 26), Vector2(16, 5))
    _line(origin, scale_value, Vector2(16, 11), Vector2(16, 19))
    draw_circle(_p(origin, scale_value, 16, 23), 1.2 * scale_value, stroke_color)

func _draw_gift(origin: Vector2, scale_value: float) -> void:
    draw_rect(Rect2(_p(origin, scale_value, 6, 13), Vector2(20, 13) * scale_value), stroke_color, false, maxf(1.0, stroke_width * scale_value), true)
    draw_rect(Rect2(_p(origin, scale_value, 5, 10), Vector2(22, 5) * scale_value), stroke_color, false, maxf(1.0, stroke_width * scale_value), true)
    _line(origin, scale_value, Vector2(16, 10), Vector2(16, 26))
    draw_arc(_p(origin, scale_value, 12, 8), 4.0 * scale_value, 0.1, PI * 1.65, 16, stroke_color, maxf(1.0, stroke_width * scale_value), true)
    draw_arc(_p(origin, scale_value, 20, 8), 4.0 * scale_value, PI * 1.35, PI * 2.9, 16, stroke_color, maxf(1.0, stroke_width * scale_value), true)
