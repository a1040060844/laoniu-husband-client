extends Node

signal manifest_loaded(data: Dictionary)
signal manifest_failed(message: String)

const DEFAULT_MANIFEST_URL: String = "https://www.laoniulaoge.cn/game-assets/manifest.json"
const LOCAL_FALLBACK_PATH: String = "res://config/asset_manifest.example.json"

var manifest_url: String = DEFAULT_MANIFEST_URL
var data: Dictionary = {}
var loading: bool = false
var remote_loaded: bool = false
var local_fallback_loaded: bool = false
var last_manifest_message: String = "尚未加载"

func _ready() -> void:
    var configured_url: Variant = ProjectSettings.get_setting(
        "laoniu/assets/manifest_url",
        DEFAULT_MANIFEST_URL
    )
    manifest_url = str(configured_url).strip_edges()

func load_manifest() -> void:
    if loading:
        return
    loading = true
    remote_loaded = false
    local_fallback_loaded = false
    last_manifest_message = "正在加载资源清单"

    var fallback: Dictionary = _read_local_manifest()
    local_fallback_loaded = not fallback.is_empty()

    if manifest_url.is_empty():
        _finish_with_local_fallback("未配置云资源清单地址", fallback)
        return

    var request: HTTPRequest = HTTPRequest.new()
    request.timeout = 12.0
    add_child(request)
    var error: int = request.request(
        manifest_url,
        ["Accept: application/json"],
        HTTPClient.METHOD_GET
    )
    if error != OK:
        request.queue_free()
        _finish_with_local_fallback(
            "无法发起资源清单请求：%s" % error_string(error),
            fallback
        )
        return

    var response: Array = await request.request_completed
    request.queue_free()

    var result: int = int(response[0])
    var response_code: int = int(response[1])
    var body: PackedByteArray = response[3]

    if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
        _finish_with_local_fallback(
            "云资源清单读取失败：result=%s HTTP=%s" % [result, response_code],
            fallback
        )
        return

    var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
    if not parsed is Dictionary:
        _finish_with_local_fallback("云资源清单不是有效 JSON 对象", fallback)
        return

    var remote: Dictionary = parsed as Dictionary
    remote_loaded = true
    if fallback.is_empty():
        data = remote
        last_manifest_message = "远程清单已加载（无本地 fallback）"
    else:
        data = _deep_merge(fallback, remote)
        last_manifest_message = "远程清单已加载，并补齐本地 fallback"

    loading = false
    print(
        "Asset manifest ready: remote=%s fallback=%s animations=%s bgm-login=%s" % [
            str(remote_loaded),
            str(local_fallback_loaded),
            _animation_entry_count(),
            str(not get_audio_asset("bgm-login").is_empty()),
        ]
    )
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
    var raw_url: String = str(entry.get("url", "")).strip_edges()
    if raw_url.begins_with("https://") or raw_url.begins_with("http://"):
        return raw_url

    var path: String = str(entry.get("path", "")).strip_edges()
    if path.is_empty():
        return ""

    var base_url: String = str(data.get("base_url", "")).trim_suffix("/")
    if base_url.is_empty():
        return path
    return "%s/%s" % [base_url, path.trim_prefix("/")]

func cache_version(entry: Dictionary) -> String:
    return str(entry.get("version", data.get("version", "1")))

func asset_format(entry: Dictionary) -> String:
    var explicit: String = str(entry.get("format", "")).to_lower()
    if not explicit.is_empty():
        return explicit
    var path: String = str(entry.get("path", entry.get("url", "")))
    return path.get_extension().to_lower()

func _nested_entry(parts: Array[String]) -> Dictionary:
    var current: Variant = data
    for part: String in parts:
        if not current is Dictionary:
            return {}
        var current_dict: Dictionary = current as Dictionary
        if not current_dict.has(part):
            return {}
        current = current_dict[part]
    if current is Dictionary:
        return current as Dictionary
    return {}

func _finish_with_local_fallback(reason: String, fallback: Dictionary = {}) -> void:
    var resolved_fallback: Dictionary = fallback
    if resolved_fallback.is_empty():
        resolved_fallback = _read_local_manifest()
    local_fallback_loaded = not resolved_fallback.is_empty()
    loading = false
    if resolved_fallback.is_empty():
        last_manifest_message = reason
        manifest_failed.emit(reason)
        return
    data = resolved_fallback
    last_manifest_message = "%s；已使用本地 fallback" % reason
    print(
        "Asset manifest fallback: %s animations=%s bgm-login=%s" % [
            reason,
            _animation_entry_count(),
            str(not get_audio_asset("bgm-login").is_empty()),
        ]
    )
    manifest_loaded.emit(data)

func _read_local_manifest() -> Dictionary:
    if not FileAccess.file_exists(LOCAL_FALLBACK_PATH):
        return {}
    var file: FileAccess = FileAccess.open(LOCAL_FALLBACK_PATH, FileAccess.READ)
    if file == null:
        return {}
    var parsed: Variant = JSON.parse_string(file.get_as_text())
    if parsed is Dictionary:
        return parsed as Dictionary
    return {}

func _deep_merge(base: Dictionary, override: Dictionary) -> Dictionary:
    var merged: Dictionary = base.duplicate(true)
    for key_value: Variant in override.keys():
        var key: String = str(key_value)
        var incoming: Variant = override[key_value]
        if merged.has(key) and merged[key] is Dictionary and incoming is Dictionary:
            merged[key] = _deep_merge(merged[key] as Dictionary, incoming as Dictionary)
        else:
            merged[key] = incoming
    return merged

func _animation_entry_count() -> int:
    var total: int = 0
    for character_id: String in ["husband", "wife", "cat-blue", "cat-white"]:
        total += get_login_animations(character_id).size()
    return total
