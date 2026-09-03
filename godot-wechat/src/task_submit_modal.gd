extends Node

const FILTERS: Dictionary = {
    "all": ["todo", "doing", "submitted", "confirmed", "failed", "expired", "failed_pending", "completed"],
    "todo": ["todo"],
    "doing": ["doing"],
    "submitted": ["submitted"],
    "completed": ["confirmed", "completed"],
}

var _canvas: CanvasLayer
var _root: Control
var _backdrop: ColorRect
var _sheet: Panel
var _close_button: Button
var _title_label: Label
var _note: TextEdit
var _submit_button: Button
var _current_task: Dictionary = {}
var _is_submitting: bool = false
var _scan_elapsed: float = 0.0

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt: int in range(120):
        if TaskVisualOverlay._root != null:
            break
        await get_tree().process_frame
    if TaskVisualOverlay._root == null:
        return
    _build_ui()
    get_viewport().size_changed.connect(_layout)
    _layout()

func _process(delta: float) -> void:
    if _root == null:
        return
    if _root.visible and not _is_task_page_visible() and not _is_submitting:
        _close_modal()
        return
    if not _is_task_page_visible() or _root.visible:
        return
    _scan_elapsed += delta
    if _scan_elapsed < 0.15:
        return
    _scan_elapsed = 0.0
    _install_submit_interceptors()

func _build_ui() -> void:
    _canvas = CanvasLayer.new()
    _canvas.layer = 88
    add_child(_canvas)

    _root = Control.new()
    _root.visible = false
    _root.mouse_filter = Control.MOUSE_FILTER_STOP
    _canvas.add_child(_root)

    _backdrop = ColorRect.new()
    _backdrop.color = Color(0.0, 0.0, 0.0, 0.72)
    _backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
    _root.add_child(_backdrop)

    _sheet = Panel.new()
    _sheet.mouse_filter = Control.MOUSE_FILTER_STOP
    var sheet_style: StyleBoxFlat = StyleBoxFlat.new()
    sheet_style.bg_color = Color(0.035, 0.027, 0.020, 0.97)
    sheet_style.border_color = Color(0.906, 0.780, 0.553, 0.42)
    sheet_style.set_border_width_all(1)
    sheet_style.shadow_color = Color(0.0, 0.0, 0.0, 0.72)
    sheet_style.shadow_size = 24
    sheet_style.shadow_offset = Vector2(0.0, 12.0)
    _sheet.add_theme_stylebox_override("panel", sheet_style)
    _root.add_child(_sheet)

    var top_glow: ColorRect = ColorRect.new()
    top_glow.color = Color.WHITE
    top_glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var glow_shader: Shader = Shader.new()
    glow_shader.code = """
shader_type canvas_item;
void fragment() {
    float d = distance(UV, vec2(0.5, 0.0));
    float a = (1.0 - smoothstep(0.0, 0.86, d)) * 0.16;
    COLOR = vec4(0.906, 0.780, 0.553, a);
}
"""
    var glow_material: ShaderMaterial = ShaderMaterial.new()
    glow_material.shader = glow_shader
    top_glow.material = glow_material
    _sheet.add_child(top_glow)
    top_glow.set_meta("layout", "top-glow")

    _close_button = Button.new()
    _close_button.text = "×"
    _close_button.focus_mode = Control.FOCUS_NONE
    _close_button.add_theme_font_size_override("font_size", 24)
    _close_button.add_theme_color_override("font_color", Color("f8dfac"))
    _close_button.pressed.connect(_close_modal)
    _sheet.add_child(_close_button)
    _style_close_button(_close_button)

    var kicker: Label = Label.new()
    kicker.text = "提交任务"
    kicker.add_theme_font_size_override("font_size", 13)
    kicker.add_theme_color_override("font_color", Color("e7c78d"))
    kicker.mouse_filter = Control.MOUSE_FILTER_IGNORE
    kicker.set_meta("layout", "kicker")
    _sheet.add_child(kicker)

    _title_label = Label.new()
    _title_label.text = "任务"
    _title_label.add_theme_font_size_override("font_size", 28)
    _title_label.add_theme_color_override("font_color", Color("f8dfac"))
    _title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    _title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _sheet.add_child(_title_label)

    _note = TextEdit.new()
    _note.placeholder_text = "写下完成说明，后续可扩展上传图片。"
    _note.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
    _note.add_theme_font_size_override("font_size", 13)
    _note.add_theme_color_override("font_color", Color("f3eadb"))
    _note.add_theme_color_override("font_placeholder_color", Color(0.953, 0.918, 0.859, 0.42))
    _note.add_theme_constant_override("line_spacing", 4)
    var note_style: StyleBoxFlat = StyleBoxFlat.new()
    note_style.bg_color = Color(0.0, 0.0, 0.0, 0.35)
    note_style.border_color = Color(0.906, 0.780, 0.553, 0.32)
    note_style.set_border_width_all(1)
    note_style.content_margin_left = 12.0
    note_style.content_margin_right = 12.0
    note_style.content_margin_top = 12.0
    note_style.content_margin_bottom = 12.0
    _note.add_theme_stylebox_override("normal", note_style)
    _note.add_theme_stylebox_override("focus", note_style)
    _sheet.add_child(_note)

    _submit_button = Button.new()
    _submit_button.text = "提交给老妞确认"
    _submit_button.focus_mode = Control.FOCUS_NONE
    _submit_button.add_theme_font_size_override("font_size", 14)
    _submit_button.pressed.connect(_begin_submit)
    _sheet.add_child(_submit_button)
    _style_submit_button(_submit_button, false)

