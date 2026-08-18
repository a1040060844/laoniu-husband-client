extends Node

const LoginSpritePlayerScript = preload("res://src/login_sprite_player.gd")
const CHARACTER_IDS: Array[String] = ["husband", "wife", "cat-blue", "cat-white"]
const SPEECH_ROOT: String = "https://raw.githubusercontent.com/a1040060844/laoniu-husband-client/main/husband-client/src/assets/login/speech"
const RESET_URL: String = "https://raw.githubusercontent.com/a1040060844/laoniu-husband-client/main/husband-client/src/assets/login/reset-button.png"
const CAT_BLUE_WEIGHTED: Array[String] = [
    "blink", "blink", "blink", "blink",
    "lick", "lick", "lick", "lick", "lick",
    "tail", "tail", "tail", "tail",
    "yawn", "yawn", "yawn",
]
const CAT_WHITE_WEIGHTED: Array[String] = [
    "lookaround", "lookaround", "lookaround", "lookaround", "lookaround",
    "stretch", "stretch", "stretch", "stretch",
    "roll", "roll", "roll",
    "jump", "jump",
]
const HUSBAND_WEIGHTED: Array[String] = ["adjustGlasses"]
const WIFE_WEIGHTED: Array[String] = ["thinking"]
const WIFE_THINKING_FILES: Array[String] = [
    "speech-wife-response.png",
    "speech-husband-select.png",
    "speech-husband-idle.png",
]

var _players: Dictionary = {}
var _static_nodes: Dictionary = {}
var _bubble_nodes: Dictionary = {}
var _bubble_texture_cache: Dictionary = {}
var _reset_button: TextureButton
var _last_drag_id: String = ""
var _mounted: bool = false
var _selection_busy: bool = false
var _elapsed: float = 0.0
var _next_idle_at: Dictionary = {}
var _wife_thinking_index: int = 0
var _rng: RandomNumberGenerator = RandomNumberGenerator.new()

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    _rng.randomize()
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt: int in range(30):
        if LoginVisualOverlay._root != null:
            break
        await get_tree().process_frame
    if LoginVisualOverlay._root == null:
        return

    _static_nodes = LoginVisualOverlay._sprite_nodes
    _create_bubble_nodes()
    _create_reset_button()
    if AssetBootstrap.assets_ready:
        _setup_players()
    else:
        AssetBootstrap.cloud_assets_ready.connect(_setup_players, CONNECT_ONE_SHOT)

func _player_for(character_id: String) -> LoginSpritePlayer:
    if not _players.has(character_id):
        return null
    return _players[character_id] as LoginSpritePlayer

func _setup_players() -> void:
    if _mounted:
        return
    _mounted = true

    for character_id: String in CHARACTER_IDS:
        var action_map: Dictionary = AssetManifest.get_login_animations(character_id)
        if action_map.is_empty():
            continue
        var player: LoginSpritePlayer = LoginSpritePlayerScript.new() as LoginSpritePlayer
        if player == null:
            continue
        player.name = "Animated_%s" % character_id.replace("-", "_")
        player.visual_ready.connect(_on_visual_ready)
        player.action_finished.connect(_on_action_finished)
        player.load_failed.connect(_on_load_failed)
        LoginVisualOverlay._root.add_child(player)
        _players[character_id] = player
        _schedule_next(character_id)
        player.configure(character_id, action_map, "idle")

    if LoginVisualOverlay._husband_card != null:
        var direct_enter: Callable = Callable(LoginVisualOverlay, "_enter_husband")
        if LoginVisualOverlay._husband_card.pressed.is_connected(direct_enter):
            LoginVisualOverlay._husband_card.pressed.disconnect(direct_enter)
        LoginVisualOverlay._husband_card.pressed.connect(_begin_select_husband)

    _play_login_intro()

func _create_bubble_nodes() -> void:
    for target: String in ["husband", "wife"]:
        var bubble: TextureRect = TextureRect.new()
        bubble.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
        bubble.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
        bubble.mouse_filter = Control.MOUSE_FILTER_IGNORE
        bubble.z_index = 90
        bubble.visible = false
        LoginVisualOverlay._root.add_child(bubble)
        _bubble_nodes[target] = bubble

func _create_reset_button() -> void:
    _reset_button = TextureButton.new()
    _reset_button.ignore_texture_size = true
    _reset_button.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
    _reset_button.z_index = 125
    _reset_button.pressed.connect(_reset_login)
    LoginVisualOverlay._root.add_child(_reset_button)
    _load_reset_texture()

func _load_reset_texture() -> void:
    var entry: Dictionary = {"url": RESET_URL, "format": "png", "version": 1}
    var texture: Texture2D = await CloudAssetManager.load_texture("login-reset-button", entry)
    if texture != null and _reset_button != null:
        _reset_button.texture_normal = texture

