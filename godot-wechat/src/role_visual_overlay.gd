extends Node

signal preview_changed(display_level: int, current_level: int, locked: bool, direction: String)
signal illustration_ready(level: int, direction: String)

var _canvas: CanvasLayer
var _root: Control
var _illustration: TextureRect
var _level_label: Label
var _title_label: Label
var _salary_label: Label
var _exp_label: Label
var _exp_track: ColorRect
var _exp_fill: ColorRect
var _bio_label: Label
var _dots: HBoxContainer
var _swipe_top: Label
var _swipe_bottom: Label
var _loaded_level: int = -1
var _current_exp: int = 0
var _required_exp: int = 1
var _progress_level: int = -1
var _display_level: int = -1
var _previewing: bool = false
var _locked_preview: bool = false
var _preview_direction: String = "none"

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
    _canvas.layer = 40
    add_child(_canvas)

    _root = Control.new()
    _root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _root.visible = false
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
    float edge = smoothstep(0.45, 1.0, distance(UV, vec2(0.5, 0.46)) * 1.55);
    float top = (1.0 - smoothstep(0.0, 0.26, UV.y)) * 0.58;
    float bottom = smoothstep(0.58, 1.0, UV.y) * 0.78;
    float side = smoothstep(0.72, 1.0, abs(UV.x - 0.5) * 2.0) * 0.55;
    float a = clamp(max(edge * 0.60, max(top, max(bottom, side))), 0.0, 0.92);
    COLOR = vec4(0.0, 0.0, 0.0, a);
}
"""
    var material: ShaderMaterial = ShaderMaterial.new()
    material.shader = shader
    scrim.material = material
    scrim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    _root.add_child(scrim)

    _swipe_top = _label("↓  下滑查看权益", 12, Color("bca77f"))
    _swipe_top.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _root.add_child(_swipe_top)

    _level_label = _label("Lv. 00", 16, Color("e7c78d"))
    _level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _root.add_child(_level_label)

    _title_label = _label("职务加载中", 30, Color("f8dfac"))
    _title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _root.add_child(_title_label)

    var panel: Panel = Panel.new()
    panel.name = "RoleBottomPanel"
    panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.025, 0.02, 0.015, 0.70)
    style.border_color = Color(0.91, 0.78, 0.55, 0.16)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 12
    style.corner_radius_top_right = 12
    style.corner_radius_bottom_left = 12
    style.corner_radius_bottom_right = 12
    panel.add_theme_stylebox_override("panel", style)
    panel.set_meta("layout", "panel")
    _root.add_child(panel)

    _salary_label = _label("基础零花钱  ¥--", 14, Color("f1ddb5"))
    _salary_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    panel.add_child(_salary_label)
    _salary_label.set_meta("layout", "salary")

    _exp_label = _label("0 / 0", 13, Color("e8d4aa"))
    _exp_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    panel.add_child(_exp_label)
    _exp_label.set_meta("layout", "exp-label")

    _exp_track = ColorRect.new()
    _exp_track.color = Color(0.18, 0.14, 0.09, 0.86)
    _exp_track.mouse_filter = Control.MOUSE_FILTER_IGNORE
    panel.add_child(_exp_track)
    _exp_track.set_meta("layout", "exp-track")

    _exp_fill = ColorRect.new()
    _exp_fill.color = Color("d7b879")
    _exp_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _exp_track.add_child(_exp_fill)

    var bio_title: Label = _label("—  人物小传  —", 13, Color("cdb78e"))
    bio_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    panel.add_child(bio_title)
    bio_title.set_meta("layout", "bio-title")

    _bio_label = _label("", 13, Color("d8cbb6"))
    _bio_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _bio_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
    _bio_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    panel.add_child(_bio_label)
    _bio_label.set_meta("layout", "bio")

    _dots = HBoxContainer.new()
    _dots.alignment = BoxContainer.ALIGNMENT_CENTER
    _dots.add_theme_constant_override("separation", 6)
    panel.add_child(_dots)
    _dots.set_meta("layout", "dots")

    _swipe_bottom = _label("↑  上滑查看任务", 14, Color("e8d4aa"))
    _swipe_bottom.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    panel.add_child(_swipe_bottom)
    _swipe_bottom.set_meta("layout", "swipe-bottom")

func _label(text_value: String, font_size: int, color: Color) -> Label:
    var label: Label = Label.new()
    label.text = text_value
    label.add_theme_font_size_override("font_size", font_size)
    label.add_theme_color_override("font_color", color)
    label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    return label

func _process(_delta: float) -> void:
    if _root == null:
        return
    var scene: Node = get_tree().current_scene
    if scene == null:
        _root.visible = false
        return
    var husband_view: Variant = scene.get("husband_view")
    var page_value: Variant = scene.get("current_page")
    var should_show: bool = husband_view is Control and husband_view.visible and int(page_value) == 1
    _root.visible = should_show

func _on_state_changed(_state: Dictionary) -> void:
    var progress: Dictionary = GameState.get_progress()
    var level: int = int(progress.get("level", 0))
    _current_exp = int(progress.get("exp", 0))

    if level != _progress_level:
        _progress_level = level
        _display_level = level
        _previewing = false
        _locked_preview = false
        _preview_direction = "none"
        _apply_display_level(level, "none")
        preview_changed.emit(_display_level, _progress_level, false, "none")
        return

    if _display_level < 0:
        _display_level = level

    _apply_display_level(_display_level, _preview_direction)

func show_preview_level(level: int, direction: String = "none") -> void:
    var target: int = clampi(level, 0, get_max_role_level())
    if target == _display_level:
        return

    _display_level = target
    _previewing = target != _progress_level
    _locked_preview = target > _progress_level
    _preview_direction = direction
    _apply_display_level(target, direction)
    preview_changed.emit(_display_level, _progress_level, _locked_preview, _preview_direction)

func reset_preview() -> void:
    var progress: Dictionary = GameState.get_progress()
    var level: int = int(progress.get("level", 0))
    _progress_level = level
    _display_level = level
    _previewing = false
    _locked_preview = false
    _preview_direction = "none"
    _current_exp = int(progress.get("exp", 0))
    _apply_display_level(level, "none")
    preview_changed.emit(_display_level, _progress_level, false, "none")

func get_display_level() -> int:
    return _display_level if _display_level >= 0 else int(GameState.get_progress().get("level", 0))

func get_progress_level() -> int:
    return _progress_level if _progress_level >= 0 else int(GameState.get_progress().get("level", 0))

func is_previewing() -> bool:
    return _previewing

func is_locked_preview() -> bool:
    return _locked_preview

func get_preview_direction() -> String:
    return _preview_direction

func get_max_role_level() -> int:
    var maximum: int = 0
    var roles: Variant = GameState.state.get("roles", [])
    if roles is Array:
        for role_value: Variant in roles:
            if role_value is Dictionary:
                maximum = maxi(maximum, int(role_value.get("level", 0)))
    return maximum

func _apply_display_level(level: int, direction: String) -> void:
    var progress: Dictionary = GameState.get_progress()
    var role: Dictionary = _role_for_level(level)
    if role.is_empty():
        return

    _required_exp = maxi(1, int(role.get("expRequired", role.get("exp_required", 1))))
    _current_exp = int(progress.get("exp", 0)) if level == _progress_level else 0

    _level_label.text = "Lv. %02d" % level
    _title_label.text = str(role.get("title", "Lv.%s" % level))
    _salary_label.text = "基础零花钱  ¥%s" % int(role.get("salary", progress.get("wallet", 0)))
    _exp_label.text = "%s / %s" % [_current_exp, _required_exp]
    _exp_label.visible = not _previewing
    _exp_track.visible = not _previewing
    _bio_label.text = str(role.get("biography", ""))
    _build_dots(level)
    _update_exp_fill()

    if level != _loaded_level:
        _loaded_level = level
        _illustration.texture = null
        _load_role_illustration(level, str(role.get("roleImage", "")), direction)

func _role_for_level(level: int) -> Dictionary:
    var roles: Variant = GameState.state.get("roles", [])
    if roles is Array:
        for role: Variant in roles:
            if role is Dictionary and int(role.get("level", -1)) == level:
                return role
    return {}

func _load_role_illustration(level: int, raw_url: String, direction: String) -> void:
    if raw_url.is_empty():
        return
    var url: String = raw_url
    if not url.begins_with("http://") and not url.begins_with("https://"):
        if not url.begins_with("/"):
            url = "/%s" % url
        url = "https://www.laoniulaoge.cn%s" % url
    var entry: Dictionary = {"url": url, "format": url.get_extension().to_lower(), "version": 1}
    var texture: Texture2D = await CloudAssetManager.load_texture("role-%02d-illustration" % level, entry)
    if level == _loaded_level and texture != null:
        _illustration.texture = texture
        illustration_ready.emit(level, direction)

func _build_dots(active_level: int) -> void:
    for child: Node in _dots.get_children():
        _dots.remove_child(child)
        child.queue_free()
    var count: int = get_max_role_level() + 1
    for index: int in range(count):
        var dot: ColorRect = ColorRect.new()
        dot.custom_minimum_size = Vector2(7, 7)
        dot.color = Color("e7c78d") if index == active_level else Color(0.91, 0.78, 0.55, 0.24)
        dot.mouse_filter = Control.MOUSE_FILTER_IGNORE
        _dots.add_child(dot)

func _layout() -> void:
    if _root == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    _root.position = Vector2.ZERO
    _root.size = viewport_size

    _illustration.position = Vector2(0.0, viewport_size.y * 0.11)
    _illustration.size = viewport_size

    _swipe_top.position = Vector2(20, 20)
    _swipe_top.size = Vector2(viewport_size.x - 40, 24)
    _level_label.position = Vector2(20, 44)
    _level_label.size = Vector2(viewport_size.x - 40, 24)
    _title_label.position = Vector2(20, 68)
    _title_label.size = Vector2(viewport_size.x - 40, 44)

    for child: Node in _root.get_children():
        if not child.has_meta("layout") or str(child.get_meta("layout")) != "panel":
            continue
        var panel: Panel = child as Panel
        panel.position = Vector2(18, viewport_size.y - 318)
        panel.size = Vector2(viewport_size.x - 36, 292)
        _layout_panel(panel)

func _layout_panel(panel: Panel) -> void:
    for child: Node in panel.get_children():
        if not child.has_meta("layout"):
            continue
        var control: Control = child as Control
        if control == null:
            continue
        match str(child.get_meta("layout")):
            "salary":
                control.position = Vector2(16, 12)
                control.size = Vector2(panel.size.x - 32, 28)
            "exp-label":
                control.position = Vector2(16, 48)
                control.size = Vector2(panel.size.x - 32, 22)
            "exp-track":
                control.position = Vector2(26, 76)
                control.size = Vector2(panel.size.x - 52, 8)
            "bio-title":
                control.position = Vector2(16, 102)
                control.size = Vector2(panel.size.x - 32, 24)
            "bio":
                control.position = Vector2(28, 132)
                control.size = Vector2(panel.size.x - 56, 72)
            "dots":
                control.position = Vector2(16, 214)
                control.size = Vector2(panel.size.x - 32, 18)
            "swipe-bottom":
                control.position = Vector2(16, 246)
                control.size = Vector2(panel.size.x - 32, 26)
    _update_exp_fill()

func _update_exp_fill() -> void:
    if _exp_track == null or _exp_fill == null:
        return
    var ratio: float = clampf(float(_current_exp) / float(maxi(1, _required_exp)), 0.0, 1.0)
    _exp_fill.position = Vector2.ZERO
    _exp_fill.size = Vector2(_exp_track.size.x * ratio, _exp_track.size.y)
