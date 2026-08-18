extends Node

const STATUS_LABELS: Dictionary = {
    "todo": "待执行",
    "doing": "进行中",
    "submitted": "待确认",
    "confirmed": "已确认",
    "failed": "未通过",
    "expired": "已过期",
    "failed_pending": "待裁定",
    "completed": "已完成",
}
const FILTERS: Dictionary = {
    "all": ["todo", "doing", "submitted", "confirmed", "failed", "expired", "failed_pending", "completed"],
    "todo": ["todo"],
    "doing": ["doing"],
    "submitted": ["submitted"],
    "completed": ["confirmed", "completed"],
}

var _canvas: CanvasLayer
var _root: Control
var _backdrop: TextureRect
var _level_label: Label
var _title_label: Label
var _overview_label: Label
var _month_label: Label
var _source_row: HBoxContainer
var _filter_row: HBoxContainer
var _scroll: ScrollContainer
var _list: VBoxContainer
var _empty_label: Label
var _source: String = "wife"
var _filter: String = "all"
var _tasks: Array = []
var _loaded_backdrop: bool = false
var _status_label: Label

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount")

func _mount() -> void:
    _build_ui()
    get_viewport().size_changed.connect(_layout)
    GameState.changed.connect(_on_state_changed)
    GameState.sync_status_changed.connect(_on_sync_status)
    GameState.sync_failed.connect(_on_sync_failed)
    _on_state_changed(GameState.state)
    _load_backdrop()
    _layout()

func _build_ui() -> void:
    _canvas = CanvasLayer.new()
    _canvas.layer = 42
    add_child(_canvas)

    _root = Control.new()
    _root.visible = false
    _root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _canvas.add_child(_root)

    var black: ColorRect = ColorRect.new()
    black.color = Color.BLACK
    black.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    black.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _root.add_child(black)

    _backdrop = TextureRect.new()
    _backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    _backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
    _backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _root.add_child(_backdrop)

    var scrim: ColorRect = ColorRect.new()
    scrim.color = Color.WHITE
    scrim.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;