func _process(delta: float) -> void:
    if not _mounted or LoginVisualOverlay._root == null:
        return
    if not LoginVisualOverlay._root.visible:
        return

    _elapsed += delta
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    for character_value: Variant in _players.keys():
        var character_id: String = str(character_value)
        var player: LoginSpritePlayer = _player_for(character_id)
        if player == null:
            continue
        var anchor_value: Variant = LoginVisualOverlay._sprite_anchor_pct.get(character_id, Vector2(0.5, 0.5))
        var anchor_pct: Vector2 = Vector2(0.5, 0.5)
        if anchor_value is Vector2:
            anchor_pct = anchor_value
        player.position = Vector2(viewport_size.x * anchor_pct.x, viewport_size.y * anchor_pct.y)
        player.z_index = 10 + int(round(anchor_pct.y * 100.0))

    _layout_bubbles(viewport_size)
    _layout_reset_button(viewport_size)
    _sync_drag_action()
    if LoginVisualOverlay._drag_id.is_empty() and not _selection_busy:
        _run_weighted_idle_actions()

func _layout_reset_button(viewport_size: Vector2) -> void:
    if _reset_button == null:
        return
    var button_size: float = clampf(viewport_size.x * 0.102, 42.0, 57.0)
    var base_position: Vector2 = Vector2(viewport_size.x - 46.0 - button_size, 164.0)
    _reset_button.position = base_position + Vector2(0.0, sin((_elapsed - 0.65) * TAU / 3.4) * 6.0)
    _reset_button.size = Vector2(button_size, button_size)

func _layout_bubbles(viewport_size: Vector2) -> void:
    for target_value: Variant in _bubble_nodes.keys():
        var target: String = str(target_value)
        var bubble: TextureRect = _bubble_nodes[target] as TextureRect
        if bubble == null or not bubble.visible:
            continue
        var anchor_value: Variant = LoginVisualOverlay._sprite_anchor_pct.get(target, Vector2(0.5, 0.5))
        var anchor_pct: Vector2 = Vector2(0.5, 0.5)
        if anchor_value is Vector2:
            anchor_pct = anchor_value
        var anchor: Vector2 = Vector2(viewport_size.x * anchor_pct.x, viewport_size.y * anchor_pct.y)
        var width: float = 107.0
        if target == "wife" and bubble.has_meta("thinking"):
            width = 111.0
        var height: float = width * 0.55
        if bubble.texture != null:
            var tex_size: Vector2 = bubble.texture.get_size()
            if tex_size.x > 0.0:
                height = width * tex_size.y / tex_size.x
        bubble.size = Vector2(width, height)
        var offset_x: float = 40.0 if target == "wife" and bubble.has_meta("thinking") else 0.0
        bubble.position = anchor + Vector2(offset_x - width * 0.5, -188.0 - height)

func _sync_drag_action() -> void:
    var drag_id: String = str(LoginVisualOverlay._drag_id)
    if drag_id == _last_drag_id:
        return

    if not _last_drag_id.is_empty():
        var previous_player: LoginSpritePlayer = _player_for(_last_drag_id)
        if previous_player != null:
            previous_player.play_idle()
            _schedule_next(_last_drag_id)

    _last_drag_id = drag_id
    if not drag_id.is_empty():
        _hide_bubble(drag_id)
        var player: LoginSpritePlayer = _player_for(drag_id)
        if player != null and player.has_action("drag"):
            player.play_action("drag")

func _run_weighted_idle_actions() -> void:
    for character_value: Variant in _players.keys():
        var character_id: String = str(character_value)
        if _elapsed < float(_next_idle_at.get(character_id, INF)):
            continue
        var player: LoginSpritePlayer = _player_for(character_id)
        if player == null or player.current_action != "idle":
            continue
        var action: String = _pick_weighted_action(character_id)
        _schedule_next(character_id)
        if action.is_empty() or not player.has_action(action):
            continue
        if character_id == "wife" and action == "thinking":
            _show_next_wife_thinking_bubble()
        player.play_action(action)

func _pick_weighted_action(character_id: String) -> String:
    var choices: Array[String] = []
    match character_id:
        "husband":
            choices = HUSBAND_WEIGHTED
        "wife":
            choices = WIFE_WEIGHTED
        "cat-blue":
            choices = CAT_BLUE_WEIGHTED
        "cat-white":
            choices = CAT_WHITE_WEIGHTED
    if choices.is_empty():
        return ""
    return choices[_rng.randi_range(0, choices.size() - 1)]

func _schedule_next(character_id: String) -> void:
    var delay: float = _rng.randf_range(7.0, 14.0)
    if character_id == "husband" or character_id == "wife":
        delay = _rng.randf_range(9.0, 17.0)
    _next_idle_at[character_id] = _elapsed + delay

func _on_visual_ready(character_id: String) -> void:
    if not _static_nodes.has(character_id):
        return
    var static_node: Variant = _static_nodes[character_id]
    if static_node is CanvasItem:
        static_node.modulate.a = 0.0

func _on_action_finished(character_id: String, action: String) -> void:
    var player: LoginSpritePlayer = _player_for(character_id)
    if player == null:
        return
    if str(LoginVisualOverlay._drag_id) == character_id:
        return

    if character_id == "wife" and action == "thinking":
        await get_tree().create_timer(0.5).timeout
        _hide_bubble("wife")

    if _selection_busy and character_id == "husband" and action == "select":
        await get_tree().create_timer(0.5).timeout
        _complete_husband_selection()
        return

    if action != "select" or not _selection_busy:
        player.play_idle()

