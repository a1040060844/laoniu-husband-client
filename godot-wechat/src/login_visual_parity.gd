extends Node

const TITLE_PERIOD: float = 3.8
const BUTTON_PERIOD: float = 3.4
const TITLE_FLOAT: float = 4.0
const BUTTON_FLOAT: float = 6.0

var _elapsed: float = 0.0
var _mounted: bool = false
var _husband_card_visual: TextureRect

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt: int in range(90):
        if LoginVisualOverlay._root != null and LoginAnimationOverlay._reset_button != null:
            break
        await get_tree().process_frame

    if LoginVisualOverlay._root == null:
        return

    _install_web_fade_masks()
    _mounted = true

func _process(delta: float) -> void:
    if not _mounted or LoginVisualOverlay._root == null:
        return
    if not LoginVisualOverlay._root.visible:
        return

    _elapsed += delta
    _ensure_husband_card_visual()
    _apply_web_layout()
    _apply_web_bubble_positions()

func _install_web_fade_masks() -> void:
    if LoginVisualOverlay._root == null:
        return

    for child: Node in LoginVisualOverlay._root.get_children():
        if not child is ColorRect or not child.has_meta("fade_top"):
            continue
        var rect: ColorRect = child as ColorRect
        var shader: Shader = Shader.new()
        shader.code = """
shader_type canvas_item;
uniform bool from_top = true;

float top_alpha(float y) {
    if (y <= 0.38) {
        return mix(0.96, 0.82, y / 0.38);
    }
    if (y <= 0.76) {
        return mix(0.82, 0.34, (y - 0.38) / 0.38);
    }
    return mix(0.34, 0.0, (y - 0.76) / 0.24);
}

float bottom_alpha(float y) {
    if (y <= 0.26) {
        return mix(0.0, 0.40, y / 0.26);
    }
    if (y <= 0.64) {
        return mix(0.40, 0.82, (y - 0.26) / 0.38);
    }
    return mix(0.82, 0.96, (y - 0.64) / 0.36);
}

void fragment() {
    float a = from_top ? top_alpha(UV.y) : bottom_alpha(UV.y);
    COLOR = vec4(0.0, 0.0, 0.0, a);
}
"""
        var material: ShaderMaterial = ShaderMaterial.new()
        material.shader = shader
        material.set_shader_parameter("from_top", bool(child.get_meta("fade_top")))
        rect.material = material

func _ensure_husband_card_visual() -> void:
    if _husband_card_visual != null:
        return
    if LoginVisualOverlay._husband_card == null:
        return
    var texture: Texture2D = LoginVisualOverlay._husband_card.texture_normal
    if texture == null:
        return

    _husband_card_visual = TextureRect.new()
    _husband_card_visual.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _husband_card_visual.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    _husband_card_visual.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
    _husband_card_visual.texture = texture
    _husband_card_visual.z_index = 1
    LoginVisualOverlay._husband_card.add_child(_husband_card_visual)
    LoginVisualOverlay._husband_card.texture_normal = null

