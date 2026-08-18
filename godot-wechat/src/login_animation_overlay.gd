extends Node

const LoginSpritePlayerScript = preload("res://src/login_sprite_player.gd")
const CHARACTER_IDS := ["husband", "wife", "cat-blue", "cat-white"]
const SPEECH_ROOT := "https://raw.githubusercontent.com/a1040060844/laoniu-husband-client/main/husband-client/src/assets/login/speech"
const CAT_BLUE_WEIGHTED := [
    "blink", "blink", "blink", "blink",
    "lick", "lick", "lick", "lick", "lick",
    "tail", "tail", "tail", "tail",
    "yawn", "yawn", "yawn",
]
const CAT_WHITE_WEIGHTED := [
    "lookaround", "lookaround", "lookaround", "lookaround", "lookaround",
    "stretch", "stretch", "stretch", "stretch",
    "roll", "roll", "roll",
    "jump", "jump",
]
const HUSBAND_WEIGHTED := ["adjustGlasses"]
const WIFE_WEIGHTED := ["thinking"]
const WIFE_THINKING_FILES := [
    "speech-wife-response.png",
    "speech-husband-select.png",
    "speech-husband-idle.png",
]

var _players: Dictionary = {}
var _static_nodes: Dictionary = {}
var _bubble_nodes: Dictionary = {}
var _bubble_texture_cache: Dictionary = {}
var _last_drag_id := ""
var _mounted := false
var _selection_busy := false
var _elapsed := 0.0
var _next_idle_at: Dictionary = {}
var _wife_thinking_index := 0
var _rng := RandomNumberGenerator.new()

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    _rng.randomize()
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt in range(30):
        if LoginVisualOverlay._root != null:
            break
        await get_tree().process_frame
    if LoginVisualOverlay._root == null:
        return

    _static_nodes = LoginVisualOverlay._sprite_nodes
    _create_bubble_nodes()
    if AssetBootstrap.ready:
        _setup_players()
    else:
        AssetBootstrap.cloud_assets_ready.connect(_setup_players, CONNECT_ONE_SHOT)

func _setup_players() -> void:
    if _mounted:
        return
    _mounted = true

    for character_id in CHARACTER_IDS:
        var action_map := AssetManifest.get_login_animations(character_id)
        if action_map.is_empty():
            continue
        var player = LoginSpritePlayerScript.new()
        player.name = "Animated_%s" % character_id.replace("-", "_")
        player.visual_ready.connect(_on_visual_ready)
        player.action_finished.connect(_on_action_finished)
        player.load_failed.connect(_on_load_failed)
        LoginVisualOverlay._root.add_child(player)
        _players[character_id] = player
        _schedule_next(character_id)
        player.configure(character_id, action_map, "idle")

    if LoginVisualOverlay._husband_card != null:
        var direct_enter := Callable(LoginVisualOverlay, "_enter_husband")
        if LoginVisualOverlay._husband_card.pressed.is_connected(direct_enter):
            LoginVisualOverlay._husband_card.pressed.disconnect(direct_enter)
        LoginVisualOverlay._husband_card.pressed.connect(_begin_select_husband)

    _play_login_intro()

func _create_bubble_nodes() -> void:
    for target in ["husband", "wife"]:
        var bubble := TextureRect.new()
        bubble.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
        bubble.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
        bubble.mouse_filter = Control.MOUSE_FILTER_IGNORE
        bubble.z_index = 90
        bubble.visible = false
        LoginVisualOverlay._root.add_child(bubble)
        _bubble_nodes[target] = bubble

func _process(delta: float) -> void:
    if not _mounted or LoginVisualOverlay._root == null:
        return
    if not LoginVisualOverlay._root.visible:
        return

    _elapsed += delta
    var viewport_size := get_viewport().get_visible_rect().size
    for character_id in _players:
        var player = _players[character_id]
        var anchor_pct = LoginVisualOverlay._sprite_anchor_pct.get(character_id, Vector2(0.5, 0.5))
        player.position = Vector2(viewport_size.x * anchor_pct.x, viewport_size.y * anchor_pct.y)
        player.z_index = 10 + int(round(float(anchor_pct.y) * 100.0))

    _layout_bubbles(viewport_size)
    _sync_drag_action()
    if LoginVisualOverlay._drag_id.is_empty() and not _selection_busy:
        _run_weighted_idle_actions()

func _layout_bubbles(viewport_size: Vector2) -> void:
    for target in _bubble_nodes:
        var bubble = _bubble_nodes[target] as TextureRect
        if not bubble.visible:
            continue
        var anchor_pct = LoginVisualOverlay._sprite_anchor_pct.get(target, Vector2(0.5, 0.5))
        var anchor := Vector2(viewport_size.x * anchor_pct.x, viewport_size.y * anchor_pct.y)
        var width := 107.0
        if target == "wife" and bubble.has_meta("thinking"):
            width = 111.0
        var height := width * 0.55
        if bubble.texture != null:
            var tex_size := bubble.texture.get_size()
            if tex_size.x > 0.0:
                height = width * tex_size.y / tex_size.x
        bubble.size = Vector2(width, height)
        var offset_x := 40.0 if target == "wife" and bubble.has_meta("thinking") else 0.0
        bubble.position = anchor + Vector2(offset_x - width * 0.5, -188.0 - height)

