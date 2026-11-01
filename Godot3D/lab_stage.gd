extends Node3D
## Пятьдесят наглядных объёмных установок. Компонент не знает правильный ответ
## и не меняет игровые правила: он только показывает явление и его движение.

const INK: Color = Color("171b31")
const BRASS: Color = Color("d7b46a")
const CYAN: Color = Color("78d9ee")
const ORANGE: Color = Color("ffad68")
const RED: Color = Color("f27685")
const BLUE: Color = Color("6f9ff5")
const GREEN: Color = Color("86e2bd")
const VIOLET: Color = Color("b59aef")
const WHITE: Color = Color("f3efff")
const TOPIC_COLORS: Dictionary = {
	"mechanics": Color("79c9ee"), "heat": Color("ffad68"),
	"electricity": Color("f3d67c"), "optics": Color("bd9df3"),
	"quantum": Color("ef91c2")
}

var specimen: Node3D
var plaque: Label3D
var game_font: Font
var current_anim: String = ""
var animated: bool = true
var time: float = 0.0
var parts: Dictionary = {}
var particles: Array[Dictionary] = []
var accent: Color = CYAN

func _ready() -> void:
	_build_stand()

func _material(color: Color, metallic: float = 0.05, roughness: float = 0.38, glow: float = 0.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.metallic = metallic
	mat.roughness = roughness
	if color.a < 0.99:
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	if glow > 0.0:
		mat.emission_enabled = true
		mat.emission = Color(color.r, color.g, color.b)
		mat.emission_energy_multiplier = glow
	return mat

func _mesh(mesh: Mesh, location: Vector3, color: Color, parent: Node3D = null, metallic: float = 0.05, glow: float = 0.0) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position = location
	node.material_override = _material(color, metallic, 0.32, glow)
	(parent if parent != null else specimen).add_child(node)
	return node

func _box(size: Vector3, location: Vector3, color: Color, parent: Node3D = null, glow: float = 0.0) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	return _mesh(mesh, location, color, parent, 0.12, glow)

func _sphere(radius: float, location: Vector3, color: Color, parent: Node3D = null, glow: float = 0.0) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 32
	mesh.rings = 16
	return _mesh(mesh, location, color, parent, 0.12, glow)

func _cylinder(radius: float, height: float, location: Vector3, color: Color, parent: Node3D = null, glow: float = 0.0) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 32
	return _mesh(mesh, location, color, parent, 0.35, glow)

func _rod(a: Vector3, b: Vector3, radius: float, color: Color, parent: Node3D = null, glow: float = 0.0) -> MeshInstance3D:
	var direction: Vector3 = b - a
	var node := _cylinder(radius, direction.length(), (a + b) * 0.5, color, parent, glow)
	node.quaternion = Quaternion(Vector3.UP, direction.normalized())
	return node

func _ring(radius: float, location: Vector3, color: Color, parent: Node3D = null, vertical: bool = false, glow: float = 0.3) -> MeshInstance3D:
	var mesh := TorusMesh.new()
	mesh.inner_radius = radius - 0.025
	mesh.outer_radius = radius + 0.025
	mesh.rings = 48
	mesh.ring_segments = 10
	var node := _mesh(mesh, location, color, parent, 0.5, glow)
	if vertical:
		node.rotation_degrees.x = 90.0
	return node

func _arrow(a: Vector3, b: Vector3, color: Color, parent: Node3D = null) -> Node3D:
	var root := Node3D.new()
	(parent if parent != null else specimen).add_child(root)
	var tip: Vector3 = a.lerp(b, 0.8)
	_rod(a, tip, 0.025, color, root, 0.7)
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.0
	mesh.bottom_radius = 0.1
	mesh.height = 0.28
	mesh.radial_segments = 24
	var head := _mesh(mesh, b - (b - a).normalized() * 0.12, color, root, 0.1, 0.7)
	head.quaternion = Quaternion(Vector3.UP, (b - a).normalized())
	return root

func _label(text: String, location: Vector3, color: Color = WHITE, font_size: int = 34, parent: Node3D = null) -> Label3D:
	var label := Label3D.new()
	if game_font != null:label.font=game_font
	label.text = text
	label.font_size = font_size
	label.pixel_size = 0.007
	label.modulate = color
	label.outline_size = 5
	label.outline_modulate = Color("202038")
	label.position = location
	(parent if parent != null else specimen).add_child(label)
	return label

func _particle(kind: String, node: Node3D, speed: float = 1.0, phase: float = 0.0) -> void:
	particles.append({"kind": kind, "node": node, "origin": node.position, "speed": speed, "phase": phase})

func _remember(key: String, node: Node3D) -> Node3D:
	parts[key] = node
	return node

func _glow(key: String, energy: float) -> void:
	if not parts.has(key):
		return
	var node: MeshInstance3D = parts[key] as MeshInstance3D
	if node != null:
		var mat: StandardMaterial3D = node.material_override as StandardMaterial3D
		if mat != null:
			mat.emission_energy_multiplier = energy

func _build_stand() -> void:
	visible = false
	specimen = Node3D.new()
	specimen.name = "AnimatedExperiment"
	add_child(specimen)
	_box(Vector3(5.0, 0.22, 2.8), Vector3(0, 0.08, 0), Color("252941"), self)
	_box(Vector3(4.78, 0.06, 2.58), Vector3(0, 0.22, 0), Color("353a58"), self)
	for side: float in [-1.0, 1.0]:
		_rod(Vector3(-2.25, 0.28, side * 1.12), Vector3(2.25, 0.28, side * 1.12), 0.025, BRASS, self)
		for x: float in [-2.25, 2.25]:
			_sphere(0.07, Vector3(x, 0.28, side * 1.12), BRASS, self)
	var name_plate := _box(Vector3(4.2, 0.5, 0.06), Vector3(0, 0.24, 1.4), Color("1b2037"), self)
	name_plate.rotation_degrees.x = -12.0
	plaque = Label3D.new()
	if game_font != null:plaque.font=game_font
	plaque.font_size = 42
	plaque.pixel_size = 0.0065
	plaque.outline_size = 5
	plaque.modulate = WHITE
	plaque.position = Vector3(0, 0.32, 1.46)
	plaque.rotation_degrees.x = -12.0
	add_child(plaque)
	var light := OmniLight3D.new()
	light.position = Vector3(0, 4.0, 1.5)
	light.light_color = Color("d6d3ff")
	light.light_energy = 1.5
	light.omni_range = 7.0
	add_child(light)

func show_experiment(card: Dictionary) -> void:
	clear_experiment()
	current_anim = str(card.get("anim", ""))
	accent = TOPIC_COLORS.get(str(card.get("topic", "mechanics")), CYAN)
	plaque.text = str(card.get("title", "Лабораторный опыт"))
	plaque.modulate = accent
	visible = true
	_build_experiment(current_anim)

func clear_experiment() -> void:
	for child: Node in specimen.get_children():
		specimen.remove_child(child)
		child.queue_free()
	parts.clear()
	particles.clear()
	time = 0.0

func hide_experiment() -> void:
	visible = false
	clear_experiment()
	current_anim = ""

func set_animated(value: bool) -> void:
	animated = value

func animated_part_count() -> int:
	return parts.size() + particles.size()

func _build_experiment(anim: String) -> void:
	match anim:
		"pendulum":
			_rod(Vector3(-1.25, 0.3, 0), Vector3(-1.25, 2.8, 0), 0.07, BRASS)
			_rod(Vector3(-1.25, 2.8, 0), Vector3(1.25, 2.8, 0), 0.07, BRASS)
			var pivot := Node3D.new()
			specimen.add_child(pivot)
			pivot.position = Vector3(0, 2.75, 0)
			_rod(Vector3.ZERO, Vector3(0, -1.75, 0), 0.018, WHITE, pivot)
			_sphere(0.25, Vector3(0, -1.8, 0), VIOLET, pivot, 0.15)
			_remember("pivot", pivot)
			_ring(1.05, Vector3(0, 1.0, -0.1), Color(0.5, 0.55, 0.8, 0.28), null, true, 0.0)
			_label("l", Vector3(0.25, 1.85, 0), WHITE)
		"freefall":
			_rod(Vector3(-1.55, 0.3, 0), Vector3(-1.55, 2.75, 0), 0.055, BRASS)
			_rod(Vector3(-1.55, 2.65, 0), Vector3(1.55, 2.65, 0), 0.05, BRASS)
			_box(Vector3(3.6, 0.12, 1.2), Vector3(0, 0.35, 0), Color("48516a"))
			_remember("heavy", _sphere(0.31, Vector3(-0.65, 2.3, 0), ORANGE))
			_remember("light", _sphere(0.19, Vector3(0.7, 2.3, 0), CYAN))
			for i: int in range(6):
				_box(Vector3(0.16 if i % 5 == 0 else 0.09, 0.012, 0.02), Vector3(1.7, 0.5 + i * 0.36, 0), WHITE)
			_label("m", Vector3(-0.65, 2.78, 0), ORANGE)
			_label("m/2", Vector3(0.7, 2.78, 0), CYAN)
		"incline":
			var ramp := _box(Vector3(3.6, 0.16, 1.15), Vector3(0, 1.15, 0), Color("687492"))
			ramp.rotation_degrees.z = 25.0
			_box(Vector3(0.2, 1.9, 1.25), Vector3(1.55, 0.95, 0), Color("3e465e"))
			_remember("ball", _sphere(0.27, Vector3(-1.35, 2.0, 0), ORANGE, null, 0.2))
			_arrow(Vector3(-0.9, 2.5, 0), Vector3(0.1, 2.05, 0), accent)
			_label("h", Vector3(1.9, 1.55, 0), WHITE)
		"spring":
			_box(Vector3(2.4, 0.16, 1.1), Vector3(0, 2.85, 0), Color("48516a"))
			_rod(Vector3(-1.0, 0.3, 0), Vector3(-1.0, 2.85, 0), 0.06, BRASS)
			var spring := Node3D.new()
			specimen.add_child(spring)
			for i: int in range(13):
				_ring(0.25, Vector3(0, 2.65 - i * 0.12, 0), Color("d5d9e8"), spring, false, 0.0)
			_remember("spring", spring)
			_remember("bob", _cylinder(0.35, 0.45, Vector3(0, 0.85, 0), VIOLET))
			_rod(Vector3(0.75, 0.45, 0), Vector3(0.75, 1.25, 0), 0.018, WHITE)
			_label("равновесие", Vector3(1.4, 0.86, 0), CYAN, 26)
		"lever":
			var support := _cylinder(0.42, 0.75, Vector3(-0.25, 0.65, 0), BRASS)
			support.scale.z = 0.65
			var beam := Node3D.new()
			specimen.add_child(beam)
			beam.position = Vector3(-0.25, 1.1, 0)
			_box(Vector3(3.8, 0.13, 0.45), Vector3.ZERO, Color("9ca8bd"), beam)
			_box(Vector3(0.65, 0.6, 0.65), Vector3(-1.25, 0.38, 0), ORANGE, beam)
			_box(Vector3(0.4, 0.35, 0.4), Vector3(1.35, 0.25, 0), CYAN, beam)
			_remember("beam", beam)
			_label("F₁", Vector3(-1.5, 2.05, 0), ORANGE)
			_label("F₂", Vector3(1.1, 1.9, 0), CYAN)
		"pulley":
			_rod(Vector3(-1.3, 0.3, 0), Vector3(-1.3, 2.85, 0), 0.06, BRASS)
			_rod(Vector3(-1.3, 2.75, 0), Vector3(1.2, 2.75, 0), 0.06, BRASS)
			_ring(0.43, Vector3(0, 2.1, 0), Color("c6cfdd"), null, true, 0.0)
			_cylinder(0.11, 0.3, Vector3(0, 2.1, 0), BRASS).rotation_degrees.x = 90
			_rod(Vector3(-0.43, 0.9, 0), Vector3(-0.43, 2.65, 0), 0.018, WHITE)
			_rod(Vector3(0.43, 0.9, 0), Vector3(0.43, 2.65, 0), 0.018, WHITE)
			_remember("load", _box(Vector3(0.9, 0.65, 0.75), Vector3(0, 0.75, 0), VIOLET))
			_arrow(Vector3(0.45, 2.2, 0.4), Vector3(0.45, 2.65, 0.4), accent)
		"collision":
			_box(Vector3(4.3, 0.12, 1.1), Vector3(0, 0.35, 0), Color("46516b"))
			for x: float in [-1.7, 1.7]:
				_rod(Vector3(x, 0.43, -0.55), Vector3(x, 0.43, 0.55), 0.025, BRASS)
			for key: String in ["a", "b"]:
				var cart := Node3D.new()
				specimen.add_child(cart)
				_box(Vector3(0.85, 0.35, 0.75), Vector3(0, 0.72, 0), ORANGE if key == "a" else CYAN, cart)
				for x: float in [-0.28, 0.28]:
					for z: float in [-0.32, 0.32]:
						_sphere(0.12, Vector3(x, 0.48, z), INK, cart)
				_remember(key, cart)
			_arrow(Vector3(-1.3, 1.45, 0), Vector3(-0.45, 1.45, 0), ORANGE)
		"friction":
			_box(Vector3(4.25, 0.24, 1.65), Vector3(0, 0.38, 0), Color("756556"))
			for i: int in range(26):
				_box(Vector3(0.035, 0.02, 1.5), Vector3(-2.0 + i * 0.16, 0.51, 0), Color("94806a"))
			_remember("block", _box(Vector3(0.85, 0.65, 0.8), Vector3(-0.65, 0.85, 0), VIOLET))
			_remember("force", _arrow(Vector3(-0.1, 1.35, 0), Vector3(1.1, 1.35, 0), CYAN))
			_arrow(Vector3(-0.8, 0.57, 0.6), Vector3(-1.6, 0.57, 0.6), ORANGE)
		"pressure":
			_box(Vector3(4.4, 0.22, 2.0), Vector3(0, 0.34, 0), Color("b99964"))
			for i: int in range(38):
				var x: float = -2.0 + float(i % 10) * 0.43
				var z: float = -0.8 + float(i / 10) * 0.45
				_sphere(0.035, Vector3(x, 0.47, z), Color("ddc18b"))
			_box(Vector3(0.45, 0.12, 0.9), Vector3(-1.0, 0.51, 0), Color("677790"))
			_box(Vector3(1.35, 0.12, 0.9), Vector3(0.95, 0.59, 0), Color("677790"))
			_remember("left_weight", _box(Vector3(0.55, 0.65, 0.55), Vector3(-1.0, 0.95, 0), ORANGE))
			_remember("right_weight", _box(Vector3(0.55, 0.65, 0.55), Vector3(0.95, 1.12, 0), ORANGE))
			_label("S", Vector3(-1.0, 0.35, 1.0), WHITE)
			_label("3S", Vector3(0.95, 0.35, 1.0), WHITE)
		"floating":
			_cylinder(1.45, 1.8, Vector3(0, 1.18, 0), Color(0.5, 0.75, 0.95, 0.16))
			_cylinder(1.37, 0.85, Vector3(0, 0.76, 0), Color(0.18, 0.55, 0.82, 0.58), null, 0.15)
			_ring(1.4, Vector3(0, 2.08, 0), Color("bceafa"), null, false, 0.2)
			_remember("wood", _box(Vector3(1.1, 0.42, 0.75), Vector3(0, 1.28, 0), Color("bd8b56")))
			_arrow(Vector3(0, 1.6, 0.5), Vector3(0, 2.35, 0.5), CYAN)
			_arrow(Vector3(0, 1.15, -0.5), Vector3(0, 0.55, -0.5), ORANGE)
		"boiling", "convection", "steam":
			_cylinder(0.85, 1.75, Vector3(0, 1.25, 0), Color(0.65, 0.86, 1.0, 0.17))
			_cylinder(0.79, 1.05, Vector3(0, 0.91, 0), Color(0.15, 0.55, 0.82, 0.68), null, 0.12)
			_ring(0.84, Vector3(0, 2.12, 0), Color("d5edfa"))
			_box(Vector3(1.8, 0.18, 1.45), Vector3(0, 0.34, 0), Color("4b4350"))
			_remember("heater", _ring(0.55, Vector3(0, 0.45, 0), ORANGE, null, false, 1.5))
			if anim == "steam":
				_rod(Vector3(0, 1.8, 0), Vector3(0, 2.55, 0), 0.28, Color(0.6, 0.8, 1.0, 0.25))
				_remember("cork", _cylinder(0.24, 0.36, Vector3(0, 2.55, 0), Color("ad835b")))
			for i: int in range(18):
				var p := _sphere(0.045 + float(i % 3) * 0.018, Vector3(sin(i * 2.1) * 0.58, 0.55 + float(i % 8) * 0.19, cos(i * 1.7) * 0.45), CYAN if anim == "convection" else WHITE, null, 0.5)
				_particle("current" if anim == "convection" else "bubble", p, 0.55 + float(i % 4) * 0.12, float(i) * 0.37)
			for i: int in range(7):
				var steam := _sphere(0.07, Vector3(sin(i) * 0.25, 2.1 + float(i % 4) * 0.2, 0), Color(0.85, 0.9, 1.0, 0.55), null, 0.25)
				_particle("steam", steam, 0.3, float(i))
		"melting":
			_cylinder(1.35, 0.12, Vector3(0, 0.38, 0), Color("a8b9cf"))
			_remember("water", _cylinder(1.1, 0.08, Vector3(0, 0.49, 0), Color(0.25, 0.65, 0.9, 0.55)))
			for i: int in range(5):
				var cube := _box(Vector3(0.58, 0.55, 0.55), Vector3(-0.65 + float(i % 3) * 0.62, 0.82 + float(i / 3) * 0.35, 0), Color(0.7, 0.9, 1.0, 0.7))
				cube.rotation.y = i * 0.4
				_remember("ice" + str(i), cube)
			_label("0 °C", Vector3(1.55, 1.05, 0), CYAN, 42)
		"evaporation":
			_remember("puddle", _cylinder(1.4, 0.035, Vector3(0, 0.29, 0), Color(0.2, 0.6, 0.9, 0.6)))
			for i: int in range(13):
				var vapor := _sphere(0.055, Vector3(sin(i) * 0.9, 0.5 + float(i % 5) * 0.28, cos(i) * 0.4), Color(0.7, 0.9, 1.0, 0.55), null, 0.25)
				_particle("wind", vapor, 0.55, float(i) * 0.6)
			for y: float in [1.0, 1.55, 2.1]:
				_arrow(Vector3(-1.7, y, -0.5), Vector3(1.65, y, -0.5), Color(0.65, 0.8, 1.0, 0.65))
		"condensation":
			_cylinder(0.8, 1.8, Vector3(0, 1.25, 0), Color(0.65, 0.9, 1.0, 0.2))
			_cylinder(0.73, 1.1, Vector3(0, 0.95, 0), Color(0.18, 0.55, 0.8, 0.65))
			_ring(0.8, Vector3(0, 2.15, 0), WHITE)
			for i: int in range(12):
				var drop := _sphere(0.055 + float(i % 3) * 0.02, Vector3(sin(i * 1.9) * 0.79, 0.75 + float(i % 7) * 0.19, cos(i * 1.9) * 0.79), CYAN, null, 0.4)
				_particle("drop", drop, 0.15, float(i) * 0.5)
			for i: int in range(4):
				_box(Vector3(0.35, 0.35, 0.35), Vector3(-0.4 + i * 0.26, 1.55 + (i % 2) * 0.22, 0), Color(0.75, 0.92, 1.0, 0.75))
			_label("холодная стенка", Vector3(1.55, 1.7, 0), CYAN, 25)
		"conduction":
			_cylinder(0.9, 1.35, Vector3(-0.8, 1.0, 0), Color(0.6, 0.85, 1.0, 0.2))
			_cylinder(0.83, 0.8, Vector3(-0.8, 0.75, 0), Color(0.7, 0.25, 0.12, 0.8))
			_remember("spoon", _rod(Vector3(-0.8, 0.65, 0), Vector3(0.85, 2.4, 0), 0.07, Color("b8c3d4")))
			_sphere(0.22, Vector3(-0.9, 0.55, 0), Color("d5dce7")).scale = Vector3(1, 1.6, 0.45)
			for i: int in range(8):
				var pulse := _sphere(0.05, Vector3(-0.8, 0.7, 0), ORANGE, null, 1.2)
				_particle("heat", pulse, 0.35, float(i) / 8.0)
		"radiation":
			_remember("sun", _sphere(0.68, Vector3(-1.45, 1.55, 0), Color("ffd46f"), null, 2.0))
			_remember("earth", _sphere(0.48, Vector3(1.5, 1.55, 0), BLUE, null, 0.25))
			for i: int in range(7):
				var ray := _sphere(0.06, Vector3(-0.8, 1.55, 0), ORANGE, null, 1.5)
				_particle("sunray", ray, 0.4, float(i) / 7.0)
			_label("вакуум", Vector3(0, 0.55, 0), VIOLET, 28)
		"diffusion":
			_cylinder(1.25, 1.9, Vector3(0, 1.25, 0), Color(0.6, 0.85, 1.0, 0.16))
			_cylinder(1.17, 1.35, Vector3(0, 0.98, 0), Color(0.16, 0.5, 0.78, 0.48))
			_ring(1.25, Vector3(0, 2.2, 0), WHITE)
			for i: int in range(30):
				var ink := _sphere(0.045, Vector3(0, 1.9, 0), VIOLET, null, 0.4)
				_particle("ink", ink, 0.3, float(i) * 0.63)
		"expansion":
			_rod(Vector3(-1.45, 0.3, 0), Vector3(-1.45, 1.75, 0), 0.05, BRASS)
			_ring(0.61, Vector3(0, 1.45, 0), Color("c5cfdd"), null, true, 0.0)
			_remember("metal_ball", _sphere(0.5, Vector3(0, 1.45, 0), Color("8798b2"), null, 0.15))
			for i: int in range(7):
				var flame := _sphere(0.1, Vector3(-0.65 + i * 0.21, 0.55, 0), ORANGE, null, 1.2)
				_particle("flame", flame, 1.0, float(i))
			_box(Vector3(2.0, 0.16, 1.0), Vector3(0, 0.33, 0), Color("494353"))
		_:
			_build_secondary(anim)

func _build_secondary(anim: String) -> void:
	match anim:
		"circuit", "series", "parallel", "conductor":
			_build_circuit(anim)
		"electromagnet", "coil":
			_rod(Vector3(-1.2, 1.35, 0), Vector3(1.2, 1.35, 0), 0.18, Color("68788e"))
			for i: int in range(12):
				var loop := _ring(0.38, Vector3(-1.05 + i * 0.19, 1.35, 0), Color("d58b52"), null, true, 0.25 if anim == "coil" else 0.0)
				loop.rotation_degrees.z = 90.0
			_box(Vector3(0.7, 0.55, 0.7), Vector3(-1.7, 0.63, 0), Color("46516b"))
			_rod(Vector3(-1.7, 0.9, 0), Vector3(-1.1, 1.2, 0), 0.025, RED)
			_rod(Vector3(1.1, 1.2, 0), Vector3(1.7, 0.6, 0), 0.025, BLUE)
			if anim == "electromagnet":
				for i: int in range(9):
					var clip := _ring(0.09, Vector3(-0.8 + float(i % 5) * 0.38, 0.45 + float(i / 5) * 0.16, 0.65), Color("d9e0ec"), null, true, 0.0)
					clip.scale = Vector3(0.55, 1.3, 1)
					_particle("clip", clip, 0.6, float(i))
				_arrow(Vector3(-1.7, 2.1, 0), Vector3(1.6, 2.1, 0), accent)
			else:
				for i: int in range(12):
					var spark := _sphere(0.045, Vector3(-1.0 + float(i % 6) * 0.4, 1.0 + float(i / 6) * 0.65, 0.4), ORANGE, null, 1.3)
					_particle("spark", spark, 1.0, float(i))
		"magnet":
			for side: float in [-1.0, 1.0]:
				var magnet := Node3D.new()
				specimen.add_child(magnet)
				magnet.position = Vector3(side * 1.15, 1.0, 0)
				_box(Vector3(0.75, 0.5, 0.65), Vector3(-side * 0.37, 0, 0), BLUE, magnet)
				_box(Vector3(0.75, 0.5, 0.65), Vector3(side * 0.37, 0, 0), RED, magnet)
				_label("N", Vector3(side * 0.38, 0.36, 0), WHITE, 30, magnet)
				_label("S", Vector3(-side * 0.38, 0.36, 0), WHITE, 30, magnet)
				_remember("left" if side < 0 else "right", magnet)
			_arrow(Vector3(-0.35, 1.75, 0), Vector3(-0.8, 1.75, 0), RED)
			_arrow(Vector3(0.35, 1.75, 0), Vector3(0.8, 1.75, 0), RED)
		"electroscope":
			_cylinder(0.85, 1.75, Vector3(0, 1.15, 0), Color(0.6, 0.8, 1.0, 0.13))
			_rod(Vector3(0, 0.55, 0), Vector3(0, 2.35, 0), 0.045, BRASS)
			_sphere(0.2, Vector3(0, 2.35, 0), BRASS)
			for side: float in [-1.0, 1.0]:
				var leaf := Node3D.new()
				specimen.add_child(leaf)
				leaf.position = Vector3(0, 1.35, 0)
				_box(Vector3(0.055, 0.9, 0.18), Vector3(0, -0.42, 0), Color("ead68c"), leaf, 0.15)
				_remember("leaf_l" if side < 0 else "leaf_r", leaf)
			_rod(Vector3(-1.35, 2.45, 0), Vector3(-0.35, 2.45, 0), 0.1, VIOLET)
			for i: int in range(5):
				_label("+", Vector3(-1.25 + i * 0.23, 2.65, 0), VIOLET, 25)
		"meters":
			for i: int in range(2):
				var x: float = -0.95 + i * 1.9
				_box(Vector3(1.45, 1.4, 0.65), Vector3(x, 1.05, 0), Color("d9deea"))
				_cylinder(0.5, 0.04, Vector3(x, 1.2, 0.36), Color("f7f3e8")).rotation_degrees.x = 90
				var needle := _rod(Vector3(x, 1.0, 0.41), Vector3(x, 1.52, 0.41), 0.018, RED)
				_remember("needle_a" if i == 0 else "needle_v", needle)
				_label("A" if i == 0 else "V", Vector3(x, 0.55, 0.4), INK, 42)
			_rod(Vector3(-1.65, 0.4, 0), Vector3(1.65, 0.4, 0), 0.025, RED)
		"compass":
			_cylinder(0.9, 0.18, Vector3(0, 0.65, 0), BRASS)
			_cylinder(0.79, 0.2, Vector3(0, 0.76, 0), Color("e6edf5"))
			_ring(0.83, Vector3(0, 0.88, 0), Color("c8d4e5"))
			var needle := Node3D.new()
			specimen.add_child(needle)
			needle.position = Vector3(0, 0.92, 0)
			_box(Vector3(0.12, 0.05, 1.15), Vector3(0, 0, -0.28), RED, needle)
			_box(Vector3(0.12, 0.05, 1.15), Vector3(0, 0, 0.28), BLUE, needle)
			_remember("needle", needle)
			_rod(Vector3(0, 1.65, -1.2), Vector3(0, 1.65, 1.2), 0.055, Color("d78b53"))
			for i: int in range(4):
				_ring(0.38 + i * 0.12, Vector3(0, 1.65, 0), Color(0.5, 0.7, 1.0, 0.3), null, false, 0.1)
		_:
			_build_optics_or_quantum(anim)

func _build_circuit(anim: String) -> void:
	_box(Vector3(4.35, 0.12, 2.0), Vector3(0, 0.3, 0), Color("313a50"))
	_box(Vector3(0.75, 0.7, 0.65), Vector3(-1.65, 0.72, 0), Color("4c566c"))
	_label("+", Vector3(-1.85, 1.16, 0), RED, 30)
	_label("−", Vector3(-1.4, 1.16, 0), CYAN, 30)
	if anim == "parallel":
		for z: float in [-0.55, 0.55]:
			_rod(Vector3(-1.25, 0.75, z), Vector3(1.65, 0.75, z), 0.03, Color("d58b52"))
			var lamp := _sphere(0.25, Vector3(0.45, 0.98, z), Color("ffe7a0"), null, 1.3 if z > 0 else 0.0)
			_remember("lamp_on" if z > 0 else "lamp_off", lamp)
		_rod(Vector3(-1.25, 0.75, -0.55), Vector3(-1.25, 0.75, 0.55), 0.03, Color("d58b52"))
		_rod(Vector3(1.65, 0.75, -0.55), Vector3(1.65, 0.75, 0.55), 0.03, Color("d58b52"))
	else:
		_rod(Vector3(-1.65, 1.1, 0), Vector3(-0.5, 1.1, 0), 0.035, RED)
		_rod(Vector3(0.7, 1.1, 0), Vector3(1.65, 1.1, 0), 0.035, RED)
		_rod(Vector3(1.65, 1.1, 0), Vector3(1.65, 0.45, 0), 0.035, BLUE)
		_rod(Vector3(1.65, 0.45, 0), Vector3(-1.65, 0.45, 0), 0.035, BLUE)
		if anim == "conductor":
			_box(Vector3(0.65, 0.22, 0.22), Vector3(0.1, 1.1, 0), Color("b9c4d3"))
			_box(Vector3(0.65, 0.22, 0.22), Vector3(0.1, 0.65, 0.65), Color("424758"))
			_label("металл / резина", Vector3(0.15, 1.65, 0), WHITE, 27)
		else:
			var lamp_count: int = 2 if anim == "series" else 1
			for i: int in range(lamp_count):
				var lamp := _sphere(0.27, Vector3(0.35 + i * 0.8, 1.1, 0), Color("ffe4a0"), null, 0.4)
				_remember("lamp" + str(i), lamp)
		if anim == "circuit":
			var key := Node3D.new()
			specimen.add_child(key)
			key.position = Vector3(-0.55, 1.1, 0)
			_rod(Vector3.ZERO, Vector3(0.8, 0.45, 0), 0.045, BRASS, key)
			_remember("switch", key)
	for i: int in range(8):
		var electron := _sphere(0.045, Vector3(-1.5 + i * 0.4, 1.13, 0.12), CYAN, null, 1.0)
		_particle("charge", electron, 0.7, float(i) / 8.0)

func _ray(a: Vector3, b: Vector3, color: Color = ORANGE) -> MeshInstance3D:
	return _rod(a, b, 0.018, color, null, 1.4)

func _lens(location: Vector3, diverging: bool = false) -> void:
	var lens := _sphere(0.72, location, Color(0.55, 0.83, 1.0, 0.36), null, 0.18)
	lens.scale = Vector3(0.16 if not diverging else 0.09, 1.35, 1.0)
	_ring(0.72, location, Color("b9d8e9"), null, true, 0.1)
	_rod(location + Vector3(0, -0.75, 0), location + Vector3(0, -1.25, 0), 0.045, BRASS)

func _nucleus(center: Vector3, protons: int, neutrons: int, prefix: String = "nucleus") -> Node3D:
	var root := Node3D.new()
	specimen.add_child(root)
	root.position = center
	var total: int = protons + neutrons
	for i: int in range(total):
		var angle: float = float(i) * 2.39996
		var radius: float = 0.13 * sqrt(float(i))
		var p := _sphere(0.16, Vector3(cos(angle) * radius, sin(angle) * radius, sin(i * 1.7) * 0.18), RED if i < protons else Color("a9b8d4"), root, 0.15)
		p.scale = Vector3.ONE * 0.95
	_remember(prefix, root)
	return root

func _atom(center: Vector3, shells: int = 2, prefix: String = "atom") -> void:
	_nucleus(center, 3, 4, prefix + "_core")
	for shell: int in range(shells):
		var orbit := _ring(0.75 + shell * 0.45, center, Color(0.5, 0.7, 1.0, 0.42), null, true, 0.1)
		orbit.rotation_degrees.z = 25.0 + shell * 55.0
		for j: int in range(2 + shell):
			var electron := _sphere(0.105, center, CYAN, null, 1.1)
			_particle("electron", electron, 0.8 + shell * 0.25, float(j) * TAU / float(2 + shell) + shell)
			particles[-1]["center"] = center
			particles[-1]["radius"] = 0.75 + shell * 0.45
			particles[-1]["tilt"] = 25.0 + shell * 55.0

func _build_optics_or_quantum(anim: String) -> void:
	match anim:
		"lens", "diverge", "magnifier":
			_lens(Vector3(0, 1.45, 0), anim == "diverge")
			if anim == "magnifier":
				_rod(Vector3(0, 0.8, 0), Vector3(0.65, 0.25, 0), 0.09, BRASS)
				_label("A", Vector3(-1.4, 1.45, 0), WHITE, 50)
				_label("A", Vector3(1.4, 1.45, 0), CYAN, 78)
				_ray(Vector3(-1.2, 1.45, 0), Vector3(0, 1.2, 0), CYAN)
				_ray(Vector3(0, 1.2, 0), Vector3(1.2, 1.45, 0), CYAN)
			else:
				for i: int in range(5):
					var y: float = 0.95 + i * 0.25
					_ray(Vector3(-2.0, y, 0), Vector3(0, y, 0), ORANGE)
					var end := Vector3(1.9, 1.45, 0) if anim == "lens" else Vector3(1.9, 1.45 + (y - 1.45) * 1.8, 0)
					_ray(Vector3(0, y, 0), end, CYAN)
				if anim == "lens":
					_sphere(0.09, Vector3(1.9, 1.45, 0), WHITE, null, 2.0)
					_label("F", Vector3(1.9, 0.95, 0), WHITE, 32)
			for i: int in range(7):
				var photon := _sphere(0.04, Vector3(-1.8 + i * 0.5, 1.45, 0.2), WHITE, null, 1.5)
				_particle("light", photon, 0.5, float(i) / 7.0)
		"mirror":
			_box(Vector3(0.09, 2.3, 1.45), Vector3(0, 1.45, 0), Color("a6c6dc"), null, 0.25)
			_box(Vector3(0.12, 2.45, 1.6), Vector3(-0.08, 1.45, 0), BRASS)
			_arrow(Vector3(-1.65, 0.55, 0), Vector3(-1.65, 2.15, 0), ORANGE)
			var image := _arrow(Vector3(1.65, 0.55, 0), Vector3(1.65, 2.15, 0), Color(0.65, 0.8, 1.0, 0.48))
			_remember("image", image)
			_ray(Vector3(-1.65, 2.15, 0), Vector3(0, 1.3, 0), ORANGE)
			_ray(Vector3(0, 1.3, 0), Vector3(-1.0, 0.6, 0), CYAN)
			_label("зеркало", Vector3(0, 2.9, 0), WHITE, 27)
		"refraction":
			_box(Vector3(4.2, 1.15, 1.7), Vector3(0, 0.82, 0), Color(0.15, 0.55, 0.85, 0.35))
			_box(Vector3(4.2, 0.04, 1.7), Vector3(0, 1.4, 0), Color(0.55, 0.9, 1.0, 0.55))
			_ray(Vector3(-1.65, 2.6, 0), Vector3(0, 1.4, 0), ORANGE)
			_ray(Vector3(0, 1.4, 0), Vector3(0.65, 0.35, 0), CYAN)
			_rod(Vector3(0, 0.3, 0), Vector3(0, 2.75, 0), 0.012, Color(0.8, 0.85, 1.0, 0.45))
			_sphere(0.07, Vector3(0, 1.4, 0), WHITE, null, 1.4)
			_label("воздух", Vector3(-1.75, 1.75, 0), WHITE, 25)
			_label("вода", Vector3(-1.65, 0.8, 0), CYAN, 25)
			for i: int in range(6):
				_particle("light", _sphere(0.045, Vector3(-1.8 + i * 0.5, 1.4, 0.25), WHITE, null, 1.5), 0.45, float(i) / 6.0)
		"prism":
			var prism := CylinderMesh.new()
			prism.top_radius = 0.72
			prism.bottom_radius = 0.72
			prism.height = 1.25
			prism.radial_segments = 3
			var glass := _mesh(prism, Vector3(0, 1.35, 0), Color(0.65, 0.85, 1.0, 0.34), null, 0.0, 0.2)
			glass.rotation_degrees = Vector3(90, 0, 30)
			_ray(Vector3(-2.1, 1.55, 0), Vector3(-0.35, 1.55, 0), WHITE)
			var colors: Array[Color] = [RED, ORANGE, Color("ffe77b"), GREEN, CYAN, BLUE, VIOLET]
			for i: int in range(colors.size()):
				_ray(Vector3(0.3, 1.5, 0), Vector3(2.0, 0.8 + i * 0.23, 0), colors[i])
				_remember("spectrum" + str(i), _sphere(0.055, Vector3(1.85, 0.85 + i * 0.23, 0), colors[i], null, 1.5))
			_box(Vector3(0.08, 2.1, 1.6), Vector3(2.1, 1.35, 0), Color("343a52"))
		"shadow":
			_box(Vector3(0.12, 2.4, 1.7), Vector3(1.7, 1.45, 0), Color("58617a"))
			_remember("source", _sphere(0.22, Vector3(-1.8, 1.55, 0), Color("ffe2a0"), null, 2.0))
			_sphere(0.43, Vector3(0, 1.55, 0), VIOLET)
			_ray(Vector3(-1.6, 1.75, 0), Vector3(1.65, 2.45, 0), ORANGE)
			_ray(Vector3(-1.6, 1.35, 0), Vector3(1.65, 0.65, 0), ORANGE)
			_box(Vector3(0.02, 0.9, 0.9), Vector3(1.62, 1.55, 0), Color("242a40"))
		"pinhole":
			_box(Vector3(2.7, 2.25, 1.7), Vector3(0.5, 1.4, 0), Color("282e43"))
			_box(Vector3(0.05, 2.0, 1.45), Vector3(1.85, 1.4, 0), Color("d8d5c9"))
			_box(Vector3(0.12, 2.1, 1.55), Vector3(-0.85, 1.4, 0), Color("3d455c"))
			_sphere(0.07, Vector3(-0.93, 1.4, 0.78), INK)
			_arrow(Vector3(-1.9, 0.55, 0), Vector3(-1.9, 2.2, 0), ORANGE)
			_ray(Vector3(-1.9, 2.2, 0), Vector3(-0.9, 1.4, 0), ORANGE)
			_ray(Vector3(-0.9, 1.4, 0), Vector3(1.8, 0.7, 0), ORANGE)
			_ray(Vector3(-1.9, 0.55, 0), Vector3(-0.9, 1.4, 0), CYAN)
			_ray(Vector3(-0.9, 1.4, 0), Vector3(1.8, 2.1, 0), CYAN)
			_arrow(Vector3(1.72, 2.15, 0), Vector3(1.72, 0.65, 0), VIOLET)
			for i: int in range(6):
				_particle("light", _sphere(0.04, Vector3(-1.7 + i * 0.5, 1.4, 0.85), WHITE, null, 1.5), 0.4, float(i) / 6.0)
		"reflection":
			_box(Vector3(4.1, 0.12, 1.45), Vector3(0, 0.65, 0), Color("a9c6da"), null, 0.3)
			_ray(Vector3(-1.7, 2.4, 0), Vector3(0, 0.72, 0), ORANGE)
			_ray(Vector3(0, 0.72, 0), Vector3(1.7, 2.4, 0), CYAN)
			_rod(Vector3(0, 0.6, 0), Vector3(0, 2.75, 0), 0.012, Color(0.8, 0.85, 1.0, 0.5))
			_sphere(0.08, Vector3(0, 0.75, 0), WHITE, null, 1.7)
			_label("i", Vector3(-0.45, 1.8, 0), ORANGE, 34)
			_label("r", Vector3(0.45, 1.8, 0), CYAN, 34)
			_remember("incident", _sphere(0.06, Vector3(-1.0, 1.8, 0), WHITE, null, 1.8))
		"lightspeed":
			_box(Vector3(4.3, 0.75, 0.5), Vector3(0, 1.8, 0), Color(0.4, 0.6, 0.8, 0.08))
			_box(Vector3(4.3, 0.75, 0.5), Vector3(0, 0.85, 0), Color(0.2, 0.6, 0.9, 0.3))
			_label("воздух", Vector3(-2.0, 2.35, 0), WHITE, 25)
			_label("вода", Vector3(-2.0, 0.4, 0), CYAN, 25)
			for i: int in range(2):
				var photon := _sphere(0.1, Vector3(-1.65, 1.8 - i * 0.95, 0.35), ORANGE if i == 0 else CYAN, null, 1.6)
				_remember("fast" if i == 0 else "slow", photon)
		"atom", "electrons", "ion":
			_atom(Vector3(0, 1.5, 0), 2)
			if anim == "atom":
				_label("+", Vector3(0, 1.55, 0.45), WHITE, 38)
			elif anim == "electrons":
				_label("−e", Vector3(1.8, 2.55, 0), CYAN, 35)
			else:
				_remember("escaping", _sphere(0.12, Vector3(1.2, 1.5, 0), CYAN, null, 1.2))
				_label("+", Vector3(-1.9, 1.5, 0), RED, 50)
		"nucleus", "isotopes":
			if anim == "nucleus":
				_nucleus(Vector3(0, 1.45, 0), 5, 6)
				_ring(1.0, Vector3(0, 1.45, 0), VIOLET, null, true, 0.4)
				_label("+Z", Vector3(1.65, 1.45, 0), RED, 46)
			else:
				_nucleus(Vector3(-1.0, 1.45, 0), 3, 3, "isotope_a")
				_nucleus(Vector3(1.0, 1.45, 0), 3, 4, "isotope_b")
				_label("Z = 3", Vector3(-1.0, 0.45, 0), RED, 29)
				_label("Z = 3", Vector3(1.0, 0.45, 0), RED, 29)
		"beta", "alpha", "nuclear":
			_nucleus(Vector3(-0.65, 1.45, 0), 5 if anim != "alpha" else 6, 6)
			if anim == "beta":
				_remember("emitted", _sphere(0.11, Vector3(0.2, 1.45, 0), CYAN, null, 1.5))
				_arrow(Vector3(0.1, 1.45, 0), Vector3(1.85, 1.45, 0), CYAN)
				_label("β⁻", Vector3(1.6, 2.0, 0), CYAN, 43)
			elif anim == "alpha":
				var cluster := Node3D.new()
				specimen.add_child(cluster)
				cluster.position = Vector3(0.5, 1.45, 0)
				for i: int in range(4):
					_sphere(0.16, Vector3((i % 2) * 0.23, float(i / 2) * 0.23, 0), RED if i < 2 else Color("b3c0d5"), cluster, 0.2)
				_remember("emitted", cluster)
				_label("α", Vector3(1.65, 2.0, 0), VIOLET, 46)
			else:
				var fragment_a := _nucleus(Vector3(0.6, 1.85, 0), 3, 3, "fragment_a")
				var fragment_b := _nucleus(Vector3(0.6, 0.95, 0), 2, 3, "fragment_b")
				fragment_a.scale = Vector3.ONE * 0.75
				fragment_b.scale = Vector3.ONE * 0.75
				for i: int in range(9):
					var energy := _sphere(0.05, Vector3(0, 1.45, 0), ORANGE, null, 1.8)
					_particle("energy", energy, 1.0, float(i) * TAU / 9.0)
		"photoelectric":
			_box(Vector3(1.0, 1.8, 1.2), Vector3(0.5, 1.2, 0), Color("71839e"), null, 0.15)
			_remember("photon_source", _sphere(0.2, Vector3(-1.65, 2.25, 0), VIOLET, null, 1.8))
			_ray(Vector3(-1.5, 2.15, 0), Vector3(0.1, 1.65, 0), VIOLET)
			for i: int in range(8):
				var electron := _sphere(0.075, Vector3(0.2, 1.6, 0), CYAN, null, 1.3)
				_particle("photo", electron, 0.6, float(i) / 8.0)
			_label("hν", Vector3(-1.25, 2.7, 0), VIOLET, 42)
		"spectra":
			_rod(Vector3(-1.8, 1.5, 0), Vector3(-0.3, 1.5, 0), 0.18, Color(0.6, 0.8, 1.0, 0.22))
			_rod(Vector3(-1.8, 1.5, 0), Vector3(-0.3, 1.5, 0), 0.06, VIOLET, null, 1.5)
			_box(Vector3(0.12, 2.15, 1.3), Vector3(0.4, 1.4, 0), Color("30374e"))
			_ray(Vector3(-0.2, 1.5, 0), Vector3(0.45, 1.5, 0), WHITE)
			_box(Vector3(0.1, 2.15, 1.4), Vector3(1.6, 1.4, 0), Color("151a2b"))
			var colors: Array[Color] = [RED, ORANGE, GREEN, CYAN, VIOLET]
			for i: int in range(colors.size()):
				var line := _box(Vector3(0.08, 0.18 + i * 0.16, 0.45), Vector3(1.53, 0.8 + i * 0.3, 0), colors[i], null, 1.6)
				_remember("line" + str(i), line)
		_:
			# Защита от пустой сцены при повреждении банка: содержимое всё равно видно.
			_remember("unknown", _sphere(0.55, Vector3(0, 1.3, 0), accent, null, 0.5))
			_label("Модель опыта", Vector3(0, 2.35, 0), accent, 34)

func _process(delta: float) -> void:
	if not visible or not animated:
		return
	time += delta
	var t: float = time
	match current_anim:
		"pendulum":
			parts["pivot"].rotation.z = sin(t * 1.8) * 0.43
		"freefall":
			var cycle: float = fmod(t, 2.5) / 2.5
			var y: float = 2.3 - pow(minf(cycle * 1.5, 1.0), 2.0) * 1.75
			parts["heavy"].position.y = y
			parts["light"].position.y = y
		"incline":
			var cycle: float = fmod(t * 0.32, 1.0)
			parts["ball"].position = Vector3(-1.35 + cycle * 2.8, 2.0 - cycle * 1.3, 0)
			parts["ball"].rotation.z = -cycle * 12.0
		"spring":
			var stretch: float = sin(t * 2.0) * 0.36
			parts["bob"].position.y = 0.85 + stretch
			parts["spring"].scale.y = 1.0 + stretch * 0.28
		"lever":
			parts["beam"].rotation.z = sin(t * 1.1) * 0.055
		"pulley":
			parts["load"].position.y = 0.75 + sin(t * 1.25) * 0.27
		"collision":
			var cycle: float = fmod(t * 0.28, 1.0)
			parts["a"].position.x = lerpf(-1.45, -0.35, minf(cycle * 2.0, 1.0))
			parts["b"].position.x = 0.45 + maxf(0.0, cycle - 0.5) * 2.0
		"friction":
			parts["block"].position.x = -0.55 + sin(t * 1.4) * 0.7
			parts["force"].scale.x = 0.85 + sin(t * 2.8) * 0.15
		"pressure":
			parts["left_weight"].position.y = 0.95 + sin(t * 1.2) * 0.04
			parts["right_weight"].position.y = 1.12 + sin(t * 1.2) * 0.025
		"floating":
			parts["wood"].position.y = 1.28 + sin(t * 1.6) * 0.08
			parts["wood"].rotation.z = sin(t * 1.1) * 0.035
		"melting":
			var melt: float = 0.78 + sin(t * 0.45) * 0.18
			for i: int in range(5):
				parts["ice" + str(i)].scale = Vector3.ONE * melt
			parts["water"].scale = Vector3(1.0 + (1.0 - melt) * 0.2, 1.0, 1.0 + (1.0 - melt) * 0.2)
		"expansion":
			parts["metal_ball"].scale = Vector3.ONE * (0.91 + (sin(t * 0.8) + 1.0) * 0.075)
		"steam":
			var launch: float = pow(minf(fmod(t, 2.8) / 1.0, 1.0), 2.0)
			parts["cork"].position = Vector3(launch * 0.9, 2.55 + launch * 1.4 - launch * launch * 0.8, 0)
			parts["cork"].rotation.z = launch * 4.0
			_glow("heater", 1.1 + sin(t * 5.0) * 0.5)
		"boiling":
			_glow("heater", 1.2 + sin(t * 6.0) * 0.6)
		"convection":
			_glow("heater", 1.0 + sin(t * 3.0) * 0.3)
		"circuit":
			parts["switch"].rotation.z = -0.48 + (sin(t * 0.8) + 1.0) * 0.24
			_glow("lamp0", 0.5 + (sin(t * 0.8) + 1.0) * 1.2)
		"series", "conductor":
			for i: int in range(2):
				_glow("lamp" + str(i), 0.5 + sin(t * 2.0 + i) * 0.35)
		"parallel":
			_glow("lamp_on", 1.3 + sin(t * 3.0) * 0.3)
		"magnet":
			parts["left"].position.x = -1.15 - (sin(t * 1.6) + 1.0) * 0.12
			parts["right"].position.x = 1.15 + (sin(t * 1.6) + 1.0) * 0.12
		"electroscope":
			parts["leaf_l"].rotation.z = -0.28 - sin(t * 1.2) * 0.08
			parts["leaf_r"].rotation.z = 0.28 + sin(t * 1.2) * 0.08
		"meters":
			parts["needle_a"].rotation.z = sin(t * 1.4) * 0.45
			parts["needle_v"].rotation.z = sin(t * 1.4 + 0.4) * 0.3
		"compass":
			parts["needle"].rotation.y = sin(t * 1.1) * 0.65
		"mirror":
			parts["image"].scale.y = 0.96 + sin(t * 1.4) * 0.04
		"reflection":
			var cycle: float = fmod(t * 0.65, 1.0)
			parts["incident"].position = Vector3(-1.7, 2.4, 0).lerp(Vector3.ZERO + Vector3(0, 0.75, 0), cycle)
		"lightspeed":
			parts["fast"].position.x = -1.65 + fmod(t * 1.15, 3.3)
			parts["slow"].position.x = -1.65 + fmod(t * 0.85, 3.3)
		"atom", "electrons", "nucleus", "isotopes":
			if parts.has("atom_core"):
				parts["atom_core"].rotation.y = t * 0.3
			if parts.has("isotope_a"):
				parts["isotope_a"].rotation.y = t * 0.3
				parts["isotope_b"].rotation.y = -t * 0.3
			if parts.has("nucleus"):
				parts["nucleus"].rotation.y = t * 0.25
		"ion":
			parts["escaping"].position = Vector3(1.0 + fmod(t * 0.45, 1.5), 1.5 + sin(t) * 0.15, 0)
		"beta", "alpha":
			parts["emitted"].position.x = 0.15 + fmod(t * 0.5, 1.65)
			parts["nucleus"].rotation.y = t * 0.25
		"nuclear":
			parts["fragment_a"].position = Vector3(0.5 + sin(t * 0.8) * 0.35, 1.75 + sin(t * 0.8) * 0.25, 0)
			parts["fragment_b"].position = Vector3(0.5 + sin(t * 0.8) * 0.35, 1.15 - sin(t * 0.8) * 0.25, 0)
		"prism":
			for i: int in range(7):
				parts["spectrum" + str(i)].scale = Vector3.ONE * (0.8 + sin(t * 3.0 + i) * 0.2)
		"spectra":
			for i: int in range(5):
				parts["line" + str(i)].scale.z = 0.8 + sin(t * 2.5 + i) * 0.2
		"shadow":
			parts["source"].scale = Vector3.ONE * (1.0 + sin(t * 4.0) * 0.08)
		"photoelectric":
			parts["photon_source"].scale = Vector3.ONE * (1.0 + sin(t * 4.0) * 0.1)
	_process_particles(t)

func _process_particles(t: float) -> void:
	for particle: Dictionary in particles:
		var node: Node3D = particle["node"] as Node3D
		var origin: Vector3 = particle["origin"] as Vector3
		var speed: float = float(particle["speed"])
		var phase: float = float(particle["phase"])
		var cycle: float = fmod(t * speed + phase, 1.0)
		match str(particle["kind"]):
			"bubble":
				node.position = origin + Vector3(sin(t * 2.0 + phase) * 0.12, cycle * 1.35, 0)
				node.scale = Vector3.ONE * (0.6 + cycle * 0.7)
			"steam":
				node.position = origin + Vector3(sin(t + phase) * 0.35, cycle * 1.2, cos(t + phase) * 0.15)
				node.scale = Vector3.ONE * (1.0 - cycle * 0.6)
			"current":
				var angle: float = (t * speed + phase) * 1.5
				node.position = Vector3(sin(angle) * 0.6, 1.1 + cos(angle) * 0.58, cos(angle * 0.7) * 0.25)
			"wind":
				node.position = origin + Vector3(cycle * 2.8 - 1.4, cycle * 0.65, sin(t + phase) * 0.15)
			"drop":
				node.position.y = 0.6 + fmod(origin.y + t * speed, 1.3)
			"heat":
				node.position = Vector3(-0.8, 0.7, 0).lerp(Vector3(0.85, 2.4, 0), cycle)
			"sunray":
				node.position = Vector3(-0.8 + cycle * 1.9, 1.55 + sin(cycle * TAU * 3.0) * 0.1, 0)
			"ink":
				var spread: float = 0.15 + cycle * 0.9
				node.position = Vector3(sin(phase * 3.0) * spread, 1.9 - cycle * 1.3, cos(phase * 2.0) * spread)
			"flame":
				node.position.y = origin.y + sin(t * 5.0 + phase) * 0.12
				node.scale = Vector3.ONE * (0.8 + sin(t * 6.0 + phase) * 0.2)
			"charge":
				node.position.x = -1.55 + cycle * 3.1
			"clip":
				node.position = origin + Vector3(0, (sin(t * speed + phase) + 1.0) * 0.16, -0.12)
			"spark":
				node.scale = Vector3.ONE * (0.55 + sin(t * 5.0 + phase) * 0.4)
			"light":
				node.position.x = -2.0 + cycle * 4.0
			"electron":
				var angle: float = t * speed + phase
				var center: Vector3 = particle["center"] as Vector3
				var radius: float = float(particle["radius"])
				node.position = center + Vector3(cos(angle) * radius, sin(angle) * radius, sin(angle * 0.7) * 0.18)
			"energy":
				node.position = origin + Vector3(cos(phase), sin(phase), sin(phase * 2.0)) * cycle * 1.8
				node.scale = Vector3.ONE * (1.0 - cycle * 0.75)
			"photo":
				node.position = origin + Vector3(cycle * 1.7, cycle * 0.75 + sin(phase * TAU) * 0.25, sin(phase * TAU) * 0.5)
