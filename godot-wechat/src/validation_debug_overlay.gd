extends Node

var _canvas: CanvasLayer
var _panel: PanelContainer
var _status: Label
var _toggle: Button
var _actions: HBoxContainer
var _collapsed: bool = true
var _elapsed: float = 0.0

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    if not OS.is_debug_build():
        return
    call_deferred("_mount")

func _mount() -> void:
    _canvas = CanvasLayer.new()
    _canvas.layer = 300
    add_child(_canvas)

    _panel = PanelContainer.new()
    _panel.mouse_filter = Control.MOUSE_FILTER_STOP
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.02, 0.018, 0.015, 0.88)
    style.border_color = Color(0.82, 0.68, 0.42, 0.65)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 6
    style.corner_radius_top_right = 6
    style.corner_radius_bottom_left = 6
    style.corner_radius_bottom_right = 6
    style.content_margin_left = 8.0
    style.content_margin_right = 8.0
    style.content_margin_top = 7.0
    style.content_margin_bottom = 7.0
    _panel.add_theme_stylebox_override("panel", style)
    _canvas.add_child(_panel)

    var box: VBoxContainer = VBoxContainer.new()
    box.add_theme_constant_override("separation", 4)
    _panel.add_child(box)

    var header: HBoxContainer = HBoxContainer.new()
    box.add_child(header)

    var title: Label = Label.new()
    title.text = "验收"
    title.add_theme_font_size_override("font_size", 12)
    title.add_theme_color_override("font_color", Color("f3dfb7"))
    title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    header.add_child(title)

    _toggle = Button.new()
    _toggle.text = "展开"
    _toggle.focus_mode = Control.FOCUS_NONE
    _toggle.add_theme_font_size_override("font_size", 10)
    _toggle.pressed.connect(_toggle_panel)
    header.add_child(_toggle)

    _status = Label.new()
    _status.add_theme_font_size_override("font_size", 10)
    _status.add_theme_color_override("font_color", Color("d9c8a6"))
    _status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    _status.visible = false
    box.add_child(_status)

    _actions = HBoxContainer.new()
    _actions.add_theme_constant_override("separation", 6)
    _actions.visible = false
    box.add_child(_actions)

    var animation_test: Button = Button.new()
    animation_test.text = "动作测试"
    animation_test.focus_mode = Control.FOCUS_NONE
    animation_test.add_theme_font_size_override("font_size", 10)
    animation_test.pressed.connect(_run_animation_test)
    _actions.add_child(animation_test)

    var bubble_test: Button = Button.new()
    bubble_test.text = "重播气泡"
    bubble_test.focus_mode = Control.FOCUS_NONE
    bubble_test.add_theme_font_size_override("font_size", 10)
    bubble_test.pressed.connect(_replay_bubbles)
    _actions.add_child(bubble_test)

    if not AudioManager.bgm_changed.is_connected(_on_bgm_changed):
        AudioManager.bgm_changed.connect(_on_bgm_changed)
    if not AudioManager.audio_failed.is_connected(_on_audio_failed):
        AudioManager.audio_failed.connect(_on_audio_failed)

    get_viewport().size_changed.connect(_layout)
    _layout()
    _refresh_status()

func _process(delta: float) -> void:
    if _panel == null:
        return
    _elapsed += delta
    if _elapsed < 0.20:
        return
    _elapsed = 0.0
    _refresh_status()

func _layout() -> void:
    if _panel == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    if _collapsed:
        _panel.position = Vector2(6.0, 6.0)
        _panel.size = Vector2(112.0, 38.0)
    else:
        _panel.position = Vector2(6.0, 6.0)
        _panel.size = Vector2(viewport_size.x - 12.0, 236.0)

func _toggle_panel() -> void:
    _collapsed = not _collapsed
    _toggle.text = "展开" if _collapsed else "收起"
    if _status != null:
        _status.visible = not _collapsed
    if _actions != null:
        _actions.visible = not _collapsed
    _layout()

