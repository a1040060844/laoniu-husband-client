extends Node

const RETURN_URL: String = "https://www.laoniulaoge.cn/assets/ui/return-login.png"
const MUSIC_URL: String = "https://www.laoniulaoge.cn/assets/ui/login-music-toggle.png"

var _canvas: CanvasLayer
var _root: Control
var _return_button: TextureButton
var _music_button: TextureButton
var _notification_button: Button
var _chat_button: Button
var _notification_badge: Label
var _chat_badge: Label

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

    _notification_button = _compact_button("通知", "bell")
    _notification_button.pressed.connect(_open_notifications)
    _root.add_child(_notification_button)
    _notification_badge = _badge()
    _root.add_child(_notification_badge)

    _chat_button = _compact_button("聊天留言", "send")
    _chat_button.pressed.connect(_open_chat)
    _root.add_child(_chat_button)
    _chat_badge = _badge()
    _root.add_child(_chat_badge)

    get_viewport().size_changed.connect(_layout)
    _load_texture(_return_button, RETURN_URL, "husband-return-login")
    _load_texture(_music_button, MUSIC_URL, "husband-music-toggle")
    _layout()
    _sync_music_visual()

func _process(_delta: float) -> void:
    if _root == null:
        return
    var scene: Node = get_tree().current_scene
    if scene == null:
        _root.visible = false
        return
    var husband_view_value: Variant = scene.get("husband_view")
    var page_value: Variant = scene.get("current_page")
    _root.visible = husband_view_value is Control and husband_view_value.visible and int(page_value) == 1
    _refresh_badges()

func _load_texture(button: TextureButton, url: String, asset_id: String) -> void:
    var entry: Dictionary = {"url": url, "format": "png", "version": 1}
    var texture: Texture2D = await CloudAssetManager.load_texture(asset_id, entry)
    if texture != null:
        button.texture_normal = texture

func _layout() -> void:
    if _root == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    _root.position = Vector2.ZERO
    _root.size = viewport_size

    var button_size: float = clampf(viewport_size.x * 0.115, 42.0, 54.0)
    _return_button.position = Vector2(14, 72)
    _return_button.size = Vector2(button_size, button_size)
    # Keep the three compact controls in one right-side stack. This mirrors
    # the Web quick-control grouping and prevents the chat button from
    # occluding the music toggle on 376/314-wide windows.
    _music_button.position = Vector2(viewport_size.x - 14 - button_size, 106)
    _music_button.size = Vector2(button_size, button_size)

    var compact_width: float = clampf(viewport_size.x * 0.19, 62.0, 78.0)
    _notification_button.position = Vector2(viewport_size.x - compact_width - 14.0, 42.0)
    _notification_button.size = Vector2(compact_width, 28.0)
    _chat_button.position = Vector2(viewport_size.x - compact_width - 14.0, 74.0)
    _chat_button.size = Vector2(compact_width, 28.0)
    _notification_badge.position = Vector2(viewport_size.x - 23.0, 37.0)
    _notification_badge.size = Vector2(16.0, 16.0)
    _chat_badge.position = Vector2(viewport_size.x - 23.0, 69.0)
    _chat_badge.size = Vector2(16.0, 16.0)

func _toggle_music() -> void:
    AudioManager.set_muted(not AudioManager.muted)
    _sync_music_visual()

func _sync_music_visual() -> void:
    if _music_button != null:
        _music_button.modulate = Color.WHITE if not AudioManager.muted else Color(1.0, 1.0, 1.0, 0.42)

func _compact_button(text_value: String, icon_key: String) -> Button:
    var button: Button = Button.new()
    button.text = text_value
    button.icon = load("res://assets/task-icons/%s.svg" % icon_key)
    button.add_theme_font_size_override("font_size", 11)
    button.add_theme_color_override("font_color", Color("f8dfac"))
    button.add_theme_color_override("font_hover_color", Color("fff0c8"))
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.08, 0.06, 0.035, 0.88)
    style.border_color = Color(0.90, 0.78, 0.55, 0.42)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 7
    style.corner_radius_top_right = 7
    style.corner_radius_bottom_left = 7
    style.corner_radius_bottom_right = 7
    style.shadow_color = Color(0.0, 0.0, 0.0, 0.48)
    style.shadow_size = 8
    button.add_theme_stylebox_override("normal", style)
    return button

func _badge() -> Label:
    var badge: Label = Label.new()
    badge.text = ""
    badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    badge.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    badge.add_theme_font_size_override("font_size", 10)
    badge.add_theme_color_override("font_color", Color("fff3de"))
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color("8f1d17")
    style.border_color = Color(1.0, 0.78, 0.60, 0.9)
    style.set_border_width_all(1)
    style.set_corner_radius_all(8)
    style.shadow_color = Color(0.0, 0.0, 0.0, 0.55)
    style.shadow_size = 5
    badge.add_theme_stylebox_override("normal", style)
    badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
    return badge

func _refresh_badges() -> void:
    if _notification_badge == null or _chat_badge == null:
        return
    var notification_count: int = 0
    for value: Variant in CommunicationAcceptanceFixture.notifications(GameState.state):
        if value is Dictionary:
            var item: Dictionary = value as Dictionary
            if item.get("viewedAt", null) == null and item.get("skippedAt", null) == null:
                notification_count += 1
    var chat_count: int = 0
    for value: Variant in CommunicationAcceptanceFixture.chat_messages(GameState.state):
        if value is Dictionary:
            var message: Dictionary = value as Dictionary
            if str(message.get("sender", "")) == "wife":
                var read_by: Variant = message.get("readBy", [])
                if not read_by is Array or not (read_by as Array).has("husband"):
                    chat_count += 1
    _notification_badge.text = str(mini(notification_count, 9)) if notification_count > 0 else ""
    _chat_badge.text = str(mini(chat_count, 9)) if chat_count > 0 else ""
    _notification_badge.visible = notification_count > 0
    _chat_badge.visible = chat_count > 0

func _open_notifications() -> void:
    HusbandCommunicationOverlay.open_notifications()

func _open_chat() -> void:
    HusbandCommunicationOverlay.open_chat()

func _return_to_login() -> void:
    var scene: Node = get_tree().current_scene
    if scene == null:
        return
    var husband_view_value: Variant = scene.get("husband_view")
    if husband_view_value is Control:
        husband_view_value.visible = false
    var login_view_value: Variant = scene.get("login_view")
    if login_view_value is Control:
        login_view_value.visible = true

    if LoginVisualOverlay._root != null:
        LoginVisualOverlay._root.visible = true
    if LoginAnimationOverlay.has_method("_reset_login"):
        LoginAnimationOverlay.call("_reset_login")

    AudioManager.set_bgm_volume_db(-20.0)
    AudioManager.play_bgm("bgm-login")
