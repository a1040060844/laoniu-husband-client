extends SceneTree

func _init() -> void:
    var source: Dictionary = {
        "chatMessages": [
            {"id": "wife-1", "sender": "wife", "text": "hi", "readBy": []},
            {"id": "husband-1", "sender": "husband", "text": "ok", "readBy": ["husband"]},
        ],
        "notifications": [{"id": "notice-1", "viewedAt": null, "skippedAt": null}],
        "decrees": [{"id": "decree-1", "readAt": null, "acknowledgedAt": null}],
    }
    var read_state: Dictionary = CommunicationStateTransforms.mark_chat_read(source, "2026-09-22T10:00:00Z")
    _assert((read_state["chatMessages"] as Array)[0]["readBy"].has("husband"), "wife message is marked read")
    _assert((source["chatMessages"] as Array)[0]["readBy"].is_empty(), "mark read does not mutate source")

    var appended: Dictionary = CommunicationStateTransforms.append_husband_message(source, "new", "2026-09-22T10:01:00Z", "husband-2")
    _assert((appended["chatMessages"] as Array).size() == 3, "message is appended once")
    _assert((source["chatMessages"] as Array).size() == 2, "append does not mutate source")

    var viewed: Dictionary = CommunicationStateTransforms.mark_notification(source, {"id": "notice-1"}, false, "2026-09-22T10:02:00Z")
    _assert((viewed["notifications"] as Array)[0]["viewedAt"] == "2026-09-22T10:02:00Z", "notification is viewed")
    var skipped: Dictionary = CommunicationStateTransforms.mark_notification(source, {"decreeId": "decree-1"}, true, "2026-09-22T10:03:00Z")
    _assert((skipped["decrees"] as Array)[0]["acknowledgedAt"] == "2026-09-22T10:03:00Z", "decree is skipped")
    print("Communication state transforms: PASS")
    quit(0)

func _assert(condition: bool, message: String) -> void:
    if not condition:
        push_error("Communication state transforms: FAIL: %s" % message)
        quit(1)
