extends Node

const PAGE_BENEFIT: int = 0
const PAGE_ROLE: int = 1
const BASE_VIEWPORT_HEIGHT: float = 844.0
const BASE_THRESHOLD: float = 44.0
const DIRECTION_RATIO: float = 1.12

var _tracking: bool = false
var _consumed: bool = false
var _start_position: Vector2 = Vector2.ZERO

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS

func _input(event: InputEvent) -> void:
    if not _is_benefit_page_active():
        _tracking = false
        _consumed = false
        return

    if _benefit_modal_is_open():
        _tracking = false
        _consumed = false
        return

    if event is InputEventScreenTouch:
        var touch: InputEventScreenTouch = event as InputEventScreenTouch
        if touch.pressed:
            _begin(touch.position)
        else:
            if _tracking and not _consumed:
                _consider(touch.position)
            _tracking = false
            _consumed = false
        return

    if event is InputEventScreenDrag:
        var drag: InputEventScreenDrag = event as InputEventScreenDrag
        if _tracking and not _consumed:
            _consider(drag.position)
        return

    if event is InputEventMouseButton:
        var mouse_button: InputEventMouseButton = event as InputEventMouseButton
        if mouse_button.button_index != MOUSE_BUTTON_LEFT:
            return
        if mouse_button.pressed:
            _begin(mouse_button.position)
        else:
            if _tracking and not _consumed:
                _consider(mouse_button.position)
            _tracking = false
            _consumed = false
        return

    if event is InputEventMouseMotion and _tracking and not _consumed and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        var motion: InputEventMouseMotion = event as InputEventMouseMotion
        _consider(motion.position)

func _begin(position: Vector2) -> void:
    _tracking = true
    _consumed = false
    _start_position = position

func _consider(position: Vector2) -> void:
    var delta: Vector2 = position - _start_position
    if delta.y >= 0.0:
        return

    var threshold: float = _scaled_threshold()
    if absf(delta.y) < threshold:
        return
    if absf(delta.y) < absf(delta.x) * DIRECTION_RATIO:
        return

    _consumed = true
    _tracking = false
    _return_to_role()

func _scaled_threshold() -> float:
    var height: float = get_viewport().get_visible_rect().size.y
    if height <= 0.0:
        return BASE_THRESHOLD
    return clampf(BASE_THRESHOLD * (height / BASE_VIEWPORT_HEIGHT), 34.0, 52.0)

func _return_to_role() -> void:
    var scene: Node = get_tree().current_scene
    if scene == null:
        return

    scene.set("touch_tracking", false)
    scene.call("_set_page", PAGE_ROLE)
    get_viewport().set_input_as_handled()
    print("Benefit return gesture: returned to role page viewport=%s threshold=%.1f" % [
        str(get_viewport().get_visible_rect().size),
        _scaled_threshold(),
    ])

func _is_benefit_page_active() -> bool:
    var scene: Node = get_tree().current_scene
    if scene == null:
        return false

    var husband_view_value: Variant = scene.get("husband_view")
    if not husband_view_value is Control:
        return false
    var husband_view: Control = husband_view_value as Control
    if not husband_view.visible:
        return false

    return int(scene.get("current_page")) == PAGE_BENEFIT

func _benefit_modal_is_open() -> bool:
    var modal_value: Variant = BenefitVisualOverlay.get("_modal")
    if modal_value is CanvasItem:
        return (modal_value as CanvasItem).visible
    return false
