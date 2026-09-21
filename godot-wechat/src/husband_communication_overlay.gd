extends Node

const HUSBAND_AVATAR_URL: String = "https://www.laoniulaoge.cn/assets/login/husband.png"
const WIFE_AVATAR_URL: String = "https://www.laoniulaoge.cn/assets/login/wife.png"
const CHAT_ACTION_URL: String = "https://www.laoniulaoge.cn/assets/ui/chat-submit.png"

var _canvas: CanvasLayer
var _root: Control
var _shade: ColorRect
var _notification_panel: Panel
var _notification_title: Label
var _notification_text: Label
var _notification_remaining: Label
var _notification_action: Button
var _notification_close: Button
var _chat_panel: Panel
var _chat_list: VBoxContainer
var _chat_input: LineEdit
var _chat_send: TextureButton
var _chat_close: Button
var _notification_queue: Array = []
var _notification_index: int = 0
var _notification_open: bool = false
var _chat_open: bool = false
var _mounted: bool = false

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    call_deferred("_mount")

func _mount() -> void:
    _build_ui()
    _mounted = true
    get_viewport().size_changed.connect(_layout)
    GameState.changed.connect(_on_state_changed)
    CommunicationAcceptanceFixture.mode_changed.connect(_on_fixture_mode_changed)
    _load_chat_action_texture()
    _layout()

func _build_ui() -> void:
    _canvas = CanvasLayer.new()
    _canvas.layer = 110
    add_child(_canvas)

    _root = Control.new()
    _root.mouse_filter = Control.MOUSE_FILTER_STOP
    _root.visible = false
    _canvas.add_child(_root)

    _shade = ColorRect.new()
    _shade.color = Color(0.0, 0.0, 0.0, 0.76)
    _shade.mouse_filter = Control.MOUSE_FILTER_STOP
    _root.add_child(_shade)

    _notification_panel = _panel()
    _root.add_child(_notification_panel)
    _notification_title = _label("通知", 30, Color("f2dcae"))
    _notification_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _notification_panel.add_child(_notification_title)
    var notification_rule: ColorRect = ColorRect.new()
    notification_rule.color = Color(0.90, 0.78, 0.55, 0.52)
    notification_rule.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _notification_panel.add_child(notification_rule)
    _notification_text = _label("", 15, Color("ede2cf"))
    _notification_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    _notification_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    _notification_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _notification_panel.add_child(_notification_text)
    _notification_remaining = _label("", 12, Color(0.90, 0.78, 0.55, 0.72))
    _notification_remaining.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _notification_panel.add_child(_notification_remaining)
    _notification_action = _button("知道了")
    _notification_action.pressed.connect(_acknowledge_notification)
    _notification_panel.add_child(_notification_action)
    _notification_close = _button("×")
    _notification_close.tooltip_text = "略过通知"
    _notification_close.pressed.connect(_skip_notification)
    _notification_panel.add_child(_notification_close)

    _chat_panel = _panel()
    _root.add_child(_chat_panel)
    var chat_title: Label = _label("给老妞留言", 28, Color("fff0d4"))
    chat_title.name = "ChatTitle"
    chat_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _chat_panel.add_child(chat_title)
    var chat_subtitle: Label = _label("可在此留下想说的话", 11, Color(0.90, 0.78, 0.55, 0.74))
    chat_subtitle.name = "ChatSubtitle"
    chat_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _chat_panel.add_child(chat_subtitle)
    _chat_close = _button("×")
    _chat_close.tooltip_text = "关闭聊天留言"
    _chat_close.pressed.connect(close_chat)
    _chat_panel.add_child(_chat_close)
    var scroll: ScrollContainer = ScrollContainer.new()
    scroll.name = "ChatScroll"
    scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
    scroll.mouse_filter = Control.MOUSE_FILTER_STOP
    _chat_panel.add_child(scroll)
    _chat_list = VBoxContainer.new()
    _chat_list.add_theme_constant_override("separation", 12)
    _chat_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    scroll.add_child(_chat_list)
    var compose: HBoxContainer = HBoxContainer.new()
    compose.name = "ChatCompose"
    compose.add_theme_constant_override("separation", 8)
    _chat_panel.add_child(compose)
    _chat_input = LineEdit.new()
    _chat_input.placeholder_text = "给老妞留一句话......"
    _chat_input.add_theme_font_size_override("font_size", 16)
    _chat_input.add_theme_color_override("font_color", Color("fff0d4"))
    _chat_input.text_submitted.connect(_on_chat_submitted)
    _chat_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    compose.add_child(_chat_input)
    _chat_send = TextureButton.new()
    _chat_send.ignore_texture_size = true
    _chat_send.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
    _chat_send.custom_minimum_size = Vector2(68, 58)
    _chat_send.tooltip_text = "上奏"
    _chat_send.pressed.connect(_send_chat)
    compose.add_child(_chat_send)

