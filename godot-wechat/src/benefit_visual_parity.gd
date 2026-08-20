extends Node

var _mounted: bool = false
var _elapsed: float = 0.0
var _bottom_scrim: ColorRect
var _level_left_line: ColorRect
var _level_right_line: ColorRect
var _commission_panel: Panel
var _commission_caption: Label
var _commission_amount: Label

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt: int in range(120):
        if BenefitVisualOverlay._root != null:
            break
        await get_tree().process_frame

    if BenefitVisualOverlay._root == null:
        return

    _install_layering()
    _install_scrim()
    _install_bottom_scrim()
    _install_level_lines()
    _install_commission_panel()
    _apply_static_style()
    get_viewport().size_changed.connect(_layout)
    _layout()
    _mounted = true

func _process(delta: float) -> void:
    if not _mounted or BenefitVisualOverlay._root == null:
        return
    if not BenefitVisualOverlay._root.visible:
        return

    _elapsed += delta
    _layout()
    _sync_commission()
    _style_bubbles()
    _layout_bubbles()

func _install_layering() -> void:
    BenefitVisualOverlay._illustration.z_index = -3
    BenefitVisualOverlay._level_label.z_index = 3
    BenefitVisualOverlay._title_label.z_index = 3
    BenefitVisualOverlay._bubble_layer.z_index = 3

    var color_rects: Array[ColorRect] = []
    for child: Node in BenefitVisualOverlay._root.get_children():
        if child is ColorRect:
            color_rects.append(child as ColorRect)
    if color_rects.size() > 0:
        color_rects[0].z_index = -4
    if color_rects.size() > 1:
        color_rects[1].z_index = -2

func _install_scrim() -> void:
    var color_rects: Array[ColorRect] = []
    for child: Node in BenefitVisualOverlay._root.get_children():
        if child is ColorRect:
            color_rects.append(child as ColorRect)
    if color_rects.size() < 2:
        return

    var scrim: ColorRect = color_rects[1]
    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;

float vertical_alpha(float y) {
    if (y <= 0.10) return 0.88;
    if (y <= 0.24) return mix(0.88, 0.48, (y - 0.10) / 0.14);
    if (y <= 0.48) return mix(0.48, 0.04, (y - 0.24) / 0.24);
    if (y <= 0.84) return mix(0.04, 0.48, (y - 0.48) / 0.36);
    return mix(0.48, 0.96, (y - 0.84) / 0.16);
}

void fragment() {
    float vertical = vertical_alpha(UV.y);
    float radial = smoothstep(0.28, 0.86, distance(UV, vec2(0.5, 0.52))) * 0.70;
    float side = smoothstep(0.28, 0.50, abs(UV.x - 0.5)) * 0.72;
    float vignette = smoothstep(0.52, 0.90, distance(UV, vec2(0.5, 0.5))) * 0.58;
    float a = clamp(max(vertical, max(radial, max(side, vignette))), 0.0, 0.97);
    COLOR = vec4(0.0, 0.0, 0.0, a);
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    scrim.material = material

func _install_bottom_scrim() -> void:
    _bottom_scrim = ColorRect.new()
    _bottom_scrim.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _bottom_scrim.color = Color.WHITE
    _bottom_scrim.z_index = -1
    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;
void fragment() {
    float a = mix(0.0, 0.92, smoothstep(0.0, 1.0, UV.y));
    COLOR = vec4(0.020, 0.012, 0.008, a);
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    _bottom_scrim.material = material
    BenefitVisualOverlay._root.add_child(_bottom_scrim)

func _install_level_lines() -> void:
    _level_left_line = _make_level_line(true)
    _level_right_line = _make_level_line(false)
    BenefitVisualOverlay._root.add_child(_level_left_line)
    BenefitVisualOverlay._root.add_child(_level_right_line)

func _make_level_line(fade_from_left: bool) -> ColorRect:
    var line: ColorRect = ColorRect.new()
    line.mouse_filter = Control.MOUSE_FILTER_IGNORE
    line.color = Color.WHITE
    line.z_index = 3
    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;
uniform bool fade_from_left = true;
void fragment() {
    float alpha = fade_from_left ? UV.x : (1.0 - UV.x);
    COLOR = vec4(0.906, 0.780, 0.553, alpha * 0.82);
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    material.set_shader_parameter("fade_from_left", fade_from_left)
    line.material = material
    return line

func _install_commission_panel() -> void:
    BenefitVisualOverlay._commission_label.visible = false

    _commission_panel = Panel.new()
    _commission_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _commission_panel.z_index = 4
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.031, 0.024, 0.016, 0.42)
    style.border_color = Color(0.906, 0.780, 0.553, 0.32)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 5
    style.corner_radius_top_right = 5
    style.corner_radius_bottom_left = 5
    style.corner_radius_bottom_right = 5
    _commission_panel.add_theme_stylebox_override("panel", style)
    BenefitVisualOverlay._root.add_child(_commission_panel)

    _commission_caption = Label.new()
    _commission_caption.text = "◉  每月佣金"
    _commission_caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    _commission_caption.add_theme_font_size_override("font_size", 13)
    _commission_caption.add_theme_color_override("font_color", Color(0.953, 0.918, 0.859, 0.68))
    _commission_caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _commission_panel.add_child(_commission_caption)

    _commission_amount = Label.new()
    _commission_amount.text = "¥ --"
    _commission_amount.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
    _commission_amount.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    _commission_amount.add_theme_font_size_override("font_size", 22)
    _commission_amount.add_theme_color_override("font_color", Color("f8dfac"))
    _commission_amount.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.76))
    _commission_amount.add_theme_constant_override("shadow_offset_y", 2)
    _commission_amount.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _commission_panel.add_child(_commission_amount)

