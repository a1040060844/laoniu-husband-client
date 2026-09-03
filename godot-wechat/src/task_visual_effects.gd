extends Node

const TaskLineIconScript = preload("res://src/task_line_icon.gd")
const FILTERS: Dictionary = {
    "all": ["todo", "doing", "submitted", "confirmed", "failed", "expired", "failed_pending", "completed"],
    "todo": ["todo"],
    "doing": ["doing"],
    "submitted": ["submitted"],
    "completed": ["confirmed", "completed"],
}

var _mounted: bool = false
var _was_visible: bool = false
var _page_age: float = 0.0
var _last_source: String = ""
var _last_filter: String = ""
var _last_signature: String = ""
var _animation_generation: int = 0

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
    _last_source = str(TaskVisualOverlay._source)
    _last_filter = str(TaskVisualOverlay._filter)
    _last_signature = _task_signature()
    _configure_scroll_visuals()
    _mounted = true

func _process(delta: float) -> void:
    if not _mounted or TaskVisualOverlay._root == null:
        return

    var visible_now: bool = TaskVisualOverlay._root.visible
    if visible_now and not _was_visible:
        _page_age = 0.0
        _last_source = str(TaskVisualOverlay._source)
        _last_filter = str(TaskVisualOverlay._filter)
        _last_signature = _task_signature()
        _animation_generation += 1
        call_deferred("_play_page_enter", _animation_generation)
    _was_visible = visible_now
    if not visible_now:
        return

    _page_age += delta
    var source_now: String = str(TaskVisualOverlay._source)
    var filter_now: String = str(TaskVisualOverlay._filter)
    var signature: String = _task_signature()
    if source_now != _last_source or filter_now != _last_filter or signature != _last_signature:
        _last_source = source_now
        _last_filter = filter_now
        _last_signature = signature
        _animation_generation += 1
        call_deferred("_refresh_cards", _animation_generation)

    _decorate_cards()
    _configure_scroll_visuals()

func _configure_scroll_visuals() -> void:
    if TaskVisualOverlay._scroll == null:
        return
    var bar: VScrollBar = TaskVisualOverlay._scroll.get_v_scroll_bar()
    if bar != null:
        bar.modulate.a = 0.0
        bar.mouse_filter = Control.MOUSE_FILTER_IGNORE

func _play_page_enter(generation: int) -> void:
    await get_tree().process_frame
    if generation != _animation_generation or not _is_task_page_visible():
        return

    _animate_control(TaskVisualOverlay._level_label, 0.00, 0.34)
    _animate_control(TaskVisualOverlay._title_label, 0.03, 0.34)

    var subtitle_value: Variant = TaskVisualParity.get("_header_subtitle")
    if subtitle_value is Control:
        _animate_control(subtitle_value as Control, 0.06, 0.34)

    var avatar_value: Variant = TaskVisualParity.get("_avatar_frame")
    if avatar_value is Control:
        _animate_control(avatar_value as Control, 0.06, 0.36)

    var overview_value: Variant = TaskVisualParity.get("_overview_panel")
    if overview_value is Control:
        _animate_control(overview_value as Control, 0.06, 0.36)

    _animate_control(TaskVisualOverlay._source_row, 0.24, 0.68)
    _animate_control(TaskVisualOverlay._filter_row, 0.32, 0.68)
    call_deferred("_refresh_cards", generation)

func _refresh_cards(generation: int) -> void:
    await get_tree().process_frame
    await get_tree().process_frame
    if generation != _animation_generation or not _is_task_page_visible():
        return
    _decorate_cards()
    _animate_task_cards(generation)

func _animate_task_cards(generation: int) -> void:
    if TaskVisualOverlay._list == null:
        return
    var index: int = 0
    for child: Node in TaskVisualOverlay._list.get_children():
        if not child is Panel:
            continue
        var panel: Panel = child as Panel
        if panel.name == "ParityMonthPanel":
            _animate_control(panel, 0.08, 0.38)
            continue
        var delay: float = 0.12 + float(index) * 0.055
        _animate_control(panel, delay, 0.36)
        panel.set_meta("task-enter-generation", generation)
        index += 1

func _animate_control(control: Control, delay: float, duration: float) -> void:
    if control == null or not is_instance_valid(control):
        return
    control.pivot_offset = control.size * 0.5
    control.self_modulate.a = 0.0
    control.scale = Vector2(0.985, 0.985)
    var tween: Tween = create_tween()
    tween.set_parallel(true)
    tween.tween_property(control, "self_modulate:a", 1.0, duration).set_delay(delay).set_trans(Tween.TRANS_QUART).set_ease(Tween.EASE_OUT)
    tween.tween_property(control, "scale", Vector2.ONE, duration).set_delay(delay).set_trans(Tween.TRANS_QUART).set_ease(Tween.EASE_OUT)

func _decorate_cards() -> void:
    if TaskVisualOverlay._list == null:
        return
    var visible_tasks: Array[Dictionary] = _visible_tasks()
    var task_index: int = 0
    for child: Node in TaskVisualOverlay._list.get_children():
        if not child is Panel:
            continue
        var card: Panel = child as Panel
        if card.name == "ParityMonthPanel":
            continue
        if task_index >= visible_tasks.size():
            break
        var task: Dictionary = visible_tasks[task_index]
        _decorate_task_card(card, task)
        task_index += 1

func _decorate_task_card(card: Panel, task: Dictionary) -> void:
    if card.get_child_count() < 6:
        return
    var action: Button = card.get_child(5) as Button
    if action == null:
        return
    _install_reward_chips(card, task)
    _install_action_icon(action, str(task.get("status", "")))