func _label(text_value: String, font_size: int, color: Color) -> Label:
    var label: Label = Label.new()
    label.text = text_value
    label.add_theme_font_size_override("font_size", font_size)
    label.add_theme_color_override("font_color", color)
    label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.82))
    label.add_theme_constant_override("shadow_offset_y", 2)
    label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    return label

func _button(text_value: String) -> Button:
    var button: Button = Button.new()
    button.text = text_value
    button.add_theme_font_size_override("font_size", 16)
    button.add_theme_color_override("font_color", Color("26180a"))
    button.add_theme_color_override("font_hover_color", Color("26180a"))
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color("b98a49")
    style.border_color = Color(0.90, 0.78, 0.55, 0.65)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 3
    style.corner_radius_top_right = 3
    style.corner_radius_bottom_left = 3
    style.corner_radius_bottom_right = 3
    button.add_theme_stylebox_override("normal", style)
    return button

func _panel() -> Panel:
    var panel: Panel = Panel.new()
    panel.mouse_filter = Control.MOUSE_FILTER_STOP
    var style: StyleBoxFlat = StyleBoxFlat.new()
    style.bg_color = Color(0.035, 0.027, 0.020, 0.985)
    style.border_color = Color(0.87, 0.72, 0.46, 0.52)
    style.set_border_width_all(1)
    style.corner_radius_top_left = 10
    style.corner_radius_top_right = 10
    style.corner_radius_bottom_left = 10
    style.corner_radius_bottom_right = 10
    style.shadow_color = Color(0.0, 0.0, 0.0, 0.82)
    style.shadow_size = 18
    panel.add_theme_stylebox_override("panel", style)
    return panel

func _process(_delta: float) -> void:
    if not _mounted:
        return
    var scene: Node = get_tree().current_scene
    var page_value: Variant = scene.get("current_page") if scene != null else -1
    var husband_view_value: Variant = scene.get("husband_view") if scene != null else null
    var on_role_page: bool = husband_view_value is Control and husband_view_value.visible and int(page_value) == 1
    if not on_role_page and (_notification_open or _chat_open):
        close_all()

func _input(event: InputEvent) -> void:
    if not is_blocking_input():
        return
    if event is InputEventKey:
        var key: InputEventKey = event as InputEventKey
        if key.pressed and not key.echo and key.keycode == KEY_ESCAPE:
            close_all()
    get_viewport().set_input_as_handled()

func is_blocking_input() -> bool:
    return _notification_open or _chat_open

func open_notifications() -> void:
    if not _is_role_page():
        return
    _chat_open = false
    _notification_queue = _unread_notifications()
    _notification_index = 0
    _notification_open = not _notification_queue.is_empty()
    if _notification_queue.is_empty():
        _notification_open = true
        _notification_title.text = "暂无通知"
        _notification_text.text = "当前没有需要查看的通知。"
        _notification_remaining.text = ""
    _update_visibility()
    _update_notification()

func open_chat() -> void:
    if not _is_role_page():
        return
    _notification_open = false
    _chat_open = true
    _update_visibility()
    _rebuild_chat()
    _mark_chat_read()

