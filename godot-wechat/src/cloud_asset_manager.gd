extends Node

signal asset_downloaded(asset_id: String, cache_path: String)
signal asset_failed(asset_id: String, message: String)

const CACHE_ROOT := "user://cloud-assets"

var _memory_textures: Dictionary = {}
var _memory_bytes: Dictionary = {}

func _ready() -> void:
    _ensure_cache_dir()

func load_texture(asset_id: String, entry: Dictionary) -> Texture2D:
    if entry.is_empty():
        return null

    var version := AssetManifest.cache_version(entry)
    var memory_key := "%s@%s" % [asset_id, version]
    if _memory_textures.has(memory_key):
        return _memory_textures[memory_key]

    var format := AssetManifest.asset_format(entry)
    var bytes := await load_bytes(asset_id, entry)
    if bytes.is_empty():
        return null

    var image := Image.new()
    var load_error := ERR_FILE_UNRECOGNIZED
    match format:
        "png":
            load_error = image.load_png_from_buffer(bytes)
        "webp":
            load_error = image.load_webp_from_buffer(bytes)
        "jpg", "jpeg":
            load_error = image.load_jpg_from_buffer(bytes)
        _:
            asset_failed.emit(asset_id, "暂不支持图片格式：%s" % format)
            return null

    if load_error != OK:
        asset_failed.emit(asset_id, "图片解码失败：%s" % error_string(load_error))
        return null

    var texture := ImageTexture.create_from_image(image)
    _memory_textures[memory_key] = texture
    return texture

func load_bytes(asset_id: String, entry: Dictionary) -> PackedByteArray:
    if entry.is_empty():
        return PackedByteArray()

    var version := AssetManifest.cache_version(entry)
    var memory_key := "%s@%s" % [asset_id, version]
    if _memory_bytes.has(memory_key):
        return _memory_bytes[memory_key]

    var format := AssetManifest.asset_format(entry)
    var cache_path := _cache_path(asset_id, version, format)
    if FileAccess.file_exists(cache_path):
        var cached := FileAccess.get_file_as_bytes(cache_path)
        if not cached.is_empty():
            _memory_bytes[memory_key] = cached
            return cached

    var url := AssetManifest.resolve_url(entry)
    if url.is_empty():
        return PackedByteArray()

    var downloaded := await _download(url)
    if downloaded.is_empty():
        asset_failed.emit(asset_id, "云资源下载失败：%s" % url)
        return PackedByteArray()

    _write_cache(cache_path, downloaded)
    _memory_bytes[memory_key] = downloaded
    asset_downloaded.emit(asset_id, cache_path)
    return downloaded

func clear_memory_cache() -> void:
    _memory_textures.clear()
    _memory_bytes.clear()

func cache_path_for(asset_id: String, entry: Dictionary) -> String:
    return _cache_path(
        asset_id,
        AssetManifest.cache_version(entry),
        AssetManifest.asset_format(entry)
    )

func _download(url: String) -> PackedByteArray:
    var request := HTTPRequest.new()
    add_child(request)
    request.timeout = 20.0

    var error := request.request(
        url,
        ["Accept: */*"],
        HTTPClient.METHOD_GET
    )
    if error != OK:
        request.queue_free()
        return PackedByteArray()

    var response = await request.request_completed
    request.queue_free()

    var result := int(response[0])
    var response_code := int(response[1])
    var body: PackedByteArray = response[3]
    if result != HTTPRequest.RESULT_SUCCESS:
        return PackedByteArray()
    if response_code < 200 or response_code >= 300:
        return PackedByteArray()
    return body

func _write_cache(path: String, bytes: PackedByteArray) -> void:
    _ensure_cache_dir()
    var file := FileAccess.open(path, FileAccess.WRITE)
    if file == null:
        return
    file.store_buffer(bytes)

func _cache_path(asset_id: String, version: String, format: String) -> String:
    var safe_id := asset_id
    for token in ["/", "\\", ":", "?", "&", "=", " "]:
        safe_id = safe_id.replace(token, "_")
    var extension := format if not format.is_empty() else "bin"
    return "%s/%s-v%s.%s" % [CACHE_ROOT, safe_id, version, extension]

func _ensure_cache_dir() -> void:
    var user_dir := DirAccess.open("user://")
    if user_dir == null:
        return
    if not user_dir.dir_exists("cloud-assets"):
        user_dir.make_dir_recursive("cloud-assets")
