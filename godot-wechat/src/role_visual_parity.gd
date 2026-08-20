extends Node

var _mounted: bool = false
var _panel: Panel
var _bio_title: Label
var _bottom_scrim: ColorRect
var _level_left_line: ColorRect
var _level_right_line: ColorRect
var _lock_mask: ColorRect
var _image_offset_x: float = 0.0
var _image_alpha: float = 1.0
var _header_offset_y: float = 0.0
var _header_alpha: float = 1.0
var _panel_offset_y: float = 0.0
var _panel_alpha: float = 1.0
var _image_tween: Tween
var _content_tween: Tween

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt: int in range(120):
        if RoleVisualOverlay._root != null:
            break
        await get_tree().process_frame

    if RoleVisualOverlay._root == null:
        return

    _panel = _find_role_panel()
    _bio_title = _find_panel_label("bio-title")
    _install_layering()
    _install_role_scrim()
    _install_bottom_scrim()
    _install_level_lines()
    _install_lock_mask()
    _apply_static_style()
    RoleVisualOverlay.preview_changed.connect(_on_preview_changed)
    RoleVisualOverlay.illustration_ready.connect(_on_illustration_ready)
    _sync_preview_visuals()
    _mounted = true

func _process(_delta: float) -> void:
    if not _mounted or RoleVisualOverlay._root == null:
        return
    if not RoleVisualOverlay._root.visible:
        return
    _layout_role_parity()
    _sync_preview_visuals()

func _find_role_panel() -> Panel:
    for child: Node in RoleVisualOverlay._root.get_children():
        if child is Panel and child.name == "RoleBottomPanel":
            return child as Panel
    return null

func _find_panel_label(layout_key: String) -> Label:
    if _panel == null:
        return null
    for child: Node in _panel.get_children():
        if child is Label and child.has_meta("layout") and str(child.get_meta("layout")) == layout_key:
            return child as Label
    return null

func _install_layering() -> void:
    RoleVisualOverlay._illustration.z_index = -3
    RoleVisualOverlay._swipe_top.z_index = 3
    RoleVisualOverlay._level_label.z_index = 3
    RoleVisualOverlay._title_label.z_index = 3
    if _panel != null:
        _panel.z_index = 3

    var color_rects: Array[ColorRect] = []
    for child: Node in RoleVisualOverlay._root.get_children():
        if child is ColorRect:
            color_rects.append(child as ColorRect)
    if color_rects.size() > 0:
        color_rects[0].z_index = -4
    if color_rects.size() > 1:
        color_rects[1].z_index = -2

func _install_role_scrim() -> void:
    var color_rects: Array[ColorRect] = []
    for child: Node in RoleVisualOverlay._root.get_children():
        if child is ColorRect:
            color_rects.append(child as ColorRect)
    if color_rects.size() < 2:
        return

    var scrim: ColorRect = color_rects[1]
    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;

float vertical_alpha(float y) {
    if (y <= 0.10) return 0.66;
    if (y <= 0.22) return mix(0.66, 0.34, (y - 0.10) / 0.12);
    if (y <= 0.40) return mix(0.34, 0.04, (y - 0.22) / 0.18);
    if (y <= 0.84) return mix(0.04, 0.22, (y - 0.40) / 0.44);
    return mix(0.22, 0.58, (y - 0.84) / 0.16);
}

