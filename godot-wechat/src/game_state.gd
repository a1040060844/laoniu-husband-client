extends Node

signal changed(state: Dictionary)
signal sync_status_changed(message: String)
signal sync_failed(message: String)

const DEFAULT_ROLE_TITLES: Array[String] = [
    "流落街头",
    "落魄女仆",
    "心酸保安",
    "见习女仆",
    "见习侍从",
    "贴身侍卫",
    "贴身女婢",
    "管事助理",
    "内务主事",
    "贴身秘书",
    "首席管家",
    "大内总管",
]

const DEFAULT_ROLE_BIOGRAPHIES: Array[String] = [
    "一位被逐出家门的可怜人，只能靠微薄救济勉强维持生计，随时面临被遗忘的风险。",
    "刚被老妞大人收留的新人，规矩还没有学会，做事也常常手忙脚乱。",
    "被安排守门的边缘保安，日夜站岗却无人问津，偶尔还要被嫌弃站姿不标准。",
    "刚刚开始学习服侍之道的新人，动作笨拙但态度尚可，仍在观察期。",
    "已经能完成基础差事的小跟班，虽然还不出彩，但总算不再频繁犯错。",
    "被允许靠近核心区域的护卫，职责是随叫随到，但还谈不上完全信任。",
    "开始参与日常贴身事务的侍从，逐渐摸清老妞大人的生活节奏。",
    "能够独立处理小事务的执行者，已经可以分担部分压力，但仍需要指示。",
    "开始掌管部分内务的小负责人，对日常运作已有一定掌控能力。",
    "负责协调事务与安排的核心助手，已经成为不可或缺的存在。",
    "统筹全局、调度资源的关键人物，几乎可以代替老妞大人处理一切事务。",
    "一人之下的最高掌权者，深受信任，既能掌控全局，也拥有一定的话语权。",
]

var state: Dictionary = {}
var revision: String = ""
var is_syncing: bool = false
var has_loaded_state: bool = false
var last_sync_message: String = "尚未同步"
var last_sync_error: String = ""

func _ready() -> void:
    ApiClient.state_loaded.connect(_on_state_loaded)
    ApiClient.state_saved.connect(_on_state_saved)
    ApiClient.revision_conflict.connect(_on_revision_conflict)
    ApiClient.request_failed.connect(_on_request_failed)

func load_remote() -> void:
    if is_syncing:
        return
    is_syncing = true
    last_sync_error = ""
    _set_sync_message("正在同步服务器状态…")
    ApiClient.load_state()

func save_remote(next_state: Dictionary) -> void:
    if is_syncing:
        return

    state = _hydrate_runtime_state(next_state)
    var payload: Dictionary = _state_for_server(state)
    is_syncing = true
    last_sync_error = ""
    _set_sync_message("正在保存…")
    ApiClient.save_state(payload, revision)

func get_progress() -> Dictionary:
    if state.is_empty():
        return {}

    var raw: Variant = state.get("progress", null)
    if raw is Dictionary:
        return raw as Dictionary

    return {
        "level": int(state.get("level", 1)),
        "exp": int(state.get("exp", 15)),
        "totalExp": int(state.get("totalExp", 286)),
        "wallet": int(state.get("wallet", 52)),
        "rewardedTaskIds": state.get("rewardedTaskIds", []),
    }

func get_roles() -> Array:
    var roles_value: Variant = state.get("roles", [])
    if roles_value is Array:
        return roles_value as Array
    return []

func get_role_for_level(level: int) -> Dictionary:
    for value: Variant in get_roles():
        if value is Dictionary:
            var role: Dictionary = value as Dictionary
            if int(role.get("level", -1)) == level:
                return role
    var roles: Array = get_roles()
    if not roles.is_empty() and roles[0] is Dictionary:
        return roles[0] as Dictionary
    return {}

func _on_state_loaded(next_state: Dictionary, next_revision: String) -> void:
    state = _hydrate_runtime_state(next_state)
    revision = next_revision
    is_syncing = false
    has_loaded_state = true
    last_sync_error = ""
    print(
        "Godot state loaded: keys=%s roles=%s progress=%s" % [
            state.keys(),
            get_roles().size(),
            get_progress(),
        ]
    )
    changed.emit(state)
    _set_sync_message("服务器状态已同步")

func _on_state_saved(next_revision: String) -> void:
    revision = next_revision
    is_syncing = false
    has_loaded_state = true
    changed.emit(state)
    _set_sync_message("状态已保存")

func _on_revision_conflict(next_revision: String) -> void:
    revision = next_revision
    is_syncing = false
    _set_sync_message("检测到另一端更新，正在重新读取…")
    load_remote()

func _on_request_failed(message: String) -> void:
    is_syncing = false
    last_sync_error = message
    print("Godot state sync failed: %s" % message)
    sync_failed.emit(message)
    _set_sync_message("同步失败：%s" % message)

func _set_sync_message(message: String) -> void:
    last_sync_message = message
    sync_status_changed.emit(message)

func _hydrate_runtime_state(raw_state: Dictionary) -> Dictionary:
    var hydrated: Dictionary = raw_state.duplicate(true)
    hydrated["roles"] = _resolve_roles(hydrated)
    return hydrated

func _state_for_server(runtime_state: Dictionary) -> Dictionary:
    var payload: Dictionary = runtime_state.duplicate(true)
    payload.erase("roles")
    return payload

