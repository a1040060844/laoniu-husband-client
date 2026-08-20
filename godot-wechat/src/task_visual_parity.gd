extends Node

const TaskLineIconScript = preload("res://src/task_line_icon.gd")

var _mounted: bool = false
var _was_visible: bool = false
var _edge_mask: ColorRect
var _swipe_root: Control
var _swipe_arrows: Array[Label] = []
var _swipe_text: Label
var _header_subtitle: Label
var _avatar_frame: Panel
var _avatar_image: TextureRect
var _avatar_requested_level: int = -1

var _overview_panel: Panel
var _overview_cells: Array[Panel] = []
var _overview_values: Array[Label] = []
var _overview_muted: Array[Label] = []

var _month_panel: Panel
var _month_cells: Array[Panel] = []
var _month_values: Array[Label] = []
var _month_note: Label

var _sync_elapsed: float = 0.0
var _float_elapsed: float = 0.0

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount_when_ready")

func _mount_when_ready() -> void:
    for _attempt: int in range(120):
        if TaskVisualOverlay._root != null and TaskVisualOverlay._scroll != null:
            break
        await get_tree().process_frame

    if TaskVisualOverlay._root == null:
        return

    _install_background()
    _install_swipe_hint()
    _install_header()
    _install_overview_panel()
    _hide_legacy_summary_labels()
    get_viewport().size_changed.connect(_layout)
    _layout()
    _sync_all()
    _mounted = true

func _process(delta: float) -> void:
    if not _mounted or TaskVisualOverlay._root == null:
        return

    var visible_now: bool = TaskVisualOverlay._root.visible
    if visible_now and not _was_visible:
        _sync_all()
        _ensure_month_panel()
    _was_visible = visible_now
    if not visible_now:
        return

    _float_elapsed += delta
    _sync_elapsed += delta
    if _sync_elapsed >= 0.20:
        _sync_elapsed = 0.0
        _sync_all()

    _ensure_month_panel()
    _style_tabs()
    _style_task_cards()
    _animate_swipe_hint()

func _install_background() -> void:
    TaskVisualOverlay._backdrop.visible = false

    var color_rects: Array[ColorRect] = []
    for child: Node in TaskVisualOverlay._root.get_children():
        if child is ColorRect:
            color_rects.append(child as ColorRect)

    if color_rects.size() > 0:
        color_rects[0].z_index = -4
        color_rects[0].color = Color.BLACK

    if color_rects.size() > 1:
        var scrim: ColorRect = color_rects[1]
        scrim.z_index = -3
        var shader: Shader = Shader.new()
        shader.code = """
shader_type canvas_item;
void fragment() {
    float vertical = 0.24;
    if (UV.y < 0.40) {
        vertical = mix(0.24, 0.66, UV.y / 0.40);
    } else {
        vertical = mix(0.66, 0.94, (UV.y - 0.40) / 0.60);
    }
    float glow = (1.0 - smoothstep(0.0, 0.78, distance(UV, vec2(0.5, 0.0)))) * 0.18;
    vec3 warm = vec3(0.090, 0.066, 0.036) * glow;
    vec3 base = vec3(0.027, 0.020, 0.016) * vertical;
    COLOR = vec4(base + warm, clamp(vertical, 0.0, 0.96));
}
"""
        var material: ShaderMaterial = ShaderMaterial.new()
        material.shader = shader
        scrim.material = material

    _edge_mask = ColorRect.new()
    _edge_mask.color = Color.WHITE
    _edge_mask.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _edge_mask.z_index = 0
    var edge_shader: Shader = Shader.new()
    edge_shader.code = """
shader_type canvas_item;
void fragment() {
    float top = 0.0;
    if (UV.y <= 0.016) top = 1.0;
    else top = (1.0 - smoothstep(0.016, 0.078, UV.y)) * 0.80;
    float bottom = smoothstep(0.917, 1.0, UV.y);
    float left = (1.0 - smoothstep(0.026, 0.167, UV.x)) * 0.80;
    float right = smoothstep(0.833, 0.974, UV.x) * 0.80;
    float a = clamp(max(max(top, bottom), max(left, right)), 0.0, 1.0);
    COLOR = vec4(0.0, 0.0, 0.0, a);
}
"""
    var edge_material: ShaderMaterial = ShaderMaterial.new()
    edge_material.shader = edge_shader
    _edge_mask.material = edge_material
    TaskVisualOverlay._root.add_child(_edge_mask)

