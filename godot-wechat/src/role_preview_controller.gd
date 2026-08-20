extends Node

const PAGE_ROLE: int = 1
const SWIPE_THRESHOLD: float = 54.0
const DIRECTION_RATIO: float = 1.15

var _canvas: CanvasLayer
var _root: Control
var _prev_button: Button
var _next_button: Button
var _preview_level: int = -1
var _current_level: int = -1
var _tracking: bool = false
var _gesture_consumed: bool = false
var _start_position: Vector2 = Vector2.ZERO
var _was_role_active: bool = false

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt: int in range(120):
        if RoleVisualOverlay._root != null:
            break
        await get_tree().process_frame

    if RoleVisualOverlay._root == null:
        return

    _build_controls()
    get_viewport().size_changed.connect(_layout)
    GameState.changed.connect(_on_state_changed)
    _sync_from_state(true)
    _layout()

func _build_controls() -> void:
    _canvas = CanvasLayer.new()
    _canvas.layer = 79
    add_child(_canvas)

    _root = Control.new()
    _root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _root.visible = false
    _canvas.add_child(_root)

    _prev_button = _make_nav_button("‹", "上一职务")
    _prev_button.pressed.connect(_preview_prev)
    _root.add_child(_prev_button)

    _next_button = _make_nav_button("›", "下一职务")
    _next_button.pressed.connect(_preview_next)
    _root.add_child(_next_button)

func _make_nav_button(text_value: String, tooltip: String) -> Button:
    var button: Button = Button.new()
    button.text = text_value
    button.tooltip_text = tooltip
    button.focus_mode = Control.FOCUS_NONE
    button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
    button.add_theme_font_size_override("font_size", 28)
    button.add_theme_color_override("font_color", Color("f3eadb"))
    button.add_theme_color_override("font_hover_color", Color("fff0c7"))
    button.add_theme_color_override("font_pressed_color", Color("e7c78d"))
    button.add_theme_color_override("font_disabled_color", Color(0.953, 0.918, 0.859, 0.28))
    return button

func _process(_delta: float) -> void:
    if _root == null:
        return

    var role_active: bool = _is_role_page_active()
    _root.visible = role_active

    if _was_role_active and not role_active:
        _tracking = false
        _gesture_consumed = false
        _reset_to_current()
    _was_role_active = role_active

func _input(event: InputEvent) -> void:
    if not _is_role_page_active():
        _tracking = false
        _gesture_consumed = false
        return

    if event is InputEventScreenTouch:
        var touch: InputEventScreenTouch = event as InputEventScreenTouch
        if touch.pressed:
            _begin_gesture(touch.position)
        else:
            if _tracking and not _gesture_consumed:
                _consider_gesture(touch.position)
            _tracking = false
            _gesture_consumed = false
        return

    if event is InputEventScreenDrag:
        var drag: InputEventScreenDrag = event as InputEventScreenDrag
        if _tracking and not _gesture_consumed:
            _consider_gesture(drag.position)
        return

    if event is InputEventMouseButton:
        var mouse_button: InputEventMouseButton = event as InputEventMouseButton
        if mouse_button.button_index != MOUSE_BUTTON_LEFT:
            return
        if mouse_button.pressed:
            _begin_gesture(mouse_button.position)
        else:
            if _tracking and not _gesture_consumed:
                _consider_gesture(mouse_button.position)
            _tracking = false
            _gesture_consumed = false
        return

    if event is InputEventMouseMotion and _tracking and not _gesture_consumed and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        var motion: InputEventMouseMotion = event as InputEventMouseMotion
        _consider_gesture(motion.position)

func _begin_gesture(position: Vector2) -> void:
    _tracking = true
    _gesture_consumed = false
    _start_position = position

func _consider_gesture(position: Vector2) -> void:
    var delta: Vector2 = position - _start_position
    if absf(delta.x) < SWIPE_THRESHOLD:
        return
    if absf(delta.x) < absf(delta.y) * DIRECTION_RATIO:
        return

    _gesture_consumed = true
    _tracking = false
    _cancel_main_vertical_gesture()

    if delta.x < 0.0:
        _preview_next()
    else:
        _preview_prev()

    get_viewport().set_input_as_handled()

func _preview_prev() -> void:
    _navigate_to(_preview_level - 1, "prev")

func _preview_next() -> void:
    _navigate_to(_preview_level + 1, "next")

