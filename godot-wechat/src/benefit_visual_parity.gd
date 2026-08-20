extends Node

const BenefitIconScript = preload("res://src/benefit_icon_control.gd")

var _mounted: bool = false
var _elapsed: float = 0.0
var _page_age: float = 0.0
var _was_visible: bool = false
var _bottom_scrim: ColorRect
var _level_left_line: ColorRect
var _level_right_line: ColorRect
var _commission_panel: Panel
var _commission_caption: Label
var _commission_amount: Label

var _modal_backdrop: ColorRect
var _modal_kicker: Label
var _modal_intro: Label
var _modal_emblem: Panel
var _modal_emblem_icon: Control
var _modal_status_panel: Panel
var _modal_x: Button
var _detail_unlock_caption: Label
var _detail_unlock_value: Label
var _detail_frequency_caption: Label
var _detail_frequency_value: Label
var _detail_method_caption: Label
var _detail_method_value: Label
var _usage_cells: Array[Panel] = []
var _usage_captions: Array[Label] = []
var _usage_values: Array[Label] = []
var _modal_was_visible: bool = false
var _modal_age: float = 0.0

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
    _install_modal_parity()
    _apply_static_style()
    get_viewport().size_changed.connect(_layout)
    _layout()
    _mounted = true

func _process(delta: float) -> void:
    if not _mounted or BenefitVisualOverlay._root == null:
        return

    var visible_now: bool = BenefitVisualOverlay._root.visible
    if visible_now and not _was_visible:
        _page_age = 0.0
    _was_visible = visible_now

    if not visible_now:
        _sync_modal_visibility(false, delta)
        return

    _elapsed += delta
    _page_age += delta
    _layout()
    _sync_commission()
    _style_bubbles()
    _layout_bubbles()
    _sync_modal_visibility(BenefitVisualOverlay._modal.visible, delta)

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
    style.shadow_color = Color(0.0, 0.0, 0.0, 0.45)
    style.shadow_size = 12
    style.shadow_offset = Vector2(0.0, 8.0)
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

