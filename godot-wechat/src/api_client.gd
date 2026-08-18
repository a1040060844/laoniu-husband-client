extends Node

signal state_loaded(state: Dictionary, revision: String)
signal state_saved(revision: String)
signal revision_conflict(revision: String)
signal request_failed(message: String)

@export var base_url: String = "https://www.laoniulaoge.cn"

var _http: HTTPRequest = HTTPRequest.new()
var _operation: String = ""

func _ready() -> void:
    add_child(_http)
    _http.request_completed.connect(_on_request_completed)

func load_state() -> void:
    if _http.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
        request_failed.emit("状态请求仍在进行中")
        return
    _operation = "load"
    var error: int = _http.request(
        "%s/api/state" % base_url,
        ["Accept: application/json"],
        HTTPClient.METHOD_GET
    )
    if error != OK:
        _operation = ""
        request_failed.emit("无法发起状态读取请求：%s" % error_string(error))

func save_state(state: Dictionary, revision: String = "") -> void:
    if _http.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
        request_failed.emit("状态请求仍在进行中")
        return
    _operation = "save"
    var payload: Dictionary = {"state": state}
    if not revision.is_empty():
        payload["revision"] = revision
    var body: String = JSON.stringify(payload)
    var error: int = _http.request(
        "%s/api/state" % base_url,
        ["Content-Type: application/json", "Accept: application/json"],
        HTTPClient.METHOD_PUT,
        body
    )
    if error != OK:
        _operation = ""
        request_failed.emit("无法发起状态保存请求：%s" % error_string(error))

func _on_request_completed(
    result: int,
    response_code: int,
    _headers: PackedStringArray,
    body: PackedByteArray
) -> void:
    var operation: String = _operation
    _operation = ""

    if result != HTTPRequest.RESULT_SUCCESS:
        request_failed.emit("网络请求失败：%s" % result)
        return

    var text: String = body.get_string_from_utf8()
    var parsed: Variant = JSON.parse_string(text)
    var payload: Dictionary = {}
    if parsed is Dictionary:
        payload = parsed

    if response_code == 409:
        revision_conflict.emit(str(payload.get("revision", "")))
        return

    if response_code < 200 or response_code >= 300:
        request_failed.emit(
            "服务器返回 %s：%s" % [response_code, str(payload.get("error", text))]
        )
        return

    if operation == "load":
        var raw_state: Variant = payload.get("state", {})
        var state: Dictionary = {}
        if raw_state is Dictionary:
            state = raw_state
        state_loaded.emit(state, str(payload.get("revision", "")))
    elif operation == "save":
        state_saved.emit(str(payload.get("revision", "")))
