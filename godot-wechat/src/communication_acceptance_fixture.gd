extends Node

signal mode_changed(mode: String)

const MODE_LIVE_READONLY: String = "live_readonly"
const MODE_UNREAD: String = "unread"
const MODE_EMPTY: String = "empty"
const MODE_STRESS: String = "stress"

var mode: String = MODE_LIVE_READONLY

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS

func _input(event: InputEvent) -> void:
    if not OS.is_debug_build() or not event is InputEventKey:
        return
    var key: InputEventKey = event as InputEventKey
    if not key.pressed or key.echo:
        return
    match key.keycode:
        KEY_F9:
            set_mode(MODE_UNREAD)
        KEY_F10:
            set_mode(MODE_EMPTY)
        KEY_F11:
            set_mode(MODE_STRESS)
        KEY_F12:
            reset()

func set_mode(next_mode: String) -> void:
    if not [MODE_LIVE_READONLY, MODE_UNREAD, MODE_EMPTY, MODE_STRESS].has(next_mode):
        return
    mode = next_mode
    print("Communication acceptance fixture: mode=%s" % mode)
    mode_changed.emit(mode)

func reset() -> void:
    set_mode(MODE_LIVE_READONLY)

func is_fixture_active() -> bool:
    return OS.is_debug_build() and mode != MODE_LIVE_READONLY

func writes_blocked() -> bool:
    return OS.is_debug_build()

func notifications(source_state: Dictionary) -> Array:
    if mode == MODE_EMPTY:
        return []
    if mode == MODE_UNREAD or mode == MODE_STRESS:
        return _fixture_notifications(mode == MODE_STRESS)

    var result: Array = []
    var raw_notifications: Variant = source_state.get("notifications", [])
    if raw_notifications is Array:
        for value: Variant in raw_notifications:
            if value is Dictionary:
                var item: Dictionary = (value as Dictionary).duplicate(true)
                if str(item.get("target", "")) == "husband":
                    result.append(item)
    var raw_decrees: Variant = source_state.get("decrees", [])
    if raw_decrees is Array:
        for value: Variant in raw_decrees:
            if not value is Dictionary:
                continue
            var decree: Dictionary = value as Dictionary
            if str(decree.get("target", "")) != "husband":
                continue
            result.append({
                "id": "decree:%s" % str(decree.get("id", result.size())),
                "target": "husband",
                "title": str(decree.get("title", "通知")),
                "text": str(decree.get("text", "")),
                "tone": str(decree.get("tone", "normal")),
                "createdAt": str(decree.get("createdAt", "")),
                "viewedAt": decree.get("readAt", null),
                "skippedAt": decree.get("acknowledgedAt", null),
                "decreeId": str(decree.get("id", "")),
            })
    return result

func chat_messages(source_state: Dictionary) -> Array:
    if mode == MODE_EMPTY:
        return []
    if mode == MODE_UNREAD or mode == MODE_STRESS:
        return _fixture_chat_messages(mode == MODE_STRESS)
    var raw: Variant = source_state.get("chatMessages", [])
    return raw.duplicate(true) if raw is Array else []

func _fixture_notifications(stress: bool) -> Array:
    var result: Array = [
        {
            "id": "fixture-notification-upgrade",
            "target": "husband",
            "source": "decree",
            "title": "老妞大人的新裁定",
            "text": "你的表现已被记录，请继续保持今日的服侍状态。",
            "tone": "upgrade",
            "createdAt": "2026-09-22T08:00:00.000Z",
        },
        {
            "id": "fixture-notification-normal",
            "target": "husband",
            "source": "story",
            "title": "一条新的留言",
            "text": "老妞大人留下一句提醒，等你回来查看。",
            "tone": "normal",
            "createdAt": "2026-09-22T09:00:00.000Z",
        },
    ]
    if stress:
        for index: int in range(3):
            result.append({
                "id": "fixture-notification-%s" % index,
                "target": "husband",
                "source": "monthly_allowance",
                "title": "本月赏赐状态提醒 %s" % (index + 1),
                "text": "这是一条用于检查长标题与长正文换行的验收通知。",
                "tone": "down" if index == 2 else "normal",
                "createdAt": "2026-09-22T0%s:00:00.000Z" % (index + 1),
            })
    return result

func _fixture_chat_messages(stress: bool) -> Array:
    var result: Array = [
        {"id":"fixture-chat-1", "sender":"wife", "text":"今日的任务已经放在任务簿里了。", "createdAt":"2026-09-22T08:10:00.000Z", "readBy":[]},
        {"id":"fixture-chat-2", "sender":"husband", "text":"收到，我会认真完成。", "createdAt":"2026-09-22T08:15:00.000Z", "readBy":["husband"]},
    ]
    if stress:
        result.append({"id":"fixture-chat-3", "sender":"wife", "text":"这是一条较长的留言，用于检查聊天抽屉在窄屏和多行文字下的换行、气泡宽度以及独立滚动行为。", "createdAt":"2026-09-22T08:20:00.000Z", "readBy":[]})
    return result
