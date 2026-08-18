extends Control

const PAGE_BENEFIT := 0
const PAGE_ROLE := 1
const PAGE_TASK := 2
const SWIPE_THRESHOLD := 60.0

var login_view: Control
var husband_view: Control
var page_container: Control
var sync_label: Label
var role_title_label: Label
var exp_label: Label
var wallet_label: Label
var current_page := PAGE_ROLE
var touch_start_y := 0.0
var touch_tracking := false

func _ready() -> void:
    get_viewport().size_changed.connect(_layout)
    GameState.changed.connect(_on_state_changed)
    GameState.sync_status_changed.connect(_on_sync_status_changed)
    GameState.sync_failed.connect(_on_sync_failed)
    _build_ui()
    _layout()
    GameState.load_remote()

func _build_ui() -> void:
    var background := ColorRect.new()
    background.color = Color("030303")
    background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    add_child(background)

    husband_view = Control.new()
    husband_view.visible = false
    husband_view.clip_contents = true
    add_child(husband_view)

    page_container = Control.new()
    husband_view.add_child(page_container)

    page_container.add_child(_build_benefit_page())
    page_container.add_child(_build_role_page())
    page_container.add_child(_build_task_page())

    login_view = _build_login_view()
    add_child(login_view)

    sync_label = _make_label("正在连接服务器…", 12, Color("cbb995"))
    sync_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    sync_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(sync_label)

func _build_login_view() -> Control:
    var root := Control.new()

    var panel := ColorRect.new()
    panel.color = Color("0d0906")
    panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    root.add_child(panel)

    var title := _make_label("老妞大人宠宠我", 30, Color("f4dfb0"))
    title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    root.add_child(title)
    title.set_meta("layout", "login_title")

    var subtitle := _make_label("GODOT · 微信小游戏重构验证", 12, Color("9f8b6d"))
    subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    root.add_child(subtitle)
    subtitle.set_meta("layout", "login_subtitle")

    var husband_button := Button.new()
    husband_button.text = "我是老哥"
    husband_button.pressed.connect(_enter_husband)
    root.add_child(husband_button)
    husband_button.set_meta("layout", "husband_button")

    var wife_button := Button.new()
    wife_button.text = "老妞端稍后迁移"
    wife_button.disabled = true
    root.add_child(wife_button)
    wife_button.set_meta("layout", "wife_button")

    var note := _make_label("PoC 阶段：先验证登录页、老哥主页、上下滑与现有 API", 11, Color("7e715f"))
    note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    root.add_child(note)
    note.set_meta("layout", "login_note")

    return root

func _build_benefit_page() -> Control:
    var page := _base_page(Color("070504"))
    page.name = "BenefitPage"

    var kicker := _make_label("下滑返回职务", 12, Color("9f8b6d"))
    kicker.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    page.add_child(kicker)
    kicker.set_meta("layout", "top_hint")

    var title := _make_label("当前权益", 28, Color("f4dfb0"))
    title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    page.add_child(title)
    title.set_meta("layout", "page_title")

    var card := ColorRect.new()
    card.color = Color("17110c")
    page.add_child(card)
    card.set_meta("layout", "center_card")

    var card_text := _make_label("权益卡片占位\n下一阶段接入现有权益数据与插画", 16, Color("e7d6b6"))
    card_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    card_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    card.add_child(card_text)
    card_text.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

    return page