func _install_swipe_hint() -> void:
    for child: Node in TaskVisualOverlay._root.get_children():
        if child.has_meta("layout") and str(child.get_meta("layout")) == "swipe":
            var old_swipe: CanvasItem = child as CanvasItem
            if old_swipe != null:
                old_swipe.visible = false

    _swipe_root = Control.new()
    _swipe_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _swipe_root.z_index = 4
    TaskVisualOverlay._root.add_child(_swipe_root)

    var arrow_sizes: Array[int] = [29, 23, 17]
    var arrow_alpha: Array[float] = [0.94, 0.58, 0.30]
    var arrow_y: Array[float] = [-4.0, 4.0, 11.0]
    for index: int in range(3):
        var arrow: Label = Label.new()
        arrow.text = "⌄"
        arrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        arrow.add_theme_font_size_override("font_size", arrow_sizes[index])
        arrow.add_theme_color_override("font_color", Color(0.973, 0.875, 0.675, arrow_alpha[index]))
        arrow.add_theme_color_override("font_shadow_color", Color(0.88, 0.62, 0.28, 0.42))
        arrow.add_theme_constant_override("shadow_offset_y", 1)
        arrow.mouse_filter = Control.MOUSE_FILTER_IGNORE
        arrow.position = Vector2(134.0, arrow_y[index])
        arrow.size = Vector2(52.0, 30.0)
        _swipe_root.add_child(arrow)
        _swipe_arrows.append(arrow)

    var left_line: ColorRect = _make_gold_line(true)
    left_line.position = Vector2(0.0, 37.0)
    left_line.size = Vector2(82.0, 1.0)
    _swipe_root.add_child(left_line)

    var right_line: ColorRect = _make_gold_line(false)
    right_line.position = Vector2(238.0, 37.0)
    right_line.size = Vector2(82.0, 1.0)
    _swipe_root.add_child(right_line)

    _swipe_text = Label.new()
    _swipe_text.text = "下滑进入主页"
    _swipe_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _swipe_text.add_theme_font_size_override("font_size", 15)
    _swipe_text.add_theme_color_override("font_color", Color(0.973, 0.875, 0.675, 0.94))
    _swipe_text.add_theme_color_override("font_shadow_color", Color(0.73, 0.51, 0.21, 0.44))
    _swipe_text.add_theme_constant_override("shadow_offset_y", 1)
    _swipe_text.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _swipe_text.position = Vector2(82.0, 26.0)
    _swipe_text.size = Vector2(156.0, 24.0)
    _swipe_root.add_child(_swipe_text)

func _make_gold_line(bright_at_right: bool) -> ColorRect:
    var line: ColorRect = ColorRect.new()
    line.color = Color.WHITE
    line.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;
