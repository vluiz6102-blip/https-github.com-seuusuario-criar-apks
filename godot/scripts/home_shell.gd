extends Control

var _play_button: Button
var _status_label: Label
var _match_info: Label
var _club_badge: Label

func _ready() -> void:
    set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    _build_ui()

    if is_instance_valid(_play_button):
        J90AnimationSystem.pop_in(_play_button, 0.22)
        _play_button.grab_focus()

func _build_ui() -> void:
    var background := ColorRect.new()
    background.color = Color("#07131f")
    background.mouse_filter = Control.MOUSE_FILTER_IGNORE
    background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    add_child(background)

    var horizon := ColorRect.new()
    horizon.color = Color("#0d2131")
    horizon.position = Vector2(0, 106)
    horizon.size = Vector2(320, 74)
    horizon.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(horizon)

    var title := Label.new()
    title.text = "JORNADA 90"
    title.position = Vector2(14, 8)
    title.add_theme_font_size_override("font_size", 18)
    title.add_theme_color_override("font_color", Color("#f4f0d7"))
    add_child(title)

    var subtitle := Label.new()
    subtitle.text = "Manager • carreira • decisões"
    subtitle.position = Vector2(15, 29)
    subtitle.add_theme_font_size_override("font_size", 8)
    subtitle.add_theme_color_override("font_color", Color("#94a8b7"))
    add_child(subtitle)

    var club_panel := _panel(Color("#102a3b"), Color("#1c4d69"))
    club_panel.position = Vector2(13, 46)
    club_panel.size = Vector2(294, 43)
    add_child(club_panel)

    _club_badge = Label.new()
    _club_badge.text = "FC"
    _club_badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _club_badge.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    _club_badge.position = Vector2(19, 52)
    _club_badge.size = Vector2(31, 31)
    _club_badge.add_theme_font_size_override("font_size", 12)
    _club_badge.add_theme_color_override("font_color", Color("#07131f"))
    _club_badge.add_theme_stylebox_override("normal", _badge_style())
    add_child(_club_badge)

    var club_name := Label.new()
    club_name.text = "Jornada FC"
    club_name.position = Vector2(59, 53)
    club_name.add_theme_font_size_override("font_size", 12)
    club_name.add_theme_color_override("font_color", Color("#f4f0d7"))
    add_child(club_name)

    _match_info = Label.new()
    _match_info.text = "Próximo: Jornada FC  ×  Aurora FC"
    _match_info.position = Vector2(59, 69)
    _match_info.add_theme_font_size_override("font_size", 7)
    _match_info.add_theme_color_override("font_color", Color("#8fb4c6"))
    add_child(_match_info)

    _play_button = _button("JOGAR", Vector2(14, 98), Vector2(86, 26))
    _play_button.pressed.connect(_on_play_pressed)

    var squad := _button("ELENCO", Vector2(106, 98), Vector2(86, 26))
    squad.pressed.connect(func(): _toast("Elenco", "Painel conectado à arquitetura Godot."))

    var tactics := _button("TÁTICA", Vector2(198, 98), Vector2(108, 26))
    tactics.pressed.connect(func(): _toast("Tática", "Prancheta e IA serão carregadas por módulos."))

    var footer := Label.new()
    footer.text = "60/90/120 FPS adaptativos  •  Mobile Vulkan  •  Compatibility fallback"
    footer.position = Vector2(14, 151)
    footer.add_theme_font_size_override("font_size", 6)
    footer.add_theme_color_override("font_color", Color("#658295"))
    add_child(footer)

    _status_label = Label.new()
    _status_label.text = "Motor pronto"
    _status_label.position = Vector2(14, 169)
    _status_label.add_theme_font_size_override("font_size", 6)
    _status_label.add_theme_color_override("font_color", Color("#a7c4d1"))
    add_child(_status_label)

func _button(text_value: String, pos: Vector2, button_size: Vector2) -> Button:
    var button := Button.new()
    button.text = text_value
    button.position = pos
    button.size = button_size
    button.focus_mode = Control.FOCUS_ALL
    button.add_theme_font_size_override("font_size", 8)
    button.add_theme_color_override("font_color", Color("#f4f0d7"))
    button.add_theme_color_override("font_hover_color", Color("#ffffff"))
    button.add_theme_stylebox_override("normal", _button_style(Color("#17384c")))
    button.add_theme_stylebox_override("hover", _button_style(Color("#23546c")))
    button.add_theme_stylebox_override("pressed", _button_style(Color("#102c3d")))
    button.add_theme_stylebox_override("focus", _button_style(Color("#2c6883")))
    add_child(button)
    return button

func _panel(bg: Color, border: Color) -> Panel:
    var panel := Panel.new()
    panel.add_theme_stylebox_override("panel", _panel_style(bg, border))
    return panel

func _panel_style(bg: Color, border: Color) -> StyleBoxFlat:
    var style := StyleBoxFlat.new()
    style.bg_color = bg
    style.border_color = border
    style.set_border_width_all(1)
    style.corner_radius_top_left = 5
    style.corner_radius_top_right = 5
    style.corner_radius_bottom_left = 5
    style.corner_radius_bottom_right = 5
    return style

func _button_style(bg: Color) -> StyleBoxFlat:
    var style := _panel_style(bg, Color("#2c586b"))
    style.corner_radius_top_left = 4
    style.corner_radius_top_right = 4
    style.corner_radius_bottom_left = 4
    style.corner_radius_bottom_right = 4
    style.content_margin_left = 5
    style.content_margin_right = 5
    return style

func _badge_style() -> StyleBoxFlat:
    var style := StyleBoxFlat.new()
    style.bg_color = Color("#e6c45b")
    style.corner_radius_top_left = 5
    style.corner_radius_top_right = 5
    style.corner_radius_bottom_left = 5
    style.corner_radius_bottom_right = 5
    return style

func _on_play_pressed() -> void:
    if not MatchSceneController.is_match_active():
        _status_label.text = "Carregando partida..."
        J90AnimationSystem.press(_play_button)
        MatchSceneController.enter_match({
            "duration_seconds": 90.0,
            "home_team": &"Jornada FC",
            "away_team": &"Aurora FC",
            "seed": 902026
        })

func _toast(title_value: String, body: String) -> void:
    _status_label.text = "%s: %s" % [title_value, body]
    J90AnimationSystem.pulse(_status_label, 0.04, 0.20)

func _exit_tree() -> void:
    if is_instance_valid(_play_button) and _play_button.pressed.is_connected(_on_play_pressed):
        _play_button.pressed.disconnect(_on_play_pressed)