func _apply_static_style() -> void:
    BenefitVisualOverlay._level_label.add_theme_font_size_override("font_size", 30)
    BenefitVisualOverlay._level_label.add_theme_color_override("font_color", Color("f8dfac"))
    BenefitVisualOverlay._level_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.88))
    BenefitVisualOverlay._level_label.add_theme_constant_override("shadow_offset_y", 3)

    BenefitVisualOverlay._title_label.add_theme_font_size_override("font_size", 46)
    BenefitVisualOverlay._title_label.add_theme_color_override("font_color", Color("f3eadb"))
    BenefitVisualOverlay._title_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.92))
    BenefitVisualOverlay._title_label.add_theme_constant_override("shadow_offset_y", 3)

func _layout() -> void:
    if BenefitVisualOverlay._root == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    var compact: bool = viewport_size.y <= 780.0 and viewport_size.x <= 430.0
    var level: int = int(BenefitVisualOverlay._loaded_level)

    if level == 3:
        BenefitVisualOverlay._illustration.position = Vector2(0.0, viewport_size.y * 0.27)
        BenefitVisualOverlay._illustration.size = Vector2(viewport_size.x, viewport_size.y * 0.65)
    elif level == 4:
        BenefitVisualOverlay._illustration.position = Vector2(0.0, viewport_size.y * 0.13 + 40.0)
        BenefitVisualOverlay._illustration.size = Vector2(viewport_size.x, viewport_size.y * 0.84)
    else:
        BenefitVisualOverlay._illustration.position = Vector2(0.0, viewport_size.y * 0.13)
        BenefitVisualOverlay._illustration.size = Vector2(viewport_size.x, viewport_size.y * 0.84)

    var header_top: float = 30.0 if compact else 50.0
    BenefitVisualOverlay._level_label.position = Vector2(78.0, header_top)
    BenefitVisualOverlay._level_label.size = Vector2(viewport_size.x - 156.0, 38.0)

    var line_width: float = 48.0 if compact else 56.0
    var line_y: float = header_top + 18.0
    _level_left_line.position = Vector2((viewport_size.x * 0.5) - 52.0 - line_width, line_y)
    _level_left_line.size = Vector2(line_width, 1.0)
    _level_right_line.position = Vector2((viewport_size.x * 0.5) + 52.0, line_y)
    _level_right_line.size = Vector2(line_width, 1.0)

    BenefitVisualOverlay._title_label.position = Vector2(16.0, header_top + 38.0)
    BenefitVisualOverlay._title_label.size = Vector2(viewport_size.x - 32.0, 60.0)

    var cloud_top: float = 128.0 if compact else 150.0
    BenefitVisualOverlay._bubble_layer.position.y = cloud_top
    BenefitVisualOverlay._bubble_layer.size = Vector2(viewport_size.x, 220.0)

    if _bottom_scrim != null:
        var scrim_height: float = viewport_size.y * 0.38
        _bottom_scrim.position = Vector2(0.0, viewport_size.y - scrim_height)
        _bottom_scrim.size = Vector2(viewport_size.x, scrim_height)

    if _commission_panel != null:
        var panel_width: float = 154.0 if compact else 168.0
        var panel_height: float = 44.0
        var bottom_gap: float = 78.0 if compact else 96.0
        _commission_panel.position = Vector2((viewport_size.x - panel_width) * 0.5, viewport_size.y - bottom_gap - panel_height)
        _commission_panel.size = Vector2(panel_width, panel_height)
        _commission_caption.position = Vector2(12.0, 4.0)
        _commission_caption.size = Vector2(panel_width * 0.57, panel_height - 8.0)
        _commission_amount.position = Vector2(panel_width * 0.52, 4.0)
        _commission_amount.size = Vector2(panel_width * 0.40, panel_height - 8.0)