uniform bool bright_at_right = true;
void fragment() {
    float a = bright_at_right ? UV.x : (1.0 - UV.x);
    COLOR = vec4(0.973, 0.875, 0.675, a * 0.72);
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    material.set_shader_parameter("bright_at_right", bright_at_right)
    line.material = material
    return line

func _install_header() -> void:
    TaskVisualOverlay._level_label.z_index = 3
    TaskVisualOverlay._level_label.add_theme_font_size_override("font_size", 20)
    TaskVisualOverlay._level_label.add_theme_color_override("font_color", Color("e7c78d"))

    TaskVisualOverlay._title_label.z_index = 3
    TaskVisualOverlay._title_label.add_theme_font_size_override("font_size", 42)
    TaskVisualOverlay._title_label.add_theme_color_override("font_color", Color("f3eadb"))
    TaskVisualOverlay._title_label.add_theme_color_override("font_shadow_color", Color(0.906, 0.780, 0.553, 0.24))
    TaskVisualOverlay._title_label.add_theme_constant_override("shadow_offset_y", 2)

    _header_subtitle = Label.new()
    _header_subtitle.text = "老哥任务簿 · 今日待执行"
    _header_subtitle.add_theme_font_size_override("font_size", 14)
    _header_subtitle.add_theme_color_override("font_color", Color("e7c78d"))
    _header_subtitle.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _header_subtitle.z_index = 3
    TaskVisualOverlay._root.add_child(_header_subtitle)

    _avatar_frame = Panel.new()
    _avatar_frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _avatar_frame.z_index = 3
    var frame_style: StyleBoxFlat = StyleBoxFlat.new()
    frame_style.bg_color = Color(0.02, 0.016, 0.012, 0.80)
    frame_style.border_color = Color(0.906, 0.780, 0.553, 0.48)
    frame_style.set_border_width_all(1)
    frame_style.corner_radius_top_left = 44
    frame_style.corner_radius_top_right = 44
    frame_style.corner_radius_bottom_left = 44
    frame_style.corner_radius_bottom_right = 44
    frame_style.shadow_color = Color(0.0, 0.0, 0.0, 0.55)
    frame_style.shadow_size = 14
    frame_style.shadow_offset = Vector2(0.0, 8.0)
    _avatar_frame.add_theme_stylebox_override("panel", frame_style)
    TaskVisualOverlay._root.add_child(_avatar_frame)

    _avatar_image = TextureRect.new()
    _avatar_image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    _avatar_image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
    _avatar_image.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var avatar_shader: Shader = Shader.new()
    avatar_shader.code = """
shader_type canvas_item;
void fragment() {
    vec2 p = UV - vec2(0.5);
    if (length(p) > 0.5) {
        COLOR = vec4(0.0);
    } else {
        vec2 sample_uv = (UV - vec2(0.5)) / 2.35 + vec2(0.5, 0.38);
        sample_uv = clamp(sample_uv, vec2(0.0), vec2(1.0));
        COLOR = texture(TEXTURE, sample_uv);
    }
}
"""
    var avatar_material: ShaderMaterial = ShaderMaterial.new()
    avatar_material.shader = avatar_shader
    _avatar_image.material = avatar_material
    _avatar_frame.add_child(_avatar_image)

func _install_overview_panel() -> void:
    TaskVisualOverlay._overview_label.visible = false

    _overview_panel = Panel.new()
    _overview_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _overview_panel.z_index = 3
    _overview_panel.add_theme_stylebox_override("panel", _panel_style())
    TaskVisualOverlay._root.add_child(_overview_panel)
    _add_panel_title(_overview_panel, "今日执行概况", 12.0)

    var labels: Array[String] = ["待执行", "待提交", "待确认", "今日可得"]
    var icons: Array[String] = ["clipboard", "send", "hourglass", "sparkles"]
    for index: int in range(4):
        var cell: Panel = _stat_cell(labels[index], icons[index], index == 3)
        _overview_panel.add_child(cell)
        _overview_cells.append(cell)
        var value_label: Label = cell.get_node("Value") as Label
        var muted_label: Label = cell.get_node("Muted") as Label
        _overview_values.append(value_label)
        _overview_muted.append(muted_label)

func _hide_legacy_summary_labels() -> void:
    TaskVisualOverlay._month_label.visible = false
    TaskVisualOverlay._status_label.visible = false

func _panel_style() -> StyleBoxFlat:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.039, 0.031, 0.024, 0.66)
    style.border_color = Color(0.906, 0.780, 0.553, 0.32)
    style.set_border_width_all(1)
    style.shadow_color = Color(0.0, 0.0, 0.0, 0.54)
    style.shadow_size = 18
    style.shadow_offset = Vector2(0.0, 10.0)
    return style

func _add_panel_title(panel: Control, text_value: String, top: float) -> void:
    var title: Label = Label.new()
    title.text = text_value
    title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    title.add_theme_font_size_override("font_size", 16)
    title.add_theme_color_override("font_color", Color("e7c78d"))
    title.mouse_filter = Control.MOUSE_FILTER_IGNORE
    title.position = Vector2(88.0, top)
    title.size = Vector2(158.0, 22.0)
    panel.add_child(title)

    var left_line: ColorRect = _make_gold_line(true)
    left_line.position = Vector2(34.0, top + 11.0)
    left_line.size = Vector2(42.0, 1.0)
    panel.add_child(left_line)

    var right_line: ColorRect = _make_gold_line(false)
    right_line.position = Vector2(258.0, top + 11.0)
    right_line.size = Vector2(42.0, 1.0)
    panel.add_child(right_line)

func _stat_cell(label_text: String, icon_key: String, muted: bool) -> Panel:
    var cell: Panel = Panel.new()
    cell.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.031, 0.024, 0.016, 0.50)
    style.border_color = Color(0.906, 0.780, 0.553, 0.24)
    style.set_border_width_all(1)
    cell.add_theme_stylebox_override("panel", style)

    var icon: Control = TaskLineIconScript.new() as Control
    icon.name = "Icon"
    icon.set("icon_key", icon_key)
    icon.set("stroke_color", Color("e7c78d"))
    icon.set("stroke_width", 1.5)
    icon.position = Vector2(27.0, 4.0)
    icon.size = Vector2(22.0, 22.0)
    cell.add_child(icon)

    var caption: Label = Label.new()
    caption.name = "Caption"
    caption.text = label_text
    caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    caption.add_theme_font_size_override("font_size", 11)
    caption.add_theme_color_override("font_color", Color(0.953, 0.918, 0.859, 0.68))
    caption.position = Vector2(2.0, 26.0)
    caption.size = Vector2(72.0, 18.0)
    caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
    cell.add_child(caption)

    var value_label: Label = Label.new()
    value_label.name = "Value"
    value_label.text = "0"
    value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    value_label.add_theme_font_size_override("font_size", 22)
    value_label.add_theme_color_override("font_color", Color("f8dfac"))
    value_label.position = Vector2(2.0, 43.0)
    value_label.size = Vector2(72.0, 25.0)
    value_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    cell.add_child(value_label)

    var muted_label: Label = Label.new()
    muted_label.name = "Muted"
    muted_label.text = "EXP" if muted else ""
    muted_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    muted_label.add_theme_font_size_override("font_size", 9)
    muted_label.add_theme_color_override("font_color", Color(0.953, 0.918, 0.859, 0.60))
    muted_label.position = Vector2(2.0, 65.0)
    muted_label.size = Vector2(72.0, 14.0)
    muted_label.visible = muted
    muted_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    cell.add_child(muted_label)
    return cell

