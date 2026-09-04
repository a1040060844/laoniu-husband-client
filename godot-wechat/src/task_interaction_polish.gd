extends Node

const COUNT_DURATION: float = 0.42
const SCAN_INTERVAL: float = 0.15

var _canvas: CanvasLayer
var _spark_root: Control
var _scroll_top_fade: ColorRect
var _scroll_bottom_fade: ColorRect
var _mounted: bool = false
var _was_visible: bool = false
var _scan_elapsed: float = 0.0

var _month_start: Array[float] = [0.0, 0.0, 0.0]
var _month_display: Array[float] = [0.0, 0.0, 0.0]
var _month_target: Array[int] = [0, 0, 0]
var _month_elapsed: float = 0.0
var _month_animating: bool = false
var _month_signature: String = ""

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt: int in range(120):
        if TaskVisualOverlay._root != null and TaskVisualOverlay._scroll != null:
            break
        await get_tree().process_frame
    if TaskVisualOverlay._root == null or TaskVisualOverlay._scroll == null:
        return

    _build_spark_layer()
    _build_scroll_fades()
    get_viewport().size_changed.connect(_layout_scroll_fades)
    _layout_scroll_fades()
    _mounted = true

func _process(delta: float) -> void:
    if not _mounted or TaskVisualOverlay._root == null:
        return

    var visible_now: bool = TaskVisualOverlay._root.visible
    if visible_now and not _was_visible:
        _start_month_countup(true)
    _was_visible = visible_now

    if not visible_now:
        if _scroll_top_fade != null:
            _scroll_top_fade.visible = false
        if _scroll_bottom_fade != null:
            _scroll_bottom_fade.visible = false
        return

    _scan_elapsed += delta
    if _scan_elapsed >= SCAN_INTERVAL:
        _scan_elapsed = 0.0
        _attach_button_feedback()
        _refresh_month_target()

    _update_month_countup(delta)
    _update_scroll_fades()

func _build_spark_layer() -> void:
    _canvas = CanvasLayer.new()
    _canvas.layer = 300
    add_child(_canvas)

    _spark_root = Control.new()
    _spark_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _spark_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    _canvas.add_child(_spark_root)

func _build_scroll_fades() -> void:
    _scroll_top_fade = _make_scroll_fade(true)
    _scroll_bottom_fade = _make_scroll_fade(false)
    TaskVisualOverlay._root.add_child(_scroll_top_fade)
    TaskVisualOverlay._root.add_child(_scroll_bottom_fade)

func _make_scroll_fade(top_fade: bool) -> ColorRect:
    var fade: ColorRect = ColorRect.new()
    fade.color = Color.WHITE
    fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
    fade.z_index = 7
    fade.visible = false

    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;
