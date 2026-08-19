extends Node

const DRAG_LIFT: float = 12.0

var _mounted: bool = false
var _static_groups: Dictionary = {}
var _sprite_shadow_groups: Dictionary = {}
var _bubble_shadows: Dictionary = {}
var _warm_fade: ColorRect

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt: int in range(120):
        if LoginVisualOverlay._root != null and LoginAnimationOverlay._mounted:
            break
        await get_tree().process_frame

    if LoginVisualOverlay._root == null:
        return

    _create_static_shadows()
    _create_bubble_shadows()
    _create_warm_exit_overlay()
    _mounted = true

func _process(_delta: float) -> void:
    if not _mounted or LoginVisualOverlay._root == null:
        return
    if not LoginVisualOverlay._root.visible:
        return

    _ensure_sprite_shadows()
    _sync_static_shadows()
    _sync_sprite_shadows()
    _sync_bubble_shadows()
    _sync_warm_exit_overlay()

func _create_static_shadows() -> void:
    _static_groups["title"] = _create_root_shadow_group([
        {"offset": Vector2(0.0, 7.0), "color": Color(0.0, 0.0, 0.0, 0.78), "z": 104},
        {"offset": Vector2(-4.0, 0.0), "color": Color(0.89, 0.56, 0.13, 0.055), "z": 103},
        {"offset": Vector2(4.0, 0.0), "color": Color(0.89, 0.56, 0.13, 0.055), "z": 103},
        {"offset": Vector2(0.0, -4.0), "color": Color(0.89, 0.56, 0.13, 0.055), "z": 103},
        {"offset": Vector2(0.0, 4.0), "color": Color(0.89, 0.56, 0.13, 0.055), "z": 103},
    ])
    _static_groups["subtitle"] = _create_root_shadow_group([
        {"offset": Vector2(0.0, 2.0), "color": Color(0.0, 0.0, 0.0, 0.28), "z": 104},
        {"offset": Vector2(-2.0, 3.0), "color": Color(0.0, 0.0, 0.0, 0.12), "z": 103},
        {"offset": Vector2(2.0, 3.0), "color": Color(0.0, 0.0, 0.0, 0.12), "z": 103},
    ])
    _static_groups["husband-card"] = _create_root_shadow_group(_card_shadow_specs())
    _static_groups["wife-card"] = _create_root_shadow_group(_card_shadow_specs())
    _static_groups["reset"] = _create_root_shadow_group(_button_shadow_specs(false))
    _static_groups["music"] = _create_root_shadow_group(_button_shadow_specs(true))

func _card_shadow_specs() -> Array:
    return [
        {"offset": Vector2(0.0, 9.0), "color": Color(0.0, 0.0, 0.0, 0.18), "z": 118},
        {"offset": Vector2(-3.0, 10.0), "color": Color(0.0, 0.0, 0.0, 0.11), "z": 118},
        {"offset": Vector2(3.0, 10.0), "color": Color(0.0, 0.0, 0.0, 0.11), "z": 118},
        {"offset": Vector2(0.0, 13.0), "color": Color(0.0, 0.0, 0.0, 0.08), "z": 118},
    ]

func _button_shadow_specs(with_glow: bool) -> Array:
    var specs: Array = [
        {"offset": Vector2(0.0, 5.0), "color": Color(0.0, 0.0, 0.0, 0.20), "z": 123},
        {"offset": Vector2(-2.0, 6.0), "color": Color(0.0, 0.0, 0.0, 0.10), "z": 123},
        {"offset": Vector2(2.0, 6.0), "color": Color(0.0, 0.0, 0.0, 0.10), "z": 123},
        {"offset": Vector2(0.0, 8.0), "color": Color(0.0, 0.0, 0.0, 0.08), "z": 123},
    ]
    if with_glow:
        specs.append({"offset": Vector2(-3.0, 0.0), "color": Color(1.0, 0.63, 0.09, 0.045), "z": 124})
        specs.append({"offset": Vector2(3.0, 0.0), "color": Color(1.0, 0.63, 0.09, 0.045), "z": 124})
        specs.append({"offset": Vector2(0.0, -3.0), "color": Color(1.0, 0.63, 0.09, 0.045), "z": 124})
        specs.append({"offset": Vector2(0.0, 3.0), "color": Color(1.0, 0.63, 0.09, 0.045), "z": 124})
    return specs