void fragment() {
    float top = (1.0 - smoothstep(0.0, 0.24, UV.y)) * 0.72;
    float bottom = smoothstep(0.46, 1.0, UV.y) * 0.90;
    float side = smoothstep(0.65, 1.0, abs(UV.x - 0.5) * 2.0) * 0.58;
    COLOR = vec4(0.0, 0.0, 0.0, clamp(max(top, max(bottom, side)), 0.0, 0.94));
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    scrim.material = material
    scrim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    _root.add_child(scrim)

    var swipe: Label = _label("↓  下滑进入主页", 13, Color("c1ad86"))
    swipe.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    swipe.set_meta("layout", "swipe")
    _root.add_child(swipe)

    _level_label = _label("Lv. 00", 13, Color("e7c78d"))
    _root.add_child(_level_label)
    _title_label = _label("老哥任务簿", 28, Color("f8dfac"))
    _root.add_child(_title_label)

    _overview_label = _label("待执行 0 · 待提交 0 · 待确认 0 · 今日可得 +0 EXP", 12, Color("ddc9a2"))
    _overview_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    _root.add_child(_overview_label)

    _source_row = HBoxContainer.new()
    _source_row.alignment = BoxContainer.ALIGNMENT_CENTER
    _source_row.add_theme_constant_override("separation", 8)
    _root.add_child(_source_row)
    _source_row.add_child(_tab_button("老婆发布", "wife", true))
    _source_row.add_child(_tab_button("每日任务", "daily", true))

    _filter_row = HBoxContainer.new()
    _filter_row.alignment = BoxContainer.ALIGNMENT_CENTER
    _filter_row.add_theme_constant_override("separation", 4)
    _root.add_child(_filter_row)
    var filter_labels: Dictionary = {"all":"全部", "todo":"待执行", "doing":"进行中", "submitted":"待确认", "completed":"已完成"}
    for key: String in ["all", "todo", "doing", "submitted", "completed"]:
        _filter_row.add_child(_tab_button(str(filter_labels.get(key, key)), key, false))

    _scroll = ScrollContainer.new()
    _scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
    _scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
    _root.add_child(_scroll)

    _list = VBoxContainer.new()
    _list.add_theme_constant_override("separation", 10)
    _scroll.add_child(_list)

    _empty_label = _label("暂无符合条件的任务", 13, Color("8e8069"))
    _empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _list.add_child(_empty_label)

    _month_label = _label("本月获得 ¥0 · 完成 0 个 · 0 EXP", 13, Color("e8d4aa"))
    _month_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _root.add_child(_month_label)

    _status_label = _label("", 11, Color("9e8c6c"))
    _status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _root.add_child(_status_label)

func _label(text_value: String, font_size: int, color: Color) -> Label:
    var label: Label = Label.new()
    label.text = text_value
    label.add_theme_font_size_override("font_size", font_size)
    label.add_theme_color_override("font_color", color)
    label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    return label

func _tab_button(text_value: String, key: String, source_tab: bool) -> Button:
    var button: Button = Button.new()
    button.text = text_value
    button.add_theme_font_size_override("font_size", 11)
    button.custom_minimum_size = Vector2(62, 30)
    if source_tab:
        button.pressed.connect(_select_source.bind(key))
        button.set_meta("source-key", key)
    else:
        button.pressed.connect(_select_filter.bind(key))
        button.set_meta("filter-key", key)
    return button

func _process(_delta: float) -> void:
    if _root == null:
        return
    var scene: Node = get_tree().current_scene
    if scene == null:
        _root.visible = false
        return
    var husband_view_value: Variant = scene.get("husband_view")
    var page_value: Variant = scene.get("current_page")
    _root.visible = husband_view_value is Control and husband_view_value.visible and int(page_value) == 2

func _on_state_changed(_state: Dictionary) -> void:
    var progress: Dictionary = GameState.get_progress()
    var level: int = int(progress.get("level", 0))
    var role: Dictionary = _role_for_level(level)
    _level_label.text = "Lv. %02d" % level
    _title_label.text = "%s · 老哥任务簿" % str(role.get("title", ""))
    var source_value: Variant = GameState.state.get("tasks", [])
    _tasks = source_value if source_value is Array else []
    _refresh_stats()
    _rebuild_task_list()

func _role_for_level(level: int) -> Dictionary:
    var roles: Variant = GameState.state.get("roles", [])
    if roles is Array:
        for role_value: Variant in roles:
            if role_value is Dictionary:
                var role: Dictionary = role_value
                if int(role.get("level", -1)) == level:
                    return role
    return {}

func _refresh_stats() -> void:
    var pending: int = 0
    var doing: int = 0
    var submitted: int = 0
    var today_exp: int = 0
    var month_money: int = 0
    var month_count: int = 0
    var month_exp: int = 0
    var today: Dictionary = Time.get_date_dict_from_system()
    var month_prefix: String = "%04d-%02d" % [int(today.get("year", 2024)), int(today.get("month", 1))]

    for value: Variant in _tasks:
        if not value is Dictionary:
            continue
        var task: Dictionary = value
        var status: String = str(task.get("status", ""))
        if status == "todo":
            pending += 1
            today_exp += _reward_exp(task)
        elif status == "doing":
            doing += 1
            today_exp += _reward_exp(task)
        elif status == "submitted":
            submitted += 1

        if status == "confirmed" or status == "completed":
            var completed_at: String = str(task.get("rewardedAt", task.get("confirmedAt", "")))
            if completed_at.begins_with(month_prefix):
                month_count += 1
                month_money += _reward_money(task)
                month_exp += _reward_exp(task)

    _overview_label.text = "待执行 %s · 待提交 %s · 待确认 %s · 今日可得 +%s EXP" % [pending, doing, submitted, today_exp]
    _month_label.text = "本月获得 ¥%s · 完成 %s 个 · %s EXP" % [month_money, month_count, month_exp]

func _reward_exp(task: Dictionary) -> int:
    var rewards: Variant = task.get("rewards", [])
    if rewards is Array and not rewards.is_empty():
        var total: int = 0
        for reward_value: Variant in rewards:
            if reward_value is Dictionary:
                var reward: Dictionary = reward_value
                if str(reward.get("type", "")) == "experience":
                    total += maxi(0, int(reward.get("value", 0)))
        return total
    return maxi(0, int(task.get("rewardExp", 0)))

func _reward_money(task: Dictionary) -> int:
    var rewards: Variant = task.get("rewards", [])
    if rewards is Array and not rewards.is_empty():
        var total: int = 0
        for reward_value: Variant in rewards:
            if reward_value is Dictionary:
                var reward: Dictionary = reward_value
                if str(reward.get("type", "")) == "allowance":
                    total += maxi(0, int(reward.get("value", 0)))
        return total
    return maxi(0, int(task.get("rewardMoney", 0)))

func _select_source(key: String) -> void:
    if _source == key:
        return
    _source = key
    _rebuild_task_list()
    _update_tab_states()

func _select_filter(key: String) -> void:
    if _filter == key:
        return
    _filter = key
    _rebuild_task_list()
    _update_tab_states()

func _update_tab_states() -> void:
    for child: Node in _source_row.get_children():
        if child is Button:
            var button: Button = child as Button
            button.modulate = Color.WHITE if str(button.get_meta("source-key")) == _source else Color(1, 1, 1, 0.55)
    for child: Node in _filter_row.get_children():
        if child is Button:
            var button: Button = child as Button
            button.modulate = Color.WHITE if str(button.get_meta("filter-key")) == _filter else Color(1, 1, 1, 0.55)

func _rebuild_task_list() -> void:
    if _list == null:
        return
    for child: Node in _list.get_children():
        child.queue_free()

    var count: int = 0
    var allowed_value: Variant = FILTERS.get(_filter, FILTERS["all"])
    var allowed: Array = allowed_value if allowed_value is Array else []
    for value: Variant in _tasks:
        if not value is Dictionary:
            continue
        var task: Dictionary = value
        if str(task.get("source", "wife")) != _source:
            continue
        if not allowed.has(str(task.get("status", ""))):
            continue
        _list.add_child(_build_task_card(task))
        count += 1

    if count == 0:
        var empty: Label = _label("暂无符合条件的任务", 13, Color("8e8069"))
        empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        empty.custom_minimum_size = Vector2(0, 80)
        _list.add_child(empty)
    _update_tab_states()

func _build_task_card(task: Dictionary) -> Panel:
    var card: Panel = Panel.new()
    card.custom_minimum_size = Vector2(0, 158)
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.045, 0.033, 0.022, 0.90)
    style.border_color = Color(0.91, 0.78, 0.55, 0.18)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 10
    style.corner_radius_top_right = 10
    style.corner_radius_bottom_left = 10
    style.corner_radius_bottom_right = 10
    card.add_theme_stylebox_override("panel", style)

    var type_text: String = str(task.get("moduleLabel", ""))
    if type_text.is_empty():
        var type_labels: Dictionary = {"daily":"日任务", "weekly":"周任务", "repeat":"重复任务", "custom":"自定义任务", "urgent":"紧急任务"}
        type_text = str(type_labels.get(str(task.get("type", "custom")), "任务"))
    if str(task.get("source", "wife")) == "wife":
        type_text += " / 老婆发布"

    var head: Label = _label("%s    %s" % [type_text, str(STATUS_LABELS.get(str(task.get("status", "")), ""))], 10, Color("bba77f"))
    head.position = Vector2(14, 10)
    head.size = Vector2(260, 20)
    card.add_child(head)

    var title: Label = _label(str(task.get("title", "任务")), 16, Color("f3e2bd"))
    title.position = Vector2(14, 34)
    title.size = Vector2(250, 24)
    card.add_child(title)

    var description: Label = _label(str(task.get("description", "")), 11, Color("c7baa5"))
    description.position = Vector2(14, 60)
    description.size = Vector2(250, 38)
    description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    card.add_child(description)

    var money: int = _reward_money(task)
    var money_text: String = " · ¥%s" % money if money > 0 else ""
    var reward: Label = _label("奖励：+%s EXP%s" % [_reward_exp(task), money_text], 10, Color("d7b879"))
    reward.position = Vector2(14, 102)
    reward.size = Vector2(250, 20)
    card.add_child(reward)

    var deadline_text: String = str(task.get("deadline", ""))
    var time_config_value: Variant = task.get("timeConfig", {})
    if time_config_value is Dictionary:
        var time_config: Dictionary = time_config_value
        if not str(time_config.get("label", "")).is_empty():
            deadline_text = str(time_config.get("label", ""))
    var deadline: Label = _label(deadline_text, 9, Color("8e8069"))
    deadline.position = Vector2(14, 126)
    deadline.size = Vector2(190, 18)
    card.add_child(deadline)

    var action: Button = Button.new()
    var status: String = str(task.get("status", ""))
    if status == "todo":
        action.text = "开始执行"
        action.pressed.connect(_start_task.bind(str(task.get("id", ""))))
    elif status == "doing":
        action.text = "提交完成"
        action.pressed.connect(_submit_task.bind(str(task.get("id", ""))))
    elif status == "submitted":
        action.text = "等待确认"
        action.disabled = true
    elif status == "confirmed" or status == "completed":
        action.text = "已归档"
        action.disabled = true
    else:
        action.text = "查看记录"
        action.disabled = true
    action.add_theme_font_size_override("font_size", 10)
    action.position = Vector2(268, 92)
    action.size = Vector2(78, 44)
    card.add_child(action)
    return card