func _style_close_button(button: Button) -> void:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.0, 0.0, 0.0, 0.22)
    style.border_color = Color(0.906, 0.780, 0.553, 0.18)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 17
    style.corner_radius_top_right = 17
    style.corner_radius_bottom_left = 17
    style.corner_radius_bottom_right = 17
    button.add_theme_stylebox_override("normal", style)
    button.add_theme_stylebox_override("hover", style)
    button.add_theme_stylebox_override("pressed", style)

func _style_submit_button(button: Button, disabled_state: bool) -> void:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    if disabled_state:
        style.bg_color = Color(0.13, 0.11, 0.08, 0.88)
        style.border_color = Color(0.906, 0.780, 0.553, 0.18)
        button.add_theme_color_override("font_disabled_color", Color(0.953, 0.918, 0.859, 0.64))
    else:
        style.bg_color = Color("d7ad67")
        style.border_color = Color(0.906, 0.780, 0.553, 0.48)
        button.add_theme_color_override("font_color", Color("251709"))
    style.set_border_width_all(1)
    style.shadow_color = Color(0.0, 0.0, 0.0, 0.38)
    style.shadow_size = 8
    style.shadow_offset = Vector2(0.0, 5.0)
    button.add_theme_stylebox_override("normal", style)
    button.add_theme_stylebox_override("hover", style)
    button.add_theme_stylebox_override("pressed", style)
    button.add_theme_stylebox_override("disabled", style)

func _layout() -> void:
    if _root == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    _root.position = Vector2.ZERO
    _root.size = viewport_size
    _backdrop.position = Vector2.ZERO
    _backdrop.size = viewport_size

    var sheet_width: float = maxf(280.0, viewport_size.x - 36.0)
    var sheet_height: float = minf(334.0, viewport_size.y - 36.0)
    _sheet.position = Vector2((viewport_size.x - sheet_width) * 0.5, viewport_size.y - sheet_height - 18.0)
    _sheet.size = Vector2(sheet_width, sheet_height)

    for child: Node in _sheet.get_children():
        if child.has_meta("layout") and str(child.get_meta("layout")) == "top-glow" and child is Control:
            var glow: Control = child as Control
            glow.position = Vector2.ZERO
            glow.size = Vector2(sheet_width, 128.0)
        elif child.has_meta("layout") and str(child.get_meta("layout")) == "kicker" and child is Control:
            var kicker: Control = child as Control
            kicker.position = Vector2(18.0, 22.0)
            kicker.size = Vector2(sheet_width - 76.0, 20.0)

    _close_button.position = Vector2(sheet_width - 46.0, 10.0)
    _close_button.size = Vector2(34.0, 34.0)
    _title_label.position = Vector2(18.0, 48.0)
    _title_label.size = Vector2(sheet_width - 72.0, 62.0)
    _note.position = Vector2(18.0, 116.0)
    _note.size = Vector2(sheet_width - 36.0, 132.0)
    _submit_button.position = Vector2(18.0, sheet_height - 64.0)
    _submit_button.size = Vector2(sheet_width - 36.0, 46.0)

func _install_submit_interceptors() -> void:
    if TaskVisualOverlay._list == null:
        return
    var visible_tasks: Array = _visible_tasks()
    var task_index: int = 0
    for child: Node in TaskVisualOverlay._list.get_children():
        if not child is Panel:
            continue
        var card: Panel = child as Panel
        if card.name == "ParityMonthPanel":
            continue
        if task_index >= visible_tasks.size():
            break
        var task_value: Variant = visible_tasks[task_index]
        task_index += 1
        if not task_value is Dictionary or card.get_child_count() < 6:
            continue
        var task: Dictionary = task_value as Dictionary
        var action: Button = card.get_child(5) as Button
        if action == null:
            continue
        _configure_action_interceptor(card, action, task)

func _configure_action_interceptor(card: Panel, action: Button, task: Dictionary) -> void:
    var status: String = str(task.get("status", ""))
    var existing: Node = card.get_node_or_null("SubmitModalIntercept")
    if status != "doing":
        if existing is Button:
            (existing as Button).visible = false
        return

    var intercept: Button
    if existing is Button:
        intercept = existing as Button
    else:
        intercept = Button.new()
        intercept.name = "SubmitModalIntercept"
        intercept.text = ""
        intercept.focus_mode = Control.FOCUS_NONE
        intercept.mouse_filter = Control.MOUSE_FILTER_STOP
        intercept.z_index = 30
        var clear_style: StyleBoxEmpty = StyleBoxEmpty.new()
        intercept.add_theme_stylebox_override("normal", clear_style)
        intercept.add_theme_stylebox_override("hover", clear_style)
        intercept.add_theme_stylebox_override("pressed", clear_style)
        intercept.add_theme_stylebox_override("focus", clear_style)
        card.add_child(intercept)
        intercept.pressed.connect(_on_intercept_pressed.bind(intercept))
    intercept.visible = true
    intercept.position = action.position
    intercept.size = action.size
    intercept.set_meta("task-data", task.duplicate(true))