func _create_root_shadow_group(specs: Array) -> Array:
    var group: Array = []
    for spec_value: Variant in specs:
        if not spec_value is Dictionary:
            continue
        var spec: Dictionary = spec_value
        var shadow: TextureRect = _shadow_rect()
        shadow.modulate = spec.get("color", Color(0.0, 0.0, 0.0, 0.2)) as Color
        shadow.z_index = int(spec.get("z", 0))
        shadow.set_meta("shadow_offset", spec.get("offset", Vector2.ZERO))
        LoginVisualOverlay._root.add_child(shadow)
        group.append(shadow)
    return group

func _shadow_rect() -> TextureRect:
    var shadow: TextureRect = TextureRect.new()
    shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
    shadow.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    shadow.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
    shadow.show_behind_parent = false
    return shadow

func _sync_static_shadows() -> void:
    _sync_root_group("title", LoginVisualOverlay._title, LoginVisualOverlay._title.texture)
    _sync_root_group("subtitle", LoginVisualOverlay._subtitle, LoginVisualOverlay._subtitle.texture)

    var husband_texture: Texture2D = _button_visual_texture(LoginVisualOverlay._husband_card)
    _sync_root_group("husband-card", LoginVisualOverlay._husband_card, husband_texture, 1.10)
    _sync_root_group("wife-card", LoginVisualOverlay._wife_card, _button_visual_texture(LoginVisualOverlay._wife_card))

    if LoginAnimationOverlay._reset_button != null:
        _sync_root_group("reset", LoginAnimationOverlay._reset_button, _button_visual_texture(LoginAnimationOverlay._reset_button))
    _sync_root_group("music", LoginVisualOverlay._music_button, _button_visual_texture(LoginVisualOverlay._music_button))

func _sync_root_group(key: String, source: Control, texture: Texture2D, visual_scale: float = 1.0) -> void:
    if source == null or texture == null or not _static_groups.has(key):
        return
    var group_value: Variant = _static_groups[key]
    if not group_value is Array:
        return
    var group: Array = group_value
    var size_value: Vector2 = source.size * visual_scale
    var visual_origin: Vector2 = source.position - (size_value - source.size) * 0.5

    for shadow_value: Variant in group:
        if not shadow_value is TextureRect:
            continue
        var shadow: TextureRect = shadow_value as TextureRect
        var offset_value: Variant = shadow.get_meta("shadow_offset", Vector2.ZERO)
        var offset: Vector2 = offset_value as Vector2 if offset_value is Vector2 else Vector2.ZERO
        shadow.texture = texture
        shadow.size = size_value
        shadow.position = visual_origin + offset
        shadow.visible = source.visible

func _button_visual_texture(button: TextureButton) -> Texture2D:
    if button == null:
        return null
    if button.texture_normal != null:
        return button.texture_normal
    for child: Node in button.get_children():
        if child is TextureRect:
            var image: TextureRect = child as TextureRect
            if image.texture != null:
                return image.texture
    return null

func _ensure_sprite_shadows() -> void:
    var players_value: Variant = LoginAnimationOverlay.get("_players")
    if not players_value is Dictionary:
        return
    var players: Dictionary = players_value as Dictionary

    for id_value: Variant in players.keys():
        var character_id: String = str(id_value)
        if _sprite_shadow_groups.has(character_id):
            continue
        var player_value: Variant = players[character_id]
        if not player_value is LoginSpritePlayer:
            continue
        var player: LoginSpritePlayer = player_value as LoginSpritePlayer
        var group: Array = []
        for spec: Dictionary in _sprite_shadow_specs():
            var shadow: TextureRect = _shadow_rect()
            shadow.modulate = spec["color"] as Color
            shadow.z_index = -1
            shadow.set_meta("shadow_offset", spec["offset"])
            player.add_child(shadow)
            group.append(shadow)
        _sprite_shadow_groups[character_id] = group

func _sprite_shadow_specs() -> Array[Dictionary]:
    return [
        {"offset": Vector2(0.0, 7.0), "color": Color(0.0, 0.0, 0.0, 0.16)},
        {"offset": Vector2(-2.0, 9.0), "color": Color(0.0, 0.0, 0.0, 0.10)},
        {"offset": Vector2(2.0, 9.0), "color": Color(0.0, 0.0, 0.0, 0.10)},
        {"offset": Vector2(0.0, 11.0), "color": Color(0.0, 0.0, 0.0, 0.06)},
    ]

