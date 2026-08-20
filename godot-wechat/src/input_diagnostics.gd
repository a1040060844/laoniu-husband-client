extends Node

var _sequence: int = 0
var _unhandled_seen: Dictionary = {}
var _last_geometry_signature: String = ""

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    if not OS.is_debug_build():
        return

    var viewport: Viewport = get_viewport()
    if not viewport.size_changed.is_connected(_on_viewport_size_changed):
        viewport.size_changed.connect(_on_viewport_size_changed)

    call_deferred("_print_geometry", "ready")

func _input(event: InputEvent) -> void:
    if not OS.is_debug_build() or not _should_log_event(event):
        return

    _sequence += 1
    var sequence: int = _sequence
    var event_id: int = event.get_instance_id()
    _unhandled_seen[event_id] = false

    print("InputDiag input #%s %s | %s" % [
        sequence,
        _event_description(event),
        _runtime_geometry(),
    ])

    call_deferred("_report_event_route", event_id, sequence)

func _unhandled_input(event: InputEvent) -> void:
    if not OS.is_debug_build() or not _should_log_event(event):
        return

    var event_id: int = event.get_instance_id()
    _unhandled_seen[event_id] = true
    print("InputDiag unhandled %s | %s" % [
        _event_description(event),
        _gui_context(),
    ])

func _should_log_event(event: InputEvent) -> bool:
    if event is InputEventKey:
        var key_event: InputEventKey = event as InputEventKey
        return key_event.keycode == KEY_F8 or key_event.physical_keycode == KEY_F8

    if event is InputEventMouseButton:
        var mouse_button: InputEventMouseButton = event as InputEventMouseButton
        return mouse_button.button_index == MOUSE_BUTTON_LEFT

    if event is InputEventMouseMotion:
        return Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT)

    if event is InputEventScreenTouch or event is InputEventScreenDrag:
        return true

    return false

func _event_description(event: InputEvent) -> String:
    if event is InputEventKey:
        var key_event: InputEventKey = event as InputEventKey
        return "Key F8 pressed=%s echo=%s keycode=%s physical=%s" % [
            str(key_event.pressed),
            str(key_event.echo),
            key_event.keycode,
            key_event.physical_keycode,
        ]

    if event is InputEventMouseButton:
        var mouse_button: InputEventMouseButton = event as InputEventMouseButton
        return "MouseButton pressed=%s pos=%s global=%s factor=%.3f" % [
            str(mouse_button.pressed),
            str(mouse_button.position),
            str(mouse_button.global_position),
            mouse_button.factor,
        ]

    if event is InputEventMouseMotion:
        var motion: InputEventMouseMotion = event as InputEventMouseMotion
        return "MouseMotion pos=%s global=%s rel=%s velocity=%s" % [
            str(motion.position),
            str(motion.global_position),
            str(motion.relative),
            str(motion.velocity),
        ]

    if event is InputEventScreenTouch:
        var touch: InputEventScreenTouch = event as InputEventScreenTouch
        return "ScreenTouch pressed=%s index=%s pos=%s" % [
            str(touch.pressed),
            touch.index,
            str(touch.position),
        ]

    if event is InputEventScreenDrag:
        var drag: InputEventScreenDrag = event as InputEventScreenDrag
        return "ScreenDrag index=%s pos=%s rel=%s velocity=%s" % [
            drag.index,
            str(drag.position),
            str(drag.relative),
            str(drag.velocity),
        ]

    return event.get_class()

func _report_event_route(event_id: int, sequence: int) -> void:
    if not _unhandled_seen.has(event_id):
        return

    var reached_unhandled: bool = bool(_unhandled_seen[event_id])
    _unhandled_seen.erase(event_id)
    print("InputDiag route #%s unhandled=%s | %s" % [
        sequence,
        str(reached_unhandled),
        _gui_context(),
    ])

func _on_viewport_size_changed() -> void:
    call_deferred("_print_geometry", "size_changed")

func _print_geometry(reason: String) -> void:
    if not OS.is_debug_build():
        return

    var signature: String = _runtime_geometry()
    if reason == "size_changed" and signature == _last_geometry_signature:
        return
    _last_geometry_signature = signature
    print("InputDiag geometry [%s] %s" % [reason, signature])

func _runtime_geometry() -> String:
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    var window_size: Vector2i = DisplayServer.window_get_size()
    var window_position: Vector2i = DisplayServer.window_get_position()
    var window_mode: int = DisplayServer.window_get_mode()
    var root_window: Window = get_window()
    var root_size: Vector2i = root_window.size if root_window != null else Vector2i.ZERO

    var scale_x: float = 0.0
    var scale_y: float = 0.0
    if viewport_size.x > 0.0:
        scale_x = float(window_size.x) / viewport_size.x
    if viewport_size.y > 0.0:
        scale_y = float(window_size.y) / viewport_size.y

    var content_scale_size: Variant = root_window.get("content_scale_size") if root_window != null else null
    var content_scale_factor: Variant = root_window.get("content_scale_factor") if root_window != null else null
    var content_scale_mode: Variant = root_window.get("content_scale_mode") if root_window != null else null
    var content_scale_aspect: Variant = root_window.get("content_scale_aspect") if root_window != null else null

    return "viewport=%s window=%s root=%s pos=%s mode=%s ratio=(%.3f,%.3f) content_size=%s factor=%s scale_mode=%s aspect=%s" % [
        str(viewport_size),
        str(window_size),
        str(root_size),
        str(window_position),
        window_mode,
        scale_x,
        scale_y,
        str(content_scale_size),
        str(content_scale_factor),
        str(content_scale_mode),
        str(content_scale_aspect),
    ]

func _gui_context() -> String:
    var viewport: Viewport = get_viewport()
    var hovered_text: String = "none"
    var focus_text: String = "none"

    if viewport.has_method("gui_get_hovered_control"):
        var hovered_value: Variant = viewport.call("gui_get_hovered_control")
        if hovered_value is Control:
            var hovered: Control = hovered_value as Control
            hovered_text = "%s:%s filter=%s visible=%s" % [
                hovered.get_class(),
                hovered.name,
                hovered.mouse_filter,
                str(hovered.visible),
            ]

    if viewport.has_method("gui_get_focus_owner"):
        var focus_value: Variant = viewport.call("gui_get_focus_owner")
        if focus_value is Control:
            var focus_owner: Control = focus_value as Control
            focus_text = "%s:%s" % [focus_owner.get_class(), focus_owner.name]

    return "hovered=%s focus=%s" % [hovered_text, focus_text]
