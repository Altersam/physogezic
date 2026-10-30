extends Node3D
## Cosmetic feedback. No function in this layer writes scores, cards or turns.

var enabled: bool = true
var sound_enabled: bool = true
var camera: Camera3D
var mascot: Sprite3D
var hud: CanvasLayer
var dynamic: Node3D
var dust: Array[MeshInstance3D] = []
var dust_origins: Array[Vector3] = []
var time: float = 0.0
var shake: float = 0.0
var shake_left: float = 0.0
var base_camera_offset: float = 1.9
var mascot_origin: Vector3
var mascot_tween: Tween
var mascot_busy: float = 0.0
var textures: Dictionary = {}
var sounds: Dictionary = {}
var transient_tweens: Array[Tween] = []
var audio: Array[AudioStreamPlayer] = []
var rng := RandomNumberGenerator.new()

func setup(view: Camera3D, character: Sprite3D, canvas: CanvasLayer) -> void:
	camera=view
	mascot=character
	hud=canvas
	mascot_origin=mascot.position
	base_camera_offset=camera.h_offset
	dynamic=Node3D.new()
	add_child(dynamic)
	rng.seed=28102026
	for i in range(52):
		var mote:=MeshInstance3D.new()
		var sphere:=SphereMesh.new()
		sphere.radius=rng.randf_range(0.012,0.035)
		sphere.height=sphere.radius*2
		mote.mesh=sphere
		mote.material_override=glow_material(Color("ffda9c") if i%3==0 else Color("adbbff"))
		mote.position=Vector3(rng.randf_range(-6.0,5.8),rng.randf_range(0.5,3.1),rng.randf_range(-4.5,4.3))
		dust.append(mote)
		dust_origins.append(mote.position)
		add_child(mote)

func glow_material(color: Color) -> StandardMaterial3D:
	var mat:=StandardMaterial3D.new()
	mat.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color=color
	mat.emission_enabled=true
	mat.emission=color
	mat.emission_energy_multiplier=0.4
	return mat

func halo(color: Color, radius: float) -> Sprite3D:
	var key: String=color.to_html()
	if not textures.has(key):
		var image:=Image.create(64,64,false,Image.FORMAT_RGBA8)
		for y in range(64):
			for x in range(64):
				var distance: float=Vector2(x-31.5,y-31.5).length()/32.0
				var alpha: float=pow(maxf(0.0,1.0-distance),2.2)*0.55
				image.set_pixel(x,y,Color(color.r,color.g,color.b,alpha))
		textures[key]=ImageTexture.create_from_image(image)
	var sprite:=Sprite3D.new()
	sprite.texture=textures[key]
	sprite.pixel_size=radius/32.0
	sprite.shaded=false
	sprite.no_depth_test=false
	sprite.rotation_degrees.x=-90
	return sprite

func ring(location: Vector3, color: Color, radius: float = 0.35) -> MeshInstance3D:
	var node:=MeshInstance3D.new()
	var torus:=TorusMesh.new()
	torus.inner_radius=radius
	torus.outer_radius=radius+0.025
	torus.rings=24
	torus.ring_segments=12
	node.mesh=torus
	node.material_override=glow_material(color)
	node.position=location
	return node

func _process(delta: float) -> void:
	time+=delta
	if not enabled:return
	for i in range(dust.size()):
		dust[i].position=dust_origins[i]+Vector3(sin(time*0.38+i)*0.13,sin(time*0.65+i*0.8)*0.16,cos(time*0.31+i)*0.11)
		var pulse: float=0.6+sin(time*1.2+i)*0.35
		dust[i].scale=Vector3.ONE*pulse
	mascot_busy=maxf(0.0,mascot_busy-delta)
	if mascot_busy<=0 and is_instance_valid(mascot):
		mascot.position=mascot_origin+Vector3(0,sin(time*1.7)*0.065,0)
		mascot.scale=Vector3(1.0+sin(time*1.7)*0.012,1.0+sin(time*1.7)*0.02,1.0)
	if shake_left>0:
		shake_left=maxf(0,shake_left-delta)
		camera.h_offset=base_camera_offset+sin(time*87)*shake*shake_left
		camera.v_offset=cos(time*69)*shake*shake_left*0.6
	elif is_instance_valid(camera):
		camera.h_offset=base_camera_offset
		camera.v_offset=0.0

func set_enabled(value: bool) -> void:
	enabled=value
	for mote in dust:mote.visible=value
	if not value:
		clear_dynamic()
		camera.h_offset=base_camera_offset
		camera.v_offset=0
		mascot.position=mascot_origin
		mascot.scale=Vector3.ONE