func _layout() -> void:
    if not _mounted and TaskVisualOverlay._root == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size

    if _edge_mask != null:
        _edge_mask.position = Vector2.ZERO
        _edge_mask.size = viewport_size

    if _swipe_root != null:
        _swipe_root.position = Vector2((viewport_size.x - 320.0) * 0.5, 12.0)
        _swipe_root.size = Vector2(320.0, 48.0)

    TaskVisualOverlay._level_label.position = Vector2(16.0, 72.0)
    TaskVisualOverlay._level_label.size = Vector2(220.0, 24.0)
    TaskVisualOverlay._title_label.position = Vector2(16.0, 94.0)
    TaskVisualOverlay._title_label.size = Vector2(258.0, 50.0)

    if _header_subtitle != null:
        _header_subtitle.position = Vector2(16.0, 145.0)
        _header_subtitle.size = Vector2(250.0, 22.0)

    if _avatar_frame != null:
        _avatar_frame.position = Vector2(viewport_size.x - 16.0 - 88.0, 72.0)
        _avatar_frame.size = Vector2(88.0, 88.0)
        _avatar_image.position = Vector2.ZERO
        _avatar_image.size = Vector2(88.0, 88.0)

    if _overview_panel != null:
        _overview_panel.position = Vector2(16.0, 174.0)
        _overview_panel.size = Vector2(viewport_size.x - 32.0, 120.0)
        var cell_width: float = (_overview_panel.size.x - 24.0 - 24.0) / 4.0
        for index: int in range(_overview_cells.size()):
            var cell: Panel = _overview_cells[index]
            cell.position = Vector2(12.0 + float(index) * (cell_width + 8.0), 42.0)
            cell.size = Vector2(cell_width, 68.0)
            var icon: Control = cell.get_node("Icon") as Control
            var caption: Label = cell.get_node("Caption") as Label
            var value_label: Label = cell.get_node("Value") as Label
            var muted_label: Label = cell.get_node("Muted") as Label
            icon.position.x = (cell_width - 22.0) * 0.5
            caption.size.x = cell_width - 4.0
            value_label.size.x = cell_width - 4.0
            muted_label.size.x = cell_width - 4.0

    TaskVisualOverlay._source_row.position = Vector2(16.0, 308.0)
    TaskVisualOverlay._source_row.size = Vector2(viewport_size.x - 32.0, 44.0)
    TaskVisualOverlay._source_row.z_index = 4

    TaskVisualOverlay._filter_row.position = Vector2(16.0, 366.0)
    TaskVisualOverlay._filter_row.size = Vector2(viewport_size.x - 32.0, 44.0)
    TaskVisualOverlay._filter_row.z_index = 4

    TaskVisualOverlay._scroll.position = Vector2(16.0, 424.0)
    TaskVisualOverlay._scroll.size = Vector2(viewport_size.x - 32.0, viewport_size.y - 442.0)
    TaskVisualOverlay._scroll.z_index = 3
    TaskVisualOverlay._list.custom_minimum_size = Vector2(TaskVisualOverlay._scroll.size.x - 8.0, 0.0)
    TaskVisualOverlay._list.add_theme_constant_override("separation", 12)

func _style_tabs() -> void:
    for child: Node in TaskVisualOverlay._source_row.get_children():
        if child is Button:
            var button: Button = child as Button
            var active: bool = str(button.get_meta("source-key", "")) == str(TaskVisualOverlay._source)
            _style_tab_button(button, active, true)

    for child: Node in TaskVisualOverlay._filter_row.get_children():
        if child is Button:
            var button: Button = child as Button
            var active: bool = str(button.get_meta("filter-key", "")) == str(TaskVisualOverlay._filter)
            _style_tab_button(button, active, false)

func _style_tab_button(button: Button, active: bool, source_tab: bool) -> void:
    button.custom_minimum_size = Vector2(0.0, 44.0)
    button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    button.add_theme_font_size_override("font_size", 18 if source_tab else 12)
    button.add_theme_color_override("font_color", Color("26190a") if active else Color(0.953, 0.918, 0.859, 0.68))
    button.add_theme_color_override("font_hover_color", Color("26190a") if active else Color("f8dfac"))

    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color("d2ad70") if active else Color(0.039, 0.031, 0.024, 0.68)
    style.border_color = Color(0.906, 0.780, 0.553, 0.40 if active else 0.22)
    style.set_border_width_all(1)
    button.add_theme_stylebox_override("normal", style)
    button.add_theme_stylebox_override("hover", style)
    button.add_theme_stylebox_override("pressed", style)