func _sync_commission() -> void:
    if _commission_amount == null:
        return
    var level: int = int(GameState.get_progress().get("level", 0))
    var roles_value: Variant = GameState.state.get("roles", [])
    if not roles_value is Array:
        return
    for value: Variant in roles_value:
        if value is Dictionary and int(value.get("level", -1)) == level:
            var role: Dictionary = value as Dictionary
            _commission_amount.text = "¥ %s" % int(role.get("salary", 0))
            return

func _style_bubbles() -> void:
    var level: int = int(GameState.get_progress().get("level", 0))
    for value: Variant in BenefitVisualOverlay._bubble_buttons:
        if not value is Button:
            continue
        var button: Button = value as Button
        button.add_theme_font_size_override("font_size", 10)
        button.add_theme_color_override("font_color", Color("f3eadb"))
        button.add_theme_color_override("font_disabled_color", Color(0.80, 0.76, 0.69, 0.62))
        var benefit_value: Variant = button.get_meta("benefit", {})
        var status: String = "available"
        if benefit_value is Dictionary:
            status = str(BenefitVisualOverlay.call("_computed_status", benefit_value as Dictionary, level))
        _apply_bubble_style(button, status)

func _apply_bubble_style(button: Button, status: String) -> void:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.10, 0.070, 0.035, 0.80)
    style.border_color = Color(0.906, 0.780, 0.553, 0.42)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 39
    style.corner_radius_top_right = 39
    style.corner_radius_bottom_left = 39
    style.corner_radius_bottom_right = 39
    style.content_margin_left = 6.0
    style.content_margin_right = 6.0
    style.content_margin_top = 9.0
    style.content_margin_bottom = 9.0

    if status == "cooldown":
        style.bg_color = Color(0.075, 0.064, 0.052, 0.80)
        style.border_color = Color(0.72, 0.66, 0.55, 0.34)
    elif status == "pending":
        style.bg_color = Color(0.13, 0.09, 0.04, 0.84)
        style.border_color = Color(0.92, 0.72, 0.38, 0.48)
    elif status == "locked" or status == "frozen":
        style.bg_color = Color(0.065, 0.065, 0.065, 0.72)
        style.border_color = Color(0.70, 0.70, 0.70, 0.22)

    button.add_theme_stylebox_override("normal", style)
    button.add_theme_stylebox_override("disabled", style)
    var hover: StyleBoxFlat = style.duplicate() as StyleBoxFlat
    hover.bg_color = Color(0.16, 0.11, 0.05, 0.92)
    button.add_theme_stylebox_override("hover", hover)
    button.add_theme_stylebox_override("pressed", hover)

func _layout_bubbles() -> void:
    var total: int = BenefitVisualOverlay._benefits.size()
    if total <= 0:
        return

    var viewport_width: float = get_viewport().get_visible_rect().size.x
    var screen_scale: float = viewport_width / 390.0
    var drift: float = 0.0
    if total <= 5:
        drift = sin((_elapsed / 9.6) * TAU) * 8.0

    for value: Variant in BenefitVisualOverlay._bubble_buttons:
        if not value is Button:
            continue
        var button: Button = value as Button
        var index: int = int(button.get_meta("index"))
        var copy_index: int = int(button.get_meta("copy"))
        var point_value: Variant = BenefitVisualOverlay.call("_bubble_position", index, total)
        if not point_value is Vector2:
            continue
        var point: Vector2 = point_value as Vector2
        var x: float = point.x + float(copy_index) * float(BenefitVisualOverlay._marquee_width)
        if total > 5:
            x -= float(BenefitVisualOverlay._marquee_offset)
        else:
            x += drift
        button.position = Vector2(x * screen_scale - 39.0, point.y - 39.0 + 36.0)
        button.size = Vector2(78.0, 78.0)
