extends Node

signal bgm_changed(asset_id: String)
signal audio_failed(asset_id: String, message: String)

var _bgm_player := AudioStreamPlayer.new()
var _sfx_player := AudioStreamPlayer.new()
var _current_bgm_id := ""
var _bgm_generation := 0
var bgm_volume_db := -10.0
var sfx_volume_db := -4.0
var muted := false

func _ready() -> void:
    _bgm_player.name = "BGM"
    _sfx_player.name = "SFX"
    add_child(_bgm_player)
    add_child(_sfx_player)
    _bgm_player.volume_db = bgm_volume_db
    _sfx_player.volume_db = sfx_volume_db

func play_bgm(asset_id: String) -> void:
    var entry := AssetManifest.get_audio_asset(asset_id)
    if entry.is_empty():
        audio_failed.emit(asset_id, "资源清单中不存在该 BGM")
        return
    play_bgm_entry(asset_id, entry, bgm_volume_db)

func play_bgm_entry(asset_id: String, entry: Dictionary, volume_db_value: float = -10.0) -> void:
    if asset_id == _current_bgm_id and _bgm_player.playing:
        set_bgm_volume_db(volume_db_value)
        return

    _bgm_generation += 1
    var generation := _bgm_generation
    var stream := await _stream_from_entry(asset_id, entry, true)
    if generation != _bgm_generation or stream == null:
        return

    _current_bgm_id = asset_id
    bgm_volume_db = volume_db_value
    _bgm_player.stop()
    _bgm_player.stream = stream
    _bgm_player.volume_db = -80.0 if muted else bgm_volume_db
    _bgm_player.play()
    bgm_changed.emit(asset_id)

func play_sfx(asset_id: String) -> void:
    var entry := AssetManifest.get_audio_asset(asset_id)
    if entry.is_empty():
        audio_failed.emit(asset_id, "资源清单中不存在该音效")
        return

    var stream := await _stream_from_entry(asset_id, entry, false)
    if stream == null:
        return

    _sfx_player.stream = stream
    _sfx_player.volume_db = -80.0 if muted else sfx_volume_db
    _sfx_player.play()

func stop_bgm() -> void:
    _bgm_generation += 1
    _bgm_player.stop()
    _current_bgm_id = ""

func current_bgm_id() -> String:
    return _current_bgm_id

func set_muted(value: bool) -> void:
    muted = value
    _bgm_player.volume_db = -80.0 if muted else bgm_volume_db
    _sfx_player.volume_db = -80.0 if muted else sfx_volume_db

func set_bgm_volume_db(value: float) -> void:
    bgm_volume_db = value
    if not muted:
        _bgm_player.volume_db = value

func set_sfx_volume_db(value: float) -> void:
    sfx_volume_db = value
    if not muted:
        _sfx_player.volume_db = value

func _stream_from_entry(
    asset_id: String,
    entry: Dictionary,
    should_loop: bool
) -> AudioStream:
    var bytes := await CloudAssetManager.load_bytes(asset_id, entry)
    if bytes.is_empty():
        audio_failed.emit(asset_id, "音频下载或缓存读取失败")
        return null

    var format := AssetManifest.asset_format(entry)
    match format:
        "mp3":
            var stream := AudioStreamMP3.load_from_buffer(bytes)
            if stream == null:
                audio_failed.emit(asset_id, "MP3 解码失败")
                return null
            stream.loop = should_loop
            return stream
        "wav":
            var stream := AudioStreamWAV.load_from_buffer(bytes)
            if stream == null:
                audio_failed.emit(asset_id, "WAV 解码失败")
                return null
            return stream
        _:
            audio_failed.emit(asset_id, "PoC 暂不支持音频格式：%s" % format)
            return null
