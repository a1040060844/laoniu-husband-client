extends Node

const PAGE_ROLE: int = 1
const PAGE_TASK: int = 2
const SWIPE_THRESHOLD: float = 44.0
const HORIZONTAL_RATIO_LIMIT: float = 1.15
const SCROLL_TOP_TOLERANCE: int = 8

var _tracking: bool = false
var _started_at_top: bool = false
var _start_position: Vector2 = Vector2.ZERO

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS

func _input(event: InputEvent) -> void:
    if not _is_task_page_active():
        _tracking = false
        return

    if event is InputEventScreenTouch:
        var touch: InputEventScreenTouch = event as InputEventScreenTouch
        if touch.pressed:
            _begin_gesture(touch.position)
        else:
            if _tracking:
                _consider_position(touch.position)
            _tracking = false
        return

    if event is InputEventScreenDrag:
        var drag: InputEventScreenDrag = event as InputEventScreenDrag
        if _tracking:
            _consider_position(drag.position)
        return

    if event is InputEventMouseButton:
        var mouse_button: InputEventMouseButton = event as InputEventMouseButton
        if mouse_button.button_index != MOUSE_BUTTON_LEFT:
            return
        if mouse_button.pressed:
            _begin_gesture(mouse_button.position)
        else:
            if _tracking:
                _consider_position(mouse_button.position)
            _tracking = false
        return

    if event is InputEventMouseMotion and _tracking and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        var motion: InputEventMouseMotion = event as InputEventMouseMotion
        _consider_position(motion.position)

func _begin_gesture(position: Vector2) -> void:
    _tracking = true
    _start_position = position
    _started_at_top = _task_scroll_is_at_top()

func _consider_position(position: Vector2) -> void:
    if not _tracking or not _started_at_top:
        return

    var delta: Vector2 = position - _start_position
    if delta.y < SWIPE_THRESHOLD:
        return
    if absf(delta.x) > absf(delta.y) * HORIZONTAL_RATIO_LIMIT:
        return

    _tracking = false
    _return_to_role()

func _return_to_role() -> void:
    var scene: Node = get_tree().current_scene
    if scene == null:
        return
    if scene.has_method("_set_page"):
        scene.call("_set_page", PAGE_ROLE)
        get_viewport().set_input_as_handled()
        print("Task return gesture: returned to role page")

func _is_task_page_active() -> bool:
    var scene: Node = get_tree().current_scene
    if scene == null:
        return false

    var husband_view_value: Variant = scene.get("husband_view")
    if not husband_view_value is Control:
        return false
    var husband_view: Control = husband_view_value as Control
    if not husband_view.visible:
        return false

    return int(scene.get("current_page")) == PAGE_TASK

func _task_scroll_is_at_top() -> bool:
    var task_overlay: Node = get_node_or_null("/root/TaskVisualOverlay")
    if task_overlay == null:
        return true

    var scroll_value: Variant = task_overlay.get("_scroll")
    if scroll_value is ScrollContainer:
        var task_scroll: ScrollContainer = scroll_value as ScrollContainer
        return task_scroll.scroll_vertical <= SCROLL_TOP_TOLERANCE

    return true