func _on_intercept_pressed(intercept: Button) -> void:
    if _root == null or _root.visible or _is_submitting:
        return
    var value: Variant = intercept.get_meta("task-data", {})
    if value is Dictionary:
        _open_modal(value as Dictionary)

func _open_modal(task: Dictionary) -> void:
    _current_task = task.duplicate(true)
    _title_label.text = str(task.get("title", "任务"))
    _note.text = ""
    _is_submitting = false
    _submit_button.disabled = false
    _submit_button.text = "提交给老妞确认"
    _style_submit_button(_submit_button, false)
    _root.visible = true
    _layout()
    _root.modulate.a = 0.0
    _sheet.pivot_offset = _sheet.size * Vector2(0.5, 0.82)
    _sheet.scale = Vector2(0.98, 0.98)
    var tween: Tween = create_tween()
    tween.set_parallel(true)
    tween.tween_property(_root, "modulate:a", 1.0, 0.26).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
    tween.tween_property(_sheet, "scale", Vector2.ONE, 0.36).set_trans(Tween.TRANS_QUART).set_ease(Tween.EASE_OUT)
    print("Task submit modal opened: %s" % str(task.get("id", "")))

func _close_modal() -> void:
    if _root == null or not _root.visible or _is_submitting:
        return
    _root.visible = false
    _current_task = {}
    _note.text = ""

func _begin_submit() -> void:
    if _is_submitting or _current_task.is_empty() or GameState.is_syncing:
        return
    _is_submitting = true
    _submit_button.disabled = true
    _submit_button.text = "正在递交..."
    _style_submit_button(_submit_button, true)
    call_deferred("_submit_after_feedback")

func _submit_after_feedback() -> void:
    await get_tree().create_timer(0.40).timeout
    if not _is_submitting or _current_task.is_empty():
        return
    var task_id: String = str(_current_task.get("id", ""))
    var note_text: String = _note.text.strip_edges()
    if note_text.is_empty():
        note_text = "已完成，请老妞大人确认。"
    if _save_submitted_task(task_id, note_text):
        print("Task submit confirmed: %s note_length=%s" % [task_id, note_text.length()])
        _is_submitting = false
        _root.visible = false
        _current_task = {}
        _note.text = ""
    else:
        _is_submitting = false
        _submit_button.disabled = false
        _submit_button.text = "提交给老妞确认"
        _style_submit_button(_submit_button, false)

func _save_submitted_task(task_id: String, note_text: String) -> bool:
    if GameState.is_syncing:
        return false
    var next_state: Dictionary = GameState.state.duplicate(true)
    var tasks_value: Variant = next_state.get("tasks", [])
    if not tasks_value is Array:
        return false
    var tasks: Array = tasks_value as Array
    var submitted_at: String = Time.get_datetime_string_from_system()
    var submitted_title: String = ""
    var changed: bool = false
    for index: int in range(tasks.size()):
        var task_value: Variant = tasks[index]
        if not task_value is Dictionary:
            continue
        var task: Dictionary = task_value as Dictionary
        if str(task.get("id", "")) == task_id and str(task.get("status", "")) == "doing":
            task["status"] = "submitted"
            task["submittedAt"] = submitted_at
            task["submitNote"] = note_text
            submitted_title = str(task.get("title", "任务"))
            tasks[index] = task
            changed = true
            break
    if not changed:
        return false

    next_state["tasks"] = tasks
    var logs_value: Variant = next_state.get("logs", [])
    var logs: Array = []
    if logs_value is Array:
        logs = logs_value as Array
    logs.push_front({
        "id": "log-task-submitted-%s" % int(Time.get_unix_time_from_system() * 1000.0),
        "type": "task_submitted",
        "title": submitted_title,
        "description": note_text,
        "taskId": task_id,
        "taskTitle": submitted_title,
        "createdAt": submitted_at,
    })
    next_state["logs"] = logs
    GameState.save_remote(next_state)
    return true

func _visible_tasks() -> Array:
    var result: Array = []
    var filter_key: String = str(TaskVisualOverlay._filter)
    var allowed_value: Variant = FILTERS.get(filter_key, FILTERS["all"])
    var allowed: Array = []
    if allowed_value is Array:
        allowed = allowed_value as Array
    for value: Variant in TaskVisualOverlay._tasks:
        if not value is Dictionary:
            continue
        var task: Dictionary = value as Dictionary
        if str(task.get("source", "wife")) != str(TaskVisualOverlay._source):
            continue
        if not allowed.has(str(task.get("status", ""))):
            continue
        result.append(task)
    return result

func _is_task_page_visible() -> bool:
    return TaskVisualOverlay._root != null and TaskVisualOverlay._root.visible
