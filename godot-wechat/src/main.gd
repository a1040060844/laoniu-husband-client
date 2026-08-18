extends Control

const PAGE_BENEFIT: int = 0
const PAGE_ROLE: int = 1
const PAGE_TASK: int = 2
const SWIPE_THRESHOLD: float = 60.0

var login_view: Control
var husband_view: Control
var page_container: Control
var diagnostic_canvas: CanvasLayer
var sync_label: Label
var current_page: int = PAGE_ROLE
var touch_start_y: float = 0.0
var touch_tracking: bool = false

func _ready() -> void:
    get_viewport().size_changed.connect(_layout)
    GameState.sync_status_changed.connect(_on_sync_status_changed)
    GameState.sync_failed.connect(_on_sync_failed)
    _build_ui()
    _layout()
    GameState.load_remote()

func _build_ui() -> void:
    var background: ColorRect = ColorRect.new()
    background.color = Color("030303")
    background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    background.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(background)

    husband_view = Control.new()
    husband_view.visible = false
    husband_view.clip_contents = true
    husband_view.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(husband_view)

    page_container = Control.new()
    page_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
    husband_view.add_child(page_container)

    page_container.add_child(_make_page("BenefitPage"))
    page_container.add_child(_make_page("RolePage"))
    page_container.add_child(_make_page("TaskPage"))

    login_view = Control.new()
    login_view.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(login_view)

    diagnostic_canvas = CanvasLayer.new()
    diagnostic_canvas.layer = 120
    add_child(diagnostic_canvas)

    sync_label = Label.new()
    sync_label.text = "正在连接服务器…"
    sync_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    sync_label.add_theme_font_size_override("font_size", 11)
    sync_label.add_theme_color_override("font_color", Color("d5c19b"))
    sync_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.9))
    sync_label.add_theme_constant_override("shadow_offset_x", 1)
    sync_label.add_theme_constant_override("shadow_offset_y", 1)
    sync_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    diagnostic_canvas.add_child(sync_label)

func _make_page(page_name: String) -> Control:
    var page: Control = Control.new()
    page.name = page_name
    page.mouse_filter = Control.MOUSE_FILTER_IGNORE
    return page

func _layout() -> void:
    var viewport_size: Vector2 = get_viewport_rect().size
    size = viewport_size

    if is_instance_valid(login_view):
        login_view.position = Vector2.ZERO
        login_view.size = viewport_size

    if is_instance_valid(husband_view):
        husband_view.position = Vector2.ZERO
        husband_view.size = viewport_size

    if is_instance_valid(page_container):
        page_container.size = Vector2(viewport_size.x, viewport_size.y * 3.0)
        var child_count: int = page_container.get_child_count()
        for index: int in range(child_count):
            var page: Control = page_container.get_child(index) as Control
            if page == null:
                continue
            page.position = Vector2(0.0, viewport_size.y * float(index))
            page.size = viewport_size
        page_container.position = Vector2(0.0, -viewport_size.y * float(current_page))

    if is_instance_valid(sync_label):
        sync_label.position = Vector2(16.0, viewport_size.y - 26.0)
        sync_label.size = Vector2(viewport_size.x - 32.0, 20.0)

func _enter_husband() -> void:
    if is_instance_valid(login_view):
        login_view.visible = false
    if is_instance_valid(husband_view):
        husband_view.visible = true
    current_page = PAGE_ROLE
    _snap_to_page(false)

func _input(event: InputEvent) -> void:
    if not is_instance_valid(husband_view) or not husband_view.visible:
        return

    if event is InputEventScreenTouch:
        var touch: InputEventScreenTouch = event as InputEventScreenTouch
        if touch.pressed:
            touch_tracking = true
            touch_start_y = touch.position.y
        elif touch_tracking:
            touch_tracking = false
            _finish_swipe(touch.position.y - touch_start_y)
        return

    if event is InputEventMouseButton:
        var mouse_button: InputEventMouseButton = event as InputEventMouseButton
        if mouse_button.button_index != MOUSE_BUTTON_LEFT:
            return
        if mouse_button.pressed:
            touch_tracking = true
            touch_start_y = mouse_button.position.y
        elif touch_tracking:
            touch_tracking = false
            _finish_swipe(mouse_button.position.y - touch_start_y)

func _finish_swipe(delta_y: float) -> void:
    if absf(delta_y) < SWIPE_THRESHOLD:
        return

    if current_page == PAGE_TASK and delta_y > 0.0 and touch_start_y > 140.0:
        return

    if delta_y < 0.0:
        _set_page(current_page + 1)
    else:
        _set_page(current_page - 1)

func _set_page(index: int) -> void:
    var next_page: int = clampi(index, PAGE_BENEFIT, PAGE_TASK)
    if next_page == current_page:
        return
    current_page = next_page
    _snap_to_page(true)

func _snap_to_page(animated: bool) -> void:
    if not is_instance_valid(page_container):
        return
    var target_y: float = -get_viewport_rect().size.y * float(current_page)
    if not animated:
        page_container.position.y = target_y
        return
    var tween: Tween = create_tween()
    tween.set_trans(Tween.TRANS_QUART)
    tween.set_ease(Tween.EASE_OUT)
    tween.tween_property(page_container, "position:y", target_y, 0.42)

func _on_sync_status_changed(message: String) -> void:
    if is_instance_valid(sync_label):
        sync_label.text = message
        sync_label.add_theme_color_override("font_color", Color("d5c19b"))

func _on_sync_failed(message: String) -> void:
    if is_instance_valid(sync_label):
        sync_label.text = "同步失败：%s" % message
        sync_label.add_theme_color_override("font_color", Color("ffb3a4"))