func _install_modal_parity() -> void:
    _modal_backdrop = ColorRect.new()
    _modal_backdrop.color = Color.WHITE
    _modal_backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _modal_backdrop.z_index = 250
    _modal_backdrop.visible = false
    var backdrop_shader: Shader = Shader.new()
    backdrop_shader.code = """
shader_type canvas_item;
void fragment() {
    float glow = 0.10 * (1.0 - smoothstep(0.0, 0.52, distance(UV, vec2(0.5, 0.48))));
    float edge = smoothstep(0.48, 0.92, distance(UV, vec2(0.5, 0.5))) * 0.34;
    COLOR = vec4(0.09, 0.065, 0.035, 0.46 + glow + edge);
}
"""
    var backdrop_material: ShaderMaterial = ShaderMaterial.new()
    backdrop_material.shader = backdrop_shader
    _modal_backdrop.material = backdrop_material
    BenefitVisualOverlay._root.add_child(_modal_backdrop)

    BenefitVisualOverlay._modal.z_index = 300
    BenefitVisualOverlay._modal_title.add_theme_font_size_override("font_size", 30)
    BenefitVisualOverlay._modal_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
    BenefitVisualOverlay._modal_title.add_theme_color_override("font_color", Color("f8dfac"))
    BenefitVisualOverlay._modal_title.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.72))
    BenefitVisualOverlay._modal_title.add_theme_constant_override("shadow_offset_y", 2)

    BenefitVisualOverlay._modal_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    BenefitVisualOverlay._modal_status.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    BenefitVisualOverlay._modal_status.add_theme_font_size_override("font_size", 12)
    BenefitVisualOverlay._modal_status.add_theme_color_override("font_color", Color("f8dfac"))

    BenefitVisualOverlay._modal_description.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
    BenefitVisualOverlay._modal_description.vertical_alignment = VERTICAL_ALIGNMENT_TOP
    BenefitVisualOverlay._modal_description.add_theme_font_size_override("font_size", 14)
    BenefitVisualOverlay._modal_description.add_theme_color_override("font_color", Color("f3eadb"))
    BenefitVisualOverlay._modal_description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    BenefitVisualOverlay._modal_frequency.visible = false

    _modal_kicker = _modal_label("老妞大人裁定光幕", 12, Color("e7c78d"))
    _modal_kicker.add_theme_constant_override("letter_spacing", 1)
    BenefitVisualOverlay._modal.add_child(_modal_kicker)

    _modal_intro = _modal_label("权益已显现，是否恩准仍以老妞大人最终裁定为准。", 13, Color(0.953, 0.918, 0.859, 0.68))
    _modal_intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    BenefitVisualOverlay._modal.add_child(_modal_intro)

    _modal_status_panel = Panel.new()
    _modal_status_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _modal_status_panel.z_index = -1
    var status_style: StyleBoxFlat = StyleBoxFlat.new()
    status_style.bg_color = Color(0.906, 0.780, 0.553, 0.10)
    status_style.border_color = Color(0.906, 0.780, 0.553, 0.34)
    status_style.set_border_width_all(1)
    status_style.corner_radius_top_left = 13
    status_style.corner_radius_top_right = 13
    status_style.corner_radius_bottom_left = 13
    status_style.corner_radius_bottom_right = 13
    _modal_status_panel.add_theme_stylebox_override("panel", status_style)
    BenefitVisualOverlay._modal.add_child(_modal_status_panel)
    BenefitVisualOverlay._modal.move_child(_modal_status_panel, 0)

    _modal_emblem = Panel.new()
    _modal_emblem.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var emblem_style: StyleBoxFlat = StyleBoxFlat.new()
    emblem_style.bg_color = Color(0.015, 0.012, 0.009, 0.34)
    emblem_style.border_color = Color(0.906, 0.780, 0.553, 0.34)
    emblem_style.set_border_width_all(1)
    emblem_style.corner_radius_top_left = 44
    emblem_style.corner_radius_top_right = 44
    emblem_style.corner_radius_bottom_left = 44
    emblem_style.corner_radius_bottom_right = 44
    emblem_style.shadow_color = Color(0.906, 0.780, 0.553, 0.10)
    emblem_style.shadow_size = 10
    _modal_emblem.add_theme_stylebox_override("panel", emblem_style)
    BenefitVisualOverlay._modal.add_child(_modal_emblem)

    _modal_emblem_icon = BenefitIconScript.new() as Control
    _modal_emblem_icon.set("stroke_color", Color("f8dfac"))
    _modal_emblem_icon.set("stroke_width", 1.5)
    _modal_emblem.add_child(_modal_emblem_icon)

    _detail_unlock_caption = _modal_label("解锁等级", 12, Color(0.953, 0.918, 0.859, 0.42))
    _detail_unlock_value = _modal_label("Lv.00", 12, Color("e7c78d"))
    _detail_frequency_caption = _modal_label("使用频率", 12, Color(0.953, 0.918, 0.859, 0.42))
    _detail_frequency_value = _modal_label("未设置", 12, Color("e7c78d"))
    _detail_method_caption = _modal_label("使用方式", 12, Color(0.953, 0.918, 0.859, 0.42))
    _detail_method_value = _modal_label("提交申请后，由老妞大人裁定", 12, Color("e7c78d"))
    _detail_method_value.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    for label: Label in [_detail_unlock_caption, _detail_unlock_value, _detail_frequency_caption, _detail_frequency_value, _detail_method_caption, _detail_method_value]:
        BenefitVisualOverlay._modal.add_child(label)

    for caption_text: String in ["当前状态", "本轮剩余次数", "上次使用时间", "下次可用时间"]:
        var cell: Panel = Panel.new()
        cell.mouse_filter = Control.MOUSE_FILTER_IGNORE
        var cell_style: StyleBoxFlat = StyleBoxFlat.new()
        cell_style.bg_color = Color(0.024, 0.020, 0.016, 0.52)
        cell_style.border_color = Color(0.906, 0.780, 0.553, 0.14)
        cell_style.set_border_width_all(1)
        cell.add_theme_stylebox_override("panel", cell_style)
        BenefitVisualOverlay._modal.add_child(cell)
        _usage_cells.append(cell)

        var caption: Label = _modal_label(caption_text, 11, Color(0.953, 0.918, 0.859, 0.42))
        cell.add_child(caption)
        _usage_captions.append(caption)

        var value_label: Label = _modal_label("--", 12, Color("f8dfac"))
        value_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
        cell.add_child(value_label)
        _usage_values.append(value_label)

    _modal_x = Button.new()
    _modal_x.text = "×"
    _modal_x.tooltip_text = "关闭"
    _modal_x.focus_mode = Control.FOCUS_NONE
    _modal_x.add_theme_font_size_override("font_size", 20)
    _modal_x.add_theme_color_override("font_color", Color(0.973, 0.875, 0.675, 0.82))
    var close_style: StyleBoxFlat = StyleBoxFlat.new()
    close_style.bg_color = Color(0.0, 0.0, 0.0, 0.22)
    close_style.border_color = Color(0.906, 0.780, 0.553, 0.18)
    close_style.set_border_width_all(1)
    close_style.corner_radius_top_left = 17
    close_style.corner_radius_top_right = 17
    close_style.corner_radius_bottom_left = 17
    close_style.corner_radius_bottom_right = 17
    _modal_x.add_theme_stylebox_override("normal", close_style)
    _modal_x.add_theme_stylebox_override("hover", close_style)
    _modal_x.add_theme_stylebox_override("pressed", close_style)
    _modal_x.pressed.connect(BenefitVisualOverlay._close_modal)
    BenefitVisualOverlay._modal.add_child(_modal_x)

    BenefitVisualOverlay._modal_close.text = "关闭光幕"
    BenefitVisualOverlay._modal_close.focus_mode = Control.FOCUS_NONE
    BenefitVisualOverlay._modal_close.add_theme_font_size_override("font_size", 14)
    BenefitVisualOverlay._modal_close.add_theme_color_override("font_color", Color("e7c78d"))
    var secondary_style: StyleBoxFlat = StyleBoxFlat.new()
    secondary_style.bg_color = Color(0.0, 0.0, 0.0, 0.24)
    secondary_style.border_color = Color(0.906, 0.780, 0.553, 0.24)
    secondary_style.set_border_width_all(1)
    secondary_style.corner_radius_top_left = 4
    secondary_style.corner_radius_top_right = 4
    secondary_style.corner_radius_bottom_left = 4
    secondary_style.corner_radius_bottom_right = 4
    BenefitVisualOverlay._modal_close.add_theme_stylebox_override("normal", secondary_style)
    BenefitVisualOverlay._modal_close.add_theme_stylebox_override("hover", secondary_style)
    BenefitVisualOverlay._modal_close.add_theme_stylebox_override("pressed", secondary_style)

    var modal_style: StyleBoxFlat = StyleBoxFlat.new()
    modal_style.bg_color = Color(0.035, 0.031, 0.027, 0.92)
    modal_style.border_color = Color(0.906, 0.780, 0.553, 0.56)
    modal_style.set_border_width_all(1)
    modal_style.corner_radius_top_left = 8
    modal_style.corner_radius_top_right = 8
    modal_style.corner_radius_bottom_left = 8
    modal_style.corner_radius_bottom_right = 8
    modal_style.shadow_color = Color(0.0, 0.0, 0.0, 0.76)
    modal_style.shadow_size = 24
    modal_style.shadow_offset = Vector2(0.0, 18.0)
    BenefitVisualOverlay._modal.add_theme_stylebox_override("panel", modal_style)