func _style_task_cards() -> void:
    if TaskVisualOverlay._list == null:
        return

    for child: Node in TaskVisualOverlay._list.get_children():
        if not child is Panel:
            continue
        var card: Panel = child as Panel
        if card == _month_panel:
            continue
        _style_task_card(card)

func _style_task_card(card: Panel) -> void:
    if card.get_child_count() < 6:
        return

    var head: Label = card.get_child(0) as Label
    var title: Label = card.get_child(1) as Label
    var description: Label = card.get_child(2) as Label
    var reward: Label = card.get_child(3) as Label
    var deadline: Label = card.get_child(4) as Label
    var action: Button = card.get_child(5) as Button
    if head == null or title == null or description == null or reward == null or deadline == null or action == null:
        return

    var status_text: String = _status_from_head(head.text)
    var type_text: String = head.text
    if not status_text.is_empty():
        type_text = type_text.replace(status_text, "").strip_edges()
    while type_text.contains("    "):
        type_text = type_text.replace("    ", " ")

    head.visible = false
    card.custom_minimum_size = Vector2(0.0, 238.0)
    var card_style: StyleBoxFlat = StyleBoxFlat.new()
    card_style.bg_color = Color(0.055, 0.040, 0.026, 0.76)
    card_style.border_color = _status_border(status_text)
    card_style.set_border_width_all(1)
    card_style.shadow_color = Color(0.0, 0.0, 0.0, 0.44)
    card_style.shadow_size = 16
    card_style.shadow_offset = Vector2(0.0, 10.0)
    card.add_theme_stylebox_override("panel", card_style)
    card.modulate = Color(1, 1, 1, 0.82) if status_text == "已确认" or status_text == "已完成" else Color.WHITE

    var width_value: float = maxf(card.size.x, TaskVisualOverlay._scroll.size.x - 8.0)
    var content_x: float = 80.0
    var content_width: float = maxf(180.0, width_value - content_x - 14.0)

    var mark: Panel = _ensure_mark(card)
    mark.position = Vector2(14.0, 14.0)
    mark.size = Vector2(54.0, 54.0)
    var mark_icon: Control = mark.get_node("Icon") as Control
    mark_icon.set("icon_key", _status_icon(status_text))
    mark_icon.set("stroke_color", Color("e7c78d"))
    mark_icon.queue_redraw()

    var type_chip: Panel = _ensure_chip(card, "ParityType", type_text, false)
    type_chip.position = Vector2(content_x, 14.0)
    type_chip.size = Vector2(minf(148.0, content_width - 76.0), 26.0)

    var status_chip: Panel = _ensure_chip(card, "ParityStatus", status_text, true)
    status_chip.position = Vector2(width_value - 14.0 - 70.0, 14.0)
    status_chip.size = Vector2(70.0, 26.0)
    _style_status_chip(status_chip, status_text)

    title.position = Vector2(content_x, 48.0)
    title.size = Vector2(content_width, 28.0)
    title.add_theme_font_size_override("font_size", 23)
    title.add_theme_color_override("font_color", Color("f3eadb"))

    description.position = Vector2(content_x, 80.0)
    description.size = Vector2(content_width, 42.0)
    description.add_theme_font_size_override("font_size", 13)
    description.add_theme_color_override("font_color", Color(0.953, 0.918, 0.859, 0.68))
    description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

    var reward_chip: Panel = _ensure_reward_chip(card)
    reward_chip.position = Vector2(content_x, 128.0)
    reward_chip.size = Vector2(minf(158.0, content_width), 26.0)
    var gift_icon: Control = reward_chip.get_node("Icon") as Control
    gift_icon.position = Vector2(7.0, 4.0)
    gift_icon.size = Vector2(18.0, 18.0)
    reward.position = Vector2(content_x + 28.0, 131.0)
    reward.size = Vector2(minf(128.0, content_width - 28.0), 20.0)
    reward.text = reward.text.trim_prefix("奖励：")
    reward.add_theme_font_size_override("font_size", 11)
    reward.add_theme_color_override("font_color", Color("e7c78d"))

    var deadline_icon: Control = _ensure_deadline_icon(card)
    deadline_icon.position = Vector2(content_x, 159.0)
    deadline_icon.size = Vector2(16.0, 16.0)
    deadline.position = Vector2(content_x + 21.0, 157.0)
    deadline.size = Vector2(content_width - 21.0, 20.0)
    deadline.add_theme_font_size_override("font_size", 12)
    deadline.add_theme_color_override("font_color", Color(0.953, 0.918, 0.859, 0.42))

    action.position = Vector2(width_value - 14.0 - 148.0, 180.0)
    action.size = Vector2(148.0, 46.0)
    action.add_theme_font_size_override("font_size", 13)
    _style_action(action)

