extends Node

const MODES: Array[String] = ["live", "all_statuses", "empty", "stress", "modal_preview"]

var _mode: String = "live"
var _last_signature: String = ""

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    if not OS.is_debug_build():
        return
    call_deferred("_sync_mode")

func _input(event: InputEvent) -> void:
    if not OS.is_debug_build() or not event is InputEventKey:
        return
    var key_event: InputEventKey = event as InputEventKey
    if not key_event.pressed or key_event.echo:
        return
    match key_event.keycode:
        KEY_F2:
            set_mode("all_statuses")
        KEY_F3:
            set_mode("empty")
        KEY_F4:
            set_mode("stress")
        KEY_F5:
            set_mode("modal_preview")
        KEY_F7:
            reset()
        _:
            return
    get_viewport().set_input_as_handled()

func _process(_delta: float) -> void:
    if not OS.is_debug_build() or _mode == "live":
        return
    _sync_mode()

func set_mode(mode: String) -> void:
    if not OS.is_debug_build():
        return
    if not MODES.has(mode):
        print("Task fixture ignored: unknown mode=%s" % mode)
        return
    _mode = mode
    _last_signature = ""
    _sync_mode()
    print("Task fixture mode=%s (read-only, no save)" % _mode)

func reset() -> void:
    _mode = "live"
    _last_signature = ""
    var overlay: Node = get_node_or_null("/root/TaskVisualOverlay")
    if overlay != null and overlay.has_method("_on_state_changed"):
        overlay.call("_on_state_changed", GameState.state)
    print("Task fixture reset: live data restored")

func is_fixture_mode() -> bool:
    return OS.is_debug_build() and _mode != "live"

func current_mode() -> String:
    return _mode

func _sync_mode() -> void:
    var overlay: Node = get_node_or_null("/root/TaskVisualOverlay")
    if overlay == null or overlay.get("_root") == null:
        return
    var fixture_tasks: Array = _tasks_for_mode()
    var signature: String = "%s/%s/%s" % [_mode, str(fixture_tasks.size()), str(overlay.get("_filter"))]
    if signature == _last_signature and _cards_are_locked(overlay):
        return
    _last_signature = signature
    overlay.set("_tasks", fixture_tasks)
    if overlay.has_method("_rebuild_task_list"):
        overlay.call("_rebuild_task_list")
    _lock_fixture_actions(overlay)
    if _mode == "modal_preview":
        var preview_task: Dictionary = _first_task_with_status(fixture_tasks, "doing")
        if not preview_task.is_empty() and not bool(TaskSubmitModal.get("_root") != null and TaskSubmitModal.get("_root").visible):
            if TaskSubmitModal.has_method("open_preview"):
                TaskSubmitModal.call("open_preview", preview_task)

func _lock_fixture_actions(overlay: Node) -> void:
    var list_value: Variant = overlay.get("_list")
    if not list_value is VBoxContainer:
        return
    var list: VBoxContainer = list_value as VBoxContainer
    for child: Node in list.get_children():
        if not child is Panel:
            continue
        var card: Panel = child as Panel
        if card.name == "ParityMonthPanel" or card.get_child_count() < 6:
            continue
        var action: Button = card.get_child(5) as Button
        if action == null:
            continue
        action.disabled = true
        action.set_meta("task_fixture_locked", true)

func _cards_are_locked(overlay: Node) -> bool:
    var list_value: Variant = overlay.get("_list")
    if not list_value is VBoxContainer:
        return false
    for child: Node in (list_value as VBoxContainer).get_children():
        if child is Panel and (child as Panel).name != "ParityMonthPanel" and (child as Panel).get_child_count() >= 6:
            var action: Button = (child as Panel).get_child(5) as Button
            if action != null and not bool(action.get_meta("task_fixture_locked", false)):
                return false
    return true

func _tasks_for_mode() -> Array:
    match _mode:
        "empty":
            return []
        "stress":
            return _stress_tasks()
        "modal_preview":
            return _all_status_tasks()
        "all_statuses":
            return _all_status_tasks()
        _:
            return []

func _all_status_tasks() -> Array:
    var now: String = Time.get_datetime_string_from_system()
    return [
        _task("fixture-todo", "todo", "整理今日书房与案头文书", "将散落的文书按老妞大人的规矩重新归档。", "wife", 12, 0),
        _task("fixture-doing", "doing", "完成一份晚间汇报", "写下今日执行情况，说明遇到的问题与明日安排。", "wife", 20, 10),
        _task("fixture-submitted", "submitted", "清点本周家用账目", "核对账目并提交给老妞大人确认。", "daily", 16, 0),
        _task("fixture-confirmed", "confirmed", "按时准备早餐", "已完成并获得老妞大人确认。", "daily", 8, 6),
        _task("fixture-completed", "completed", "整理衣柜", "任务已经归档。", "wife", 10, 0),
        _task("fixture-failed", "failed", "完成拉伸训练", "未达到本次任务标准，等待重新裁定。", "daily", 6, 0),
        {"id":"fixture-repeat", "title":"重复任务进度示例", "description":"用于检查重复任务的进度行和多奖励胶囊。", "type":"repeat", "moduleLabel":"重复任务", "source":"wife", "status":"doing", "deadline":"今日 22:00 前", "repeatCount":5, "completedCount":2, "rewards":[{"type":"experience","value":15},{"type":"allowance","value":20},{"type":"benefit","value":1}], "rewardExp":15, "rewardMoney":20, "createdAt":now},
    ]

func _stress_tasks() -> Array:
    var task: Dictionary = _task("fixture-stress", "doing", "这是一条用于验证窄屏换行和任务卡高度的较长任务标题示例", "这是一段较长的任务说明，用来确认 390、376 和 314 宽度下，标题、说明、奖励、重复进度、结果文字以及操作区不会互相覆盖。", "wife", 35, 88)
    task["repeatCount"] = 9
    task["completedCount"] = 4
    task["resultText"] = "本轮结果：已完成主要步骤，等待老妞大人最终裁定。"
    task["rewards"] = [{"type":"experience","value":35},{"type":"allowance","value":88},{"type":"benefit","value":2}]
    return [task, _task("fixture-stress-2", "completed", "完成一条较长的已归档任务", "归档状态的长文案也需要保持可读和不裁切。", "daily", 24, 0)]

func _task(id: String, status: String, title: String, description: String, source: String, exp: int, money: int) -> Dictionary:
    return {
        "id": id,
        "title": title,
        "description": description,
        "type": "daily",
        "moduleLabel": "日任务",
        "source": source,
        "status": status,
        "deadline": "今日 22:00 前",
        "rewardExp": exp,
        "rewardMoney": money,
        "rewards": [{"type":"experience","value":exp}] if money <= 0 else [{"type":"experience","value":exp},{"type":"allowance","value":money}],
    }

func _first_task_with_status(tasks: Array, status: String) -> Dictionary:
    for value: Variant in tasks:
        if value is Dictionary and str((value as Dictionary).get("status", "")) == status:
            return value as Dictionary
    return {}