func _modal_label(text_value: String, font_size: int, color: Color) -> Label:
    var label: Label = Label.new()
    label.text = text_value
    label.add_theme_font_size_override("font_size", font_size)
    label.add_theme_color_override("font_color", color)
    label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    return label

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
    BenefitVisualOverlay._bubble_layer.size = Vector2(viewport_size.x, 230.0)

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

    if _modal_backdrop != null:
        _modal_backdrop.position = Vector2.ZERO
        _modal_backdrop.size = viewport_size

    _layout_modal(viewport_size)

func _layout_modal(viewport_size: Vector2) -> void:
    if BenefitVisualOverlay._modal == null:
        return

    var modal_width: float = minf(354.0, viewport_size.x - 36.0)
    var modal_height: float = minf(560.0, viewport_size.y - 96.0)
    BenefitVisualOverlay._modal.position = Vector2((viewport_size.x - modal_width) * 0.5, (viewport_size.y - modal_height) * 0.5)
    BenefitVisualOverlay._modal.size = Vector2(modal_width, modal_height)

    _modal_kicker.position = Vector2(18.0, 17.0)
    _modal_kicker.size = Vector2(modal_width - 70.0, 18.0)
    BenefitVisualOverlay._modal_title.position = Vector2(18.0, 37.0)
    BenefitVisualOverlay._modal_title.size = Vector2(modal_width - 70.0, 40.0)
    _modal_intro.position = Vector2(18.0, 78.0)
    _modal_intro.size = Vector2(modal_width - 36.0, 42.0)

    _modal_status_panel.position = Vector2(18.0, 121.0)
    _modal_status_panel.size = Vector2(76.0, 26.0)
    BenefitVisualOverlay._modal_status.position = Vector2(18.0, 121.0)
    BenefitVisualOverlay._modal_status.size = Vector2(76.0, 26.0)

    _modal_x.position = Vector2(modal_width - 46.0, 12.0)
    _modal_x.size = Vector2(34.0, 34.0)

    _modal_emblem.position = Vector2(18.0, 164.0)
    _modal_emblem.size = Vector2(88.0, 88.0)
    _modal_emblem_icon.position = Vector2(21.0, 21.0)
    _modal_emblem_icon.size = Vector2(46.0, 46.0)

    BenefitVisualOverlay._modal_description.position = Vector2(122.0, 158.0)
    BenefitVisualOverlay._modal_description.size = Vector2(modal_width - 140.0, 72.0)

    _detail_unlock_caption.position = Vector2(122.0, 230.0)
    _detail_unlock_caption.size = Vector2(66.0, 18.0)
    _detail_unlock_value.position = Vector2(194.0, 230.0)
    _detail_unlock_value.size = Vector2(modal_width - 212.0, 18.0)

    _detail_frequency_caption.position = Vector2(122.0, 252.0)
    _detail_frequency_caption.size = Vector2(66.0, 18.0)
    _detail_frequency_value.position = Vector2(194.0, 252.0)
    _detail_frequency_value.size = Vector2(modal_width - 212.0, 18.0)

    _detail_method_caption.position = Vector2(122.0, 274.0)
    _detail_method_caption.size = Vector2(66.0, 18.0)
    _detail_method_value.position = Vector2(194.0, 274.0)
    _detail_method_value.size = Vector2(modal_width - 212.0, 36.0)

    var grid_top: float = 320.0
    var gap: float = 2.0
    var inner_width: float = modal_width - 36.0
    var cell_width: float = (inner_width - gap) * 0.5
    var cell_height: float = 64.0
    for index: int in range(_usage_cells.size()):
        var col: int = index % 2
        var row: int = int(index / 2)
        var cell: Panel = _usage_cells[index]
        cell.position = Vector2(18.0 + float(col) * (cell_width + gap), grid_top + float(row) * (cell_height + gap))
        cell.size = Vector2(cell_width, cell_height)
        _usage_captions[index].position = Vector2(10.0, 8.0)
        _usage_captions[index].size = Vector2(cell_width - 20.0, 16.0)
        _usage_values[index].position = Vector2(10.0, 28.0)
        _usage_values[index].size = Vector2(cell_width - 20.0, 30.0)

    BenefitVisualOverlay._modal_close.position = Vector2(18.0, modal_height - 60.0)
    BenefitVisualOverlay._modal_close.size = Vector2(modal_width - 36.0, 44.0)

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
        var benefit_value: Variant = button.get_meta("benefit", {})
        if not benefit_value is Dictionary:
            continue
        var benefit: Dictionary = benefit_value as Dictionary
        var status: String = str(BenefitVisualOverlay.call("_computed_status", benefit, level))
        _apply_bubble_style(button, status)
        _ensure_bubble_content(button, benefit, status, level)

