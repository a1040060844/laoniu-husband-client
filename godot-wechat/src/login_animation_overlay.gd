extends Node

const LoginSpritePlayerScript = preload("res://src/login_sprite_player.gd")
const CHARACTER_IDS := ["husband", "wife", "cat-blue", "cat-white"]
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

var _players: Dictionary = {}
var _static_nodes: Dictionary = {}
var _last_drag_id := ""
var _mounted := false
var _elapsed := 0.0
var _next_idle_at: Dictionary = {}
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
        LoginVisualOverlay._husband_card.pressed.connect(_on_husband_card_pressed)

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

    _sync_drag_action()
    if LoginVisualOverlay._drag_id.is_empty():
        _run_weighted_idle_actions()

func _sync_drag_action() -> void:
    var drag_id: String = LoginVisualOverlay._drag_id
    if drag_id == _last_drag_id:
        return

    if not _last_drag_id.is_empty() and _players.has(_last_drag_id):
        _players[_last_drag_id].play_idle()
        _schedule_next(_last_drag_id)

    _last_drag_id = drag_id
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
        if not action.is_empty() and player.has_action(action):
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
    var delay := _rng.randf_range(7000.0, 14000.0) / 1000.0
    if character_id == "husband" or character_id == "wife":
        delay = _rng.randf_range(9000.0, 17000.0) / 1000.0
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
    if action == "select" and not LoginVisualOverlay._root.visible:
        return
    _players[character_id].play_idle()

func _on_load_failed(character_id: String, action: String, message: String) -> void:
    # Static PNG stays in place until the first animated frame is actually ready.
    print("Login animation fallback [%s/%s]: %s" % [character_id, action, message])

func _on_husband_card_pressed() -> void:
    if _players.has("husband"):
        var player = _players["husband"]
        if player.has_action("select"):
            player.play_action("select")