func _navigate_to(level: int, direction: String) -> void:
    var max_level: int = RoleVisualOverlay.get_max_role_level()
    var target: int = clampi(level, 0, max_level)
    if target == _preview_level:
        return

    _preview_level = target
    RoleVisualOverlay.show_preview_level(target, direction)
    _update_buttons()
    print("Role preview: Lv.%02d direction=%s locked=%s" % [
        target,
        direction,
        str(target > _current_level),
    ])

func _on_state_changed(_state: Dictionary) -> void:
    _sync_from_state(false)

func _sync_from_state(force: bool) -> void:
    var progress: Dictionary = GameState.get_progress()
    var level: int = int(progress.get("level", 0))
    if force or level != _current_level:
        _current_level = level
        _preview_level = level
        if RoleVisualOverlay._root != null:
            RoleVisualOverlay.reset_preview()
    elif _preview_level < 0:
        _preview_level = level
    _update_buttons()

func _reset_to_current() -> void:
    if _current_level < 0:
        _sync_from_state(true)
        return
    if _preview_level == _current_level and not RoleVisualOverlay.is_previewing():
        return
    _preview_level = _current_level
    RoleVisualOverlay.reset_preview()
    _update_buttons()

func _update_buttons() -> void:
    if _prev_button == null or _next_button == null:
        return

    var max_level: int = RoleVisualOverlay.get_max_role_level()
    _prev_button.disabled = _preview_level <= 0
    _next_button.disabled = _preview_level >= max_level

    var locked: bool = _preview_level > _current_level
    _apply_nav_style(_prev_button, locked)
    _apply_nav_style(_next_button, locked)
    _prev_button.modulate = Color(1.0, 1.0, 1.0, 0.18) if _prev_button.disabled else Color.WHITE
    _next_button.modulate = Color(1.0, 1.0, 1.0, 0.18) if _next_button.disabled else Color.WHITE

func _apply_nav_style(button: Button, locked: bool) -> void:
    var normal: StyleBoxFlat = _nav_style(
        Color(0.020, 0.016, 0.012, 0.26 if locked else 0.42),
        Color(0.906, 0.780, 0.553, 0.26 if locked else 0.48)
    )
    var hover: StyleBoxFlat = _nav_style(
        Color(0.055, 0.040, 0.024, 0.48),
        Color(0.969, 0.875, 0.675, 0.72)
    )
    var pressed: StyleBoxFlat = _nav_style(
        Color(0.015, 0.012, 0.009, 0.62),
        Color(0.906, 0.780, 0.553, 0.82)
    )
    var disabled: StyleBoxFlat = _nav_style(
        Color(0.020, 0.016, 0.012, 0.12),
        Color(0.906, 0.780, 0.553, 0.16)
    )
    button.add_theme_stylebox_override("normal", normal)
    button.add_theme_stylebox_override("hover", hover)
    button.add_theme_stylebox_override("pressed", pressed)
    button.add_theme_stylebox_override("disabled", disabled)

func _nav_style(background: Color, border: Color) -> StyleBoxFlat:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = background
    style.border_color = border
    style.set_border_width_all(1)
    style.corner_radius_top_left = 23
    style.corner_radius_top_right = 23
    style.corner_radius_bottom_left = 23
    style.corner_radius_bottom_right = 23
    return style

func _layout() -> void:
    if _root == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    _root.position = Vector2.ZERO
    _root.size = viewport_size

    var compact: bool = viewport_size.y <= 780.0 or viewport_size.x <= 380.0
    var button_size: float = 42.0 if compact else 46.0
    var center_y: float = viewport_size.y * (0.51 if compact else 0.49)
    _prev_button.position = Vector2(18.0, center_y - button_size * 0.5)
    _prev_button.size = Vector2(button_size, button_size)
    _next_button.position = Vector2(viewport_size.x - 18.0 - button_size, center_y - button_size * 0.5)
    _next_button.size = Vector2(button_size, button_size)

func _is_role_page_active() -> bool:
    var scene: Node = get_tree().current_scene
    if scene == null:
        return false

    var husband_view_value: Variant = scene.get("husband_view")
    if not husband_view_value is Control:
        return false
    var husband_view: Control = husband_view_value as Control
    if not husband_view.visible:
        return false

    return int(scene.get("current_page")) == PAGE_ROLE

func _cancel_main_vertical_gesture() -> void:
    var scene: Node = get_tree().current_scene
    if scene != null:
        scene.set("touch_tracking", false)