func close_chat() -> void:
    _chat_open = false
    _update_visibility()

func close_all() -> void:
    _notification_open = false
    _chat_open = false
    _update_visibility()

func _update_visibility() -> void:
    if _root == null:
        return
    _root.visible = _notification_open or _chat_open
    _notification_panel.visible = _notification_open
    _chat_panel.visible = _chat_open

func _on_state_changed(_state: Dictionary) -> void:
    if _notification_open:
        _notification_queue = _unread_notifications()
        _update_notification()
    if _chat_open:
        _rebuild_chat()

func _on_fixture_mode_changed(_mode: String) -> void:
    if _notification_open:
        _notification_queue = _unread_notifications()
        _notification_index = 0
        _update_notification()
    if _chat_open:
        _rebuild_chat()

func _unread_notifications() -> Array:
    var all: Array = CommunicationAcceptanceFixture.notifications(GameState.state)
    var unread: Array = []
    for value: Variant in all:
        if not value is Dictionary:
            continue
        var item: Dictionary = value as Dictionary
        if item.get("viewedAt", null) == null and item.get("skippedAt", null) == null:
            unread.append(item)
    unread.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
        return str(a.get("createdAt", "")) < str(b.get("createdAt", ""))
    )
    return unread

func _update_notification() -> void:
    if not _notification_open:
        return
    if _notification_queue.is_empty():
        _notification_title.text = "暂无通知"
        _notification_text.text = "当前没有需要查看的通知。"
        _notification_remaining.text = ""
        _notification_action.visible = false
        _notification_close.text = "关闭"
        return
    _notification_action.visible = true
    _notification_close.text = "×"
    var item: Dictionary = _notification_queue[clampi(_notification_index, 0, _notification_queue.size() - 1)] as Dictionary
    _notification_title.text = str(item.get("title", "通知"))
    _notification_text.text = str(item.get("text", ""))
    var remaining: int = maxi(0, _notification_queue.size() - _notification_index - 1)
    _notification_remaining.text = "还有 %s 条通知待查看" % remaining if remaining > 0 else "老哥端"

func _acknowledge_notification() -> void:
    if _notification_queue.is_empty():
        close_all()
        return
    var item: Dictionary = _notification_queue[_notification_index] as Dictionary
    _mark_notification(item, false)
    _notification_index += 1
    if _notification_index >= _notification_queue.size():
        close_all()
        return
    _update_notification()

func _skip_notification() -> void:
    if _notification_queue.is_empty():
        close_all()
        return
    var item: Dictionary = _notification_queue[_notification_index] as Dictionary
    _mark_notification(item, true)
    _notification_index += 1
    if _notification_index >= _notification_queue.size():
        close_all()
        return
    _update_notification()

func _mark_notification(item: Dictionary, skipped: bool) -> void:
    if CommunicationAcceptanceFixture.writes_blocked():
        print("Communication fixture write blocked: notification id=%s skipped=%s" % [str(item.get("id", "")), skipped])
        return
    var timestamp: String = Time.get_datetime_string_from_system(true)
    var next_state: Dictionary = CommunicationStateTransforms.mark_notification(GameState.state, item, skipped, timestamp)
    GameState.save_remote(next_state)

func _rebuild_chat() -> void:
    if _chat_list == null:
        return
    for child: Node in _chat_list.get_children():
        child.queue_free()
    var messages: Array = CommunicationAcceptanceFixture.chat_messages(GameState.state)
    messages.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
        return str(a.get("createdAt", "")) < str(b.get("createdAt", ""))
    )
    for value: Variant in messages:
        if value is Dictionary:
            _chat_list.add_child(_chat_message(value as Dictionary))

