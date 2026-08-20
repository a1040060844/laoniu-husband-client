extends Control

var icon_key: String = "gift":
    set(value):
        icon_key = value
        queue_redraw()

var stroke_color: Color = Color("fff2d4"):
    set(value):
        stroke_color = value
        queue_redraw()

var stroke_width: float = 1.8

func _ready() -> void:
    mouse_filter = Control.MOUSE_FILTER_IGNORE
    queue_redraw()

func _draw() -> void:
    var extent: float = minf(size.x, size.y)
    if extent <= 0.0:
        return
    var scale_value: float = extent / 26.0
    var origin: Vector2 = (size - Vector2(extent, extent)) * 0.5
    var width: float = maxf(1.0, stroke_width * scale_value)

    match icon_key:
        "shopping-bag":
            _draw_shopping_bag(origin, scale_value, width)
        "coffee":
            _draw_coffee(origin, scale_value, width)
        "utensils":
            _draw_utensils(origin, scale_value, width)
        "hand-heart":
            _draw_hand_heart(origin, scale_value, width)
        "gamepad-2":
            _draw_gamepad(origin, scale_value, width)
        "heart":
            _draw_heart(origin, scale_value, width)
        "sparkles":
            _draw_sparkles(origin, scale_value, width)
        "coins":
            _draw_coins(origin, scale_value, width)
        "scale":
            _draw_scale(origin, scale_value, width)
        "mask":
            _draw_mask(origin, scale_value, width)
        "badge-plus":
            _draw_badge_plus(origin, scale_value, width)
        "clipboard-check":
            _draw_clipboard(origin, scale_value, width)
        "settings":
            _draw_settings(origin, scale_value, width)
        _:
            _draw_gift(origin, scale_value, width)

func _point(x: float, y: float, origin: Vector2, scale_value: float) -> Vector2:
    return origin + Vector2(x, y) * scale_value

func _line(points: Array[Vector2], width: float) -> void:
    if points.size() < 2:
        return
    draw_polyline(PackedVector2Array(points), stroke_color, width, true)

func _draw_shopping_bag(origin: Vector2, s: float, width: float) -> void:
    draw_rect(Rect2(_point(5.0, 8.0, origin, s), Vector2(16.0, 14.0) * s), stroke_color, false, width)
    draw_arc(_point(13.0, 9.0, origin, s), 4.0 * s, PI, TAU, 18, stroke_color, width, true)

func _draw_coffee(origin: Vector2, s: float, width: float) -> void:
    _line([_point(5.0, 9.0, origin, s), _point(6.0, 19.0, origin, s), _point(17.0, 19.0, origin, s), _point(18.0, 9.0, origin, s)], width)
    draw_arc(_point(18.0, 13.5, origin, s), 4.0 * s, -PI * 0.5, PI * 0.5, 16, stroke_color, width, true)
    _line([_point(4.0, 22.0, origin, s), _point(20.0, 22.0, origin, s)], width)
    _line([_point(9.0, 6.0, origin, s), _point(9.5, 3.0, origin, s)], width)
    _line([_point(14.0, 6.0, origin, s), _point(14.5, 3.0, origin, s)], width)

func _draw_utensils(origin: Vector2, s: float, width: float) -> void:
    _line([_point(7.0, 3.0, origin, s), _point(7.0, 22.0, origin, s)], width)
    for x: float in [4.0, 7.0, 10.0]:
        _line([_point(x, 3.0, origin, s), _point(x, 9.0, origin, s)], width)
    _line([_point(4.0, 9.0, origin, s), _point(10.0, 9.0, origin, s)], width)
    _line([_point(18.0, 3.0, origin, s), _point(16.0, 11.0, origin, s), _point(19.0, 11.0, origin, s), _point(19.0, 22.0, origin, s)], width)

func _draw_hand_heart(origin: Vector2, s: float, width: float) -> void:
    _draw_heart_at(_point(15.5, 8.5, origin, s), 0.62 * s, width)
    _line([_point(3.5, 17.0, origin, s), _point(8.0, 17.0, origin, s), _point(11.0, 19.0, origin, s), _point(17.0, 19.0, origin, s), _point(22.0, 15.0, origin, s)], width)
    _line([_point(8.0, 17.0, origin, s), _point(10.5, 13.5, origin, s), _point(14.0, 13.5, origin, s)], width)

func _draw_gamepad(origin: Vector2, s: float, width: float) -> void:
    var points: Array[Vector2] = [
        _point(6.0, 9.0, origin, s), _point(9.0, 6.0, origin, s), _point(17.0, 6.0, origin, s),
        _point(20.0, 9.0, origin, s), _point(22.0, 17.0, origin, s), _point(19.0, 20.0, origin, s),
        _point(15.5, 17.0, origin, s), _point(10.5, 17.0, origin, s), _point(7.0, 20.0, origin, s),
        _point(4.0, 17.0, origin, s), _point(6.0, 9.0, origin, s)
    ]
    _line(points, width)
    _line([_point(8.0, 12.5, origin, s), _point(12.0, 12.5, origin, s)], width)
    _line([_point(10.0, 10.5, origin, s), _point(10.0, 14.5, origin, s)], width)
    draw_circle(_point(17.0, 11.5, origin, s), 1.0 * s, stroke_color, false, width, true)
    draw_circle(_point(19.0, 14.0, origin, s), 1.0 * s, stroke_color, false, width, true)

func _draw_heart(origin: Vector2, s: float, width: float) -> void:
    _draw_heart_at(_point(13.0, 12.5, origin, s), s, width)

