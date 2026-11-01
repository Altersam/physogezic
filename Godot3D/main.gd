extends Node3D

const GOAL: int = 15
const COLORS: Array[Color] = [Color("bda2ef"),Color("ffc586"),Color("87d7c8"),Color("ef9db9")]
const Feedback=preload("res://game_fx.gd")
const Journal=preload("res://journal.gd")
const LabStage=preload("res://lab_stage.gd")
const GameFont=preload("res://game_font.tres")
const TOPICS: Dictionary={"mechanics":"Механика","heat":"Тепловые явления","electricity":"Электричество","optics":"Оптика","quantum":"Квантовые явления"}
var questions: Array = []
var experiments: Array = []
var lab_enabled: bool = false
var deck: Array = []
var players: Array = []
var pawns: Array[Node3D] = []
var cards: Array[Node3D] = []
var turn: int = 0
var phase: String = "draw"
var active: Dictionary = {}
var table_ui: VBoxContainer
var status: Label
var question_label: Label
var answer_box: VBoxContainer
var next_button: Button
var player_label: Label
var selected_pairs: Array = []
var selected_card: Node3D
var front_caption: Label3D
var smoke: bool = false
var fx
var journal
var camera: Camera3D
var mascot: Sprite3D
var hud: CanvasLayer
var cells: Array[MeshInstance3D]=[]
var card_homes: Array[Vector3]=[]
var front_viewport: SubViewport
var card_tween: Tween
var movement_tween: Tween
var hover_slot: int=-1
var stage_time: float=0.0
var log_tick: float=0.0
var player_badges: HBoxContainer
var panel: PanelContainer
var response_badge: Label
var progress: ProgressBar
var victory_panel: Control
var turn_halo: Sprite3D
var finish_halo: Sprite3D
var finish_light: MeshInstance3D
var sound_button: Button
var effect_button: Button
var lab_button: Button
var lab_stage: Node3D
var web_state_pending: bool=false
var game_theme: Theme

func _ready() -> void:
	var args: PackedStringArray = OS.get_cmdline_user_args()
	smoke = args.has("--smoke") or args.has("--lab-test")
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/questions.json"))
	var lab_parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/experiments.json"))
	if parsed is Array and lab_parsed is Array:
		questions = parsed
		experiments = lab_parsed
	else:
		push_error("Question banks could not be read")
		get_tree().quit(1)
		return
	journal=Journal.new()
	game_theme=Theme.new()
	game_theme.default_font=GameFont
	fx=Feedback.new()
	add_child(fx)
	_build_world()
	lab_stage=LabStage.new()
	lab_stage.position=Vector3(-0.1,.36,-2.3)
	lab_stage.scale=Vector3.ONE*.78
	add_child(lab_stage)
	_build_ui()
	fx.setup(camera,mascot,hud)
	if smoke:fx.set_enabled(false);fx.sound_enabled=false
	elif OS.get_cmdline_user_args().has("--reduced-motion"):fx.set_enabled(false)
	turn_halo=fx.halo(Color("ffe1a2"),.8)
	add_child(turn_halo)
	_new_game(2)
	if args.has("--lab-test"):
		call_deferred("_lab_test")
	elif smoke:
		call_deferred("_smoke_test")
	elif args.has("--effects-test"):
		call_deferred("_effects_test")
	elif args.has("--capture"):
		call_deferred("_capture")

func _material(color: Color) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.55
	mat.metallic = 0.12
	return mat

func _box(size: Vector3, location: Vector3, color: Color, parent: Node = null) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	var shape := BoxMesh.new()
	shape.size = size
	mesh.mesh = shape
	mesh.material_override = _material(color)
	mesh.position = location
	(parent if parent != null else self).add_child(mesh)
	return mesh

func _cell(index: int) -> Vector3:
	var angle: float = PI / 2.0 + float(index) * TAU / 16.0
	return Vector3(cos(angle)*5.0,0.4,sin(angle)*3.5)

