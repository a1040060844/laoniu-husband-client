extends Node

const ROLE_BGM_VOLUME_DB := -20.92
const ROLE_BGM_ROOT := "https://www.laoniulaoge.cn/assets/audio/bgm/roles"

var _last_page := -99
var _last_level := -1
var _was_husband_visible := false

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    GameState.changed.connect(_on_state_changed)

func _process(_delta: float) -> void:
    var scene := get_tree().current_scene
    if scene == null:
        return

    var husband_view = scene.get("husband_view")
    if not husband_view is Control:
        return

    var visible := husband_view.visible
    var page := int(scene.get("current_page")) if visible else -1
    var level := int(GameState.get_progress().get("level", 0))

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
    # Force the next process tick to re-evaluate the level-to-track mapping.
    _last_level = -1

func _play_role_bgm(level: int) -> void:
    var safe_level := clampi(level, 0, 11)
    var asset_id := "bgm-role-%02d" % safe_level
    var entry := {
        "url": "%s/%s.mp3" % [ROLE_BGM_ROOT, asset_id],
        "format": "mp3",
        "version": 1,
    }
    AudioManager.play_bgm_entry(asset_id, entry, ROLE_BGM_VOLUME_DB)
