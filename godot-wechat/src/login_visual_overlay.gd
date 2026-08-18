extends Node

const BG_SOURCE_SIZE := Vector2(941.0, 1672.0)
const TREE_PLAQUE_CENTER := Vector2(206.0, 1144.0)
const PERSON_VISUAL_HEIGHT := 188.0
const BLUE_CAT_WIDTH := 82.0
const WHITE_CAT_WIDTH := 72.0

var _canvas: CanvasLayer
var _root: Control
var _background: TextureRect
var _title: TextureRect
var _subtitle: TextureRect
var _husband: TextureRect
var _wife: TextureRect
var _cat_blue: TextureRect
var _cat_white: TextureRect
var _husband_card: TextureButton
var _wife_card: TextureButton
var _music_button: TextureButton
var _plaque_days: Label
var _fade: ColorRect

var _float_base: Dictionary = {}
var _sprite_anchor_pct := {
    "husband": Vector2(0.38, 0.65),
    "wife": Vector2(0.59, 0.65),
    "cat-blue": Vector2(0.51, 0.74),
    "cat-white": Vector2(0.63, 0.76),
}
var _sprite_nodes: Dictionary = {}
var _drag_id := ""
var _drag_offset := Vector2.ZERO
var _elapsed := 0.0
var _assets_applied := false

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount")

func _mount() -> void:
    _build_overlay()
    get_viewport().size_changed.connect(_layout)
    if AssetBootstrap.ready:
        _apply_cloud_assets()
    else:
        AssetBootstrap.cloud_assets_ready.connect(_apply_cloud_assets, CONNECT_ONE_SHOT)
    _layout()

func _build_overlay() -> void:
    _canvas = CanvasLayer.new()
    _canvas.layer = 50
    add_child(_canvas)

    _root = Control.new()
    _root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    _root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _canvas.add_child(_root)

    var black := ColorRect.new()
    black.color = Color.BLACK
    black.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    black.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _root.add_child(black)

    _background = _texture_rect()
    _background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
    _background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    _background.z_index = 0
    _root.add_child(_background)

    var top_mask := _fade_mask(true)
    top_mask.z_index = 10
    _root.add_child(top_mask)

    var bottom_mask := _fade_mask(false)
    bottom_mask.z_index = 10
    _root.add_child(bottom_mask)

    _husband = _texture_rect()
    _wife = _texture_rect()
    _cat_blue = _texture_rect()
    _cat_white = _texture_rect()
    _sprite_nodes = {
        "husband": _husband,
        "wife": _wife,
        "cat-blue": _cat_blue,
        "cat-white": _cat_white,
    }
    for sprite in [_husband, _wife, _cat_blue, _cat_white]:
        sprite.z_index = 30
        _root.add_child(sprite)

    _plaque_days = Label.new()
    _plaque_days.text = str(_love_day_count())
    _plaque_days.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _plaque_days.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    _plaque_days.add_theme_font_size_override("font_size", 10)
    _plaque_days.add_theme_color_override("font_color", Color("3b1f0f"))
    _plaque_days.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _plaque_days.z_index = 45
    _root.add_child(_plaque_days)

    _title = _texture_rect()
    _title.z_index = 105
    _root.add_child(_title)

    _subtitle = _texture_rect()
    _subtitle.z_index = 105
    _root.add_child(_subtitle)

    _husband_card = _texture_button()
    _husband_card.z_index = 120
    _husband_card.pressed.connect(_enter_husband)
    _root.add_child(_husband_card)

    _wife_card = _texture_button()
    _wife_card.z_index = 120
    _wife_card.disabled = true
    _root.add_child(_wife_card)

    _music_button = _texture_button()
    _music_button.z_index = 126
    _music_button.pressed.connect(_toggle_music)
    _root.add_child(_music_button)

    _fade = ColorRect.new()
    _fade.color = Color(0.0, 0.0, 0.0, 0.0)
    _fade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    _fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _fade.z_index = 500
    _root.add_child(_fade)

func _texture_rect() -> TextureRect:
    var node := TextureRect.new()
    node.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    node.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
    node.mouse_filter = Control.MOUSE_FILTER_IGNORE
    return node

func _texture_button() -> TextureButton:
    var node := TextureButton.new()
    node.ignore_texture_size = true
    node.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
    return node

func _fade_mask(from_top: bool) -> ColorRect:
    var rect := ColorRect.new()
    rect.color = Color.WHITE
    rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
    var shader := Shader.new()
    shader.code = """
shader_type canvas_item;
uniform bool from_top = true;
void fragment() {
    float ramp = from_top ? (1.0 - smoothstep(0.0, 1.0, UV.y)) : smoothstep(0.0, 1.0, UV.y);
    float a = ramp * 0.96;
    COLOR = vec4(0.0, 0.0, 0.0, a);
}
"""
    var material := ShaderMaterial.new()
    material.shader = shader
    material.set_shader_parameter("from_top", from_top)
    rect.material = material
    rect.set_meta("fade_top", from_top)
    return rect