func _sync_drag_action() -> void:
    var drag_id: String = LoginVisualOverlay._drag_id
    if drag_id == _last_drag_id:
        return

    if not _last_drag_id.is_empty() and _players.has(_last_drag_id):
        _players[_last_drag_id].play_idle()
        _schedule_next(_last_drag_id)

    _last_drag_id = drag_id
    if not drag_id.is_empty():
        _hide_bubble(drag_id)
    if not drag_id.is_empty() and _players.has(drag_id):
        var player = _players[drag_id]
        if player.has_action("drag"):
            player.play_action("drag")

func _run_weighted_idle_actions() -> void:
    for character_id in _players:
        if _elapsed < float(_next_idle_at.get(character_id, INF)):
            continue
        var player = _players[character_id]
        if player.current_action != "idle":
            continue
        var action := _pick_weighted_action(character_id)
        _schedule_next(character_id)
        if action.is_empty() or not player.has_action(action):
            continue
        if character_id == "wife" and action == "thinking":
            _show_next_wife_thinking_bubble()
        player.play_action(action)

func _pick_weighted_action(character_id: String) -> String:
    var choices: Array = []
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
    return str(choices[_rng.randi_range(0, choices.size() - 1)])

func _schedule_next(character_id: String) -> void:
    var delay := _rng.randf_range(7.0, 14.0)
    if character_id == "husband" or character_id == "wife":
        delay = _rng.randf_range(9.0, 17.0)
    _next_idle_at[character_id] = _elapsed + delay

func _on_visual_ready(character_id: String) -> void:
    if not _static_nodes.has(character_id):
        return
    var static_node = _static_nodes[character_id]
    if static_node is CanvasItem:
        static_node.modulate.a = 0.0

func _on_action_finished(character_id: String, action: String) -> void:
    if not _players.has(character_id):
        return
    if LoginVisualOverlay._drag_id == character_id:
        return

    if character_id == "wife" and action == "thinking":
        await get_tree().create_timer(0.5).timeout
        _hide_bubble("wife")

    if _selection_busy and character_id == "husband" and action == "select":
        await get_tree().create_timer(0.5).timeout
        _hide_all_bubbles()
        LoginVisualOverlay._enter_husband()
        return

    if action != "select" or not _selection_busy:
        _players[character_id].play_idle()

func _on_load_failed(character_id: String, action: String, message: String) -> void:
    print("Login animation fallback [%s/%s]: %s" % [character_id, action, message])

func _begin_select_husband() -> void:
    if _selection_busy or LoginVisualOverlay._root == null or not LoginVisualOverlay._root.visible:
        return
    _selection_busy = true
    LoginVisualOverlay._husband_card.disabled = true
    LoginVisualOverlay._wife_card.disabled = true
    LoginVisualOverlay._drag_id = ""
    _hide_all_bubbles()

    if _players.has("husband") and _players["husband"].has_action("select"):
        _players["husband"].play_action("select")
    if _players.has("wife") and _players["wife"].has_action("response"):
        _players["wife"].play_action("response")

    await get_tree().create_timer(0.1).timeout
    _show_bubble("husband", "thought-wife-food-1.png", false)

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
    var file_name := WIFE_THINKING_FILES[_wife_thinking_index % WIFE_THINKING_FILES.size()]
    _wife_thinking_index += 1
    _show_bubble("wife", file_name, true)

func _show_bubble(target: String, file_name: String, thinking: bool) -> void:
    if not _bubble_nodes.has(target):
        return
    var texture := await _load_speech_texture(file_name)
    if texture == null:
        return
    var bubble = _bubble_nodes[target] as TextureRect
    bubble.texture = texture
    if thinking:
        bubble.set_meta("thinking", true)
    elif bubble.has_meta("thinking"):
        bubble.remove_meta("thinking")
    bubble.visible = true

func _load_speech_texture(file_name: String) -> Texture2D:
    if _bubble_texture_cache.has(file_name):
        return _bubble_texture_cache[file_name]
    var entry := {
        "url": "%s/%s" % [SPEECH_ROOT, file_name],
        "format": "png",
        "version": 1,
    }
    var texture := await CloudAssetManager.load_texture("login-speech-%s" % file_name, entry)
    if texture != null:
        _bubble_texture_cache[file_name] = texture
    return texture

func _hide_bubble(target: String) -> void:
    if _bubble_nodes.has(target):
        _bubble_nodes[target].visible = false

func _hide_all_bubbles() -> void:
    for target in _bubble_nodes:
        _bubble_nodes[target].visible = false