func _build_role_page() -> Control:
    var page := _base_page(Color("050302"))
    page.name = "RolePage"

    var top_hint := _make_label("下滑查看权益", 12, Color("9f8b6d"))
    top_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    page.add_child(top_hint)
    top_hint.set_meta("layout", "top_hint")

    var illustration := ColorRect.new()
    illustration.color = Color("120c07")
    page.add_child(illustration)
    illustration.set_meta("layout", "hero")

    var illustration_text := _make_label("角色插画区域\n下一步替换为现有职务插画", 14, Color("79684f"))
    illustration_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    illustration_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    illustration.add_child(illustration_text)
    illustration_text.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

    role_title_label = _make_label("职务加载中", 28, Color("f4dfb0"))
    role_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    page.add_child(role_title_label)
    role_title_label.set_meta("layout", "role_title")

    exp_label = _make_label("经验 --", 14, Color("d9c69f"))
    page.add_child(exp_label)
    exp_label.set_meta("layout", "exp")

    wallet_label = _make_label("零花钱 --", 14, Color("d9c69f"))
    page.add_child(wallet_label)
    wallet_label.set_meta("layout", "wallet")

    var bio := _make_label("人物小传\nGodot PoC 正在复刻现有 React 页面结构。", 13, Color("a99575"))
    bio.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    bio.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    page.add_child(bio)
    bio.set_meta("layout", "bio")

    var bottom_hint := _make_label("↑  上滑查看任务", 14, Color("e8d4aa"))
    bottom_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    page.add_child(bottom_hint)
    bottom_hint.set_meta("layout", "bottom_hint")

    return page

func _build_task_page() -> Control:
    var page := _base_page(Color("080604"))
    page.name = "TaskPage"

    var top_hint := _make_label("↓  下滑返回职务", 12, Color("9f8b6d"))
    top_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    page.add_child(top_hint)
    top_hint.set_meta("layout", "top_hint")

    var title := _make_label("任务", 28, Color("f4dfb0"))
    title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    page.add_child(title)
    title.set_meta("layout", "page_title")

    var list := VBoxContainer.new()
    list.add_theme_constant_override("separation", 12)
    page.add_child(list)
    list.set_meta("layout", "task_list")

    for text in ["今日任务占位", "待老妞确认占位", "本月完成任务占位"]:
        var item := ColorRect.new()
        item.custom_minimum_size = Vector2(0, 76)
        item.color = Color("17110c")
        list.add_child(item)
        var item_label := _make_label(text, 14, Color("d9c69f"))
        item_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
        item_label.position = Vector2(16, 0)
        item_label.size = Vector2(300, 76)
        item.add_child(item_label)

    return page

func _base_page(color: Color) -> Control:
    var page := Control.new()
    var bg := ColorRect.new()
    bg.color = color
    bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    page.add_child(bg)
    return page

func _make_label(text: String, size: int, color: Color) -> Label:
    var label := Label.new()
    label.text = text
    label.add_theme_font_size_override("font_size", size)
    label.add_theme_color_override("font_color", color)
    return label

func _layout() -> void:
    var viewport_size := get_viewport_rect().size
    size = viewport_size

    if is_instance_valid(login_view):
        login_view.position = Vector2.ZERO
        login_view.size = viewport_size
        _layout_login(login_view, viewport_size)

    if is_instance_valid(husband_view):
        husband_view.position = Vector2.ZERO
        husband_view.size = viewport_size
        page_container.size = Vector2(viewport_size.x, viewport_size.y * 3.0)

        for index in page_container.get_child_count():
            var page := page_container.get_child(index) as Control
            page.position = Vector2(0, viewport_size.y * index)
            page.size = viewport_size
            _layout_page(page, viewport_size)

        page_container.position.y = -viewport_size.y * current_page

    if is_instance_valid(sync_label):
        sync_label.position = Vector2(16, viewport_size.y - 28)
        sync_label.size = Vector2(viewport_size.x - 32, 18)

func _layout_login(root: Control, viewport_size: Vector2) -> void:
    for child in root.get_children():
        if not child.has_meta("layout"):
            continue
        match str(child.get_meta("layout")):
            "login_title":
                child.position = Vector2(20, viewport_size.y * 0.24)
                child.size = Vector2(viewport_size.x - 40, 44)
            "login_subtitle":
                child.position = Vector2(20, viewport_size.y * 0.24 + 48)
                child.size = Vector2(viewport_size.x - 40, 22)
            "husband_button":
                child.position = Vector2(48, viewport_size.y * 0.57)
                child.size = Vector2(viewport_size.x - 96, 52)
            "wife_button":
                child.position = Vector2(48, viewport_size.y * 0.57 + 64)
                child.size = Vector2(viewport_size.x - 96, 52)
            "login_note":
                child.position = Vector2(36, viewport_size.y * 0.78)
                child.size = Vector2(viewport_size.x - 72, 50)