func _start_task(task_id: String) -> void:
    if GameState.is_syncing:
        return
    var next_state: Dictionary = GameState.state.duplicate(true)
    var tasks_value: Variant = next_state.get("tasks", [])
    if not tasks_value is Array:
        return
    var tasks: Array = tasks_value
    for index: int in range(tasks.size()):
        var task_value: Variant = tasks[index]
        if task_value is Dictionary:
            var task: Dictionary = task_value
            if str(task.get("id", "")) == task_id and str(task.get("status", "")) == "todo":
                task["status"] = "doing"
                tasks[index] = task
                break
    next_state["tasks"] = tasks
    GameState.save_remote(next_state)

func _submit_task(task_id: String) -> void:
    if GameState.is_syncing:
        return
    var next_state: Dictionary = GameState.state.duplicate(true)
    var tasks_value: Variant = next_state.get("tasks", [])
    if not tasks_value is Array:
        return
    var tasks: Array = tasks_value

    var submitted_at: String = Time.get_datetime_string_from_system()
    var submitted_title: String = ""
    var changed: bool = false
    for index: int in range(tasks.size()):
        var task_value: Variant = tasks[index]
        if task_value is Dictionary:
            var task: Dictionary = task_value
            if str(task.get("id", "")) == task_id and str(task.get("status", "")) == "doing":
                task["status"] = "submitted"
                task["submittedAt"] = submitted_at
                task["submitNote"] = "已完成，请老妞大人确认。"
                submitted_title = str(task.get("title", "任务"))
                tasks[index] = task
                changed = true
                break
    if not changed:
        return

    next_state["tasks"] = tasks
    var logs_value: Variant = next_state.get("logs", [])
    var logs: Array = logs_value if logs_value is Array else []
    logs.push_front({
        "id": "log-task-submitted-%s" % int(Time.get_unix_time_from_system() * 1000.0),
        "type": "task_submitted",
        "title": submitted_title,
        "description": "已完成，请老妞大人确认。",
        "taskId": task_id,
        "taskTitle": submitted_title,
        "createdAt": submitted_at,
    })
    next_state["logs"] = logs
    GameState.save_remote(next_state)