func _chat_message(message: Dictionary) -> Control:
    var mine: bool = str(message.get("sender", "")) == "husband"
    var row: HBoxContainer = HBoxContainer.new()
    row.custom_minimum_size = Vector2(0, 78)
    row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    row.alignment = BoxContainer.ALIGNMENT_END if mine else BoxContainer.ALIGNMENT_BEGIN
    row.add_theme_constant_override("separation", 10)

    var avatar: TextureRect = TextureRect.new()
    avatar.custom_minimum_size = Vector2(38, 38)
    avatar.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    avatar.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
    avatar.mouse_filter = Control.MOUSE_FILTER_IGNORE
    avatar.tooltip_text = "老哥" if mine else "老妞大人"

    var body: VBoxContainer = VBoxContainer.new()
    body.custom_minimum_size = Vector2(0, 68)
    body.size_flags_horizontal = Control.SIZE_SHRINK_END if mine else Control.SIZE_SHRINK_BEGIN
    body.add_theme_constant_override("separation", 5)
    body.alignment = BoxContainer.ALIGNMENT_END
    var meta: Label = _label(
        "%s  %s" % ["老哥" if mine else "老妞大人", _format_chat_time(str(message.get("createdAt", "")))],
        12,
        Color(0.90, 0.78, 0.55, 0.76)
    )
    meta.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT if mine else HORIZONTAL_ALIGNMENT_LEFT
    meta.custom_minimum_size = Vector2(0, 18)
    body.add_child(meta)

    var bubble: Panel = Panel.new()
    bubble.custom_minimum_size = Vector2(minf(260.0, maxf(150.0, _chat_panel.size.x - 132.0)), 42)
    bubble.size_flags_horizontal = Control.SIZE_SHRINK_END if mine else Control.SIZE_SHRINK_BEGIN
    var bubble_style: StyleBoxFlat = StyleBoxFlat.new()
    bubble_style.bg_color = Color(0.15, 0.105, 0.055, 0.90) if mine else Color(0.055, 0.043, 0.030, 0.90)
    bubble_style.border_color = Color(0.97, 0.78, 0.45, 0.62) if mine else Color(0.90, 0.78, 0.55, 0.42)
    bubble_style.set_border_width_all(1)
    bubble_style.set_corner_radius_all(10)
    bubble_style.shadow_color = Color(0.0, 0.0, 0.0, 0.48)
    bubble_style.shadow_size = 8
    bubble.add_theme_stylebox_override("panel", bubble_style)
    var text_label: Label = _label(str(message.get("text", "")), 15, Color("fff0d4") if mine else Color("ede2cf"))
    text_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    text_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT if mine else HORIZONTAL_ALIGNMENT_LEFT
    text_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    text_label.position = Vector2(12, 5)
    text_label.size = Vector2(bubble.custom_minimum_size.x - 24, 34)
    bubble.add_child(text_label)
    body.add_child(bubble)

    if mine:
        row.add_child(body)
        row.add_child(avatar)
    else:
        row.add_child(avatar)
        row.add_child(body)
    _load_avatar(avatar, HUSBAND_AVATAR_URL if mine else WIFE_AVATAR_URL)
    return row

func _load_avatar(target: TextureRect, url: String) -> void:
    var entry: Dictionary = {"url": url, "format": "png", "version": 1}
    var texture: Texture2D = await CloudAssetManager.load_texture("husband-communication-avatar-%s" % ("husband" if url == HUSBAND_AVATAR_URL else "wife"), entry)
    if is_instance_valid(target) and texture != null:
        target.texture = texture

func _format_chat_time(value: String) -> String:
    if value.length() < 16:
        return ""
    return value.substr(11, 5)

func _mark_chat_read() -> void:
    var messages: Array = CommunicationAcceptanceFixture.chat_messages(GameState.state)
    var changed: bool = false
    var next_state: Dictionary = CommunicationStateTransforms.mark_chat_read(GameState.state, Time.get_datetime_string_from_system(true))
    var original_messages: Array = GameState.state.get("chatMessages", []) as Array
    var updated_messages: Array = next_state.get("chatMessages", []) as Array
    changed = original_messages != updated_messages
    if changed:
        if CommunicationAcceptanceFixture.writes_blocked():
            print("Communication fixture write blocked: mark chat messages read")
        else:
            GameState.save_remote(next_state)

