extends Control

signal visual_ready(character_id: String)
signal action_finished(character_id: String, action: String)
signal load_failed(character_id: String, action: String, message: String)

var character_id: String = ""
var actions: Dictionary = {}
var idle_action: String = "idle"
var current_action: String = ""

var _texture_rect: TextureRect = TextureRect.new()
var _sheet_texture: Texture2D
var _meta: Dictionary = {}
var _metrics: Dictionary = {}
var _entry: Dictionary = {}
var _frames: Array = []
var _frame_index: int = 0
var _frame_elapsed: float = 0.0
var _playing: bool = false
var _loop: bool = true
var _playback_rate: float = 1.0
var _fps: float = 5.0
var _scale: float = 1.0
var _visual_offset_y: float = 0.0
var _stabilize_bottom: bool = false
var _generation: int = 0
var _has_visual: bool = false

func _ready() -> void:
    mouse_filter = Control.MOUSE_FILTER_IGNORE
    _texture_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    _texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
    add_child(_texture_rect)

func configure(id_value: String, action_map: Dictionary, initial_action: String = "idle") -> void:
    character_id = id_value
    actions = action_map
    idle_action = initial_action
    if actions.has(initial_action):
        play_action(initial_action)

func play_idle() -> void:
    play_action(idle_action)

func play_action(action: String) -> void:
    if action.is_empty() or not actions.has(action):
        return
    _generation += 1
    var generation: int = _generation
    var entry_value: Variant = actions[action]
    if not entry_value is Dictionary:
        load_failed.emit(character_id, action, "动作配置不是对象")
        return
    var entry: Dictionary = entry_value
    await _load_action(action, entry, generation)

func has_action(action: String) -> bool:
    return actions.has(action)

func local_hit_rect() -> Rect2:
    if _metrics.is_empty():
        return Rect2(Vector2(-32, -96), Vector2(64, 96))
    var visible_value: Variant = _metrics.get("visibleBounds", {})
    var anchor_value: Variant = _metrics.get("anchor", {})
    if not visible_value is Dictionary or not anchor_value is Dictionary:
        return Rect2(Vector2(-32, -96), Vector2(64, 96))
    var visible: Dictionary = visible_value
    var anchor: Dictionary = anchor_value
    var left: float = (float(visible.get("x", 0.0)) - float(anchor.get("x", 0.0))) * _scale
    var top: float = (float(visible.get("y", 0.0)) - float(anchor.get("y", 0.0))) * _scale
    return Rect2(
        Vector2(left, top),
        Vector2(float(visible.get("w", 0.0)), float(visible.get("h", 0.0))) * _scale
    )

func _process(delta: float) -> void:
    if not _playing or _frames.is_empty():
        return
    _frame_elapsed += delta
    var duration: float = _frame_duration(_frame_index)
    if _frame_elapsed < duration:
        return
    _frame_elapsed -= duration
    var is_last: bool = _frame_index >= _frames.size() - 1
    if is_last and not _loop:
        _playing = false
        action_finished.emit(character_id, current_action)
        return
    _frame_index = 0 if is_last else _frame_index + 1
    _apply_frame()

func _load_action(action: String, entry: Dictionary, generation: int) -> void:
    var root_url: String = str(entry.get("root_url", "")).trim_suffix("/")
    if root_url.is_empty():
        load_failed.emit(character_id, action, "动作缺少 root_url")
        return

    var version: String = str(entry.get("version", 1))
    var sprite_entry: Dictionary = {
        "url": "%s/sprite.png" % root_url,
        "format": "png",
        "version": version,
    }
    var meta_entry: Dictionary = {
        "url": "%s/index.json" % root_url,
        "format": "json",
        "version": version,
    }
    var metrics_entry: Dictionary = {
        "url": "%s/metrics.json" % root_url,
        "format": "json",
        "version": version,
    }

    var prefix: String = "login-sprite-%s-%s" % [character_id, action]
    var texture: Texture2D = await CloudAssetManager.load_texture("%s-sheet" % prefix, sprite_entry)
    if generation != _generation:
        return
    var meta_bytes: PackedByteArray = await CloudAssetManager.load_bytes("%s-meta" % prefix, meta_entry)
    if generation != _generation:
        return
    var metrics_bytes: PackedByteArray = await CloudAssetManager.load_bytes("%s-metrics" % prefix, metrics_entry)
    if generation != _generation:
        return

    if texture == null or meta_bytes.is_empty() or metrics_bytes.is_empty():
        load_failed.emit(character_id, action, "Sprite Sheet 或元数据加载失败")
        return

    var meta_text: String = meta_bytes.get_string_from_utf8().trim_prefix("\uFEFF")
    var metrics_text: String = metrics_bytes.get_string_from_utf8().trim_prefix("\uFEFF")
    var parsed_meta: Variant = JSON.parse_string(meta_text)
    var parsed_metrics: Variant = JSON.parse_string(metrics_text)
    if not parsed_meta is Dictionary or not parsed_metrics is Dictionary:
        load_failed.emit(character_id, action, "Sprite Sheet 元数据 JSON 无效")
        return

    _sheet_texture = texture
    _meta = parsed_meta
    _metrics = parsed_metrics
    _entry = entry
    var frames_value: Variant = _meta.get("frames", [])
    _frames = frames_value if frames_value is Array else []
    if _frames.is_empty():
        load_failed.emit(character_id, action, "动作没有帧")
        return

    current_action = action
    _frame_index = 0
    _frame_elapsed = 0.0
    _loop = bool(entry.get("loop", true))
    _playback_rate = maxf(0.1, float(entry.get("playback_rate", 1.0)))
    _fps = maxf(1.0, float(entry.get("fps", 5.0)))
    _visual_offset_y = float(entry.get("visual_offset_y", 0.0))
    _stabilize_bottom = bool(entry.get("stabilize_bottom", false))
    _scale = _resolve_scale(entry)
    _playing = true
    _apply_frame()

    if not _has_visual:
        _has_visual = true
        visual_ready.emit(character_id)