func _apply_web_layout() -> void:
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    var compact: bool = viewport_size.y <= 820.0

    var title_width: float = minf(viewport_size.x * (0.82 if compact else 0.86), 352.0 if compact else 370.0)
    var title_top: float = 28.0 if compact else 36.0
    var title_height: float = _height_for_width(LoginVisualOverlay._title, title_width, 0.18)
    LoginVisualOverlay._title.size = Vector2(title_width, title_height)
    LoginVisualOverlay._title.position = Vector2(
        (viewport_size.x - title_width) * 0.5,
        title_top + _float_offset(TITLE_PERIOD, TITLE_FLOAT, 0.0)
    )

    var subtitle_width: float = minf(viewport_size.x * 0.57, 245.0)
    var subtitle_top: float = 116.0 if compact else 134.0
    var subtitle_height: float = _height_for_width(LoginVisualOverlay._subtitle, subtitle_width, 0.18)
    LoginVisualOverlay._subtitle.size = Vector2(subtitle_width, subtitle_height)
    LoginVisualOverlay._subtitle.position = Vector2(
        (viewport_size.x - subtitle_width) * 0.5,
        subtitle_top + _float_offset(TITLE_PERIOD, TITLE_FLOAT, 1.1)
    )

    var card_width: float = viewport_size.x * 0.47
    var card_height: float = card_width / (1448.0 / 1086.0)
    var card_bottom: float = viewport_size.y * (0.066 if compact else 0.073) - 80.0
    var card_top: float = viewport_size.y - card_bottom - card_height

    LoginVisualOverlay._husband_card.position = Vector2(
        viewport_size.x * 0.02,
        card_top + _float_offset(BUTTON_PERIOD, BUTTON_FLOAT, 0.0)
    )
    LoginVisualOverlay._husband_card.size = Vector2(card_width, card_height)

    LoginVisualOverlay._wife_card.position = Vector2(
        viewport_size.x - viewport_size.x * 0.02 - card_width,
        card_top + _float_offset(BUTTON_PERIOD, BUTTON_FLOAT, 1.2)
    )
    LoginVisualOverlay._wife_card.size = Vector2(card_width, card_height)

    if _husband_card_visual != null:
        _husband_card_visual.position = Vector2(-card_width * 0.05, -card_height * 0.05)
        _husband_card_visual.size = Vector2(card_width * 1.10, card_height * 1.10)

    var button_size: float = clampf(
        viewport_size.x * (0.096 if compact else 0.102),
        39.0 if compact else 42.0,
        51.0 if compact else 57.0
    )
    var button_x: float = viewport_size.x - 46.0 - button_size

    LoginVisualOverlay._music_button.position = Vector2(
        button_x,
        (202.0 if compact else 226.0) + _float_offset(BUTTON_PERIOD, BUTTON_FLOAT, 1.05)
    )
    LoginVisualOverlay._music_button.size = Vector2(button_size, button_size)

    if LoginAnimationOverlay._reset_button != null:
        LoginAnimationOverlay._reset_button.position = Vector2(
            button_x,
            (146.0 if compact else 164.0) + _float_offset(BUTTON_PERIOD, BUTTON_FLOAT, 0.65)
        )
        LoginAnimationOverlay._reset_button.size = Vector2(button_size, button_size)

    if LoginVisualOverlay._plaque_days != null:
        var digits: int = LoginVisualOverlay._plaque_days.text.length()
        LoginVisualOverlay._plaque_days.add_theme_font_size_override("font_size", 7 if digits >= 4 else 9)

func _apply_web_bubble_positions() -> void:
    var bubbles_value: Variant = LoginAnimationOverlay.get("_bubble_nodes")
    if not bubbles_value is Dictionary:
        return
    var bubbles: Dictionary = bubbles_value as Dictionary
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size

    for target_value: Variant in bubbles.keys():
        var target: String = str(target_value)
        var bubble_value: Variant = bubbles[target]
        if not bubble_value is TextureRect:
            continue
        var bubble: TextureRect = bubble_value as TextureRect
        if not bubble.visible:
            continue

        var anchor_value: Variant = LoginVisualOverlay._sprite_anchor_pct.get(target, Vector2(0.5, 0.5))
        if not anchor_value is Vector2:
            continue
        var anchor_pct: Vector2 = anchor_value as Vector2
        var anchor: Vector2 = Vector2(viewport_size.x * anchor_pct.x, viewport_size.y * anchor_pct.y)
        var thinking: bool = target == "wife" and bubble.has_meta("thinking")
        var x_offset: float = 40.0 if thinking else 0.0
        var y_factor: float = 1.01 if thinking else 1.02
        bubble.position = Vector2(
            anchor.x + x_offset - bubble.size.x * 0.5,
            anchor.y - 188.0 - bubble.size.y * y_factor
        )

func _height_for_width(node: TextureRect, target_width: float, fallback_ratio: float) -> float:
    if node != null and node.texture != null:
        var tex_size: Vector2 = node.texture.get_size()
        if tex_size.x > 0.0:
            return target_width * tex_size.y / tex_size.x
    return target_width * fallback_ratio

func _float_offset(period: float, amplitude: float, advance: float) -> float:
    var phase: float = fposmod(_elapsed + advance, period) / period
    return -amplitude * 0.5 * (1.0 - cos(phase * TAU))