func clear_dynamic() -> void:
	for tween in transient_tweens:
		if tween and tween.is_valid():tween.kill()
	transient_tweens.clear()
	if mascot_tween and mascot_tween.is_valid():mascot_tween.kill()
	mascot_busy=0
	if is_instance_valid(dynamic):
		for node in dynamic.get_children():node.queue_free()
	for node in hud.get_children():
		if node.has_meta("game_effect"):node.queue_free()
	for player in audio:
		if is_instance_valid(player):player.queue_free()
	audio.clear()

func _remember(tween: Tween) -> Tween:
	transient_tweens=transient_tweens.filter(func(t: Tween)->bool:return t and t.is_valid())
	transient_tweens.append(tween)
	return tween

func burst(location: Vector3, color: Color, amount: int = 14, power: float = 1.0) -> void:
	if not enabled:return
	for i in range(mini(amount,40)):
		var spark:=MeshInstance3D.new()
		var shape:=SphereMesh.new()
		shape.radius=rng.randf_range(0.025,0.065)
		shape.height=shape.radius*2
		spark.mesh=shape
		spark.material_override=glow_material(color.lightened(rng.randf_range(0,.25)))
		spark.position=location
		dynamic.add_child(spark)
		var direction:=Vector3(rng.randf_range(-1,1),rng.randf_range(.3,1.2),rng.randf_range(-1,1)).normalized()*power
		var target: Vector3=location+direction
		var tween:=_remember(create_tween().set_parallel())
		tween.tween_property(spark,"position",target,0.42).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.tween_property(spark,"scale",Vector3.ONE*0.05,0.62).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tween.chain().tween_callback(spark.queue_free)

func ripple(location: Vector3, color: Color, power: float = 1.0) -> void:
	if not enabled:return
	var circle:=ring(location+Vector3(0,.04,0),color,.15)
	dynamic.add_child(circle)
	var tween:=_remember(create_tween())
	tween.tween_property(circle,"scale",Vector3.ONE*(3.8*power),.55).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(circle,"scale",Vector3.ONE*.01,.18)
	tween.tween_callback(circle.queue_free)

func floating_text(text: String, location: Vector3, color: Color) -> void:
	if not enabled:return
	var label:=Label3D.new()
	label.text=text
	label.billboard=BaseMaterial3D.BILLBOARD_ENABLED
	label.font_size=54
	label.outline_size=6
	label.pixel_size=.008
	label.modulate=color
	label.no_depth_test=true
	label.position=location
	dynamic.add_child(label)
	var tween:=_remember(create_tween().set_parallel())
	tween.tween_property(label,"position",location+Vector3(0,1.5,0),1.15).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(label,"modulate:a",0.0,.5).set_delay(.65)
	tween.chain().tween_callback(label.queue_free)

