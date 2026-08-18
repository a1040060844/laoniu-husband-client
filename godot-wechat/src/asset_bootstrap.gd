extends Node

signal cloud_assets_ready
signal cloud_assets_degraded(message: String)

const LOGIN_PREFETCH_ASSETS := [
    "background",
    "husband",
    "wife",
    "cat-blue",
    "cat-white",
    "card-husband",
    "card-wife",
    "title",
    "subtitle",
    "music-toggle",
]

var ready := false

func _ready() -> void:
    AssetManifest.manifest_loaded.connect(_on_manifest_loaded)
    AssetManifest.manifest_failed.connect(_on_manifest_failed)
    AssetManifest.load_manifest()

func _on_manifest_loaded(_data: Dictionary) -> void:
    ready = true
    cloud_assets_ready.emit()
    _prefetch_login_assets()

    var login_bgm := AssetManifest.get_audio_asset("bgm-login")
    if not login_bgm.is_empty() and not AssetManifest.resolve_url(login_bgm).is_empty():
        AudioManager.play_bgm("bgm-login")

func _on_manifest_failed(message: String) -> void:
    ready = false
    cloud_assets_degraded.emit(message)

func _prefetch_login_assets() -> void:
    for asset_name in LOGIN_PREFETCH_ASSETS:
        var entry := AssetManifest.get_login_asset(asset_name)
        if entry.is_empty() or AssetManifest.resolve_url(entry).is_empty():
            continue
        CloudAssetManager.load_bytes("login-%s" % asset_name, entry)
