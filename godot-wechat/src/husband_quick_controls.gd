extends Node

const RETURN_URL := "https://www.laoniulaoge.cn/assets/ui/return-login.png"
const MUSIC_URL := "https://www.laoniulaoge.cn/assets/ui/login-music-toggle.png"

var _canvas: CanvasLayer
var _root: Control
var _return_button: TextureButton
var _music_button: TextureButton

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount")

func _mount() -> void:
    _canvas = CanvasLayer.new()
    _canvas.layer = 80
    add_child(_canvas)

    _root = Control.new()
    _root.visible = false
    _root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _canvas.add_child(_root)

    _return_button = TextureButton.new()
    _return_button.ignore_texture_size = true
    _return_button.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
    _return_button.tooltip_text = "返回登录"
    _return_button.pressed.connect(_return_to_login)
    _root.add_child(_return_button)

    _music_button = TextureButton.new()
    _music_button.ignore_texture_size = true
    _music_button.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
    _music_button.tooltip_text = "音乐开关"
    _music_button.pressed.connect(_toggle_music)
    _root.add_child(_music_button)

    get_viewport().size_changed.connect(_layout)
    _load_texture(_return_button, RETURN_URL, "husband-return-login")
    _load_texture(_music_button, MUSIC_URL, "husband-music-toggle")
    _layout()
    _sync_music_visual()

func _process(_delta: float) -> void:
    if _root == null:
        return
    var scene := get_tree().current_scene
    if scene == null:
        _root.visible = false
        return
    var husband_view = scene.get("husband_view")
    var page_value = scene.get("current_page")
    _root.visible = husband_view is Control and husband_view.visible and int(page_value) == 1

func _load_texture(button: TextureButton, url: String, asset_id: String) -> void:
    var entry := {"url": url, "format": "png", "version": 1}
    var texture := await CloudAssetManager.load_texture(asset_id, entry)
    if texture != null and button != null:
        button.texture_normal = texture

func _layout() -> void:
    if _root == null:
        return
    var viewport_size := get_viewport().get_visible_rect().size
    _root.position = Vector2.ZERO
    _root.size = viewport_size

    var button_size := clamp(viewport_size.x * 0.115, 42.0, 54.0)
    _return_button.position = Vector2(14, 72)
    _return_button.size = Vector2(button_size, button_size)
    _music_button.position = Vector2(viewport_size.x - 14 - button_size, 72)
    _music_button.size = Vector2(button_size, button_size)

func _toggle_music() -> void:
    AudioManager.set_muted(not AudioManager.muted)
    _sync_music_visual()

func _sync_music_visual() -> void:
    if _music_button != null:
        _music_button.modulate = Color.WHITE if not AudioManager.muted else Color(1.0, 1.0, 1.0, 0.42)

func _return_to_login() -> void:
    var scene := get_tree().current_scene
    if scene == null:
        return
    var husband_view = scene.get("husband_view")
    if husband_view is Control:
        husband_view.visible = false
    var login_view = scene.get("login_view")
    if login_view is Control:
        login_view.visible = true

    if LoginVisualOverlay._root != null:
        LoginVisualOverlay._root.visible = true
    if LoginAnimationOverlay.has_method("_reset_login"):
        LoginAnimationOverlay.call("_reset_login")

    AudioManager.set_bgm_volume_db(-20.0)
    AudioManager.play_bgm("bgm-login")