func _build_world() -> void:
	var environment := WorldEnvironment.new()
	var sky := Environment.new()
	sky.background_mode = Environment.BG_COLOR
	sky.background_color = Color("0c1020")
	sky.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	sky.ambient_light_color = Color("b6b4e6")
	sky.ambient_light_energy = 0.3
	environment.environment = sky
	add_child(environment)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55,-25,0)
	sun.light_energy = 0.8
	sun.shadow_enabled = true
	add_child(sun)
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 10.7
	camera.position = Vector3(0,10,10)
	camera.h_offset = 1.9
	add_child(camera)
	camera.look_at(Vector3(0,0,0))
	camera.current = true
	var base:=MeshInstance3D.new()
	var oval:=CylinderMesh.new()
	oval.top_radius=6.5
	oval.bottom_radius=6.25
	oval.height=.46
	base.mesh=oval
	base.scale.z=.77
	base.position.y=-.1
	base.material_override=_material(Color("59416c"))
	add_child(base)
	var felt:=MeshInstance3D.new()
	var surface:=CylinderMesh.new()
	surface.top_radius=6.23
	surface.bottom_radius=6.3
	surface.height=.13
	felt.mesh=surface
	felt.scale.z=.77
	felt.position.y=.2
	felt.material_override=fx.glow_material(Color("191b32"))
	add_child(felt)
	var outer: MeshInstance3D=fx.ring(Vector3(0,.29,0),Color("ab83da"),6.22)
	outer.scale.z=.77
	add_child(outer)
	var inner: MeshInstance3D=fx.ring(Vector3(0,.3,0),Color("697db0"),5.96)
	inner.scale.z=.77
	add_child(inner)
	for i in range(16):
		var marker := MeshInstance3D.new()
		var cylinder := CylinderMesh.new()
		cylinder.top_radius = 0.4 if i==0 or i==GOAL else 0.32
		cylinder.bottom_radius = cylinder.top_radius+0.04
		cylinder.height = 0.13
		marker.mesh = cylinder
		marker.material_override = _material(Color("c6a65f") if i==GOAL else Color("343454"))
		marker.position = _cell(i)
		add_child(marker)
		cells.append(marker)
		var cell_color: Color=Color("ffdc8a") if i==GOAL else Color("9e8de0") if i%3==0 else Color("70b7cc")
		var rim: MeshInstance3D=fx.ring(_cell(i)+Vector3(0,.073,0),cell_color,cylinder.top_radius+.015)
		add_child(rim)
		var light_pad: Sprite3D=fx.halo(cell_color,.7)
		light_pad.position=_cell(i)+Vector3(0,-.055,0)
		add_child(light_pad)
		var label := Label3D.new()
		label.font=GameFont
		label.text = "СТАРТ" if i==0 else "★" if i==GOAL else str(i)
		label.font_size = 24 if i==0 else 40
		label.pixel_size = 0.008
		label.modulate = Color("f5e3ff")
		label.rotation_degrees.x = -90
		label.position = _cell(i)+Vector3(0,0.075,0)
		add_child(label)
		if i<15:
			for j in range(1,5):
				var dot := MeshInstance3D.new()
				var sphere := SphereMesh.new()
				sphere.radius = 0.025
				sphere.height = 0.05
				sphere.radial_segments=6
				sphere.rings=4
				dot.mesh = sphere
				dot.material_override = fx.glow_material(Color("8278b8"))
				dot.position = _cell(i).lerp(_cell(i+1),j/5.0)
				add_child(dot)
	# Финиш зовёт издалека: тёплое сияние и парящий золотой огонёк.
	finish_halo=fx.halo(Color("ffdc8a"),1.7)
	finish_halo.position=_cell(GOAL)+Vector3(0,.02,0)
	add_child(finish_halo)
	finish_light=MeshInstance3D.new()
	var light_shape:=SphereMesh.new()
	light_shape.radius=.09
	light_shape.height=.18
	finish_light.mesh=light_shape
	finish_light.material_override=fx.glow_material(Color("ffe3a1"))
	finish_light.position=_cell(GOAL)+Vector3(0,.6,0)
	add_child(finish_light)
	mascot = Sprite3D.new()
	mascot.texture = load("res://assets/mascot.png")
	mascot.pixel_size = 0.003
	mascot.position = Vector3(-3.0,1.5,-0.4)
	mascot.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	add_child(mascot)
	for slot in range(3):
		var card := Node3D.new()
		card.position = Vector3(-1.25+slot*1.5,0.5,0.2)
		card_homes.append(card.position)
		card.set_meta("slot",slot)
		add_child(card)
		var paper := _box(Vector3(1.22,0.07,1.8),Vector3.ZERO,Color("c7b1e6"),card)
		paper.name = "Paper"
		var art := MeshInstance3D.new()
		var plane := PlaneMesh.new()
		plane.size = Vector2(1.16,1.74)
		art.mesh = plane
		var mat := _material(Color.WHITE)
		mat.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.albedo_texture = load("res://assets/card-1.webp")
		mat.cull_mode = BaseMaterial3D.CULL_BACK
		art.material_override = mat
		art.position.y = 0.042
		art.name = "BackArt"
		card.add_child(art)
		var front:=MeshInstance3D.new()
		front.mesh=plane
		front.position.y=-.043
		front.rotation_degrees.z=180
		front.name="FrontArt"
		front.visible=false
		card.add_child(front)
		var card_rim: MeshInstance3D=fx.ring(Vector3(0,.01,0),Color("d6b9ff"),.18)
		card_rim.scale=Vector3(2.7,1,4.0)
		card_rim.visible=false
		card_rim.name="HoverRing"
		card.add_child(card_rim)
		var area := Area3D.new()
		area.set_meta("slot",slot)
		var collision := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = Vector3(1.35,0.2,1.95)
		collision.shape = box
		area.add_child(collision)
		card.add_child(area)
		cards.append(card)
	front_caption=Label3D.new()
	front_caption.font=GameFont
	front_caption.billboard=BaseMaterial3D.BILLBOARD_ENABLED
	front_caption.font_size=30
	front_caption.outline_size=3
	front_caption.pixel_size=0.009
	front_caption.modulate=Color("6a4a7b")
	front_caption.no_depth_test=true
	front_caption.visible=false
	add_child(front_caption)