func _resolve_scale(entry: Dictionary) -> float:
    var frame_size_value: Variant = _meta.get("frame_size", {})
    var visible_value: Variant = _metrics.get("visibleBounds", {})
    if not frame_size_value is Dictionary or not visible_value is Dictionary:
        return 1.0
    var frame_size: Dictionary = frame_size_value
    var visible: Dictionary = visible_value

    if entry.has("display_width"):
        return float(entry.get("display_width", 100.0)) / maxf(1.0, float(frame_size.get("w", 1.0)))

    var target_visual_height: float = float(entry.get("target_visual_height", 0.0))
    if target_visual_height > 0.0:
        var display_width: float = float(frame_size.get("w", 1.0)) * target_visual_height / maxf(1.0, float(visible.get("h", 1.0)))
        return display_width / maxf(1.0, float(frame_size.get("w", 1.0)))

    return 1.0

func _apply_frame() -> void:
    if _sheet_texture == null or _frames.is_empty():
        return
    var frame_value: Variant = _frames[_frame_index]
    if not frame_value is Dictionary:
        return
    var frame: Dictionary = frame_value
    var atlas: AtlasTexture = AtlasTexture.new()
    atlas.atlas = _sheet_texture
    atlas.region = Rect2(
        float(frame.get("x", 0.0)),
        float(frame.get("y", 0.0)),
        float(frame.get("w", 1.0)),
        float(frame.get("h", 1.0))
    )
    _texture_rect.texture = atlas
    _texture_rect.size = Vector2(float(frame.get("w", 1.0)), float(frame.get("h", 1.0))) * _scale

    var anchor_value: Variant = _metrics.get("anchor", {})
    var anchor: Vector2 = Vector2.ZERO
    if anchor_value is Dictionary:
        var anchor_dict: Dictionary = anchor_value
        anchor = Vector2(float(anchor_dict.get("x", 0.0)), float(anchor_dict.get("y", 0.0))) * _scale

    var y_offset: float = _visual_offset_y
    if _stabilize_bottom:
        var frame_bounds_value: Variant = _metrics.get("frameBounds", [])
        if frame_bounds_value is Array:
            var frame_bounds: Array = frame_bounds_value
            if _frame_index < frame_bounds.size():
                var bounds_value: Variant = frame_bounds[_frame_index]
                if bounds_value is Dictionary and anchor_value is Dictionary:
                    var bounds: Dictionary = bounds_value
                    var anchor_dict: Dictionary = anchor_value
                    var bottom: float = float(bounds.get("y", 0.0)) + float(bounds.get("h", 0.0))
                    y_offset += (float(anchor_dict.get("y", 0.0)) - bottom) * _scale

    _texture_rect.position = -anchor + Vector2(0.0, y_offset)

func _frame_duration(index: int) -> float:
    var fallback: float = 1.0 / _fps
    if index < 0 or index >= _frames.size() - 1:
        return fallback / _playback_rate
    var current_value: Variant = _frames[index]
    var next_value: Variant = _frames[index + 1]
    if not current_value is Dictionary or not next_value is Dictionary:
        return fallback / _playback_rate
    var current_frame: Dictionary = current_value
    var next_frame: Dictionary = next_value
    var time_delta: float = float(next_frame.get("t", 0.0)) - float(current_frame.get("t", 0.0))
    if time_delta <= 0.0:
        return fallback / _playback_rate
    var seconds: float = time_delta if time_delta < 10.0 else time_delta / 1000.0
    if seconds < 0.016 or seconds > 2.5:
        seconds = fallback
    return seconds / _playback_rate
