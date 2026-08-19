extends Node

var _button: Button
var _elapsed: float = 0.0

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt: int in range(60):
        if LoginVisualOverlay._root != null:
            break
        await get_tree().process_frame

    if LoginVisualOverlay._root == null:
        return

    _button = Button.new()
    _button.text = "复位"
    _button.tooltip_text = "恢复人物默认位置"
    _button.focus_mode = Control.FOCUS_NONE
    _button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
    _button.z_index = 145
    _button.add_theme_font_size_override("font_size", 12)
    _button.add_theme_color_override("font_color", Color("f1ddb5"))
    _button.add_theme_color_override("font_hover_color", Color("fff1cf"))
    _button.add_theme_color_override("font_pressed_color", Color("e1bf7d"))
    _button.add_theme_stylebox_override("normal", _style(Color(0.035, 0.026, 0.018, 0.82), Color(0.82, 0.67, 0.39, 0.55)))
    _button.add_theme_stylebox_override("hover", _style(Color(0.07, 0.05, 0.025, 0.92), Color(0.92, 0.78, 0.52, 0.78)))
    _button.add_theme_stylebox_override("pressed", _style(Color(0.02, 0.015, 0.01, 0.94), Color(0.90, 0.72, 0.42, 0.90)))
    _button.pressed.connect(_reset_login)
    LoginVisualOverlay._root.add_child(_button)

    get_viewport().size_changed.connect(_layout)
    _layout()

func _style(background: Color, border: Color) -> StyleBoxFlat:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = background
    style.border_color = border
    style.set_border_width_all(1)
    style.corner_radius_top_left = 4
    style.corner_radius_top_right = 4
    style.corner_radius_bottom_left = 4
    style.corner_radius_bottom_right = 4
    style.content_margin_left = 8.0
    style.content_margin_right = 8.0
    style.content_margin_top = 4.0
    style.content_margin_bottom = 4.0
    return style

func _process(delta: float) -> void:
    if _button == null or LoginVisualOverlay._root == null:
        return
    if not LoginVisualOverlay._root.visible:
        return

    _elapsed += delta
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    var base_position: Vector2 = Vector2(viewport_size.x - 82.0, 170.0)
    _button.position = base_position + Vector2(0.0, sin((_elapsed - 0.65) * TAU / 3.4) * 4.0)

func _layout() -> void:
    if _button == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    _button.position = Vector2(viewport_size.x - 82.0, 170.0)
    _button.size = Vector2(60.0, 32.0)

func _reset_login() -> void:
    if LoginAnimationOverlay.has_method("_reset_login"):
        LoginAnimationOverlay.call("_reset_login")
        print("Login reset control: reset requested")
        return

    LoginVisualOverlay._drag_id = ""
    LoginVisualOverlay._sprite_anchor_pct["husband"] = Vector2(0.38, 0.65)
    LoginVisualOverlay._sprite_anchor_pct["wife"] = Vector2(0.59, 0.65)
    LoginVisualOverlay._sprite_anchor_pct["cat-blue"] = Vector2(0.51, 0.74)
    LoginVisualOverlay._sprite_anchor_pct["cat-white"] = Vector2(0.63, 0.76)
    LoginVisualOverlay._layout()