uniform bool top_fade = true;
void fragment() {
    float a = top_fade ? (1.0 - UV.y) : UV.y;
    a = smoothstep(0.0, 1.0, a) * 0.78;
    COLOR = vec4(0.0, 0.0, 0.0, a);
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    material.set_shader_parameter("top_fade", top_fade)
    fade.material = material
    return fade

func _layout_scroll_fades() -> void:
    if TaskVisualOverlay._scroll == null:
        return
    var scroll_pos: Vector2 = TaskVisualOverlay._scroll.position
    var scroll_size: Vector2 = TaskVisualOverlay._scroll.size
    if _scroll_top_fade != null:
        _scroll_top_fade.position = scroll_pos
        _scroll_top_fade.size = Vector2(scroll_size.x, 28.0)
    if _scroll_bottom_fade != null:
        _scroll_bottom_fade.position = Vector2(scroll_pos.x, scroll_pos.y + maxf(0.0, scroll_size.y - 30.0))
        _scroll_bottom_fade.size = Vector2(scroll_size.x, 30.0)

func _update_scroll_fades() -> void:
    if TaskVisualOverlay._scroll == null:
        return
    _layout_scroll_fades()
    var bar: VScrollBar = TaskVisualOverlay._scroll.get_v_scroll_bar()
    if bar == null:
        return
    var current: float = float(TaskVisualOverlay._scroll.scroll_vertical)
    var max_scroll: float = maxf(0.0, bar.max_value - bar.page)
    if _scroll_top_fade != null:
        _scroll_top_fade.visible = current > 4.0
        _scroll_top_fade.modulate.a = clampf(current / 30.0, 0.0, 1.0)
    if _scroll_bottom_fade != null:
        _scroll_bottom_fade.visible = max_scroll > 4.0 and current < max_scroll - 4.0
        _scroll_bottom_fade.modulate.a = clampf((max_scroll - current) / 30.0, 0.0, 1.0)

func _attach_button_feedback() -> void:
    if TaskVisualOverlay._source_row != null:
        for child: Node in TaskVisualOverlay._source_row.get_children():
            if child is Button:
                _attach_button(child as Button, true)

    if TaskVisualOverlay._filter_row != null:
        for child: Node in TaskVisualOverlay._filter_row.get_children():
            if child is Button:
                _attach_button(child as Button, true)

    if TaskVisualOverlay._list != null:
        for child: Node in TaskVisualOverlay._list.get_children():
            if not child is Panel:
                continue
            var card: Panel = child as Panel
            if card.name == "ParityMonthPanel" or card.get_child_count() < 6:
                continue
            var action: Button = card.get_child(5) as Button
            if action == null:
                continue
            _attach_button(action, true)
            var intercept: Node = card.get_node_or_null("SubmitModalIntercept")
            if intercept is Button:
                _attach_button(intercept as Button, true)

    _attach_submit_modal_buttons()

func _attach_submit_modal_buttons() -> void:
    var close_value: Variant = TaskSubmitModal.get("_close_button")
    if close_value is Button:
        _attach_button(close_value as Button, false)
    var submit_value: Variant = TaskSubmitModal.get("_submit_button")
    if submit_value is Button:
        _attach_button(submit_value as Button, true)

func _attach_button(button: Button, spark_enabled: bool) -> void:
    if button == null or not is_instance_valid(button):
        return
    if bool(button.get_meta("task-polish-feedback", false)):
        return
    button.set_meta("task-polish-feedback", true)
    button.set_meta("task-polish-spark", spark_enabled)
    button.button_down.connect(_on_button_down.bind(button))
    button.button_up.connect(_on_button_up.bind(button))

func _on_button_down(button: Button) -> void:
    if button == null or not is_instance_valid(button) or button.disabled:
        return
    button.pivot_offset = button.size * 0.5
    var tween: Tween = create_tween()
    tween.tween_property(button, "scale", Vector2(0.97, 0.97), 0.08).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
    if bool(button.get_meta("task-polish-spark", false)):
        _spawn_click_spark(button.get_global_rect().get_center())

func _on_button_up(button: Button) -> void:
    if button == null or not is_instance_valid(button):
        return
    var tween: Tween = create_tween()
    tween.tween_property(button, "scale", Vector2.ONE, 0.12).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

func _spawn_click_spark(center: Vector2) -> void:
    if _spark_root == null:
        return
    for index: int in range(6):
        var angle: float = deg_to_rad(float(index) * 60.0)
        var line: Line2D = Line2D.new()
        line.width = 2.0
        line.default_color = Color("f0d9a4") if index % 2 == 1 else Color("d7b56d")
        line.points = PackedVector2Array([Vector2(0.0, -2.0), Vector2(0.0, -11.0)])
        line.position = center
        line.rotation = angle
        line.scale = Vector2(1.0, 0.70)
        line.modulate.a = 0.90
        _spark_root.add_child(line)

        var outward: Vector2 = Vector2.UP.rotated(angle) * 25.0
        var tween: Tween = create_tween()
        tween.set_parallel(true)
        tween.tween_property(line, "position", center + outward, 0.30).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
        tween.tween_property(line, "modulate:a", 0.0, 0.30).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
        tween.tween_property(line, "scale", Vector2(0.55, 1.0), 0.30).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
        get_tree().create_timer(0.34).timeout.connect(_free_spark.bind(line))

func _free_spark(line: Line2D) -> void:
    if line != null and is_instance_valid(line):
        line.queue_free()

func _start_month_countup(from_zero: bool) -> void:
    var target: Array[int] = _calculate_month_target()
    _month_target = target
    if from_zero:
        _month_start = [0.0, 0.0, 0.0]
        _month_display = [0.0, 0.0, 0.0]
    else:
        _month_start = [_month_display[0], _month_display[1], _month_display[2]]
    _month_elapsed = 0.0
    _month_animating = true
    _month_signature = "%s/%s/%s" % [target[0], target[1], target[2]]

func _refresh_month_target() -> void:
    var target: Array[int] = _calculate_month_target()
    var signature: String = "%s/%s/%s" % [target[0], target[1], target[2]]
    if signature == _month_signature:
        return
    _month_target = target
    _month_start = [_month_display[0], _month_display[1], _month_display[2]]
    _month_elapsed = 0.0
    _month_animating = true
    _month_signature = signature

func _update_month_countup(delta: float) -> void:
    var labels: Array = _month_value_labels()
    if labels.size() < 3:
        return

    if _month_animating:
        _month_elapsed += delta
        var progress: float = clampf(_month_elapsed / COUNT_DURATION, 0.0, 1.0)
        var eased: float = 1.0 - pow(1.0 - progress, 3.0)
        for index: int in range(3):
            _month_display[index] = lerpf(_month_start[index], float(_month_target[index]), eased)
        if progress >= 1.0:
            _month_animating = false
            for index: int in range(3):
                _month_display[index] = float(_month_target[index])

    var money_label: Label = labels[0] as Label
    var count_label: Label = labels[1] as Label
    var exp_label: Label = labels[2] as Label
    if money_label != null:
        money_label.text = "¥ %s" % int(round(_month_display[0]))
    if count_label != null:
        count_label.text = str(int(round(_month_display[1])))
    if exp_label != null:
        exp_label.text = "%s EXP" % int(round(_month_display[2]))

func _month_value_labels() -> Array:
    var value: Variant = TaskVisualParity.get("_month_values")
    if value is Array:
        return value as Array
    return []

func _calculate_month_target() -> Array[int]:
    var money: int = 0
    var count: int = 0
    var exp: int = 0
    var today: Dictionary = Time.get_date_dict_from_system()
    var prefix: String = "%04d-%02d" % [int(today.get("year", 2024)), int(today.get("month", 1))]

    for value: Variant in TaskVisualOverlay._tasks:
        if not value is Dictionary:
            continue
        var task: Dictionary = value as Dictionary
        var status: String = str(task.get("status", ""))
        if status != "confirmed" and status != "completed":
            continue
        var completed_at: String = str(task.get("rewardedAt", task.get("confirmedAt", "")))
        if not completed_at.begins_with(prefix):
            continue
        count += 1
        money += _task_reward(task, "allowance", "rewardMoney")
        exp += _task_reward(task, "experience", "rewardExp")
    return [money, count, exp]

func _task_reward(task: Dictionary, reward_type: String, fallback_key: String) -> int:
    var rewards: Variant = task.get("rewards", [])
    if rewards is Array and not rewards.is_empty():
        var total: int = 0
        for reward_value: Variant in rewards:
            if reward_value is Dictionary and str(reward_value.get("type", "")) == reward_type:
                total += maxi(0, int(reward_value.get("value", 0)))
        return total
    return maxi(0, int(task.get(fallback_key, 0)))