func _sync_sprite_shadows() -> void:
    var players_value: Variant = LoginAnimationOverlay.get("_players")
    if not players_value is Dictionary:
        return
    var players: Dictionary = players_value as Dictionary
    var drag_id: String = str(LoginVisualOverlay._drag_id)

    for id_value: Variant in players.keys():
        var character_id: String = str(id_value)
        var player_value: Variant = players[character_id]
        if not player_value is LoginSpritePlayer:
            continue
        var player: LoginSpritePlayer = player_value as LoginSpritePlayer
        var source_value: Variant = player.get("_texture_rect")
        if not source_value is TextureRect:
            continue
        var source: TextureRect = source_value as TextureRect

        var is_dragging: bool = drag_id == character_id
        if is_dragging:
            player.position.y -= DRAG_LIFT

        var group_value: Variant = _sprite_shadow_groups.get(character_id, [])
        if not group_value is Array:
            continue
        var group: Array = group_value
        for shadow_value: Variant in group:
            if not shadow_value is TextureRect:
                continue
            var shadow: TextureRect = shadow_value as TextureRect
            var base_offset_value: Variant = shadow.get_meta("shadow_offset", Vector2.ZERO)
            var base_offset: Vector2 = base_offset_value as Vector2 if base_offset_value is Vector2 else Vector2.ZERO
            var offset: Vector2 = base_offset
            if is_dragging:
                offset.y += 9.0
            shadow.texture = source.texture
            shadow.size = source.size
            shadow.position = source.position + offset
            shadow.visible = source.visible

func _create_bubble_shadows() -> void:
    var bubbles_value: Variant = LoginAnimationOverlay.get("_bubble_nodes")
    if not bubbles_value is Dictionary:
        return
    var bubbles: Dictionary = bubbles_value as Dictionary
    for target_value: Variant in bubbles.keys():
        var target: String = str(target_value)
        var shadow: TextureRect = _shadow_rect()
        shadow.modulate = Color(0.0, 0.0, 0.0, 0.40)
        shadow.z_index = 89
        LoginVisualOverlay._root.add_child(shadow)
        _bubble_shadows[target] = shadow

func _sync_bubble_shadows() -> void:
    var bubbles_value: Variant = LoginAnimationOverlay.get("_bubble_nodes")
    if not bubbles_value is Dictionary:
        return
    var bubbles: Dictionary = bubbles_value as Dictionary

    for target_value: Variant in _bubble_shadows.keys():
        var target: String = str(target_value)
        if not bubbles.has(target):
            continue
        var bubble_value: Variant = bubbles[target]
        var shadow_value: Variant = _bubble_shadows[target]
        if not bubble_value is TextureRect or not shadow_value is TextureRect:
            continue
        var bubble: TextureRect = bubble_value as TextureRect
        var shadow: TextureRect = shadow_value as TextureRect
        shadow.texture = bubble.texture
        shadow.size = bubble.size
        shadow.position = bubble.position + Vector2(0.0, 2.0)
        shadow.visible = bubble.visible

func _create_warm_exit_overlay() -> void:
    _warm_fade = ColorRect.new()
    _warm_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _warm_fade.color = Color.WHITE
    _warm_fade.z_index = 501

    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;
uniform float progress = 0.0;
uniform float aspect = 0.462;
void fragment() {
    vec2 d = UV - vec2(0.5, 0.56);
    d.x *= aspect;
    float radius = length(d);
    float glow = 1.0 - smoothstep(0.0, 0.38, radius);
    COLOR = vec4(0.808, 0.557, 0.227, 0.16 * glow * progress);
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    _warm_fade.material = material
    LoginVisualOverlay._root.add_child(_warm_fade)

func _sync_warm_exit_overlay() -> void:
    if _warm_fade == null or LoginVisualOverlay._fade == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    _warm_fade.position = Vector2.ZERO
    _warm_fade.size = viewport_size
    var material: ShaderMaterial = _warm_fade.material as ShaderMaterial
    if material == null:
        return
    var progress: float = clampf(LoginVisualOverlay._fade.color.a / 0.84, 0.0, 1.0)
    material.set_shader_parameter("progress", progress)
    material.set_shader_parameter("aspect", viewport_size.x / maxf(1.0, viewport_size.y))