func _ensure_mark(card: Panel) -> Panel:
    var existing: Node = card.get_node_or_null("ParityMark")
    if existing is Panel:
        return existing as Panel

    var mark: Panel = Panel.new()
    mark.name = "ParityMark"
    mark.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.0, 0.0, 0.0, 0.28)
    style.border_color = Color(0.906, 0.780, 0.553, 0.38)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 27
    style.corner_radius_top_right = 27
    style.corner_radius_bottom_left = 27
    style.corner_radius_bottom_right = 27
    mark.add_theme_stylebox_override("panel", style)
    card.add_child(mark)

    var icon: Control = TaskLineIconScript.new() as Control
    icon.name = "Icon"
    icon.position = Vector2(11.0, 11.0)
    icon.size = Vector2(32.0, 32.0)
    mark.add_child(icon)
    return mark

func _ensure_chip(card: Panel, node_name: String, text_value: String, status: bool) -> Panel:
    var existing: Node = card.get_node_or_null(node_name)
    var panel: Panel
    if existing is Panel:
        panel = existing as Panel
    else:
        panel = Panel.new()
        panel.name = node_name
        panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
        var style: StyleBoxFlat = StyleBoxFlat.new()
        style.bg_color = Color(0.906, 0.780, 0.553, 0.08)
        style.border_color = Color(0.906, 0.780, 0.553, 0.20)
        style.set_border_width_all(1)
        panel.add_theme_stylebox_override("panel", style)
        card.add_child(panel)

        var label: Label = Label.new()
        label.name = "Label"
        label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        label.add_theme_font_size_override("font_size", 12)
        label.add_theme_color_override("font_color", Color("f3eadb") if status else Color("e7c78d"))
        label.mouse_filter = Control.MOUSE_FILTER_IGNORE
        panel.add_child(label)

    var chip_label: Label = panel.get_node("Label") as Label
    chip_label.text = text_value
    chip_label.position = Vector2.ZERO
    chip_label.size = panel.size
    return panel

func _style_status_chip(panel: Panel, status_text: String) -> void:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.906, 0.780, 0.553, 0.12)
    style.border_color = Color(0.906, 0.780, 0.553, 0.20)
    style.set_border_width_all(1)
    if status_text == "未通过" or status_text == "已过期" or status_text == "待裁定":
        style.bg_color = Color(0.45, 0.14, 0.09, 0.18)
        style.border_color = Color(0.843, 0.482, 0.384, 0.32)
    panel.add_theme_stylebox_override("panel", style)
    var label: Label = panel.get_node("Label") as Label
    label.size = panel.size
    label.add_theme_color_override("font_color", Color(1.0, 0.67, 0.59, 0.94) if status_text == "未通过" else Color("f3eadb"))

func _ensure_reward_chip(card: Panel) -> Panel:
    var existing: Node = card.get_node_or_null("ParityRewardChip")
    if existing is Panel:
        return existing as Panel
    var panel: Panel = Panel.new()
    panel.name = "ParityRewardChip"
    panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.906, 0.780, 0.553, 0.08)
    style.border_color = Color(0.906, 0.780, 0.553, 0.20)
    style.set_border_width_all(1)
    panel.add_theme_stylebox_override("panel", style)
    card.add_child(panel)
    var icon: Control = TaskLineIconScript.new() as Control
    icon.name = "Icon"
    icon.set("icon_key", "gift")
    icon.set("stroke_color", Color("e7c78d"))
    panel.add_child(icon)
    return panel

func _ensure_deadline_icon(card: Panel) -> Control:
    var existing: Node = card.get_node_or_null("ParityDeadlineIcon")
    if existing is Control:
        return existing as Control
    var icon: Control = TaskLineIconScript.new() as Control
    icon.name = "ParityDeadlineIcon"
    icon.set("icon_key", "clipboard")
    icon.set("stroke_color", Color(0.953, 0.918, 0.859, 0.42))
    card.add_child(icon)
    return icon

func _style_action(action: Button) -> void:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    if action.disabled:
        style.bg_color = Color(0.13, 0.11, 0.08, 0.80)
        style.border_color = Color(0.906, 0.780, 0.553, 0.18)
        action.add_theme_color_override("font_disabled_color", Color(0.953, 0.918, 0.859, 0.68))
    else:
        style.bg_color = Color("d6af6c")
        style.border_color = Color(0.906, 0.780, 0.553, 0.48)
        action.add_theme_color_override("font_color", Color("241608"))
    style.set_border_width_all(1)
    style.shadow_color = Color(0.0, 0.0, 0.0, 0.38)
    style.shadow_size = 8
    style.shadow_offset = Vector2(0.0, 5.0)
    action.add_theme_stylebox_override("normal", style)
    action.add_theme_stylebox_override("hover", style)
    action.add_theme_stylebox_override("pressed", style)
    action.add_theme_stylebox_override("disabled", style)