func mascot_reaction(happy: bool) -> void:
	if not enabled:return
	if mascot_tween and mascot_tween.is_valid():mascot_tween.kill()
	mascot_busy=1.1
	mascot_tween=create_tween()
	if happy:
		mascot_tween.tween_property(mascot,"position",mascot_origin+Vector3(0,.5,0),.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		mascot_tween.parallel().tween_property(mascot,"scale",Vector3(.85,1.18,1),.18)
		mascot_tween.tween_property(mascot,"position",mascot_origin,.27).set_trans(Tween.TRANS_BOUNCE)
	else:
		mascot_tween.tween_property(mascot,"rotation:z",.12,.12)
		mascot_tween.tween_property(mascot,"rotation:z",-.1,.14)
		mascot_tween.tween_property(mascot,"rotation:z",0,.18)
	mascot_tween.tween_property(mascot,"scale",Vector3.ONE,.2)

func toast(text: String, color: Color = Color("ffe19c")) -> void:
	if not enabled:return
	var label:=Label.new()
	label.set_meta("game_effect",true)
	label.text=text
	label.position=Vector2(170,105)
	label.size=Vector2(570,70)
	label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment=VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size",32)
	label.add_theme_color_override("font_color",color)
	label.add_theme_color_override("font_shadow_color",Color("211633"))
	label.add_theme_constant_override("shadow_offset_y",4)
	label.pivot_offset=Vector2(285,35)
	label.scale=Vector2.ONE*.65
	hud.add_child(label)
	var tween:=_remember(create_tween())
	tween.tween_property(label,"scale",Vector2.ONE,.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_interval(.75)
	tween.tween_property(label,"modulate:a",0.0,.35)
	tween.tween_callback(label.queue_free)

func confetti(amount: int = 75) -> void:
	if not enabled:return
	var colors: Array[Color]=[Color("ffd788"),Color("a994f3"),Color("8ae6cb"),Color("f49ebf"),Color("9ad9ff")]
	for i in range(mini(amount,110)):
		var piece:=ColorRect.new()
		piece.set_meta("game_effect",true)
		piece.mouse_filter=Control.MOUSE_FILTER_IGNORE
		piece.color=colors[i%colors.size()]
		piece.size=Vector2(rng.randf_range(5,10),rng.randf_range(8,17))
		piece.position=Vector2(rng.randf_range(50,1200),-30-rng.randf_range(0,250))
		piece.rotation=rng.randf_range(-PI,PI)
		hud.add_child(piece)
		var tween:=_remember(create_tween().set_parallel())
		var duration: float=rng.randf_range(1.8,3.5)
		tween.tween_property(piece,"position",piece.position+Vector2(rng.randf_range(-160,160),1100),duration).set_delay(i*.006)
		tween.tween_property(piece,"rotation",piece.rotation+rng.randf_range(-8,8),duration)
		tween.chain().tween_callback(piece.queue_free)

func answer_feedback(correct: bool, cell: Vector3, points: int, combo: int) -> void:
	tone("correct" if correct else "wrong")
	if not enabled:return
	mascot_reaction(correct)
	if correct:
		burst(cell+Vector3(0,.4,0),Color("a4f2ce"),18,1.2)
		ripple(cell,Color("98efc7"),1.2)
		floating_text("+"+str(points)+" КЛЕТКИ",cell+Vector3(0,.6,0),Color("baffdc"))
		toast("СЕРИЯ ×"+str(combo)+"!" if combo>=3 else "ЕСТЬ КОНТАКТ!",Color("aaf4d2"))
		if combo>=3:confetti(22)
		shake=.12
		shake_left=.18
	else:
		ripple(cell,Color("ffbf8c"),.8)
		toast("РАЗБЕРЁМСЯ И ПОПРОБУЕМ ЕЩЁ",Color("ffd4aa"))

func victory(location: Vector3) -> void:
	tone("victory")
	if not enabled:return
	confetti(100)
	burst(location+Vector3(0,.4,0),Color("ffdf8a"),36,2.3)
	ripple(location,Color("ffdf8a"),2.5)
	floating_text("ПОБЕДА!",location+Vector3(0,.7,0),Color("ffe4a5"))
	mascot_reaction(true)

func tone(kind: String) -> void:
	if not sound_enabled or DisplayServer.get_name()=="headless":return
	if not sounds.has(kind):sounds[kind]=_make_sound(kind)
	# A finished voice is a freed Object, so do not pass it into a typed lambda.
	for i in range(audio.size()-1,-1,-1):
		if not is_instance_valid(audio[i]):audio.remove_at(i)
	if audio.size()>=8:audio.pop_front().queue_free()
	var player:=AudioStreamPlayer.new()
	player.stream=sounds[kind]
	player.volume_db=-18
	add_child(player)
	audio.append(player)
	player.finished.connect(player.queue_free)
	player.play()

func _make_sound(kind: String) -> AudioStreamWAV:
	var notes: Array=[523.25,659.25,783.99]
	var length: float=.1
	if kind=="hover":notes=[660.0];length=.035
	elif kind=="card":notes=[390.0,520.0];length=.075
	elif kind=="step":notes=[880.0];length=.065
	elif kind=="wrong":notes=[330.0,293.66];length=.13
	elif kind=="victory":notes=[523.25,659.25,783.99,1046.5,783.99,1046.5];length=.14
	var rate: int=22050
	var frames: int=int(rate*length*notes.size())
	var bytes:=PackedByteArray()
	bytes.resize(frames*2)
	for frame in range(frames):
		var t: float=float(frame)/rate
		var index: int=mini(notes.size()-1,int(t/length))
		var local: float=fmod(t,length)/length
		var envelope: float=minf(1.0,local*18)*pow(1.0-local,1.5)
		var wave: float=sin(TAU*float(notes[index])*t)*.7+sin(TAU*float(notes[index])*t*2)*.12
		bytes.encode_s16(frame*2,int(wave*envelope*14000))
	var stream:=AudioStreamWAV.new()
	stream.format=AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate=rate
	stream.data=bytes
	return stream