func _apply_cloud_assets() -> void:
    if _assets_applied:
        return
    _assets_applied = true

    var targets := {
        "background": _background,
        "husband": _husband,
        "wife": _wife,
        "cat-blue": _cat_blue,
        "cat-white": _cat_white,
        "title": _title,
        "subtitle": _subtitle,
    }
    for asset_name in targets:
        var entry := AssetManifest.get_login_asset(asset_name)
        if entry.is_empty():
            continue
        var texture := await CloudAssetManager.load_texture("login-%s" % asset_name, entry)
        if texture != null:
            (targets[asset_name] as TextureRect).texture = texture

    await _apply_card_texture("card-husband", _husband_card)
    await _apply_card_texture("card-wife", _wife_card)
    await _apply_button_texture("music-toggle", _music_button)
    _layout()

func _apply_card_texture(asset_name: String, button: TextureButton) -> void:
    var entry := AssetManifest.get_login_asset(asset_name)
    if entry.is_empty():
        return
    var texture := await CloudAssetManager.load_texture("login-%s" % asset_name, entry)
    if texture != null:
        button.texture_normal = texture

func _apply_button_texture(asset_name: String, button: TextureButton) -> void:
    var entry := AssetManifest.get_login_asset(asset_name)
    if entry.is_empty():
        return
    var texture := await CloudAssetManager.load_texture("login-%s" % asset_name, entry)
    if texture != null:
        button.texture_normal = texture

func _layout() -> void:
    if _root == null:
        return
    var viewport_size := get_viewport().get_visible_rect().size
    _root.size = viewport_size

    for child in _root.get_children():
        if child is ColorRect and child.has_meta("fade_top"):
            var is_top := bool(child.get_meta("fade_top"))
            child.position = Vector2.ZERO if is_top else Vector2(0.0, viewport_size.y * 0.72)
            child.size = Vector2(viewport_size.x, viewport_size.y * (0.30 if is_top else 0.28))

    var title_width := min(viewport_size.x * 0.86, 370.0)
    _layout_texture_by_width(_title, title_width, Vector2((viewport_size.x - title_width) * 0.5, 36.0))

    var subtitle_width := min(viewport_size.x * 0.57, 245.0)
    _layout_texture_by_width(_subtitle, subtitle_width, Vector2((viewport_size.x - subtitle_width) * 0.5, 134.0))

    _layout_person(_husband, _sprite_anchor_pct["husband"], PERSON_VISUAL_HEIGHT)
    _layout_person(_wife, _sprite_anchor_pct["wife"], PERSON_VISUAL_HEIGHT)
    _layout_sprite_by_width(_cat_blue, _sprite_anchor_pct["cat-blue"], BLUE_CAT_WIDTH)
    _layout_sprite_by_width(_cat_white, _sprite_anchor_pct["cat-white"], WHITE_CAT_WIDTH)

    var card_width := viewport_size.x * 0.47
    var card_height := card_width / (1448.0 / 1086.0)
    var card_y := viewport_size.y - (viewport_size.y * 0.073 - 80.0) - card_height
    _husband_card.position = Vector2(viewport_size.x * 0.02, card_y)
    _husband_card.size = Vector2(card_width, card_height)
    _wife_card.position = Vector2(viewport_size.x - viewport_size.x * 0.02 - card_width, card_y)
    _wife_card.size = Vector2(card_width, card_height)

    var music_size := clamp(viewport_size.x * 0.102, 42.0, 57.0)
    _music_button.position = Vector2(viewport_size.x - 46.0 - music_size, 226.0)
    _music_button.size = Vector2(music_size, music_size)

    _layout_plaque(viewport_size)
    _record_float_bases()

func _layout_texture_by_width(node: TextureRect, target_width: float, position_value: Vector2) -> void:
    var height := target_width * 0.18
    if node.texture != null:
        var tex_size := node.texture.get_size()
        if tex_size.x > 0.0:
            height = target_width * tex_size.y / tex_size.x
    node.position = position_value
    node.size = Vector2(target_width, height)

func _layout_person(node: TextureRect, anchor_pct: Vector2, target_height: float) -> void:
    var width := target_height * 0.56
    if node.texture != null:
        var tex_size := node.texture.get_size()
        if tex_size.y > 0.0:
            width = target_height * tex_size.x / tex_size.y
    _place_bottom_center(node, anchor_pct, Vector2(width, target_height))

func _layout_sprite_by_width(node: TextureRect, anchor_pct: Vector2, target_width: float) -> void:
    var height := target_width
    if node.texture != null:
        var tex_size := node.texture.get_size()
        if tex_size.x > 0.0:
            height = target_width * tex_size.y / tex_size.x
    _place_bottom_center(node, anchor_pct, Vector2(target_width, height))