func _status_from_head(text_value: String) -> String:
    for status_text: String in ["待执行", "进行中", "待确认", "已确认", "未通过", "已过期", "待裁定", "已完成"]:
        if text_value.contains(status_text):
            return status_text
    return ""

func _status_icon(status_text: String) -> String:
    match status_text:
        "待执行":
            return "clock"
        "进行中":
            return "play"
        "待确认":
            return "hourglass"
        "已确认", "已完成":
            return "check"
        _:
            return "alert"

func _status_border(status_text: String) -> Color:
    if status_text == "待执行":
        return Color(0.843, 0.482, 0.384, 0.50)
    if status_text == "未通过":
        return Color(0.843, 0.482, 0.384, 0.42)
    if status_text == "已确认" or status_text == "已完成":
        return Color(0.906, 0.780, 0.553, 0.22)
    if status_text == "待确认":
        return Color(0.906, 0.780, 0.553, 0.24)
    return Color(0.906, 0.780, 0.553, 0.30)

func _ensure_month_panel() -> void:
    if _month_panel != null and is_instance_valid(_month_panel) and not _month_panel.is_queued_for_deletion():
        if _month_panel.get_parent() != TaskVisualOverlay._list:
            TaskVisualOverlay._list.add_child(_month_panel)
        return

    _month_cells.clear()
    _month_values.clear()
    _month_panel = Panel.new()
    _month_panel.name = "ParityMonthPanel"
    _month_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _month_panel.custom_minimum_size = Vector2(0.0, 154.0)
    _month_panel.add_theme_stylebox_override("panel", _panel_style())
    TaskVisualOverlay._list.add_child(_month_panel)
    _add_panel_title(_month_panel, "本月收获", 12.0)

    var labels: Array[String] = ["本月获得零花钱", "本月完成任务数", "本月经验总数"]
    var icons: Array[String] = ["money", "user-check", "sparkles"]
    for index: int in range(3):
        var cell: Panel = _stat_cell(labels[index], icons[index], false)
        _month_panel.add_child(cell)
        _month_cells.append(cell)
        _month_values.append(cell.get_node("Value") as Label)

    _month_note = Label.new()
    _month_note.text = "本月表现正在稳步提升"
    _month_note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _month_note.add_theme_font_size_override("font_size", 12)
    _month_note.add_theme_color_override("font_color", Color("e7c78d"))
    _month_note.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _month_panel.add_child(_month_note)
    _layout_month_panel()
    _sync_stats()

func _layout_month_panel() -> void:
    if _month_panel == null or not is_instance_valid(_month_panel):
        return
    var width_value: float = maxf(_month_panel.size.x, TaskVisualOverlay._scroll.size.x - 8.0)
    var cell_width: float = (width_value - 24.0 - 16.0) / 3.0
    for index: int in range(_month_cells.size()):
        var cell: Panel = _month_cells[index]
        cell.position = Vector2(12.0 + float(index) * (cell_width + 8.0), 42.0)
        cell.size = Vector2(cell_width, 78.0)
        var icon: Control = cell.get_node("Icon") as Control
        var caption: Label = cell.get_node("Caption") as Label
        var value_label: Label = cell.get_node("Value") as Label
        icon.position.x = (cell_width - 22.0) * 0.5
        caption.size.x = cell_width - 4.0
        value_label.size.x = cell_width - 4.0
    if _month_note != null:
        _month_note.position = Vector2(12.0, 126.0)
        _month_note.size = Vector2(width_value - 24.0, 20.0)

func _sync_all() -> void:
    _sync_header()
    _sync_stats()
    _layout()
    _layout_month_panel()

func _sync_header() -> void:
    var progress: Dictionary = GameState.get_progress()
    var level: int = int(progress.get("level", 0))
    var role: Dictionary = _role_for_level(level)
    if role.is_empty():
        return
    TaskVisualOverlay._level_label.text = "Lv. %02d" % level
    TaskVisualOverlay._title_label.text = str(role.get("title", ""))
    _header_subtitle.text = "老哥任务簿 · 今日待执行"
    var raw_url: String = str(role.get("roleImage", ""))
    if level != _avatar_requested_level and not raw_url.is_empty():
        _avatar_requested_level = level
        call_deferred("_load_avatar", level, raw_url)