func _apply_bubble_style(button: Button, status: String) -> void:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.047, 0.035, 0.027, 0.52)
    style.border_color = Color(0.906, 0.780, 0.553, 0.18)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 39
    style.corner_radius_top_right = 39
    style.corner_radius_bottom_left = 39
    style.corner_radius_bottom_right = 39
    style.content_margin_left = 6.0
    style.content_margin_right = 6.0
    style.content_margin_top = 9.0
    style.content_margin_bottom = 9.0
    style.shadow_color = Color(0.0, 0.0, 0.0, 0.40)
    style.shadow_size = 10
    style.shadow_offset = Vector2(0.0, 8.0)

    if status == "cooldown":
        style.bg_color = Color(0.050, 0.045, 0.040, 0.58)
        style.border_color = Color(0.70, 0.66, 0.58, 0.22)
    elif status == "pending":
        style.bg_color = Color(0.070, 0.050, 0.030, 0.62)
        style.border_color = Color(0.906, 0.780, 0.553, 0.26)
    elif status == "locked" or status == "frozen":
        style.bg_color = Color(0.040, 0.040, 0.040, 0.56)
        style.border_color = Color(0.70, 0.70, 0.70, 0.16)

    button.add_theme_stylebox_override("normal", style)
    button.add_theme_stylebox_override("disabled", style)

    var hover: StyleBoxFlat = style.duplicate() as StyleBoxFlat
    hover.border_color = Color(0.973, 0.875, 0.675, 0.58)
    hover.shadow_color = Color(0.0, 0.0, 0.0, 0.46)
    hover.shadow_size = 12
    hover.shadow_offset = Vector2(0.0, 9.0)
    button.add_theme_stylebox_override("hover", hover)
    button.add_theme_stylebox_override("pressed", hover)