func _layout_page(page: Control, viewport_size: Vector2) -> void:
    for child in page.get_children():
        if not child.has_meta("layout"):
            continue
        match str(child.get_meta("layout")):
            "top_hint":
                child.position = Vector2(20, 28)
                child.size = Vector2(viewport_size.x - 40, 22)
            "page_title":
                child.position = Vector2(20, 72)
                child.size = Vector2(viewport_size.x - 40, 44)
            "center_card":
                child.position = Vector2(32, 170)
                child.size = Vector2(viewport_size.x - 64, 360)
            "hero":
                child.position = Vector2(24, 78)
                child.size = Vector2(viewport_size.x - 48, viewport_size.y * 0.43)
            "role_title":
                child.position = Vector2(20, viewport_size.y * 0.53)
                child.size = Vector2(viewport_size.x - 40, 42)
            "exp":
                child.position = Vector2(36, viewport_size.y * 0.61)
                child.size = Vector2(viewport_size.x * 0.45, 26)
            "wallet":
                child.position = Vector2(viewport_size.x * 0.56, viewport_size.y * 0.61)
                child.size = Vector2(viewport_size.x * 0.35, 26)
            "bio":
                child.position = Vector2(36, viewport_size.y * 0.68)
                child.size = Vector2(viewport_size.x - 72, 82)
            "bottom_hint":
                child.position = Vector2(20, viewport_size.y - 72)
                child.size = Vector2(viewport_size.x - 40, 26)
            "task_list":
                child.position = Vector2(28, 150)
                child.size = Vector2(viewport_size.x - 56, viewport_size.y - 210)

func _enter_husband() -> void:
    login_view.visible = false
    husband_view.visible = true
    current_page = PAGE_ROLE
    _snap_to_page(false)

func _unhandled_input(event: InputEvent) -> void:
    if not is_instance_valid(husband_view) or not husband_view.visible:
        return

    if event is InputEventScreenTouch:
        if event.pressed:
            touch_tracking = true
            touch_start_y = event.position.y
        elif touch_tracking:
            touch_tracking = false
            _finish_swipe(event.position.y - touch_start_y)
    elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
        if event.pressed:
            touch_tracking = true
            touch_start_y = event.position.y
        elif touch_tracking:
            touch_tracking = false
            _finish_swipe(event.position.y - touch_start_y)

func _finish_swipe(delta_y: float) -> void:
    if abs(delta_y) < SWIPE_THRESHOLD:
        return
    if delta_y < 0:
        _set_page(current_page + 1)
    else:
        _set_page(current_page - 1)

func _set_page(index: int) -> void:
    var next_page := clampi(index, PAGE_BENEFIT, PAGE_TASK)
    if next_page == current_page:
        return
    current_page = next_page
    _snap_to_page(true)

func _snap_to_page(animated: bool) -> void:
    var target_y := -get_viewport_rect().size.y * current_page
    if not animated:
        page_container.position.y = target_y
        return
    var tween := create_tween()
    tween.set_trans(Tween.TRANS_QUART)
    tween.set_ease(Tween.EASE_OUT)
    tween.tween_property(page_container, "position:y", target_y, 0.42)

func _on_state_changed(_state: Dictionary) -> void:
    var progress := GameState.get_progress()
    var level := int(progress.get("level", 0))
    var exp := int(progress.get("exp", 0))
    var wallet := int(progress.get("wallet", 0))
    role_title_label.text = _resolve_role_title(level)
    exp_label.text = "经验  %s" % exp
    wallet_label.text = "零花钱  ¥%s" % wallet

func _resolve_role_title(level: int) -> String:
    var roles = GameState.state.get("roles", [])
    if roles is Array:
        for role in roles:
            if role is Dictionary and int(role.get("level", -1)) == level:
                return str(role.get("title", role.get("name", "Lv.%s" % level)))
    return "Lv.%s" % level

func _on_sync_status_changed(message: String) -> void:
    if is_instance_valid(sync_label):
        sync_label.text = message

func _on_sync_failed(message: String) -> void:
    if is_instance_valid(sync_label):
        sync_label.text = "同步失败：%s" % message