func _on_load_failed(character_id: String, action: String, message: String) -> void:
    print("Login animation fallback [%s/%s]: %s" % [character_id, action, message])

func _begin_select_husband() -> void:
    if _selection_busy or LoginVisualOverlay._root == null or not LoginVisualOverlay._root.visible:
        return
    _selection_busy = true
    LoginVisualOverlay._husband_card.disabled = true
    LoginVisualOverlay._wife_card.disabled = true
    if _reset_button != null:
        _reset_button.disabled = true
    LoginVisualOverlay._drag_id = ""
    _hide_all_bubbles()

    var husband_player: LoginSpritePlayer = _player_for("husband")
    if husband_player != null and husband_player.has_action("select"):
        husband_player.play_action("select")
    var wife_player: LoginSpritePlayer = _player_for("wife")
    if wife_player != null and wife_player.has_action("response"):
        wife_player.play_action("response")

    _selection_fallback()
    await get_tree().create_timer(0.1).timeout
    _show_bubble("husband", "thought-wife-food-1.png", false)

func _selection_fallback() -> void:
    await get_tree().create_timer(7.0).timeout
    if _selection_busy and LoginVisualOverlay._root != null and LoginVisualOverlay._root.visible:
        _complete_husband_selection()

func _complete_husband_selection() -> void:
    if not _selection_busy:
        return
    _selection_busy = false
    _hide_all_bubbles()
    LoginVisualOverlay._enter_husband()

func _reset_login() -> void:
    if _selection_busy:
        return
    LoginVisualOverlay._drag_id = ""
    _last_drag_id = ""
    LoginVisualOverlay._sprite_anchor_pct["husband"] = Vector2(0.38, 0.65)
    LoginVisualOverlay._sprite_anchor_pct["wife"] = Vector2(0.59, 0.65)
    LoginVisualOverlay._sprite_anchor_pct["cat-blue"] = Vector2(0.51, 0.74)
    LoginVisualOverlay._sprite_anchor_pct["cat-white"] = Vector2(0.63, 0.76)
    LoginVisualOverlay._fade.color.a = 0.0
    LoginVisualOverlay._husband_card.disabled = false
    LoginVisualOverlay._wife_card.disabled = true
    if _reset_button != null:
        _reset_button.disabled = false
    _wife_thinking_index = 0
    _hide_all_bubbles()
    for character_value: Variant in _players.keys():
        var character_id: String = str(character_value)
        var player: LoginSpritePlayer = _player_for(character_id)
        if player != null:
            player.play_idle()
            _schedule_next(character_id)
    LoginVisualOverlay._layout()
    _play_login_intro()

func _play_login_intro() -> void:
    await get_tree().create_timer(0.3).timeout
    if _selection_busy or LoginVisualOverlay._root == null or not LoginVisualOverlay._root.visible:
        return
    _show_bubble("wife", "speech-wife-login.png", false)
    await get_tree().create_timer(0.3).timeout
    if _selection_busy:
        return
    _show_bubble("husband", "speech-husband-login.png", false)
    await get_tree().create_timer(3.6).timeout
    if not _selection_busy:
        _hide_all_bubbles()

func _show_next_wife_thinking_bubble() -> void:
    var file_name: String = WIFE_THINKING_FILES[_wife_thinking_index % WIFE_THINKING_FILES.size()]
    _wife_thinking_index += 1
    _show_bubble("wife", file_name, true)

func _show_bubble(target: String, file_name: String, thinking: bool) -> void:
    if not _bubble_nodes.has(target):
        return
    var texture: Texture2D = await _load_speech_texture(file_name)
    if texture == null:
        return
    var bubble: TextureRect = _bubble_nodes[target] as TextureRect
    if bubble == null:
        return
    bubble.texture = texture
    if thinking:
        bubble.set_meta("thinking", true)
    elif bubble.has_meta("thinking"):
        bubble.remove_meta("thinking")
    bubble.visible = true

func _load_speech_texture(file_name: String) -> Texture2D:
    if _bubble_texture_cache.has(file_name):
        return _bubble_texture_cache[file_name] as Texture2D
    var entry: Dictionary = {
        "url": "%s/%s" % [SPEECH_ROOT, file_name],
        "format": "png",
        "version": 1,
    }
    var texture: Texture2D = await CloudAssetManager.load_texture("login-speech-%s" % file_name, entry)
    if texture != null:
        _bubble_texture_cache[file_name] = texture
    return texture

func _hide_bubble(target: String) -> void:
    if _bubble_nodes.has(target):
        var bubble: TextureRect = _bubble_nodes[target] as TextureRect
        if bubble != null:
            bubble.visible = false

func _hide_all_bubbles() -> void:
    for target_value: Variant in _bubble_nodes.keys():
        var bubble: TextureRect = _bubble_nodes[target_value] as TextureRect
        if bubble != null:
            bubble.visible = false
