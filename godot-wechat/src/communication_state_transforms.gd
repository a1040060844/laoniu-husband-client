extends RefCounted
class_name CommunicationStateTransforms

## Pure, side-effect-free state transforms shared by the communication overlay
## and its acceptance tests. They never call GameState.save_remote().

static func mark_chat_read(source_state: Dictionary, timestamp: String) -> Dictionary:
    var next_state: Dictionary = source_state.duplicate(true)
    var raw_messages: Variant = next_state.get("chatMessages", [])
    if not raw_messages is Array:
        return next_state
    var messages: Array = raw_messages as Array
    for index: int in range(messages.size()):
        if not messages[index] is Dictionary:
            continue
        var message: Dictionary = (messages[index] as Dictionary).duplicate(true)
        if str(message.get("sender", "")) != "wife":
            continue
        var raw_read_by: Variant = message.get("readBy", [])
        var read_by: Array = raw_read_by as Array if raw_read_by is Array else []
        if not read_by.has("husband"):
            read_by.append("husband")
            message["readBy"] = read_by
            messages[index] = message
    next_state["chatMessages"] = messages
    return next_state

static func append_husband_message(source_state: Dictionary, text_value: String, timestamp: String, message_id: String) -> Dictionary:
    var next_state: Dictionary = source_state.duplicate(true)
    var raw_messages: Variant = next_state.get("chatMessages", [])
    var messages: Array = raw_messages as Array if raw_messages is Array else []
    messages.append({
        "id": message_id,
        "sender": "husband",
        "text": text_value,
        "createdAt": timestamp,
        "readBy": ["husband"],
    })
    next_state["chatMessages"] = messages
    return next_state

static func mark_notification(source_state: Dictionary, item: Dictionary, skipped: bool, timestamp: String) -> Dictionary:
    var next_state: Dictionary = source_state.duplicate(true)
    var decree_id: String = str(item.get("decreeId", ""))
    if not decree_id.is_empty():
        var raw_decrees: Variant = next_state.get("decrees", [])
        var decrees: Array = raw_decrees as Array if raw_decrees is Array else []
        for index: int in range(decrees.size()):
            if not decrees[index] is Dictionary:
                continue
            var decree: Dictionary = (decrees[index] as Dictionary).duplicate(true)
            if str(decree.get("id", "")) != decree_id:
                continue
            decree["acknowledgedAt" if skipped else "readAt"] = timestamp
            decrees[index] = decree
        next_state["decrees"] = decrees
        return next_state

    var raw_notifications: Variant = next_state.get("notifications", [])
    var notifications: Array = raw_notifications as Array if raw_notifications is Array else []
    var item_id: String = str(item.get("id", ""))
    for index: int in range(notifications.size()):
        if not notifications[index] is Dictionary:
            continue
        var notification: Dictionary = (notifications[index] as Dictionary).duplicate(true)
        if str(notification.get("id", "")) == item_id:
            notification["skippedAt" if skipped else "viewedAt"] = timestamp
            notifications[index] = notification
    next_state["notifications"] = notifications
    return next_state
