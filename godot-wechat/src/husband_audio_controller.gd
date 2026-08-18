extends Node

const ROLE_BGM_VOLUME_DB: float = -20.92
const ROLE_BGM_ROOT: String = "https://www.laoniulaoge.cn/assets/audio/bgm/roles"

var _last_page: int = -99
var _last_level: int = -1
var _was_husband_visible: bool = false

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    GameState.changed.connect(_on_state_changed)

func _process(_delta: float) -> void:
    var scene: Node = get_tree().current_scene
    if scene == null:
        return

    var husband_view_value: Variant = scene.get("husband_view")
    if not husband_view_value is Control:
        return
    var husband_view: Control = husband_view_value as Control

    var visible: bool = husband_view.visible
    var page: int = int(scene.get("current_page")) if visible else -1
    var progress: Dictionary = GameState.get_progress()
    var level: int = int(progress.get("level", 0))

    if visible == _was_husband_visible and page == _last_page and level == _last_level:
        return

    _was_husband_visible = visible
    _last_page = page
    _last_level = level

    if not visible:
        return

    if page == 0 or page == 1:
        _play_role_bgm(level)
    elif page == 2:
        AudioManager.stop_bgm()

func _on_state_changed(_state: Dictionary) -> void:
    _last_level = -1

func _play_role_bgm(level: int) -> void:
    var safe_level: int = clampi(level, 0, 11)
    var asset_id: String = "bgm-role-%02d" % safe_level
    var entry: Dictionary = {
        "url": "%s/%s.mp3" % [ROLE_BGM_ROOT, asset_id],
        "format": "mp3",
        "version": 1,
    }
    AudioManager.play_bgm_entry(asset_id, entry, ROLE_BGM_VOLUME_DB)