func _resolve_roles(raw_state: Dictionary) -> Array:
    var roles: Array = _default_roles()
    var admin_value: Variant = raw_state.get("adminConfig", {})
    if not admin_value is Dictionary:
        return roles

    var admin: Dictionary = admin_value as Dictionary
    var roles_config_value: Variant = admin.get("roles", {})
    if not roles_config_value is Dictionary:
        return roles
    var roles_config: Dictionary = roles_config_value as Dictionary

    var overrides_value: Variant = roles_config.get("overrides", [])
    if overrides_value is Array:
        for override_value: Variant in overrides_value:
            if not override_value is Dictionary:
                continue
            var override: Dictionary = override_value as Dictionary
            var level: int = int(override.get("level", -1))
            var index: int = _role_index_for_level(roles, level)
            if index < 0:
                continue
            roles[index] = _apply_role_definition(roles[index] as Dictionary, override, "override")

    var custom_value: Variant = roles_config.get("customRoles", [])
    if custom_value is Array:
        for definition_value: Variant in custom_value:
            if not definition_value is Dictionary:
                continue
            var definition: Dictionary = definition_value as Dictionary
            var level: int = int(definition.get("level", -1))
            if level < 0:
                continue
            var custom_role: Dictionary = _custom_role_from_definition(definition)
            var index: int = _role_index_for_level(roles, level)
            if index >= 0:
                roles[index] = custom_role
            else:
                roles.append(custom_role)

    roles.sort_custom(_role_less)
    return roles

func _role_less(a: Variant, b: Variant) -> bool:
    if not a is Dictionary or not b is Dictionary:
        return false
    var role_a: Dictionary = a as Dictionary
    var role_b: Dictionary = b as Dictionary
    return int(role_a.get("level", 0)) < int(role_b.get("level", 0))

func _default_roles() -> Array:
    var roles: Array = []
    for level: int in range(DEFAULT_ROLE_TITLES.size()):
        roles.append({
            "level": level,
            "title": DEFAULT_ROLE_TITLES[level],
            "salary": _salary_for_level(level),
            "expCurrent": 0,
            "expRequired": _exp_required_for_level(level),
            "biography": DEFAULT_ROLE_BIOGRAPHIES[level],
            "roleImage": _default_role_image(level),
            "benefitImage": _default_benefit_image(level),
            "bgm": "/assets/audio/bgm/roles/bgm-role-%02d.mp3" % level,
            "source": "default",
        })
    return roles

func _apply_role_definition(base_role: Dictionary, definition: Dictionary, source: String) -> Dictionary:
    var role: Dictionary = base_role.duplicate(true)
    if definition.has("title") and not str(definition.get("title", "")).is_empty():
        role["title"] = str(definition.get("title"))
    if definition.has("salary"):
        role["salary"] = max(0, int(definition.get("salary", role.get("salary", 0))))
    if definition.has("story") and not str(definition.get("story", "")).is_empty():
        role["biography"] = str(definition.get("story"))
    if definition.has("illustration") and not str(definition.get("illustration", "")).is_empty():
        role["roleImage"] = str(definition.get("illustration"))
    if definition.has("benefitIllustration") and not str(definition.get("benefitIllustration", "")).is_empty():
        role["benefitImage"] = str(definition.get("benefitIllustration"))
    if definition.has("bgm") and not str(definition.get("bgm", "")).is_empty():
        role["bgm"] = str(definition.get("bgm"))
    role["source"] = source
    return role

func _custom_role_from_definition(definition: Dictionary) -> Dictionary:
    var level: int = max(0, int(definition.get("level", 0)))
    var title: String = str(definition.get("title", "Lv.%s 自定义职务" % level))
    if title.is_empty():
        title = "Lv.%s 自定义职务" % level
    var story: String = str(definition.get("story", "后台新增的自定义职务。"))
    if story.is_empty():
        story = "后台新增的自定义职务。"
    var illustration: String = str(definition.get("illustration", _default_role_image(level)))
    if illustration.is_empty():
        illustration = _default_role_image(level)
    var benefit_illustration: String = str(definition.get("benefitIllustration", _default_benefit_image(level)))
    if benefit_illustration.is_empty():
        benefit_illustration = _default_benefit_image(level)
    return {
        "level": level,
        "title": title,
        "salary": max(0, int(definition.get("salary", _salary_for_level(level)))),
        "expCurrent": 0,
        "expRequired": _exp_required_for_level(level),
        "biography": story,
        "roleImage": illustration,
        "benefitImage": benefit_illustration,
        "bgm": str(definition.get("bgm", "/assets/audio/bgm/roles/bgm-role-%02d.mp3" % level)),
        "source": "custom",
    }

func _role_index_for_level(roles: Array, level: int) -> int:
    for index: int in range(roles.size()):
        var value: Variant = roles[index]
        if value is Dictionary and int((value as Dictionary).get("level", -1)) == level:
            return index
    return -1

func _salary_for_level(level: int) -> int:
    return (max(0, level) + 1) * 100

func _exp_required_for_level(level: int) -> int:
    return max(1, max(0, level)) * 500

func _default_role_image(level: int) -> String:
    match level:
        0:
            return "/assets/roles/role-00-street-vagrant.png"
        3:
            return "/assets/roles/role-03-trainee-maid.png"
        8:
            return "/assets/roles/role-08-housekeeper.png"
        9:
            return "/assets/roles/role-09-secretary.png"
        _:
            return "/assets/roles/role-%02d.png" % level

func _default_benefit_image(level: int) -> String:
    match level:
        0:
            return "/assets/benefits/benefit-00-street-vagrant.png"
        3:
            return "/assets/benefits/benefit-03-trainee-maid.png"
        _:
            return "/assets/benefits/benefit-%02d.png" % level