void fragment() {
    float vertical = vertical_alpha(UV.y);
    float radial_distance = distance(UV, vec2(0.5, 0.38));
    float radial = smoothstep(0.30, 0.86, radial_distance) * 0.60;
    float side = smoothstep(0.30, 0.50, abs(UV.x - 0.5)) * 0.66;
    float vignette = smoothstep(0.54, 0.92, distance(UV, vec2(0.5, 0.5))) * 0.54;
    float a = clamp(max(vertical, max(radial, max(side, vignette))), 0.0, 0.94);
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
    _bottom_scrim.z_index = 1

    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;
void fragment() {
    float a = mix(0.0, 0.62, smoothstep(0.0, 1.0, UV.y));
    COLOR = vec4(0.012, 0.012, 0.012, a);
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    _bottom_scrim.material = material
    RoleVisualOverlay._root.add_child(_bottom_scrim)

func _install_level_lines() -> void:
    _level_left_line = _make_level_line(true)
    _level_right_line = _make_level_line(false)
    RoleVisualOverlay._root.add_child(_level_left_line)
    RoleVisualOverlay._root.add_child(_level_right_line)

func _install_lock_mask() -> void:
    _lock_mask = ColorRect.new()
    _lock_mask.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _lock_mask.color = Color.WHITE
    _lock_mask.z_index = -1
    _lock_mask.visible = false

    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;
void fragment() {
    vec2 delta = UV - vec2(0.5, 0.56);
    delta.x *= 1.28;
    delta.y *= 0.82;
    float radius = length(delta);
    float center = 1.0 - smoothstep(0.16, 0.46, radius);
    float middle = 1.0 - smoothstep(0.28, 0.68, radius);
    float alpha = center * 0.30 + middle * 0.14;
    COLOR = vec4(0.0, 0.0, 0.0, alpha);
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    _lock_mask.material = material
    RoleVisualOverlay._root.add_child(_lock_mask)

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

func _apply_static_style() -> void:
    RoleVisualOverlay._level_label.add_theme_font_size_override("font_size", 30)
    RoleVisualOverlay._level_label.add_theme_color_override("font_color", Color("f8dfac"))
    RoleVisualOverlay._level_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.88))
    RoleVisualOverlay._level_label.add_theme_constant_override("shadow_offset_y", 3)

    RoleVisualOverlay._title_label.add_theme_font_size_override("font_size", 44)
    RoleVisualOverlay._title_label.add_theme_color_override("font_color", Color("f3eadb"))
    RoleVisualOverlay._title_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.92))
    RoleVisualOverlay._title_label.add_theme_constant_override("shadow_offset_y", 3)

    RoleVisualOverlay._salary_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
    RoleVisualOverlay._salary_label.add_theme_font_size_override("font_size", 13)
    RoleVisualOverlay._salary_label.add_theme_color_override("font_color", Color(0.76, 0.70, 0.61, 1.0))

    RoleVisualOverlay._exp_label.add_theme_font_size_override("font_size", 26)
    RoleVisualOverlay._exp_label.add_theme_color_override("font_color", Color("ffe6a3"))
    RoleVisualOverlay._exp_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.82))
    RoleVisualOverlay._exp_label.add_theme_constant_override("shadow_offset_y", 2)

    RoleVisualOverlay._exp_track.color = Color(0.031, 0.024, 0.016, 0.72)
    RoleVisualOverlay._exp_fill.color = Color("bea053")

    if _bio_title != null:
        _bio_title.add_theme_font_size_override("font_size", 15)
        _bio_title.add_theme_color_override("font_color", Color("e7c78d"))

    RoleVisualOverlay._bio_label.add_theme_font_size_override("font_size", 14)
    RoleVisualOverlay._bio_label.add_theme_color_override("font_color", Color(0.953, 0.918, 0.859, 0.82))

    RoleVisualOverlay._dots.add_theme_constant_override("separation", 8)
    RoleVisualOverlay._swipe_top.add_theme_font_size_override("font_size", 12)
    RoleVisualOverlay._swipe_top.add_theme_color_override("font_color", Color(0.91, 0.78, 0.55, 0.74))
    RoleVisualOverlay._swipe_bottom.add_theme_font_size_override("font_size", 14)
    RoleVisualOverlay._swipe_bottom.add_theme_color_override("font_color", Color("e8d4aa"))

    if _panel != null:
        var transparent: StyleBoxFlat = StyleBoxFlat.new()
        transparent.bg_color = Color(0.0, 0.0, 0.0, 0.0)
        transparent.border_color = Color(0.0, 0.0, 0.0, 0.0)
        transparent.set_border_width_all(0)
        _panel.add_theme_stylebox_override("panel", transparent)

