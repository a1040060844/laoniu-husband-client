extends Node

var _canvas: CanvasLayer
var _root: Control
var _illustration: TextureRect
var _level_label: Label
var _title_label: Label
var _commission_label: Label
var _bubble_layer: Control
var _modal: Panel
var _modal_title: Label
var _modal_description: Label
var _modal_frequency: Label
var _modal_status: Label
var _modal_close: Button
var _loaded_level: int = -1
var _benefits: Array = []
var _bubble_buttons: Array[Button] = []
var _marquee_offset: float = 0.0
var _marquee_width: float = 390.0
var _marquee_duration: float = 18.0
var _visible_last_frame: bool = false

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount")

func _mount() -> void:
    _build_ui()
    get_viewport().size_changed.connect(_layout)
    GameState.changed.connect(_on_state_changed)
    _on_state_changed(GameState.state)
    _layout()

func _build_ui() -> void:
    _canvas = CanvasLayer.new()
    _canvas.layer = 41
    add_child(_canvas)

    _root = Control.new()
    _root.visible = false
    _root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _canvas.add_child(_root)

    var black: ColorRect = ColorRect.new()
    black.color = Color.BLACK
    black.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    black.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _root.add_child(black)

    _illustration = TextureRect.new()
    _illustration.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    _illustration.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
    _illustration.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _root.add_child(_illustration)

    var scrim: ColorRect = ColorRect.new()
    scrim.color = Color.WHITE
    scrim.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var shader: Shader = Shader.new()
    shader.code = """
shader_type canvas_item;
void fragment() {
    float top = (1.0 - smoothstep(0.0, 0.30, UV.y)) * 0.78;
    float bottom = smoothstep(0.58, 1.0, UV.y) * 0.88;
    float side = smoothstep(0.67, 1.0, abs(UV.x - 0.5) * 2.0) * 0.64;
    float edge = smoothstep(0.48, 1.0, distance(UV, vec2(0.5, 0.52)) * 1.45) * 0.48;
    float a = clamp(max(max(top, bottom), max(side, edge)), 0.0, 0.94);
    COLOR = vec4(0.0, 0.0, 0.0, a);
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    scrim.material = material
    scrim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    _root.add_child(scrim)

    _level_label = _label("Lv. 00", 15, Color("e7c78d"))
    _level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _root.add_child(_level_label)

    _title_label = _label("权益", 34, Color("f8dfac"))
    _title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _root.add_child(_title_label)

    _bubble_layer = Control.new()
    _bubble_layer.clip_contents = true
    _bubble_layer.mouse_filter = Control.MOUSE_FILTER_PASS
    _root.add_child(_bubble_layer)

    _commission_label = _label("每月佣金  ¥--", 16, Color("f1ddb5"))
    _commission_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _root.add_child(_commission_label)

    var swipe: Label = _label("↑  上滑进入主页", 14, Color("e8d4aa"))
    swipe.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    swipe.set_meta("layout", "swipe")
    _root.add_child(swipe)

    _build_modal()

func _build_modal() -> void:
    _modal = Panel.new()
    _modal.visible = false
    _modal.z_index = 300
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.035, 0.026, 0.018, 0.96)
    style.border_color = Color(0.91, 0.78, 0.55, 0.42)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 14
    style.corner_radius_top_right = 14
    style.corner_radius_bottom_left = 14
    style.corner_radius_bottom_right = 14
    _modal.add_theme_stylebox_override("panel", style)
    _root.add_child(_modal)

    _modal_title = _label("权益名称", 22, Color("f8dfac"))
    _modal_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _modal.add_child(_modal_title)

    _modal_status = _label("可申请", 13, Color("d7b879"))
    _modal_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _modal.add_child(_modal_status)

    _modal_description = _label("", 14, Color("e0d3bf"))
    _modal_description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    _modal_description.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _modal.add_child(_modal_description)

    _modal_frequency = _label("", 12, Color("ac9876"))
    _modal_frequency.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _modal.add_child(_modal_frequency)

    _modal_close = Button.new()
    _modal_close.text = "收起"
    _modal_close.pressed.connect(_close_modal)
    _modal.add_child(_modal_close)

func _label(text_value: String, font_size: int, color: Color) -> Label:
    var label: Label = Label.new()
    label.text = text_value
    label.add_theme_font_size_override("font_size", font_size)
    label.add_theme_color_override("font_color", color)
    label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    return label

func _process(delta: float) -> void:
    if _root == null:
        return
    var scene: Node = get_tree().current_scene
    if scene == null:
        _root.visible = false
        return
    var husband_view_value: Variant = scene.get("husband_view")
    var page_value: Variant = scene.get("current_page")
    var should_show: bool = husband_view_value is Control and husband_view_value.visible and int(page_value) == 0
    _root.visible = should_show

    if should_show and not _visible_last_frame:
        _marquee_offset = 0.0
    _visible_last_frame = should_show

    if should_show and _bubble_buttons.size() > 5 and not _modal.visible:
        _marquee_offset += delta * (_marquee_width / _marquee_duration)
        if _marquee_offset >= _marquee_width:
            _marquee_offset -= _marquee_width
        _position_bubbles()

func _on_state_changed(_state: Dictionary) -> void:
    var progress: Dictionary = GameState.get_progress()
    var level: int = int(progress.get("level", 0))
    var role: Dictionary = _role_for_level(level)
    if role.is_empty():
        return

    _level_label.text = "Lv. %02d" % level
    _title_label.text = str(role.get("title", ""))
    _commission_label.text = "每月佣金  ¥%s" % int(role.get("salary", 0))
    _benefits = _visible_benefits(level)
    _rebuild_bubbles(level)

    if level != _loaded_level:
        _loaded_level = level
        _load_illustration(level, str(role.get("benefitImage", "")))

func _role_for_level(level: int) -> Dictionary:
    var roles: Variant = GameState.state.get("roles", [])
    if roles is Array:
        for role_value: Variant in roles:
            if role_value is Dictionary:
                var role: Dictionary = role_value
                if int(role.get("level", -1)) == level:
                    return role
    return {}

func _visible_benefits(level: int) -> Array:
    var result: Array = []
    var source: Variant = GameState.state.get("benefits", [])
    if not source is Array:
        return result
    for value: Variant in source:
        if not value is Dictionary:
            continue
        var benefit: Dictionary = value
        var required: int = int(benefit.get("levelRequired", 0))
        var visible: bool = (required == 0) if level == 0 else (required > 0 and required <= level)
        if visible:
            result.append(_benefit_for_level(benefit, level))
    return result

func _benefit_for_level(benefit: Dictionary, level: int) -> Dictionary:
    var resolved: Dictionary = benefit.duplicate(true)
    var variants: Variant = benefit.get("displayVariants", [])
    if variants is Array:
        var best_level: int = -1
        for value: Variant in variants:
            if not value is Dictionary:
                continue
            var variant: Dictionary = value
            var min_level: int = int(variant.get("minLevel", -1))
            if min_level <= level and min_level >= best_level:
                best_level = min_level
                for key: String in ["name", "frequency", "description"]:
                    if variant.has(key) and not str(variant.get(key, "")).is_empty():
                        resolved[key] = variant[key]
    return resolved

func _rebuild_bubbles(level: int) -> void:
    for child: Node in _bubble_layer.get_children():
        child.queue_free()
    _bubble_buttons.clear()
    _marquee_offset = 0.0

    var copies: int = 2 if _benefits.size() > 5 else 1
    _marquee_width = maxf(390.0, float(_benefits.size()) * 86.0 + 120.0)
    _marquee_duration = maxf(18.0, float(_benefits.size()) * 3.8)

    for copy_index: int in range(copies):
        for index: int in range(_benefits.size()):
            var benefit: Dictionary = _benefits[index] as Dictionary
            var button: Button = Button.new()
            button.custom_minimum_size = Vector2(72, 72)
            button.text = "%s\n%s" % [str(benefit.get("name", "权益")), _status_text(benefit, level)]
            button.add_theme_font_size_override("font_size", 10)
            button.add_theme_color_override("font_color", Color("f3eadb"))
            button.add_theme_color_override("font_disabled_color", Color(0.78, 0.73, 0.65, 0.58))
            button.set_meta("benefit", benefit)
            button.set_meta("index", index)
            button.set_meta("copy", copy_index)
            button.disabled = _computed_status(benefit, level) != "available"
            button.pressed.connect(_open_benefit.bind(benefit, level))
            _apply_bubble_style(button, _computed_status(benefit, level))
            _bubble_layer.add_child(button)
            _bubble_buttons.append(button)
    _position_bubbles()

func _apply_bubble_style(button: Button, status: String) -> void:
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.corner_radius_top_left = 40
    style.corner_radius_top_right = 40
    style.corner_radius_bottom_left = 40
    style.corner_radius_bottom_right = 40
    style.border_color = Color(0.91, 0.78, 0.55, 0.42)
    style.set_border_width_all(1)
    style.bg_color = Color(0.12, 0.085, 0.045, 0.78)
    if status == "cooldown":
        style.bg_color = Color(0.09, 0.075, 0.06, 0.76)
    elif status == "pending":
        style.bg_color = Color(0.14, 0.10, 0.05, 0.82)
    elif status == "locked" or status == "frozen":
        style.bg_color = Color(0.08, 0.08, 0.08, 0.66)
        style.border_color = Color(0.55, 0.55, 0.55, 0.22)
    button.add_theme_stylebox_override("normal", style)
    button.add_theme_stylebox_override("disabled", style)
    var hover: StyleBoxFlat = style.duplicate() as StyleBoxFlat
    hover.bg_color = Color(0.18, 0.125, 0.06, 0.9)
    button.add_theme_stylebox_override("hover", hover)
    button.add_theme_stylebox_override("pressed", hover)

func _position_bubbles() -> void:
    if _bubble_layer == null:
        return
    var total: int = _benefits.size()
    if total == 0:
        return
    var screen_scale: float = get_viewport().get_visible_rect().size.x / 390.0
    for button: Button in _bubble_buttons:
        var index: int = int(button.get_meta("index"))
        var copy_index: int = int(button.get_meta("copy"))
        var point: Vector2 = _bubble_position(index, total)
        var x: float = point.x + float(copy_index) * _marquee_width
        if total > 5:
            x -= _marquee_offset
        button.position = Vector2(x * screen_scale - 36.0, point.y)
        button.size = Vector2(72, 72)

func _bubble_position(index: int, total: int) -> Vector2:
    if total <= 5:
        var layouts: Array = [
            [Vector2(195, 78)],
            [Vector2(128, 64), Vector2(262, 122)],
            [Vector2(94, 118), Vector2(195, 54), Vector2(296, 118)],
            [Vector2(82, 70), Vector2(170, 128), Vector2(258, 62), Vector2(340, 124)],
            [Vector2(64, 114), Vector2(132, 56), Vector2(204, 128), Vector2(282, 62), Vector2(354, 118)],
        ]
        var row: Array = layouts[total - 1]
        return row[index] as Vector2
    var stagger_values: Array[int] = [0, 12, -8, 6, -12]
    var drift_values: Array[int] = [0, 8, -4, 10, -8]
    var stagger_x: int = stagger_values[index % 5]
    var row_offset: int = 0 if int(index / 5) % 2 == 0 else 8
    var y_base: int = 54 if index % 2 == 0 else 118
    var y_drift: int = drift_values[index % 5]
    return Vector2(60 + index * 82 + stagger_x, mini(140, y_base + y_drift + row_offset))

func _computed_status(benefit: Dictionary, level: int) -> String:
    if level < int(benefit.get("levelRequired", 0)):
        return "locked"
    var raw_status: String = str(benefit.get("status", "available"))
    if benefit.get("pendingRequest", null) is Dictionary or raw_status == "pending":
        return "pending"
    if raw_status == "frozen":
        return "frozen"
    if raw_status == "cooldown" or not str(benefit.get("cooldownUntil", "")).is_empty():
        return "cooldown"
    return "available"

func _status_text(benefit: Dictionary, level: int) -> String:
    var status: String = _computed_status(benefit, level)
    match status:
        "locked":
            return "未解锁"
        "pending":
            return "待审批"
        "frozen":
            return "已冻结"
        "cooldown":
            var text: String = str(benefit.get("cooldownText", ""))
            return text if not text.is_empty() else "未冷却"
        _:
            var bonus: int = int(benefit.get("availableBonusCount", 0))
            if bonus > 0:
                return "奖励 %s 次" % bonus
            if not str(benefit.get("lastApprovedAt", "")).is_empty():
                return "已使用"
            return "可申请"

func _open_benefit(benefit: Dictionary, level: int) -> void:
    _modal_title.text = str(benefit.get("name", "权益"))
    _modal_status.text = _status_text(benefit, level)
    _modal_description.text = str(benefit.get("description", ""))
    _modal_frequency.text = "使用频率：%s" % str(benefit.get("frequency", "未设置"))
    _modal.visible = true

func _close_modal() -> void:
    _modal.visible = false

func _load_illustration(level: int, raw_url: String) -> void:
    if raw_url.is_empty():
        return
    var url: String = raw_url
    if not url.begins_with("http://") and not url.begins_with("https://"):
        if not url.begins_with("/"):
            url = "/%s" % url
        url = "https://www.laoniulaoge.cn%s" % url
    var split_result: PackedStringArray = url.split("?", true, 1)
    var path_only: String = split_result[0]
    var format: String = path_only.get_extension().to_lower()
    var entry: Dictionary = {"url": url, "format": format, "version": 1}
    var texture: Texture2D = await CloudAssetManager.load_texture("benefit-%02d-illustration" % level, entry)
    if level == _loaded_level and texture != null:
        _illustration.texture = texture

func _layout() -> void:
    if _root == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    _root.position = Vector2.ZERO
    _root.size = viewport_size
    _illustration.position = Vector2(0, viewport_size.y * 0.13)
    _illustration.size = Vector2(viewport_size.x, viewport_size.y * 0.84)

    _level_label.position = Vector2(20, 44)
    _level_label.size = Vector2(viewport_size.x - 40, 24)
    _title_label.position = Vector2(20, 70)
    _title_label.size = Vector2(viewport_size.x - 40, 52)

    _bubble_layer.position = Vector2(0, 150)
    _bubble_layer.size = Vector2(viewport_size.x, 220)
    _commission_label.position = Vector2(20, viewport_size.y - 116)
    _commission_label.size = Vector2(viewport_size.x - 40, 28)

    for child: Node in _root.get_children():
        if child.has_meta("layout") and str(child.get_meta("layout")) == "swipe":
            var control: Control = child as Control
            if control != null:
                control.position = Vector2(20, viewport_size.y - 72)
                control.size = Vector2(viewport_size.x - 40, 26)

    _modal.position = Vector2(32, viewport_size.y * 0.30)
    _modal.size = Vector2(viewport_size.x - 64, minf(360.0, viewport_size.y * 0.48))
    _modal_title.position = Vector2(18, 20)
    _modal_title.size = Vector2(_modal.size.x - 36, 34)
    _modal_status.position = Vector2(18, 60)
    _modal_status.size = Vector2(_modal.size.x - 36, 24)
    _modal_description.position = Vector2(28, 100)
    _modal_description.size = Vector2(_modal.size.x - 56, 116)
    _modal_frequency.position = Vector2(18, 226)
    _modal_frequency.size = Vector2(_modal.size.x - 36, 24)
    _modal_close.position = Vector2(72, _modal.size.y - 58)
    _modal_close.size = Vector2(_modal.size.x - 144, 38)
    _position_bubbles()