func _style(color: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = border
	style.set_border_width_all(2)
	style.border_width_bottom = 5
	style.set_corner_radius_all(12)
	style.content_margin_left=16
	style.content_margin_right=16
	style.content_margin_top=12
	style.content_margin_bottom=12
	style.shadow_color=Color(0,0,0,.24)
	style.shadow_size=9
	return style

func _button(text: String, action: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size.y = 46
	button.add_theme_font_size_override("font_size",16)
	button.add_theme_stylebox_override("normal",_style(Color("6f5293"),Color("a086bc")))
	button.add_theme_stylebox_override("hover",_style(Color("9272b8"),Color("d7bced")))
	button.add_theme_stylebox_override("pressed",_style(Color("594273"),Color("bb98da")))
	button.mouse_entered.connect(func()->void:
		if not is_instance_valid(button) or not fx.enabled:return
		button.pivot_offset=button.size*.5
		button.create_tween().tween_property(button,"scale",Vector2.ONE*1.025,.1)
		fx.tone("hover"))
	button.mouse_exited.connect(func()->void:
		if is_instance_valid(button):button.create_tween().tween_property(button,"scale",Vector2.ONE,.1))
	button.pressed.connect(action)
	return button

func _build_ui() -> void:
	hud = CanvasLayer.new()
	add_child(hud)
	var layer: CanvasLayer=hud
	var header := Label.new()
	header.text = "ФИЗОГЭЗИК · звёздный стол"
	header.position = Vector2(28,20)
	header.add_theme_font_size_override("font_size",24)
	header.modulate = Color("e3d2f4")
	layer.add_child(header)
	player_label = Label.new()
	player_label.position = Vector2(28,112)
	player_label.add_theme_font_size_override("font_size",16)
	player_label.modulate = Color("c7afd9")
	layer.add_child(player_label)
	player_badges=HBoxContainer.new()
	player_badges.position=Vector2(28,64)
	player_badges.add_theme_constant_override("separation",10)
	layer.add_child(player_badges)
	panel = PanelContainer.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_RIGHT_WIDE)
	panel.offset_left = -385
	panel.offset_right = -18
	panel.offset_top = 24
	panel.offset_bottom = -22
	panel.add_theme_stylebox_override("panel",_style(Color("1e2137"),Color("65548b")))
	layer.add_child(panel)
	table_ui = VBoxContainer.new()
	table_ui.add_theme_constant_override("separation",12)
	panel.add_child(table_ui)
	status = Label.new()
	status.add_theme_font_size_override("font_size",20)
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	table_ui.add_child(status)
	response_badge=Label.new()
	response_badge.add_theme_font_size_override("font_size",13)
	response_badge.modulate=Color("b0a4cf")
	response_badge.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	table_ui.add_child(response_badge)
	progress=ProgressBar.new()
	progress.max_value=15
	progress.show_percentage=false
	progress.custom_minimum_size.y=9
	progress.add_theme_stylebox_override("background",_style(Color("292a45"),Color("292a45")))
	progress.add_theme_stylebox_override("fill",_style(Color("aa87de"),Color("bb9fe9")))
	table_ui.add_child(progress)
	question_label = Label.new()
	question_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	question_label.add_theme_font_size_override("font_size",18)
	table_ui.add_child(question_label)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	table_ui.add_child(scroll)
	answer_box = VBoxContainer.new()
	answer_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	answer_box.add_theme_constant_override("separation",9)
	scroll.add_child(answer_box)
	next_button = _button("Передать ход",_next_turn)
	table_ui.add_child(next_button)
	var options := HBoxContainer.new()
	options.position = Vector2(28,655)
	layer.add_child(options)
	for n in range(1,5):
		options.add_child(_button(str(n)+" игр.",_new_game.bind(n)))
	lab_button=_button("Лаборатория: выкл",_toggle_lab)
	lab_button.position=Vector2(420,25)
	lab_button.custom_minimum_size=Vector2(190,36)
	lab_button.add_theme_font_size_override("font_size",12)
	layer.add_child(lab_button)
	sound_button=_button("Звук: вкл",_toggle_sound)
	sound_button.position=Vector2(620,25)
	sound_button.custom_minimum_size=Vector2(120,36)
	sound_button.add_theme_font_size_override("font_size",12)
	layer.add_child(sound_button)
	effect_button=_button("Эффекты: вкл",_toggle_effects)
	effect_button.position=Vector2(750,25)
	effect_button.custom_minimum_size=Vector2(126,36)
	effect_button.add_theme_font_size_override("font_size",12)
	layer.add_child(effect_button)
	var help := Label.new()
	help.text = "Кликни карту на столе или нажми 1 / 2 / 3.\nОбычная карта: +1–3. Опыт: +1–3 или −1 за ошибку."
	help.position = Vector2(28,600)
	help.modulate = Color("b7a3ca")
	help.add_theme_font_size_override("font_size",14)
	layer.add_child(help)
	for child in layer.get_children():
		if child is Control:child.theme=game_theme

func _toggle_sound() -> void:
	fx.sound_enabled=not fx.sound_enabled
	sound_button.text="Звук: вкл" if fx.sound_enabled else "Звук: выкл"
	if fx.sound_enabled:fx.tone("hover")

func _toggle_effects() -> void:
	fx.set_enabled(not fx.enabled)
	lab_stage.set_animated(fx.enabled)
	effect_button.text="Эффекты: вкл" if fx.enabled else "Эффекты: выкл"

func _toggle_lab() -> void:
	lab_enabled=not lab_enabled
	lab_button.text="Лаборатория: вкл" if lab_enabled else "Лаборатория: выкл"
	_new_game(players.size())
	if not smoke:fx.toast("95 КАРТ · 50 ОБЪЁМНЫХ ОПЫТОВ" if lab_enabled else "ИСХОДНАЯ КОЛОДА · 45 КАРТ",Color("ffe0a0"))

func _pawn_at(index: int, cell: int) -> Vector3:
	return _cell(cell)+Vector3((index-(players.size()-1)/2.0)*.45,.14,0)

func _process(delta: float) -> void:
	stage_time+=delta
	log_tick+=delta
	if log_tick>=5.0 and journal:
		journal.reset_if_due()
		log_tick=0
	if not fx or not fx.enabled:return
	if phase=="draw":
		for i in range(cards.size()):
			if not cards[i].visible:continue
			var target_y: float=card_homes[i].y+sin(stage_time*1.6+i)*.035+(.22 if hover_slot==i else 0)
			cards[i].position.y=lerpf(cards[i].position.y,target_y,minf(1,delta*12))
			cards[i].rotation.y=lerpf(cards[i].rotation.y,(-.1 if i==0 else .1 if i==2 else 0.0),minf(1,delta*8))
	if is_instance_valid(turn_halo) and not players.is_empty():
		turn_halo.position=_pawn_at(turn,int(players[turn].score))+Vector3(0,-.11,0)
		turn_halo.scale=Vector3.ONE*(1.0+sin(stage_time*3)*.08)
	if is_instance_valid(finish_halo):
		finish_halo.scale=Vector3.ONE*(1.0+sin(stage_time*2.2)*.14)
		finish_light.position.y=_cell(GOAL).y+.6+sin(stage_time*1.8)*.1

func _physics_process(_delta: float) -> void:
	if smoke or phase!="draw":return
	var pointer:=get_viewport().get_mouse_position()
	var next_hover: int=-1
	if pointer.x<890:
		var origin:=camera.project_ray_origin(pointer)
		var query:=PhysicsRayQueryParameters3D.create(origin,origin+camera.project_ray_normal(pointer)*100)
		query.collide_with_areas=true
		var hit:=get_world_3d().direct_space_state.intersect_ray(query)
		if hit and hit.collider.has_meta("slot"):
			var slot: int=int(hit.collider.get_meta("slot"))
			if slot<deck.size() and cards[slot].visible:next_hover=slot
	if hover_slot!=next_hover:
		hover_slot=next_hover
		for i in range(cards.size()):cards[i].get_node("HoverRing").visible=i==hover_slot and fx.enabled
		if hover_slot>=0:fx.tone("hover")

func _update_badges() -> void:
	for child in player_badges.get_children():
		player_badges.remove_child(child)
		child.queue_free()
	for i in range(players.size()):
		var badge:=PanelContainer.new()
		badge.add_theme_stylebox_override("panel",_style(Color("29273e"),COLORS[i] if i==turn else Color("4b4163")))
		badge.custom_minimum_size.x=155
		var label:=Label.new()
		label.text=("▶ " if i==turn else "")+str(players[i].name)+"    "+str(players[i].score)+"/15"
		label.add_theme_font_size_override("font_size",13)
		label.modulate=COLORS[i]
		badge.add_child(label)
		player_badges.add_child(badge)

func _new_game(count: int) -> void:
	if card_tween and card_tween.is_valid():card_tween.kill()
	if movement_tween and movement_tween.is_valid():movement_tween.kill()
	if is_instance_valid(victory_panel):victory_panel.queue_free()
	fx.clear_dynamic()
	for pawn in pawns:pawn.queue_free()
	pawns.clear()
	players.clear()
	for i in range(count):
		players.append({"name":"Игрок "+str(i+1),"score":0,"streak":0})
		var pawn := Node3D.new()
		add_child(pawn)
		var base := MeshInstance3D.new()
		var cylinder := CylinderMesh.new()
		cylinder.top_radius=0.17
		cylinder.bottom_radius=0.22
		cylinder.height=0.33
		base.mesh=cylinder
		base.material_override=_material(COLORS[i])
		base.position.y=0.2
		pawn.add_child(base)
		var head := MeshInstance3D.new()
		var sphere := SphereMesh.new()
		sphere.radius=0.16
		sphere.height=0.32
		sphere.radial_segments=16
		sphere.rings=8
		head.mesh=sphere
		head.material_override=_material(COLORS[i].lightened(0.14))
		head.position.y=0.5
		pawn.add_child(head)
		for side in [-1,1]:
			var eye:=MeshInstance3D.new()
			var eye_shape:=SphereMesh.new()
			eye_shape.radius=.048
			eye_shape.height=.096
			eye_shape.radial_segments=8
			eye_shape.rings=4
			eye.mesh=eye_shape
			eye.material_override=fx.glow_material(Color("f9f5ff"))
			eye.position=Vector3(side*.057,.51,.125)
			pawn.add_child(eye)
			var pupil:=MeshInstance3D.new()
			var pupil_shape:=SphereMesh.new()
			pupil_shape.radius=.022
			pupil_shape.height=.044
			pupil_shape.radial_segments=8
			pupil_shape.rings=4
			pupil.mesh=pupil_shape
			pupil.material_override=fx.glow_material(Color("25213b"))
			pupil.position=Vector3(side*.057,.51,.167)
			pawn.add_child(pupil)
		var aura: MeshInstance3D=fx.ring(Vector3(0,.045,0),COLORS[i],.23)
		pawn.add_child(aura)
		pawn.position=_cell(0)+Vector3((i-(count-1)/2.0)*.45,.14,0)
		pawns.append(pawn)
	deck=questions.duplicate(true)
	if lab_enabled:deck.append_array(experiments.duplicate(true))
	deck.shuffle()
	turn=0
	phase="draw"
	hover_slot=-1
	_reset_cards()
	_refresh()
	journal.record("New party: "+str(count)+" players")
	if not smoke:fx.toast("ЗНАНИЯ ПРИВОДЯТ В ДВИЖЕНИЕ",Color("ddd0ff"))

func _reset_cards() -> void:
	front_caption.visible=false
	lab_stage.hide_experiment()
	mascot.visible=true
	if is_instance_valid(front_viewport):front_viewport.queue_free()
	if not smoke and fx.enabled:
		phase="dealing"
		card_tween=create_tween().set_parallel()
	for i in range(cards.size()):
		var card: Node3D=cards[i]
		card.rotation=Vector3.ZERO
		card.scale=Vector3.ONE
		card.position=card_homes[i]
		card.visible=i<deck.size()
		card.get_node("BackArt").visible=true
		card.get_node("FrontArt").visible=false
		card.get_node("HoverRing").visible=false
		card.get_node("Paper").material_override=_material(Color("c7b1e6"))
		if not smoke and fx.enabled and card.visible:
			card.position=card_homes[i]+Vector3(0,.8,-1.0)
			card.scale=Vector3.ONE*.6
			card_tween.tween_property(card,"position",card_homes[i],.35).set_delay(i*.06).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
			card_tween.tween_property(card,"scale",Vector3.ONE,.32).set_delay(i*.06)
	if phase=="dealing":card_tween.chain().tween_callback(func()->void:phase="draw";_refresh())

func _refresh() -> void:
	player_label.text="В колоде "+str(deck.size())+" карт · Каждый верный ответ двигает фишку на 1–3 клетки"
	player_label.add_theme_font_size_override("font_size",12)
	_update_badges()
	progress.value=float(players[turn].score)
	response_badge.text="Серия: "+str(players[turn].streak)+" подряд" if int(players[turn].streak)>0 else "Твоя следующая маленькая победа"
	next_button.visible=phase=="feedback" or phase=="finished"
	next_button.text="Сыграть ещё" if phase=="finished" else "Забрать победу!" if int(players[turn].score)>=GOAL else "Передать ход →"
	if phase in ["draw","dealing"]:
		status.text="Ходит "+str(players[turn].name)
		question_label.text="Выбери закрытую карту на столе. Вопрос появится после переворота."
		_clear_answers()
		for i in range(mini(3,deck.size())):
			var button:=_button("Открыть карту "+str(i+1),_open_card.bind(i))
			button.disabled=phase!="draw"
			answer_box.add_child(button)
		panel.add_theme_stylebox_override("panel",_style(Color("1e2137"),Color("65548b")))
		status.modulate=Color("e5d6f4")
	_queue_web_state()

func _clear_answers() -> void:
	for child in answer_box.get_children():
		answer_box.remove_child(child)
		child.queue_free()

func _open_card(slot: int) -> void:
	if phase!="draw" or slot>=deck.size():return
	active=deck.pop_at(slot)
	phase="answer" if smoke or not fx.enabled else "opening"
	selected_card=cards[slot]
	var is_experiment: bool=str(active.get("kind",""))=="experiment"
	if is_experiment:
		lab_stage.show_experiment(active)
		mascot.visible=false
	if card_tween and card_tween.is_valid():card_tween.kill()
	for card in cards:
		card.get_node("HoverRing").visible=false
		card.visible=card==selected_card
	var art: MeshInstance3D=selected_card.get_node("BackArt")
	if not smoke:
		var front: MeshInstance3D=selected_card.get_node("FrontArt")
		var front_material:=_material(Color.WHITE)
		front_material.albedo_texture=_front_texture(active)
		front_material.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
		front.material_override=front_material
		front.visible=true
		fx.tone("card")
	if phase=="answer":
		art.visible=false
		selected_card.rotation=Vector3(.55,0,PI)
		selected_card.position=Vector3(0,1.45,.4)
		selected_card.scale=Vector3.ONE*1.55
	else:
		fx.burst(selected_card.position,Color("cab2ff"),9,.65)
		card_tween=create_tween().set_parallel()
		card_tween.tween_property(selected_card,"position",Vector3(.0,1.45,.4),.6).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		card_tween.tween_property(selected_card,"rotation:z",PI,.7).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
		card_tween.tween_property(selected_card,"rotation:x",.55,.6)
		card_tween.tween_property(selected_card,"rotation:y",0.0,.6)
		card_tween.tween_property(selected_card,"scale",Vector3.ONE*1.55,.55).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		card_tween.chain().tween_callback(_enable_answers)
	status.text="Опыт · +"+str(int(active.level))+" / −1 за ошибку" if is_experiment else "Карта на "+str(int(active.level))+(" балл" if int(active.level)==1 else " балла")
	question_label.text=(str(active.title)+"\n\n" if is_experiment else "")+str(active.prompt)
	_clear_answers()
	if active.type=="match":
		selected_pairs.resize(active.pairs.size())
		selected_pairs.fill("")
		var right: Array=active.pairs.map(func(pair: Array)->String:return str(pair[1]))
		right.shuffle()
		for i in range(active.pairs.size()):
			var label:=Label.new()
			label.text=str(active.pairs[i][0])
			label.add_theme_font_size_override("font_size",14)
			answer_box.add_child(label)
			var option:=OptionButton.new()
			option.add_item("Выбрать переход")
			for value in right:option.add_item(value)
			option.item_selected.connect(func(index: int)->void:selected_pairs[i]="" if index==0 else option.get_item_text(index))
			answer_box.add_child(option)
		answer_box.add_child(_button("Проверить переходы",_check_pairs))
	else:
		var order: Array=range(active.options.size())
		order.shuffle()
		for i in order:
			var button:=_button(str(active.options[i]),_resolve.bind(i==int(active.correct)))
			button.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
			button.custom_minimum_size.y=64
			answer_box.add_child(button)
	answer_box.add_child(_button("Пока не знаю",_resolve.bind(false)))
	for child in answer_box.get_children():
		if child is BaseButton:child.disabled=phase!="answer"
	journal.record("Card opened: "+str(active.id))
	_refresh()

func _enable_answers() -> void:
	if phase!="opening":return
	phase="answer"
	for child in answer_box.get_children():
		if child is BaseButton:child.disabled=false
	_queue_web_state()

func _queue_web_state() -> void:
	if not OS.has_feature("web") or web_state_pending:return
	web_state_pending=true
	call_deferred("_publish_web_state")

func _publish_web_state() -> void:
	await get_tree().process_frame
	web_state_pending=false
	var controls: Array=[]
	_collect_web_controls(hud,controls)
	var payload: Dictionary={"phase":phase,"turn":turn,"remaining":deck.size(),"players":players,"viewport":[get_viewport().get_visible_rect().size.x,get_viewport().get_visible_rect().size.y],"question":{"id":active.get("id",""),"type":active.get("type",""),"level":active.get("level",0)},"controls":controls}
	print("PHYSOGEZIC_STATE:"+JSON.stringify(payload))

func _collect_web_controls(node: Node, output: Array) -> void:
	if node is Button and node.is_visible_in_tree() and not node.disabled:
		var rect: Rect2=node.get_global_rect()
		output.append({"text":node.text,"rect":[rect.position.x,rect.position.y,rect.size.x,rect.size.y]})
	for child in node.get_children():_collect_web_controls(child,output)

func _input(event: InputEvent) -> void:
	if OS.has_feature("web") and ((event is InputEventMouseButton and event.pressed) or (event is InputEventKey and event.pressed)):_queue_web_state()

func _front_texture(q: Dictionary) -> ViewportTexture:
	front_viewport=SubViewport.new()
	front_viewport.size=Vector2i(1280,1792)
	front_viewport.disable_3d=true
	front_viewport.render_target_update_mode=SubViewport.UPDATE_ONCE
	add_child(front_viewport)
	var face_root:=Control.new()
	face_root.scale=Vector2.ONE*2.0
	front_viewport.add_child(face_root)
	var experiment: bool=str(q.get("kind",""))=="experiment"
	var background:=ColorRect.new()
	background.color=Color("fff7e8")
	background.size=Vector2(640,896)
	face_root.add_child(background)
	var border:=Panel.new()
	border.position=Vector2(18,18)
	border.size=Vector2(604,860)
	border.add_theme_stylebox_override("panel",_style(Color("fffaf0"),Color("b78bc3") if experiment else Color("cbb390")))
	face_root.add_child(border)
	var title:=Label.new()
	title.text=("ОПЫТ · " if experiment else "")+str(TOPICS.get(q.topic,"ФИЗИКА"))
	title.position=Vector2(44,49)
	title.add_theme_font_size_override("font_size",23 if experiment else 28)
	title.modulate=Color("86699b")
	face_root.add_child(title)
	var cost:=Label.new()
	cost.text=str(int(q.level))+" ★"
	cost.position=Vector2(490,38)
	cost.add_theme_font_size_override("font_size",53)
	cost.modulate=Color("ac78ba")
	face_root.add_child(cost)
	var text:=Label.new()
	text.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	text.add_theme_font_size_override("font_size",30 if str(q.prompt).length()>160 else 35)
	text.modulate=Color("5d4872")
	text.text=str(q.prompt)
	face_root.add_child(text)
	text.position=Vector2(46,150)
	text.size=Vector2(548,445)
	var face:=TextureRect.new()
	face.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	face.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	face.texture=load("res://assets/happy.png")
	face_root.add_child(face)
	face.position=Vector2(245,624)
	face.size=Vector2(150,170)
	var footer:=Label.new()
	footer.text="НАБЛЮДАЙ · ВЫБИРАЙ ОТВЕТ" if experiment else "ФИЗОГЭЗИК · ОТКРОЙ ЗАКОН"
	footer.position=Vector2(88,823)
	footer.add_theme_font_size_override("font_size",22)
	footer.modulate=Color("a391b1")
	face_root.add_child(footer)
	for child in face_root.get_children():
		if child is Control:child.theme=game_theme
	return front_viewport.get_texture()

func _check_pairs() -> void:
	var correct: bool=true
	for i in range(active.pairs.size()):
		if selected_pairs[i]!=active.pairs[i][1]:correct=false
	_resolve(correct)

func _resolve(correct: bool) -> void:
	if phase!="answer":return
	phase="resolving"
	_clear_answers()
	var previous: int=int(players[turn].score)
	var delta: int=int(active.level) if correct else -int(active.get("penalty",0))
	players[turn].score=clampi(previous+delta,0,GOAL)
	if correct:players[turn].streak=int(players[turn].streak)+1
	else:players[turn].streak=0
	if correct:
		status.text="Верно! +"+str(delta)+(" клетка" if delta==1 else " клетки")
	elif delta<0 and int(players[turn].score)<previous:
		status.text="Разберём опыт: −1 клетка"
	elif delta<0:
		status.text="Разберём опыт: старт не даёт уйти ниже нуля"
	else:
		status.text="Разберёмся и попробуем ещё"
	status.modulate=Color("a8ebc9") if correct else Color("ffcb9f")
	panel.add_theme_stylebox_override("panel",_style(Color("1c2c31") if correct else Color("342938"),Color("70b69b") if correct else Color("bb936d")))
	question_label.text=str(active.explanation)
	journal.record("Answer "+("correct" if correct else "incorrect")+"; player "+str(turn+1)+"; delta "+str(delta)+"; score "+str(players[turn].score))
	if not smoke:fx.answer_feedback(correct,_pawn_at(turn,previous),delta,int(players[turn].streak))
	if smoke or not fx.enabled:
		pawns[turn].position=_pawn_at(turn,int(players[turn].score))
		phase="feedback"
	elif delta!=0 and int(players[turn].score)!=previous:
		var pawn: Node3D=pawns[turn]
		var color: Color=COLORS[turn] if correct else Color("ffbd8c")
		var direction: int=1 if delta>0 else -1
		movement_tween=create_tween()
		var cell: int=previous+direction
		while cell!=int(players[turn].score)+direction:
			var target: Vector3=_pawn_at(turn,cell)
			movement_tween.tween_property(pawn,"scale",Vector3(1.15,.8,1.15),.07)
			movement_tween.tween_property(pawn,"position",target+Vector3(0,.65,0),.16).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
			movement_tween.parallel().tween_property(pawn,"scale",Vector3(.82,1.23,.82),.16)
			movement_tween.tween_property(pawn,"position",target,.17).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
			movement_tween.parallel().tween_property(pawn,"scale",Vector3(1.2,.75,1.2),.17)
			movement_tween.tween_callback(func()->void:
				fx.ripple(target, color,.8)
				fx.burst(target+Vector3(0,.2,0),color,6,.55)
				fx.tone("step"))
			movement_tween.tween_property(pawn,"scale",Vector3.ONE,.12).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
			cell+=direction
		movement_tween.tween_callback(_finish_resolution)
	else:
		movement_tween=create_tween()
		movement_tween.tween_property(selected_card,"rotation:z",PI+.09,.1)
		movement_tween.tween_property(selected_card,"rotation:z",PI-.07,.14)
		movement_tween.tween_property(selected_card,"rotation:z",PI,.16)
		movement_tween.tween_callback(_finish_resolution)
	_refresh()

func _finish_resolution() -> void:
	if phase!="resolving":return
	phase="feedback"
	_refresh()

func _next_turn() -> void:
	if phase=="finished":_new_game(players.size());return
	if phase!="feedback":return
	if int(players[turn].score)>=GOAL or deck.is_empty():
		phase="finished"
		var ranked: Array=players.duplicate(true)
		ranked.sort_custom(func(a: Dictionary,b: Dictionary)->bool:return int(a.score)>int(b.score))
		status.text="Партия завершена!"
		var winners: Array=ranked.filter(func(p: Dictionary)->bool:return int(p.score)==int(ranked[0].score))
		question_label.text="Разделённая победа!" if winners.size()>1 else str(ranked[0].name)+" впереди: "+str(ranked[0].score)+" клеток."
		_refresh()
		journal.record("Party finished")
		if not smoke:
			_show_victory(ranked,winners.size()>1)
			fx.victory(_pawn_at(turn,int(players[turn].score)))
		return
	turn=(turn+1)%players.size()
	phase="draw"
	_reset_cards()
	_refresh()
	if not smoke:fx.tone("card")

func _show_victory(ranked: Array, tied: bool) -> void:
	if is_instance_valid(victory_panel):victory_panel.queue_free()
	victory_panel=Control.new()
	victory_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.add_child(victory_panel)
	var shade:=ColorRect.new()
	shade.color=Color(0.03,.025,.08,.74)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	victory_panel.add_child(shade)
	var reward:=PanelContainer.new()
	reward.theme=game_theme
	reward.position=Vector2(300,150)
	reward.custom_minimum_size=Vector2(680,490)
	reward.add_theme_stylebox_override("panel",_style(Color("25243c"),Color("d7b56e")))
	victory_panel.add_child(reward)
	var column:=VBoxContainer.new()
	column.add_theme_constant_override("separation",16)
	reward.add_child(column)
	var stars:=Label.new()
	stars.text="★   ★   ★"
	stars.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	stars.add_theme_font_size_override("font_size",55)
	stars.modulate=Color("ffdf97")
	column.add_child(stars)
	var title:=Label.new()
	title.text="ПОБЕДИЛА ДРУЖБА!" if tied else str(ranked[0].name).to_upper()+" ПОБЕЖДАЕТ!"
	title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size",30)
	title.modulate=Color("f4e6ff")
	column.add_child(title)
	var sub:=Label.new()
	sub.text="Знания стали твоей суперсилой. Отличная партия!"
	sub.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	sub.modulate=Color("c2b2d4")
	column.add_child(sub)
	for i in range(ranked.size()):
		var result:=Label.new()
		result.text=str(i+1)+".  "+str(ranked[i].name)+"     "+str(ranked[i].score)+" / 15 клеток"
		result.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
		result.add_theme_font_size_override("font_size",21)
		result.modulate=Color("dcc6f2")
		column.add_child(result)
	column.add_child(_button("ЕЩЁ ОДНА ПАРТИЯ!",_new_game.bind(players.size())))
	column.add_child(_button("Посмотреть на стол",func()->void:victory_panel.queue_free()))
	if fx.enabled:
		reward.pivot_offset=Vector2(340,245)
		reward.scale=Vector2.ONE*.75
		reward.create_tween().tween_property(reward,"scale",Vector2.ONE,.45).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and phase=="draw":
		if event.keycode>=KEY_1 and event.keycode<=KEY_3:_open_card(event.keycode-KEY_1)
	if event is InputEventMouseButton and event.pressed and event.button_index==MOUSE_BUTTON_LEFT and phase=="draw":
		var camera:=get_viewport().get_camera_3d()
		var origin:=camera.project_ray_origin(event.position)
		var query:=PhysicsRayQueryParameters3D.create(origin,origin+camera.project_ray_normal(event.position)*100)
		query.collide_with_areas=true
		var hit:=get_world_3d().direct_space_state.intersect_ray(query)
		if hit and hit.collider.has_meta("slot"):_open_card(int(hit.collider.get_meta("slot")))

func _smoke_test() -> void:
	for symbol in [0x2605,0x25b6,0x2192]:
		var bundled: bool=GameFont.base_font.has_char(symbol)
		for fallback in GameFont.fallbacks:bundled=bundled or fallback.has_char(symbol)
		assert(bundled,"Browser symbol fallback must be bundled: "+str(symbol))
	var seen: Dictionary={}
	var turns_played: int=0
	while phase!="finished" and turns_played<45:
		_open_card(0)
		assert(not seen.has(active.id),"A card must not repeat")
		seen[active.id]=true
		var before: int=int(players[turn].score)
		var points: int=int(active.level)
		_resolve(true)
		assert(int(players[turn].score)==mini(GOAL,before+points),"Original 1–3 steps")
		_next_turn()
		turns_played+=1
	assert(phase=="finished","A full party must finish")
	print("GODOT_SMOKE_PASS: 45 cards loaded, 3D board, deck selection, turns, exact 1–3 movement; party finished in ",turns_played," turns.")
	get_tree().quit(0)

func _lab_test() -> void:
	assert(experiments.size()==50,"All 50 experiments must be available")
	var ids: Dictionary={}
	var animations: Dictionary={}
	for card: Dictionary in experiments:
		assert(not ids.has(card.id),"Experiment IDs must be unique")
		assert(not animations.has(card.anim),"Each experiment needs its own scene type")
		ids[card.id]=true
		animations[card.anim]=true
		lab_stage.show_experiment(card)
		assert(lab_stage.visible and lab_stage.specimen.get_child_count()>0,"3D scene must not be empty: "+str(card.id))
		assert(lab_stage.animated_part_count()>0,"Scene needs animated parts: "+str(card.id))
		assert(int(card.correct)==0 and card.options.size()==4,"Choice data must be complete")
		var moving_nodes: Array[Node3D]=[]
		for value: Variant in lab_stage.parts.values():moving_nodes.append(value as Node3D)
		for particle: Dictionary in lab_stage.particles:moving_nodes.append(particle.node as Node3D)
		var before_motion: Array[Transform3D]=[]
		for node: Node3D in moving_nodes:before_motion.append(node.transform)
		await get_tree().process_frame
		await get_tree().process_frame
		var moved: bool=false
		for i: int in range(moving_nodes.size()):
			if not before_motion[i].is_equal_approx(moving_nodes[i].transform):moved=true
		assert(moved,"Scene must really animate: "+str(card.id))
	lab_enabled=true
	_new_game(2)
	assert(deck.size()==95,"Laboratory must combine both banks")
	deck[0]=experiments[0].duplicate(true)
	_open_card(0)
	assert(answer_box.get_child_count()==5,"Four shuffled choices and a pass button")
	for child: Node in answer_box.get_children():
		if child is Button:
			assert(not child.text.begins_with("✓"),"Correct answer must not be revealed")
	_resolve(false)
	assert(int(players[turn].score)==0,"Experiment score cannot fall below zero")
	_next_turn()
	players[turn].score=5
	pawns[turn].position=_pawn_at(turn,5)
	deck[0]=experiments[1].duplicate(true)
	_open_card(0)
	_resolve(true)
	assert(int(players[turn].score)==5+int(active.level),"Correct experiment awards its level")
	_next_turn()
	players[turn].score=3
	pawns[turn].position=_pawn_at(turn,3)
	deck[0]=experiments[2].duplicate(true)
	_open_card(0)
	_resolve(false)
	assert(int(players[turn].score)==2,"Incorrect experiment deducts exactly one")
	_next_turn()
	var ordinary_before: int=int(players[turn].score)
	deck[0]=questions[0].duplicate(true)
	_open_card(0)
	_resolve(false)
	assert(int(players[turn].score)==ordinary_before,"Original cards never deduct points")
	print("GODOT_LAB_PASS: 50 unique animated 3D scenes, 95-card deck, hidden choices, +level, −1 and zero floor.")
	get_tree().quit(0)

func _wait_phase(expected: String, seconds: float = 8.0) -> bool:
	var deadline: int=Time.get_ticks_msec()+int(seconds*1000)
	while phase!=expected and Time.get_ticks_msec()<deadline:
		await get_tree().process_frame
	return phase==expected

func _effects_test() -> void:
	assert(await _wait_phase("draw"),"Deal animation must finish")
	_open_card(1)
	assert(phase=="opening","The printed card must flip before answering")
	var before: int=int(players[turn].score)
	_resolve(true)
	assert(int(players[turn].score)==before,"Opening animation cannot award points")
	assert(await _wait_phase("answer"),"Card flip must unlock input")
	_resolve(false)
	_next_turn()
	assert(phase=="resolving","Input must not skip feedback animation")
	assert(await _wait_phase("feedback"),"Mistake reaction must finish")
	assert(int(players[turn].score)==before,"Wrong answer never moves the token")
	_next_turn()
	assert(await _wait_phase("draw"))
	_open_card(0)
	assert(await _wait_phase("answer"))
	before=int(players[turn].score)
	var points: int=int(active.level)
	_resolve(true)
	assert(await _wait_phase("feedback"),"All jump animations must finish")
	assert(int(players[turn].score)==mini(GOAL,before+points))
	assert(pawns[turn].position.distance_to(_pawn_at(turn,int(players[turn].score)))<.01)
	_next_turn()
	assert(await _wait_phase("draw"))
	players[turn].score=14
	pawns[turn].position=_pawn_at(turn,14)
	_open_card(0)
	assert(await _wait_phase("answer"))
	_resolve(true)
	assert(await _wait_phase("feedback"))
	_next_turn()
	assert(phase=="finished" and is_instance_valid(victory_panel),"Victory is a real reward screen")
	_new_game(4)
	assert(await _wait_phase("draw"),"Restart must cancel old effects")
	assert(players.size()==4 and pawns.size()==4)
	_toggle_effects()
	_open_card(0)
	assert(phase=="answer","Reduced effects must retain the playable card")
	_resolve(true)
	assert(phase=="feedback")
	_toggle_effects()
	lab_enabled=true
	_new_game(2)
	assert(await _wait_phase("draw"))
	players[turn].score=3
	pawns[turn].position=_pawn_at(turn,3)
	deck[0]=experiments[0].duplicate(true)
	_open_card(0)
	assert(await _wait_phase("answer"))
	_resolve(false)
	assert(phase=="resolving" and int(players[turn].score)==2)
	assert(await _wait_phase("feedback"),"Penalty step must finish")
	assert(pawns[turn].position.distance_to(_pawn_at(turn,2))<.01,"Penalty must move the pawn back")
	print("GODOT_EFFECTS_PASS: deal, flip, input gates, exact jumps, victory, reduced effects and animated −1 penalty.")
	get_tree().quit(0)

func _capture() -> void:
	await _wait_phase("draw")
	var args:=OS.get_cmdline_user_args()
	if args.has("--capture-lab") or args.has("--capture-lab-wrong"):
		lab_enabled=true
		lab_button.text="Лаборатория: вкл"
		_new_game(2)
		await _wait_phase("draw")
		var wanted: String=OS.get_environment("FIZ_LAB_ANIM")
		if wanted.is_empty():wanted="prism"
		var chosen: Dictionary={}
		for card: Dictionary in experiments:
			if str(card.anim)==wanted:chosen=card.duplicate(true)
		assert(not chosen.is_empty(),"Unknown capture experiment")
		deck[0]=chosen
		_open_card(0)
		await _wait_phase("answer")
		if args.has("--capture-lab-wrong"):
			players[turn].score=5
			pawns[turn].position=_pawn_at(turn,5)
			_resolve(false)
			await _wait_phase("feedback")
			await get_tree().create_timer(.25).timeout
		else:await get_tree().create_timer(1.2).timeout
	else:
		if args.has("--capture-card") or args.has("--capture-correct") or args.has("--capture-wrong") or args.has("--capture-victory"):
			_open_card(1)
			await _wait_phase("answer")
		if args.has("--capture-correct") or args.has("--capture-wrong") or args.has("--capture-victory"):
			if args.has("--capture-victory"):
				players[turn].score=14
				pawns[turn].position=_pawn_at(turn,14)
			_resolve(not args.has("--capture-wrong"))
			if args.has("--capture-victory"):
				await _wait_phase("feedback")
				_next_turn()
				await get_tree().create_timer(.35).timeout
			else:
				await get_tree().create_timer(.25).timeout
		else:await get_tree().create_timer(.4).timeout
	var path: String=OS.get_environment("FIZ_CAPTURE")
	if not path.is_empty():
		# Физический экран может быть меньше 4K. Отдельный буфер сохраняет
		# тот же мир и интерфейс в честные 3840×2160 без масштабирования PNG.
		var capture_viewport:=SubViewport.new()
		capture_viewport.size=Vector2i(3840,2160)
		capture_viewport.size_2d_override=Vector2i(1280,720)
		capture_viewport.size_2d_override_stretch=true
		capture_viewport.world_3d=get_viewport().world_3d
		capture_viewport.msaa_3d=Viewport.MSAA_4X
		capture_viewport.render_target_update_mode=SubViewport.UPDATE_ALWAYS
		add_child(capture_viewport)
		for child: Node in get_children():
			if child!=capture_viewport and child!=front_viewport:
				child.reparent(capture_viewport,true)
		camera.make_current()
		await get_tree().process_frame
		await get_tree().process_frame
		var image:=capture_viewport.get_texture().get_image()
		assert(image.get_size()==Vector2i(3840,2160),"Capture must be real 4K")
		assert(image.save_png(path)==OK,"Screenshot must be written")
		print("GODOT_CAPTURE: ",path," · ",image.get_width(),"×",image.get_height())
	get_tree().quit(0)