func _role_for_level(level: int) -> Dictionary:
    var roles_value: Variant = GameState.state.get("roles", [])
    if not roles_value is Array:
        return {}
    for value: Variant in roles_value:
        if value is Dictionary and int(value.get("level", -1)) == level:
            return value as Dictionary
    return {}

func _load_avatar(level: int, raw_url: String) -> void:
    var url: String = raw_url
    if not url.begins_with("http://") and not url.begins_with("https://"):
        if not url.begins_with("/"):
            url = "/%s" % url
        url = "https://www.laoniulaoge.cn%s" % url
    var split_result: PackedStringArray = url.split("?", true, 1)
    var format: String = split_result[0].get_extension().to_lower()
    var entry: Dictionary = {"url": url, "format": format, "version": 1}
    var texture: Texture2D = await CloudAssetManager.load_texture("task-avatar-%02d" % level, entry)
    if level == _avatar_requested_level and texture != null and _avatar_image != null:
        _avatar_image.texture = texture

func _sync_stats() -> void:
    var stats: Dictionary = _calculate_stats()
    if _overview_values.size() == 4:
        _overview_values[0].text = str(stats.get("pending", 0))
        _overview_values[1].text = str(stats.get("doing", 0))
        _overview_values[2].text = str(stats.get("submitted", 0))
        _overview_values[3].text = "+%s" % int(stats.get("today_exp", 0))
    if _month_values.size() == 3:
        _month_values[0].text = "¥ %s" % int(stats.get("month_money", 0))
        _month_values[1].text = str(stats.get("month_count", 0))
        _month_values[2].text = "%s EXP" % int(stats.get("month_exp", 0))

func _calculate_stats() -> Dictionary:
    var pending: int = 0
    var doing: int = 0
    var submitted: int = 0
    var today_exp: int = 0
    var month_money: int = 0
    var month_count: int = 0
    var month_exp: int = 0
    var today: Dictionary = Time.get_date_dict_from_system()
    var month_prefix: String = "%04d-%02d" % [int(today.get("year", 2024)), int(today.get("month", 1))]

    for value: Variant in TaskVisualOverlay._tasks:
        if not value is Dictionary:
            continue
        var task: Dictionary = value as Dictionary
        var status: String = str(task.get("status", ""))
        if status == "todo":
            pending += 1
            today_exp += _task_reward_exp(task)
        elif status == "doing":
            doing += 1
            today_exp += _task_reward_exp(task)
        elif status == "submitted":
            submitted += 1

        if status == "confirmed" or status == "completed":
            var completed_at: String = str(task.get("rewardedAt", task.get("confirmedAt", "")))
            if completed_at.begins_with(month_prefix):
                month_count += 1
                month_money += _task_reward_money(task)
                month_exp += _task_reward_exp(task)

    return {
        "pending": pending,
        "doing": doing,
        "submitted": submitted,
        "today_exp": today_exp,
        "month_money": month_money,
        "month_count": month_count,
        "month_exp": month_exp,
    }

func _task_reward_exp(task: Dictionary) -> int:
    var rewards: Variant = task.get("rewards", [])
    if rewards is Array and not rewards.is_empty():
        var total: int = 0
        for reward_value: Variant in rewards:
            if reward_value is Dictionary and str(reward_value.get("type", "")) == "experience":
                total += maxi(0, int(reward_value.get("value", 0)))
        return total
    return maxi(0, int(task.get("rewardExp", 0)))

func _task_reward_money(task: Dictionary) -> int:
    var rewards: Variant = task.get("rewards", [])
    if rewards is Array and not rewards.is_empty():
        var total: int = 0
        for reward_value: Variant in rewards:
            if reward_value is Dictionary and str(reward_value.get("type", "")) == "allowance":
                total += maxi(0, int(reward_value.get("value", 0)))
        return total
    return maxi(0, int(task.get("rewardMoney", 0)))

func _animate_swipe_hint() -> void:
    if _swipe_root == null:
        return
    var wave: float = (sin((_float_elapsed / 1.4) * TAU) + 1.0) * 0.5
    for index: int in range(_swipe_arrows.size()):
        var arrow: Label = _swipe_arrows[index]
        var base_alpha: float = [0.94, 0.58, 0.30][index]
        var alpha: float = clampf(base_alpha * (0.62 + wave * 0.38), 0.0, 1.0)
        arrow.modulate = Color(1.0, 1.0, 1.0, alpha)
        var base_y: float = [-4.0, 4.0, 11.0][index]
        arrow.position.y = base_y + lerpf(-4.0, 2.0, wave)
    if _swipe_text != null:
        var text_wave: float = (sin((_float_elapsed / 2.8) * TAU) + 1.0) * 0.5
        _swipe_text.modulate = Color(1.0, 1.0, 1.0, lerpf(0.76, 1.0, text_wave))