func _install_reward_chips(card: Panel, task: Dictionary) -> void:
    var existing: Node = card.get_node_or_null("ParityRewardRow")
    var row: HBoxContainer
    if existing is HBoxContainer:
        row = existing as HBoxContainer
    else:
        row = HBoxContainer.new()
        row.name = "ParityRewardRow"
        row.mouse_filter = Control.MOUSE_FILTER_IGNORE
        row.add_theme_constant_override("separation", 6)
        card.add_child(row)

    var signature: String = _reward_signature(task)
    if str(row.get_meta("signature", "")) == signature:
        _layout_reward_row(card, row)
        return
    row.set_meta("signature", signature)
    for child: Node in row.get_children():
        child.queue_free()

    var chips: Array[Dictionary] = _reward_chips(task)
    for index: int in range(chips.size()):
        var chip_data: Dictionary = chips[index]
        var chip: Panel = Panel.new()
        chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
        var text_value: String = str(chip_data.get("text", ""))
        chip.custom_minimum_size = Vector2(maxf(72.0, float(text_value.length()) * 7.0 + 30.0), 26.0)
        var style: StyleBoxFlat = StyleBoxFlat.new()
        style.bg_color = Color(0.906, 0.780, 0.553, 0.08)
        style.border_color = Color(0.906, 0.780, 0.553, 0.20)
        style.set_border_width_all(1)
        chip.add_theme_stylebox_override("panel", style)
        row.add_child(chip)

        if index == 0:
            var icon: Control = TaskLineIconScript.new() as Control
            icon.set("icon_key", "gift")
            icon.set("stroke_color", Color("e7c78d"))
            icon.position = Vector2(7.0, 4.0)
            icon.size = Vector2(18.0, 18.0)
            chip.add_child(icon)

        var label: Label = Label.new()
        label.text = text_value
        label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        label.add_theme_font_size_override("font_size", 11)
        label.add_theme_color_override("font_color", Color("e7c78d"))
        label.mouse_filter = Control.MOUSE_FILTER_IGNORE
        label.position = Vector2(27.0 if index == 0 else 9.0, 0.0)
        label.size = Vector2(chip.custom_minimum_size.x - (34.0 if index == 0 else 18.0), 26.0)
        chip.add_child(label)

    var old_reward: Label = card.get_child(3) as Label
    if old_reward != null:
        old_reward.visible = false
    var old_chip: Node = card.get_node_or_null("ParityRewardChip")
    if old_chip is CanvasItem:
        (old_chip as CanvasItem).visible = false
    _layout_reward_row(card, row)

func _layout_reward_row(card: Panel, row: HBoxContainer) -> void:
    var width_value: float = maxf(card.size.x, TaskVisualOverlay._scroll.size.x - 8.0)
    row.position = Vector2(80.0, 128.0)
    row.size = Vector2(maxf(180.0, width_value - 94.0), 26.0)

func _reward_chips(task: Dictionary) -> Array[Dictionary]:
    var result: Array[Dictionary] = []
    var rewards: Variant = task.get("rewards", [])
    if rewards is Array and not rewards.is_empty():
        for reward_value: Variant in rewards:
            if not reward_value is Dictionary:
                continue
            var reward: Dictionary = reward_value as Dictionary
            var reward_type: String = str(reward.get("type", ""))
            var value: int = int(reward.get("value", 0))
            if reward_type == "experience" and value > 0:
                result.append({"text": "+%s EXP" % value})
            elif reward_type == "allowance" and value > 0:
                result.append({"text": "¥%s" % value})
            elif value > 0:
                result.append({"text": "+%s" % value})
    if result.is_empty():
        var exp_value: int = int(task.get("rewardExp", 0))
        var money_value: int = int(task.get("rewardMoney", 0))
        if exp_value > 0:
            result.append({"text": "+%s EXP" % exp_value})
        if money_value > 0:
            result.append({"text": "¥%s" % money_value})
    if result.is_empty():
        result.append({"text": "任务奖励"})
    return result

func _reward_signature(task: Dictionary) -> String:
    var parts: Array[String] = []
    for chip: Dictionary in _reward_chips(task):
        parts.append(str(chip.get("text", "")))
    return "|".join(parts)

func _install_action_icon(action: Button, status: String) -> void:
    var existing: Node = action.get_node_or_null("ParityActionIcon")
    if status != "doing":
        if existing is CanvasItem:
            (existing as CanvasItem).visible = false
        return

    var icon: Control
    if existing is Control:
        icon = existing as Control
    else:
        icon = TaskLineIconScript.new() as Control
        icon.name = "ParityActionIcon"
        icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
        icon.set("icon_key", "send")
        icon.set("stroke_color", Color("241608"))
        action.add_child(icon)
    icon.visible = true
    icon.position = Vector2(14.0, 14.0)
    icon.size = Vector2(18.0, 18.0)

func _visible_tasks() -> Array[Dictionary]:
    var result: Array[Dictionary] = []
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

func _task_signature() -> String:
    var parts: Array[String] = []
    for task: Dictionary in _visible_tasks():
        parts.append("%s:%s" % [str(task.get("id", "")), str(task.get("status", ""))])
    return "%s/%s/%s" % [str(TaskVisualOverlay._source), str(TaskVisualOverlay._filter), ",".join(parts)]

func _is_task_page_visible() -> bool:
    return TaskVisualOverlay._root != null and TaskVisualOverlay._root.visible
