extends Node

signal changed(state: Dictionary)
signal sync_status_changed(message: String)
signal sync_failed(message: String)

var state: Dictionary = {}
var revision: String = ""
var is_syncing: bool = false

func _ready() -> void:
    ApiClient.state_loaded.connect(_on_state_loaded)
    ApiClient.state_saved.connect(_on_state_saved)
    ApiClient.revision_conflict.connect(_on_revision_conflict)
    ApiClient.request_failed.connect(_on_request_failed)

func load_remote() -> void:
    if is_syncing:
        return
    is_syncing = true
    sync_status_changed.emit("正在同步服务器状态…")
    ApiClient.load_state()

func save_remote(next_state: Dictionary) -> void:
    if is_syncing:
        return
    state = next_state.duplicate(true)
    is_syncing = true
    sync_status_changed.emit("正在保存…")
    ApiClient.save_state(state, revision)

func get_progress() -> Dictionary:
    var raw: Variant = state.get("progress", state)
    if raw is Dictionary:
        return raw
    return {}

func _on_state_loaded(next_state: Dictionary, next_revision: String) -> void:
    state = next_state.duplicate(true)
    revision = next_revision
    is_syncing = false
    changed.emit(state)
    sync_status_changed.emit("服务器状态已同步")

func _on_state_saved(next_revision: String) -> void:
    revision = next_revision
    is_syncing = false
    changed.emit(state)
    sync_status_changed.emit("状态已保存")

func _on_revision_conflict(next_revision: String) -> void:
    revision = next_revision
    is_syncing = false
    sync_status_changed.emit("检测到另一端更新，正在重新读取…")
    load_remote()

func _on_request_failed(message: String) -> void:
    is_syncing = false
    sync_failed.emit(message)
    sync_status_changed.emit("同步失败")