func _ensure_bubble_content(button: Button, benefit: Dictionary, status: String, level: int) -> void:
    button.text = ""
    button.clip_contents = true
    button.pivot_offset = Vector2(39.0, 39.0)

    var content: Control = button.get_node_or_null("ParityContent") as Control
    if content == null:
        content = Control.new()
        content.name = "ParityContent"
        content.mouse_filter = Control.MOUSE_FILTER_IGNORE
        button.add_child(content)

        var icon: Control = BenefitIconScript.new() as Control
        icon.name = "Icon"
        icon.set("stroke_width", 1.8)
        content.add_child(icon)

        var name_label: Label = _modal_label("", 12, Color("f3eadb"))
        name_label.name = "Name"
        name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        name_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        name_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
        content.add_child(name_label)

        var status_label: Label = _modal_label("", 9, Color(0.953, 0.918, 0.859, 0.42))
        status_label.name = "Status"
        status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        status_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        content.add_child(status_label)

    content.position = Vector2.ZERO
    content.size = Vector2(78.0, 78.0)

    var icon_control: Control = content.get_node("Icon") as Control
    icon_control.position = Vector2(26.0, 7.0)
    icon_control.size = Vector2(26.0, 26.0)
    icon_control.set("icon_key", str(benefit.get("icon", "gift")))
    icon_control.set("stroke_color", Color(1.0, 0.949, 0.831, 0.88))

    var name_label_value: Label = content.get_node("Name") as Label
    name_label_value.text = str(benefit.get("name", "权益"))
    name_label_value.add_theme_font_size_override("font_size", 11 if name_label_value.text.length() >= 7 else 12)
    name_label_value.position = Vector2(5.0, 34.0)
    name_label_value.size = Vector2(68.0, 25.0)

    var status_label_value: Label = content.get_node("Status") as Label
    status_label_value.text = str(BenefitVisualOverlay.call("_status_text", benefit, level))
    status_label_value.position = Vector2(5.0, 59.0)
    status_label_value.size = Vector2(68.0, 12.0)

    var muted: bool = status != "available"
    var content_alpha: float = 0.72 if muted else 1.0
    content.modulate = Color(1.0, 1.0, 1.0, content_alpha)

