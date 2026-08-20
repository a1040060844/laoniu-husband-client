extends Node

const DEBUG_SIZE_ARG_PREFIX: String = "--debug-window-size="
const DEBUG_SIZES: Array[Vector2i] = [
    Vector2i(314, 706),
    Vector2i(376, 806),
    Vector2i(390, 844),
]

var _cycle_index: int = 2

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    if not OS.is_debug_build():
        return
    call_deferred("_apply_requested_size")

func _input(event: InputEvent) -> void:
    if not OS.is_debug_build():
        return
    if event is InputEventKey:
        var key_event: InputEventKey = event as InputEventKey
        if not key_event.pressed or key_event.echo:
            return
        if key_event.keycode == KEY_F6 or key_event.physical_keycode == KEY_F6:
            _cycle_debug_size()
            get_viewport().set_input_as_handled()

func _apply_requested_size() -> void:
    await get_tree().process_frame
    await get_tree().process_frame

    var requested: Vector2i = _requested_size_from_args()
    if requested == Vector2i.ZERO:
        _print_runtime_size("no-override")
        return

    _set_window_size(requested, "cmdline")

func _requested_size_from_args() -> Vector2i:
    var args: PackedStringArray = OS.get_cmdline_user_args()
    for arg: String in args:
        if not arg.begins_with(DEBUG_SIZE_ARG_PREFIX):
            continue
        var raw: String = arg.trim_prefix(DEBUG_SIZE_ARG_PREFIX).strip_edges().to_lower()
        var parts: PackedStringArray = raw.split("x", false, 1)
        if parts.size() != 2:
            print("Debug window size ignored: invalid argument %s" % arg)
            return Vector2i.ZERO
        if not parts[0].is_valid_int() or not parts[1].is_valid_int():
            print("Debug window size ignored: invalid argument %s" % arg)
            return Vector2i.ZERO
        var width: int = parts[0].to_int()
        var height: int = parts[1].to_int()
        if width < 240 or height < 480:
            print("Debug window size ignored: too small %sx%s" % [width, height])
            return Vector2i.ZERO
        return Vector2i(width, height)
    return Vector2i.ZERO

func _cycle_debug_size() -> void:
    var current: Vector2i = DisplayServer.window_get_size()
    var nearest_index: int = _nearest_size_index(current)
    _cycle_index = (nearest_index + 1) % DEBUG_SIZES.size()
    _set_window_size(DEBUG_SIZES[_cycle_index], "F6")

func _nearest_size_index(current: Vector2i) -> int:
    var best_index: int = 0
    var best_distance: float = INF
    for index: int in range(DEBUG_SIZES.size()):
        var candidate: Vector2i = DEBUG_SIZES[index]
        var dx: float = float(candidate.x - current.x)
        var dy: float = float(candidate.y - current.y)
        var distance: float = dx * dx + dy * dy
        if distance < best_distance:
            best_distance = distance
            best_index = index
    return best_index

func _set_window_size(target: Vector2i, reason: String) -> void:
    DisplayServer.window_set_size(target)
    await get_tree().process_frame
    _center_window_if_possible()
    await get_tree().process_frame
    _print_runtime_size(reason)

func _center_window_if_possible() -> void:
    var screen: int = DisplayServer.window_get_current_screen()
    var screen_size: Vector2i = DisplayServer.screen_get_size(screen)
    var window_size: Vector2i = DisplayServer.window_get_size()
    if screen_size.x <= 0 or screen_size.y <= 0:
        return
    var position: Vector2i = Vector2i(
        maxi(0, int((screen_size.x - window_size.x) / 2)),
        maxi(0, int((screen_size.y - window_size.y) / 2))
    )
    DisplayServer.window_set_position(position)

func _print_runtime_size(reason: String) -> void:
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    var window_size: Vector2i = DisplayServer.window_get_size()
    var root_window: Window = get_window()
    var root_size: Vector2i = root_window.size if root_window != null else Vector2i.ZERO
    print("Debug window size [%s]: viewport=%s window=%s root=%s" % [
        reason,
        str(viewport_size),
        str(window_size),
        str(root_size),
    ])