func _refresh_status() -> void:
    if _status == null:
        return

    var page_text: String = _page_text()
    var bgm_id: String = AudioManager.current_bgm_id()
    if bgm_id.is_empty():
        bgm_id = "none"
    var player_value: Variant = AudioManager.get("_bgm_player")
    var bgm_playing: bool = false
    var volume_db: float = -80.0
    if player_value is AudioStreamPlayer:
        var bgm_player: AudioStreamPlayer = player_value as AudioStreamPlayer
        bgm_playing = bgm_player.playing
        volume_db = bgm_player.volume_db

    var lines: Array[String] = []
    lines.append("页面：%s" % page_text)
    lines.append("BGM：%s | playing=%s | muted=%s | %.1f dB" % [bgm_id, str(bgm_playing), str(AudioManager.muted), volume_db])

    var players: Dictionary = {}
    var players_value: Variant = LoginAnimationOverlay.get("_players")
    if players_value is Dictionary:
        players = players_value as Dictionary

    for character_id: String in ["husband", "wife", "cat-blue", "cat-white"]:
        if not players.has(character_id):
            lines.append("%s：未创建" % character_id)
            continue
        var object_value: Variant = players[character_id]
        if not object_value is Object:
            lines.append("%s：对象无效" % character_id)
            continue
        var player: Object = object_value as Object
        var action: String = str(player.get("current_action"))
        var ready: bool = bool(player.get("_has_visual"))
        var playing: bool = bool(player.get("_playing"))
        lines.append("%s：%s | ready=%s | playing=%s" % [character_id, action, str(ready), str(playing)])

    var bubbles: Dictionary = {}
    var bubbles_value: Variant = LoginAnimationOverlay.get("_bubble_nodes")
    if bubbles_value is Dictionary:
        bubbles = bubbles_value as Dictionary
    var husband_bubble: bool = _bubble_visible(bubbles, "husband")
    var wife_bubble: bool = _bubble_visible(bubbles, "wife")
    lines.append("气泡：husband=%s | wife=%s" % [str(husband_bubble), str(wife_bubble)])
    _status.text = "\n".join(lines)

func _page_text() -> String:
    if LoginVisualOverlay._root != null and LoginVisualOverlay._root.visible:
        return "login"
    var scene: Node = get_tree().current_scene
    if scene == null:
        return "unknown"
    var page: int = int(scene.get("current_page"))
    match page:
        0:
            return "benefit"
        1:
            return "role"
        2:
            return "task"
        _:
            return "page-%s" % page

func _bubble_visible(bubbles: Dictionary, key: String) -> bool:
    if not bubbles.has(key):
        return false
    var value: Variant = bubbles[key]
    if value is CanvasItem:
        var item: CanvasItem = value as CanvasItem
        return item.visible
    return false

func _run_animation_test() -> void:
    if LoginVisualOverlay._root == null or not LoginVisualOverlay._root.visible:
        print("Validation animation test: login page is not active")
        return

    var players_value: Variant = LoginAnimationOverlay.get("_players")
    if not players_value is Dictionary:
        print("Validation animation test: players are not ready")
        return
    var players: Dictionary = players_value as Dictionary
    _play_test_action(players, "husband", "adjustGlasses")
    _play_test_action(players, "wife", "thinking")
    _play_test_action(players, "cat-blue", "lick")
    _play_test_action(players, "cat-white", "stretch")
    if LoginAnimationOverlay.has_method("_show_next_wife_thinking_bubble"):
        LoginAnimationOverlay.call("_show_next_wife_thinking_bubble")
    print("Validation animation test: husband=adjustGlasses wife=thinking blue=lick white=stretch")

func _play_test_action(players: Dictionary, character_id: String, action: String) -> void:
    if not players.has(character_id):
        return
    var object_value: Variant = players[character_id]
    if not object_value is Object:
        return
    var player: Object = object_value as Object
    if player.has_method("has_action") and bool(player.call("has_action", action)):
        player.call("play_action", action)

func _replay_bubbles() -> void:
    if LoginVisualOverlay._root == null or not LoginVisualOverlay._root.visible:
        print("Validation bubble replay: login page is not active")
        return
    if LoginAnimationOverlay.has_method("_play_login_intro"):
        LoginAnimationOverlay.call("_play_login_intro")
        print("Validation bubble replay: intro requested")

func _on_bgm_changed(asset_id: String) -> void:
    print("Validation BGM changed: %s" % asset_id)

func _on_audio_failed(asset_id: String, message: String) -> void:
    print("Validation audio failed [%s]: %s" % [asset_id, message])