func _layout_role_parity() -> void:
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    var compact: bool = viewport_size.y <= 780.0 and viewport_size.x <= 430.0

    RoleVisualOverlay._illustration.position = Vector2(_image_offset_x, viewport_size.y * 0.11)
    RoleVisualOverlay._illustration.size = viewport_size
    RoleVisualOverlay._illustration.modulate = Color(1.0, 1.0, 1.0, _image_alpha)

    if _lock_mask != null:
        _lock_mask.position = Vector2.ZERO
        _lock_mask.size = viewport_size

    var header_top: float = (28.0 if compact else 42.0) + _header_offset_y
    RoleVisualOverlay._level_label.position = Vector2(78.0, header_top)
    RoleVisualOverlay._level_label.size = Vector2(viewport_size.x - 156.0, 38.0)
    RoleVisualOverlay._level_label.modulate = Color(1.0, 1.0, 1.0, _header_alpha)

    var line_width: float = 56.0 if not compact else 48.0
    var line_y: float = header_top + 18.0
    _level_left_line.position = Vector2((viewport_size.x * 0.5) - 52.0 - line_width, line_y)
    _level_left_line.size = Vector2(line_width, 1.0)
    _level_left_line.modulate = Color(1.0, 1.0, 1.0, _header_alpha)
    _level_right_line.position = Vector2((viewport_size.x * 0.5) + 52.0, line_y)
    _level_right_line.size = Vector2(line_width, 1.0)
    _level_right_line.modulate = Color(1.0, 1.0, 1.0, _header_alpha)

    RoleVisualOverlay._title_label.position = Vector2(16.0, header_top + 40.0)
    RoleVisualOverlay._title_label.size = Vector2(viewport_size.x - 32.0, 58.0)
    RoleVisualOverlay._title_label.modulate = Color(1.0, 1.0, 1.0, _header_alpha)

    RoleVisualOverlay._swipe_top.position = Vector2(20.0, (28.0 if compact else 42.0) + 102.0)
    RoleVisualOverlay._swipe_top.size = Vector2(viewport_size.x - 40.0, 24.0)

    if _bottom_scrim != null:
        _bottom_scrim.position = Vector2(0.0, viewport_size.y - 160.0)
        _bottom_scrim.size = Vector2(viewport_size.x, 160.0)

    if _panel == null:
        return

    var panel_height: float = 304.0 if not compact else 276.0
    _panel.position = Vector2(18.0, viewport_size.y - panel_height - 8.0 + 24.0 + _panel_offset_y)
    _panel.size = Vector2(viewport_size.x - 36.0, panel_height)
    _panel.modulate = Color(1.0, 1.0, 1.0, _panel_alpha)

    var bio_height: float = 108.0 if not compact else 98.0
    var bio_top: float = 112.0
    var bio_bottom: float = bio_top + bio_height
    var dots_top: float = bio_bottom + 4.0
    var swipe_top: float = dots_top + 18.0

    for child: Node in _panel.get_children():
        if not child.has_meta("layout"):
            continue
        var control: Control = child as Control
        if control == null:
            continue
        match str(child.get_meta("layout")):
            "salary":
                control.position = Vector2(0.0, 30.0)
                control.size = Vector2(132.0, 42.0)
            "exp-label":
                control.position = Vector2(30.0, 52.0)
                control.size = Vector2(_panel.size.x - 60.0, 38.0)
            "exp-track":
                control.position = Vector2(30.0, 92.0)
                control.size = Vector2(_panel.size.x - 60.0, 10.0)
            "bio-title":
                control.position = Vector2(18.0, 120.0)
                control.size = Vector2(_panel.size.x - 36.0, 24.0)
            "bio":
                control.position = Vector2(18.0, 146.0)
                control.size = Vector2(_panel.size.x - 36.0, bio_height - 35.0)
            "dots":
                control.position = Vector2(18.0, dots_top)
                control.size = Vector2(_panel.size.x - 36.0, 14.0)
            "swipe-bottom":
                control.position = Vector2(18.0, swipe_top)
                control.size = Vector2(_panel.size.x - 36.0, 24.0)

    _style_salary_box()
    _style_bio_region(bio_height)
    _restyle_dots()
    RoleVisualOverlay._update_exp_fill()