func _on_sync_status(message: String) -> void:
    if _status_label != null:
        _status_label.text = message

func _on_sync_failed(message: String) -> void:
    if _status_label != null:
        _status_label.text = "同步失败：%s" % message

func _load_backdrop() -> void:
    if _loaded_backdrop:
        return
    _loaded_backdrop = true
    var entry: Dictionary = {
        "url": "https://www.laoniulaoge.cn/assets/tasks/task-lv01.png",
        "format": "png",
        "version": 1,
    }
    var texture: Texture2D = await CloudAssetManager.load_texture("task-backdrop", entry)
    if texture != null:
        _backdrop.texture = texture

func _layout() -> void:
    if _root == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    _root.position = Vector2.ZERO
    _root.size = viewport_size
    _backdrop.position = Vector2.ZERO
    _backdrop.size = viewport_size

    for child: Node in _root.get_children():
        if child.has_meta("layout") and str(child.get_meta("layout")) == "swipe":
            var control: Control = child as Control
            if control != null:
                control.position = Vector2(20, 18)
                control.size = Vector2(viewport_size.x - 40, 24)

    _level_label.position = Vector2(22, 54)
    _level_label.size = Vector2(120, 20)
    _title_label.position = Vector2(22, 76)
    _title_label.size = Vector2(viewport_size.x - 44, 38)
    _overview_label.position = Vector2(22, 120)
    _overview_label.size = Vector2(viewport_size.x - 44, 38)

    _source_row.position = Vector2(18, 166)
    _source_row.size = Vector2(viewport_size.x - 36, 32)
    _filter_row.position = Vector2(10, 204)
    _filter_row.size = Vector2(viewport_size.x - 20, 32)

    _scroll.position = Vector2(18, 246)
    _scroll.size = Vector2(viewport_size.x - 36, viewport_size.y - 390)
    _list.custom_minimum_size = Vector2(_scroll.size.x - 8, 0)
    _month_label.position = Vector2(18, viewport_size.y - 130)
    _month_label.size = Vector2(viewport_size.x - 36, 26)
    _status_label.position = Vector2(18, viewport_size.y - 98)
    _status_label.size = Vector2(viewport_size.x - 36, 20)
