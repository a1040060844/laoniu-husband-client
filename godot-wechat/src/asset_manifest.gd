extends Node

signal manifest_loaded(data: Dictionary)
signal manifest_failed(message: String)

const DEFAULT_MANIFEST_URL := "https://www.laoniulaoge.cn/game-assets/manifest.json"
const LOCAL_FALLBACK_PATH := "res://config/asset_manifest.example.json"

var manifest_url := DEFAULT_MANIFEST_URL
var data: Dictionary = {}
var loading := false

func _ready() -> void:
    var configured_url = ProjectSettings.get_setting(
        "laoniu/assets/manifest_url",
        DEFAULT_MANIFEST_URL
    )
    manifest_url = str(configured_url).strip_edges()

func load_manifest() -> void:
    if loading:
        return
    loading = true

    if manifest_url.is_empty():
        _finish_with_local_fallback("未配置云资源清单地址")
        return

    var request := HTTPRequest.new()
    add_child(request)
    var error := request.request(
        manifest_url,
        ["Accept: application/json"],
        HTTPClient.METHOD_GET
    )
    if error != OK:
        request.queue_free()
        _finish_with_local_fallback("无法发起资源清单请求：%s" % error_string(error))
        return

    var response = await request.request_completed
    request.queue_free()

    var result := int(response[0])
    var response_code := int(response[1])
    var body: PackedByteArray = response[3]

    if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
        _finish_with_local_fallback("云资源清单读取失败：HTTP %s" % response_code)
        return

    var parsed = JSON.parse_string(body.get_string_from_utf8())
    if not parsed is Dictionary:
        _finish_with_local_fallback("云资源清单不是有效 JSON 对象")
        return

    data = parsed
    loading = false
    manifest_loaded.emit(data)

func get_login_asset(name: String) -> Dictionary:
    return _nested_entry(["login", name])

func get_login_animations(character_id: String) -> Dictionary:
    return _nested_entry(["login", "animations", character_id])

func get_login_animation(character_id: String, action: String) -> Dictionary:
    return _nested_entry(["login", "animations", character_id, action])

func get_role_asset(level: int, name: String = "illustration") -> Dictionary:
    return _nested_entry(["roles", str(level), name])

func get_benefit_asset(level: int, name: String = "illustration") -> Dictionary:
    return _nested_entry(["benefits", str(level), name])

func get_wife_asset(name: String) -> Dictionary:
    return _nested_entry(["wife", name])

func get_audio_asset(name: String) -> Dictionary:
    return _nested_entry(["audio", name])

func resolve_url(entry: Dictionary) -> String:
    var raw_url := str(entry.get("url", "")).strip_edges()
    if raw_url.begins_with("https://") or raw_url.begins_with("http://"):
        return raw_url

    var path := str(entry.get("path", "")).strip_edges()
    if path.is_empty():
        return ""

    var base_url := str(data.get("base_url", "")).trim_suffix("/")
    if base_url.is_empty():
        return path
    return "%s/%s" % [base_url, path.trim_prefix("/")]

func cache_version(entry: Dictionary) -> String:
    return str(entry.get("version", data.get("version", "1")))

func asset_format(entry: Dictionary) -> String:
    var explicit := str(entry.get("format", "")).to_lower()
    if not explicit.is_empty():
        return explicit
    var path := str(entry.get("path", entry.get("url", "")))
    return path.get_extension().to_lower()

func _nested_entry(parts: Array[String]) -> Dictionary:
    var current: Variant = data
    for part in parts:
        if not current is Dictionary or not current.has(part):
            return {}
        current = current[part]
    return current if current is Dictionary else {}

func _finish_with_local_fallback(reason: String) -> void:
    var fallback := _read_local_manifest()
    loading = false
    if fallback.is_empty():
        manifest_failed.emit(reason)
        return
    data = fallback
    manifest_loaded.emit(data)

func _read_local_manifest() -> Dictionary:
    if not FileAccess.file_exists(LOCAL_FALLBACK_PATH):
        return {}
    var file := FileAccess.open(LOCAL_FALLBACK_PATH, FileAccess.READ)
    if file == null:
        return {}
    var parsed = JSON.parse_string(file.get_as_text())
    return parsed if parsed is Dictionary else {}