func _draw_heart_at(center: Vector2, s: float, width: float) -> void:
    var points: Array[Vector2] = [
        center + Vector2(0.0, 7.0) * s,
        center + Vector2(-7.0, 0.0) * s,
        center + Vector2(-6.0, -4.0) * s,
        center + Vector2(-2.5, -5.0) * s,
        center,
        center + Vector2(2.5, -5.0) * s,
        center + Vector2(6.0, -4.0) * s,
        center + Vector2(7.0, 0.0) * s,
        center + Vector2(0.0, 7.0) * s,
    ]
    _line(points, width)

func _draw_sparkles(origin: Vector2, s: float, width: float) -> void:
    _draw_star(_point(10.0, 10.0, origin, s), 6.0 * s, width)
    _draw_star(_point(19.0, 17.0, origin, s), 3.5 * s, width)
    _draw_star(_point(19.5, 5.5, origin, s), 2.0 * s, width)

func _draw_star(center: Vector2, radius: float, width: float) -> void:
    _line([center + Vector2(0.0, -radius), center, center + Vector2(0.0, radius)], width)
    _line([center + Vector2(-radius, 0.0), center, center + Vector2(radius, 0.0)], width)

func _draw_coins(origin: Vector2, s: float, width: float) -> void:
    draw_arc(_point(10.0, 8.0, origin, s), 5.0 * s, 0.0, TAU, 24, stroke_color, width, true)
    draw_arc(_point(16.0, 16.0, origin, s), 5.0 * s, 0.0, TAU, 24, stroke_color, width, true)
    _line([_point(5.0, 8.0, origin, s), _point(5.0, 14.0, origin, s)], width)
    _line([_point(11.0, 11.0, origin, s), _point(11.0, 18.0, origin, s)], width)

func _draw_scale(origin: Vector2, s: float, width: float) -> void:
    _line([_point(13.0, 4.0, origin, s), _point(13.0, 21.0, origin, s)], width)
    _line([_point(6.0, 7.0, origin, s), _point(20.0, 7.0, origin, s)], width)
    _line([_point(8.0, 7.0, origin, s), _point(5.0, 13.0, origin, s), _point(11.0, 13.0, origin, s), _point(8.0, 7.0, origin, s)], width)
    _line([_point(18.0, 7.0, origin, s), _point(15.0, 13.0, origin, s), _point(21.0, 13.0, origin, s), _point(18.0, 7.0, origin, s)], width)
    _line([_point(8.0, 21.0, origin, s), _point(18.0, 21.0, origin, s)], width)

func _draw_mask(origin: Vector2, s: float, width: float) -> void:
    var points: Array[Vector2] = [
        _point(5.0, 7.0, origin, s), _point(13.0, 5.0, origin, s), _point(21.0, 7.0, origin, s),
        _point(20.0, 15.0, origin, s), _point(16.0, 20.0, origin, s), _point(13.0, 21.0, origin, s),
        _point(10.0, 20.0, origin, s), _point(6.0, 15.0, origin, s), _point(5.0, 7.0, origin, s)
    ]
    _line(points, width)
    _line([_point(8.0, 11.0, origin, s), _point(11.0, 12.0, origin, s)], width)
    _line([_point(15.0, 12.0, origin, s), _point(18.0, 11.0, origin, s)], width)

func _draw_gift(origin: Vector2, s: float, width: float) -> void:
    draw_rect(Rect2(_point(5.0, 10.0, origin, s), Vector2(16.0, 11.0) * s), stroke_color, false, width)
    draw_rect(Rect2(_point(4.0, 7.0, origin, s), Vector2(18.0, 4.0) * s), stroke_color, false, width)
    _line([_point(13.0, 7.0, origin, s), _point(13.0, 21.0, origin, s)], width)
    draw_arc(_point(10.0, 6.0, origin, s), 3.0 * s, -PI * 0.15, PI * 0.85, 14, stroke_color, width, true)
    draw_arc(_point(16.0, 6.0, origin, s), 3.0 * s, PI * 0.15, PI * 1.15, 14, stroke_color, width, true)

func _draw_badge_plus(origin: Vector2, s: float, width: float) -> void:
    draw_arc(_point(13.0, 11.5, origin, s), 7.0 * s, 0.0, TAU, 24, stroke_color, width, true)
    _line([_point(13.0, 7.5, origin, s), _point(13.0, 15.5, origin, s)], width)
    _line([_point(9.0, 11.5, origin, s), _point(17.0, 11.5, origin, s)], width)
    _line([_point(9.0, 18.0, origin, s), _point(8.0, 23.0, origin, s), _point(13.0, 20.0, origin, s), _point(18.0, 23.0, origin, s), _point(17.0, 18.0, origin, s)], width)

func _draw_clipboard(origin: Vector2, s: float, width: float) -> void:
    draw_rect(Rect2(_point(6.0, 5.0, origin, s), Vector2(14.0, 17.0) * s), stroke_color, false, width)
    draw_rect(Rect2(_point(10.0, 3.0, origin, s), Vector2(6.0, 4.0) * s), stroke_color, false, width)
    _line([_point(9.0, 14.0, origin, s), _point(12.0, 17.0, origin, s), _point(17.0, 11.0, origin, s)], width)

func _draw_settings(origin: Vector2, s: float, width: float) -> void:
    draw_arc(_point(13.0, 13.0, origin, s), 5.0 * s, 0.0, TAU, 24, stroke_color, width, true)
    draw_circle(_point(13.0, 13.0, origin, s), 1.8 * s, stroke_color, false, width, true)
    for angle_index: int in range(8):
        var angle: float = float(angle_index) * TAU / 8.0
        var inner: Vector2 = _point(13.0, 13.0, origin, s) + Vector2(cos(angle), sin(angle)) * 6.2 * s
        var outer: Vector2 = _point(13.0, 13.0, origin, s) + Vector2(cos(angle), sin(angle)) * 9.0 * s
        draw_line(inner, outer, stroke_color, width, true)