func _place_bottom_center(node: Control, anchor_pct: Vector2, target_size: Vector2) -> void:
    var viewport_size := get_viewport().get_visible_rect().size
    var anchor := Vector2(viewport_size.x * anchor_pct.x, viewport_size.y * anchor_pct.y)
    node.size = target_size
    node.position = anchor - Vector2(target_size.x * 0.5, target_size.y)

func _layout_plaque(viewport_size: Vector2) -> void:
    var scale := min(viewport_size.x / BG_SOURCE_SIZE.x, viewport_size.y / BG_SOURCE_SIZE.y)
    var displayed := BG_SOURCE_SIZE * scale
    var origin := (viewport_size - displayed) * 0.5
    var center := origin + TREE_PLAQUE_CENTER * scale
    _plaque_days.size = Vector2(56.0, 24.0)
    _plaque_days.position = center - _plaque_days.size * 0.5
    _plaque_days.pivot_offset = _plaque_days.size * 0.5
    _plaque_days.rotation = deg_to_rad(-12.0)
    _plaque_days.add_theme_font_size_override("font_size", 9 if _plaque_days.text.length() >= 4 else 10)

func _record_float_bases() -> void:
    _float_base = {
        "title": _title.position,
        "subtitle": _subtitle.position,
        "husband-card": _husband_card.position,
        "wife-card": _wife_card.position,
        "music": _music_button.position,
    }

func _process(delta: float) -> void:
    if _root == null or not _root.visible:
        return
    _elapsed += delta
    if _float_base.is_empty():
        return
    _title.position = _float_base["title"] + Vector2(0.0, sin(_elapsed * TAU / 3.8) * 4.0)
    _subtitle.position = _float_base["subtitle"] + Vector2(0.0, sin((_elapsed - 1.1) * TAU / 3.8) * 4.0)
    _husband_card.position = _float_base["husband-card"] + Vector2(0.0, sin(_elapsed * TAU / 3.4) * 6.0)
    _wife_card.position = _float_base["wife-card"] + Vector2(0.0, sin((_elapsed - 1.2) * TAU / 3.4) * 6.0)
    _music_button.position = _float_base["music"] + Vector2(0.0, sin((_elapsed - 1.05) * TAU / 3.4) * 6.0)

func _input(event: InputEvent) -> void:
    if _root == null or not _root.visible:
        return

    if event is InputEventScreenTouch:
        if event.pressed:
            _begin_drag(event.position)
        else:
            _drag_id = ""
    elif event is InputEventScreenDrag and not _drag_id.is_empty():
        _drag_to(event.position)
    elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
        if event.pressed:
            _begin_drag(event.position)
        else:
            _drag_id = ""
    elif event is InputEventMouseMotion and not _drag_id.is_empty() and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
        _drag_to(event.position)

func _begin_drag(point: Vector2) -> void:
    for id in ["cat-white", "cat-blue", "wife", "husband"]:
        var node := _sprite_nodes[id] as Control
        var rect := Rect2(node.position, node.size)
        if rect.has_point(point):
            var anchor := node.position + Vector2(node.size.x * 0.5, node.size.y)
            _drag_id = id
            _drag_offset = point - anchor
            return

func _drag_to(point: Vector2) -> void:
    if _drag_id.is_empty():
        return
    var viewport_size := get_viewport().get_visible_rect().size
    var node := _sprite_nodes[_drag_id] as Control
    var anchor := point - _drag_offset
    anchor.x = clamp(anchor.x, node.size.x * 0.5, viewport_size.x - node.size.x * 0.5)
    anchor.y = clamp(anchor.y, node.size.y, viewport_size.y)
    _sprite_anchor_pct[_drag_id] = Vector2(anchor.x / viewport_size.x, anchor.y / viewport_size.y)
    _place_bottom_center(node, _sprite_anchor_pct[_drag_id], node.size)

func _toggle_music() -> void:
    AudioManager.set_muted(not AudioManager.muted)
    _music_button.modulate = Color.WHITE if not AudioManager.muted else Color(1.0, 1.0, 1.0, 0.46)

func _enter_husband() -> void:
    if _root == null or not _root.visible:
        return
    _husband_card.disabled = true
    _wife_card.disabled = true
    var tween := create_tween()
    tween.tween_property(_fade, "color:a", 0.84, 0.36).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
    await tween.finished
    AudioManager.stop_bgm()
    _root.visible = false
    var scene := get_tree().current_scene
    if scene != null and scene.has_method("_enter_husband"):
        scene.call("_enter_husband")

func _love_day_count() -> int:
    var today := Time.get_date_dict_from_system()
    var today_unix := Time.get_unix_time_from_datetime_dict({
        "year": int(today.year),
        "month": int(today.month),
        "day": int(today.day),
        "hour": 0,
        "minute": 0,
        "second": 0,
    })
    var start_unix := Time.get_unix_time_from_datetime_dict({
        "year": 2024,
        "month": 9,
        "day": 14,
        "hour": 0,
        "minute": 0,
        "second": 0,
    })
    return clampi(int(floor((today_unix - start_unix) / 86400.0)) + 1, 1, 9999)