func _on_chat_submitted(_text: String) -> void:
    _send_chat()

func _send_chat() -> void:
    if _chat_input == null:
        return
    var text_value: String = _chat_input.text.strip_edges()
    if text_value.is_empty():
        return
    if CommunicationAcceptanceFixture.writes_blocked():
        print("Communication fixture write blocked: send chat")
        _chat_input.text = ""
        return
    var next_state: Dictionary = CommunicationStateTransforms.append_husband_message(
        GameState.state,
        text_value,
        Time.get_datetime_string_from_system(true),
        "chat-husband-%s" % Time.get_ticks_msec()
    )
    GameState.save_remote(next_state)
    _chat_input.text = ""
    _rebuild_chat()

func _load_chat_action_texture() -> void:
    if _chat_send == null:
        return
    var entry: Dictionary = {"url": CHAT_ACTION_URL, "format": "png", "version": 1}
    var texture: Texture2D = await CloudAssetManager.load_texture("husband-chat-submit", entry)
    if texture != null:
        _chat_send.texture_normal = texture

func _layout() -> void:
    if _root == null:
        return
    var viewport_size: Vector2 = get_viewport().get_visible_rect().size
    _root.position = Vector2.ZERO
    _root.size = viewport_size
    _shade.position = Vector2.ZERO
    _shade.size = viewport_size
    var panel_width: float = minf(viewport_size.x - 44.0, 390.0)
    var panel_height: float = minf(viewport_size.y - 80.0, 420.0)
    _notification_panel.position = Vector2((viewport_size.x - panel_width) * 0.5, (viewport_size.y - panel_height) * 0.5)
    _notification_panel.size = Vector2(panel_width, panel_height)
    _notification_title.position = Vector2(24, 28)
    _notification_title.size = Vector2(panel_width - 48, 48)
    var rule: Control = _notification_panel.get_child(1) as Control
    rule.position = Vector2(panel_width * 0.14, 86)
    rule.size = Vector2(panel_width * 0.72, 1)
    _notification_text.position = Vector2(24, 110)
    _notification_text.size = Vector2(panel_width - 48, 120)
    _notification_remaining.position = Vector2(24, 244)
    _notification_remaining.size = Vector2(panel_width - 48, 24)
    _notification_action.position = Vector2(24, panel_height - 68)
    _notification_action.size = Vector2(panel_width - 48, 48)
    _notification_close.position = Vector2(panel_width - 48, 10)
    _notification_close.size = Vector2(34, 34)

    var chat_width: float = minf(viewport_size.x - 24.0, 430.0)
    var chat_height: float = minf(viewport_size.y * 0.78, 640.0)
    _chat_panel.position = Vector2((viewport_size.x - chat_width) * 0.5, viewport_size.y - chat_height - 12.0)
    _chat_panel.size = Vector2(chat_width, chat_height)
    var chat_title: Label = _chat_panel.get_node("ChatTitle") as Label
    var chat_subtitle: Label = _chat_panel.get_node("ChatSubtitle") as Label
    chat_title.position = Vector2(48, 20)
    chat_title.size = Vector2(chat_width - 96, 40)
    chat_subtitle.position = Vector2(48, 58)
    chat_subtitle.size = Vector2(chat_width - 96, 22)
    _chat_close.position = Vector2(chat_width - 54, 16)
    _chat_close.size = Vector2(40, 40)
    var scroll: ScrollContainer = _chat_panel.get_node("ChatScroll") as ScrollContainer
    scroll.position = Vector2(16, 92)
    scroll.size = Vector2(chat_width - 32, chat_height - 178)
    var compose: HBoxContainer = _chat_panel.get_node("ChatCompose") as HBoxContainer
    compose.position = Vector2(14, chat_height - 76)
    compose.size = Vector2(chat_width - 28, 62)

func _is_role_page() -> bool:
    var scene: Node = get_tree().current_scene
    if scene == null:
        return false
    var view: Variant = scene.get("husband_view")
    return view is Control and view.visible and int(scene.get("current_page")) == 1