func _layout_bubbles() -> void:
    var total: int = BenefitVisualOverlay._benefits.size()
    if total <= 0:
        return

    var viewport_width: float = get_viewport().get_visible_rect().size.x
    var screen_scale: float = viewport_width / 390.0
    var cloud_drift: float = 0.0
    if total <= 5:
        var drift_phase: float = fmod(_elapsed, 9.6) / 9.6
        if drift_phase <= 0.5:
            cloud_drift = lerpf(-8.0, 8.0, drift_phase / 0.5)
        else:
            cloud_drift = lerpf(8.0, -3.0, (drift_phase - 0.5) / 0.5)

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
            x += cloud_drift

        var benefit_value: Variant = button.get_meta("benefit", {})
        var status: String = "available"
        if benefit_value is Dictionary:
            status = str(BenefitVisualOverlay.call("_computed_status", benefit_value as Dictionary, int(GameState.get_progress().get("level", 0))))

        var delay: float = 0.12 + float(index) * 0.18
        var entry_t: float = clampf((_page_age - delay) / 0.36, 0.0, 1.0)
        var ease_t: float = 1.0 - pow(1.0 - entry_t, 3.0)
        var entry_y: float = lerpf(6.0, 0.0, ease_t)
        var float_x: float = 0.0
        var float_y: float = 0.0
        if status != "locked" and status != "cooldown" and _page_age > 0.90 + delay:
            var float_phase: float = (_page_age - 0.90 - delay) / 4.2 * TAU
            float_x = lerpf(-1.0, 1.5, (sin(float_phase) + 1.0) * 0.5)
            float_y = -2.5 - cos(float_phase) * 2.5

        button.position = Vector2(x * screen_scale - 39.0 + float_x, point.y - 39.0 + 36.0 + entry_y + float_y)
        button.size = Vector2(78.0, 78.0)
        button.scale = Vector2.ONE * lerpf(0.94, 1.0, ease_t)
        var final_alpha: float = 1.0 if status == "available" else 0.46
        button.modulate = Color(1.0, 1.0, 1.0, final_alpha * ease_t)

func _sync_modal_visibility(visible_now: bool, delta: float) -> void:
    if visible_now and not _modal_was_visible:
        _modal_age = 0.0
    if visible_now:
        _modal_age += delta
        _sync_modal_content()
    _modal_was_visible = visible_now
    if _modal_backdrop != null:
        _modal_backdrop.visible = visible_now

    if BenefitVisualOverlay._modal != null:
        var t: float = clampf(_modal_age / 0.26, 0.0, 1.0) if visible_now else 0.0
        var ease_t: float = 1.0 - pow(1.0 - t, 3.0)
        BenefitVisualOverlay._modal.modulate = Color(1.0, 1.0, 1.0, ease_t if visible_now else 1.0)
        BenefitVisualOverlay._modal.scale = Vector2.ONE * lerpf(0.96, 1.0, ease_t)
        BenefitVisualOverlay._modal.pivot_offset = BenefitVisualOverlay._modal.size * 0.5

func _selected_benefit() -> Dictionary:
    if BenefitVisualOverlay._modal_title == null:
        return {}
    var target_name: String = BenefitVisualOverlay._modal_title.text
    for value: Variant in BenefitVisualOverlay._benefits:
        if value is Dictionary and str(value.get("name", "")) == target_name:
            return value as Dictionary
    return {}

func _sync_modal_content() -> void:
    var benefit: Dictionary = _selected_benefit()
    if benefit.is_empty():
        return

    var level: int = int(GameState.get_progress().get("level", 0))
    var status: String = str(BenefitVisualOverlay.call("_computed_status", benefit, level))
    var status_text: String = str(BenefitVisualOverlay.call("_status_text", benefit, level))

    _modal_emblem_icon.set("icon_key", str(benefit.get("icon", "gift")))
    _detail_unlock_value.text = "Lv.%02d" % int(benefit.get("levelRequired", 0))
    _detail_frequency_value.text = str(benefit.get("frequency", "未设置"))

    if _usage_values.size() >= 4:
        _usage_values[0].text = status_text
        var bonus_count: int = int(benefit.get("availableBonusCount", 0))
        _usage_values[1].text = "%s 次奖励库存" % bonus_count
        var last_used: String = str(benefit.get("lastApprovedAt", ""))
        _usage_values[2].text = last_used if not last_used.is_empty() else "暂无记录"
        var cooldown_until: String = str(benefit.get("cooldownUntil", ""))
        if status == "pending":
            _usage_values[3].text = "等待老婆审批"
        elif not cooldown_until.is_empty():
            _usage_values[3].text = cooldown_until
        else:
            _usage_values[3].text = "现在可申请"

    var muted: bool = status != "available"
    var status_color: Color = Color(0.86, 0.83, 0.76, 0.82) if muted else Color("f8dfac")
    BenefitVisualOverlay._modal_status.add_theme_color_override("font_color", status_color)
    _modal_emblem_icon.set("stroke_color", status_color)