func _style_salary_box() -> void:
    if RoleVisualOverlay._salary_label == null:
        return
    var box: StyleBoxFlat = StyleBoxFlat.new()
    box.bg_color = Color(0.035, 0.027, 0.018, 0.58)
    box.border_color = Color(0.906, 0.780, 0.553, 0.42)
    box.set_border_width_all(1)
    box.corner_radius_top_left = 5
    box.corner_radius_top_right = 5
    box.corner_radius_bottom_left = 5
    box.corner_radius_bottom_right = 5
    box.content_margin_left = 9.0
    box.content_margin_right = 9.0
    box.content_margin_top = 6.0
    box.content_margin_bottom = 7.0
    RoleVisualOverlay._salary_label.add_theme_stylebox_override("normal", box)

func _style_bio_region(bio_height: float) -> void:
    if _panel == null:
        return
    var bio_background: Panel = _panel.get_node_or_null("RoleBioBackground") as Panel
    if bio_background == null:
        bio_background = Panel.new()
        bio_background.name = "RoleBioBackground"
        bio_background.mouse_filter = Control.MOUSE_FILTER_IGNORE
        bio_background.z_index = -1
        _panel.add_child(bio_background)

    bio_background.position = Vector2(0.0, 112.0)
    bio_background.size = Vector2(_panel.size.x, bio_height)

    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.035, 0.027, 0.020, 0.46)
    style.border_color = Color(0.0, 0.0, 0.0, 0.0)
    style.set_border_width_all(0)
    bio_background.add_theme_stylebox_override("panel", style)

func _restyle_dots() -> void:
    var active_level: int = RoleVisualOverlay.get_display_level()
    var index: int = 0
    for child: Node in RoleVisualOverlay._dots.get_children():
        if not child is ColorRect:
            continue
        var dot: ColorRect = child as ColorRect
        dot.custom_minimum_size = Vector2(6.0, 6.0)
        dot.color = Color("fff0c7") if index == active_level else Color(0.953, 0.918, 0.859, 0.28)
        index += 1

func _on_preview_changed(_display_level: int, _current_level: int, locked: bool, direction: String) -> void:
    if _lock_mask != null:
        _lock_mask.visible = locked
    if direction == "next" or direction == "prev":
        _play_content_transition()
    else:
        _header_offset_y = 0.0
        _header_alpha = 1.0
        _panel_offset_y = 0.0
        _panel_alpha = 1.0

func _on_illustration_ready(level: int, direction: String) -> void:
    if level != RoleVisualOverlay.get_display_level():
        return
    _play_image_transition(direction)

func _play_image_transition(direction: String) -> void:
    if _image_tween != null and _image_tween.is_valid():
        _image_tween.kill()

    if direction != "next" and direction != "prev":
        _image_offset_x = 0.0
        _image_alpha = 1.0
        return

    _image_offset_x = 24.0 if direction == "next" else -24.0
    _image_alpha = 0.0
    _image_tween = create_tween()
    _image_tween.set_parallel(true)
    _image_tween.set_trans(Tween.TRANS_QUART)
    _image_tween.set_ease(Tween.EASE_OUT)
    _image_tween.tween_property(self, "_image_offset_x", 0.0, 0.36)
    _image_tween.tween_property(self, "_image_alpha", 1.0, 0.36)

func _play_content_transition() -> void:
    if _content_tween != null and _content_tween.is_valid():
        _content_tween.kill()

    _header_offset_y = 10.0
    _header_alpha = 0.0
    _panel_offset_y = 10.0
    _panel_alpha = 0.0

    _content_tween = create_tween()
    _content_tween.set_parallel(true)
    _content_tween.set_trans(Tween.TRANS_QUAD)
    _content_tween.set_ease(Tween.EASE_OUT)
    _content_tween.tween_property(self, "_header_offset_y", 0.0, 0.36)
    _content_tween.tween_property(self, "_header_alpha", 1.0, 0.36)
    _content_tween.tween_property(self, "_panel_offset_y", 0.0, 0.38).set_delay(0.08)
    _content_tween.tween_property(self, "_panel_alpha", 1.0, 0.38).set_delay(0.08)

func _sync_preview_visuals() -> void:
    if _lock_mask != null:
        _lock_mask.visible = RoleVisualOverlay.is_locked_preview()
