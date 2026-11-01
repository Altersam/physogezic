extends Node3D
## Decorative stage identity. This component never changes scores or game phases.

const ACCENTS: Array[Color] = [Color("b9a0f1"), Color("ffad82"), Color("7ddfff"), Color("91e6c5"), Color("d4a8ff")]
const SECONDARY: Array[Color] = [Color("79c6dc"), Color("#ffd18e"), Color("8aa9ff"), Color("b6a5ff"), Color("84d9ff")]

var stage_index: int = -1
var animated: bool = true
var time: float = 0.0
var sigil: Node3D
var orbiters: Array[MeshInstance3D] = []
var orbit_origins: Array[float] = []

func _ready() -> void:
	for index: int in range(10):
		var mote: MeshInstance3D = _sphere(0.035, Vector3.ZERO, ACCENTS[0])
		orbiters.append(mote)
		orbit_origins.append(float(index) * TAU / 10.0)

func set_stage(value: int) -> void:
	var next_stage: int = clampi(value, 0, 4)
	if stage_index == next_stage:
		return
	stage_index = next_stage
	for index: int in range(orbiters.size()):
		var tint: Color = ACCENTS[stage_index] if index % 2 == 0 else SECONDARY[stage_index]
		orbiters[index].material_override = _glow_material(tint)
	if is_instance_valid(sigil):
		remove_child(sigil)
		sigil.queue_free()
	sigil = Node3D.new()
	sigil.position = Vector3(0.0, 0.56, -2.15)
	sigil.scale = Vector3.ONE * 0.72
	add_child(sigil)
	_build_sigil()

func set_enabled(value: bool) -> void:
	animated = value
	for mote: MeshInstance3D in orbiters:
		mote.visible = value

func _process(delta: float) -> void:
	if not animated or stage_index < 0:
		return
	time += delta
	for index: int in range(orbiters.size()):
		var angle: float = orbit_origins[index] + time * (0.12 + stage_index * 0.012)
		var height: float = 0.38 + sin(time * 1.1 + index) * 0.08
		orbiters[index].position = Vector3(cos(angle) * 4.55, height, sin(angle) * 2.75)
		orbiters[index].scale = Vector3.ONE * (0.72 + sin(time * 2.0 + index) * 0.2)
	if not is_instance_valid(sigil):
		return
	sigil.position.y = 0.56 + sin(time * 1.2) * 0.045
	match stage_index:
		0:
			sigil.rotation.y = time * 0.28
		1:
			sigil.scale = Vector3.ONE * (0.72 + sin(time * 2.4) * 0.035)
			sigil.rotation.y = sin(time * 0.55) * 0.18
		2:
			sigil.scale = Vector3.ONE * (0.72 + sin(time * 6.0) * 0.022)
			sigil.rotation.y = sin(time * 0.8) * 0.12
		3:
			sigil.rotation.y = sin(time * 0.65) * 0.38
		4:
			sigil.rotation.y = time * 0.38
			sigil.rotation.z = sin(time * 0.45) * 0.12

func _build_sigil() -> void:
	var accent: Color = ACCENTS[stage_index]
	var secondary: Color = SECONDARY[stage_index]
	match stage_index:
		0:
			_ring(0.43, Vector3.ZERO, accent, sigil)
			_ring(0.19, Vector3(0.0, 0.015, 0.0), secondary, sigil)
			for index: int in range(8):
				var angle: float = float(index) * TAU / 8.0
				var tooth: MeshInstance3D = _box(Vector3(0.15, 0.09, 0.18), Vector3(cos(angle) * 0.51, 0.0, sin(angle) * 0.51), accent, sigil)
				tooth.rotation.y = -angle
		1:
			for index: int in range(3):
				var ring_node: MeshInstance3D = _ring(0.23 + index * 0.1, Vector3(0.0, index * 0.18, 0.0), accent.lightened(index * 0.08), sigil)
				ring_node.scale.z = 0.72
			_sphere(0.13, Vector3(0.0, -0.04, 0.0), secondary, sigil)
		2:
			var points: Array[Vector3] = [Vector3(0.16, 0.68, 0.0), Vector3(-0.28, 0.12, 0.0), Vector3(0.02, 0.12, 0.0), Vector3(-0.18, -0.55, 0.0), Vector3(0.42, 0.23, 0.0), Vector3(0.12, 0.23, 0.0)]
			for index: int in range(points.size() - 1):
				_rod(points[index], points[index + 1], 0.055, accent, sigil)
			_ring(0.62, Vector3(0.0, 0.05, 0.0), secondary, sigil).rotation.x = PI / 2.0
		3:
			var prism: MeshInstance3D = MeshInstance3D.new()
			var shape: CylinderMesh = CylinderMesh.new()
			shape.top_radius = 0.34
			shape.bottom_radius = 0.34
			shape.height = 0.5
			shape.radial_segments = 3
			prism.mesh = shape
			prism.material_override = _glow_material(secondary)
			prism.rotation.z = PI / 2.0
			sigil.add_child(prism)
			_rod(Vector3(-0.85, 0.0, 0.0), Vector3(-0.2, 0.0, 0.0), 0.025, Color("fff7df"), sigil)
			for index: int in range(5):
				var ray_color: Color = Color.from_hsv(0.02 + index * 0.16, 0.55, 1.0)
				_rod(Vector3(0.2, 0.0, 0.0), Vector3(0.85, (index - 2) * 0.12, 0.0), 0.022, ray_color, sigil)
		4:
			for index: int in range(3):
				var orbit: MeshInstance3D = _ring(0.52, Vector3.ZERO, ACCENTS[stage_index].lightened(index * 0.08), sigil)
				orbit.rotation = Vector3(index * PI / 3.0, index * PI / 4.0, index * PI / 5.0)
			_sphere(0.17, Vector3.ZERO, secondary, sigil)
			_sphere(0.08, Vector3(0.15, 0.08, 0.04), Color("ffd0a6"), sigil)

func _glow_material(color: Color) -> StandardMaterial3D:
	var material: StandardMaterial3D = StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.albedo_color = color
	material.emission_enabled = true
	material.emission = color
	material.emission_energy_multiplier = 0.35
	return material

func _sphere(radius: float, location: Vector3, color: Color, parent: Node3D = null) -> MeshInstance3D:
	var node: MeshInstance3D = MeshInstance3D.new()
	var shape: SphereMesh = SphereMesh.new()
	shape.radius = radius
	shape.height = radius * 2.0
	shape.radial_segments = 32
	shape.rings = 16
	node.mesh = shape
	node.material_override = _glow_material(color)
	node.position = location
	(parent if parent != null else self).add_child(node)
	return node

func _box(size: Vector3, location: Vector3, color: Color, parent: Node3D) -> MeshInstance3D:
	var node: MeshInstance3D = MeshInstance3D.new()
	var shape: BoxMesh = BoxMesh.new()
	shape.size = size
	node.mesh = shape
	node.material_override = _glow_material(color)
	node.position = location
	parent.add_child(node)
	return node

func _ring(radius: float, location: Vector3, color: Color, parent: Node3D) -> MeshInstance3D:
	var node: MeshInstance3D = MeshInstance3D.new()
	var shape: TorusMesh = TorusMesh.new()
	shape.inner_radius = radius
	shape.outer_radius = radius + 0.025
	shape.rings = 64
	shape.ring_segments = 16
	node.mesh = shape
	node.material_override = _glow_material(color)
	node.position = location
	parent.add_child(node)
	return node

func _rod(start: Vector3, end: Vector3, radius: float, color: Color, parent: Node3D) -> MeshInstance3D:
	var node: MeshInstance3D = MeshInstance3D.new()
	var shape: CylinderMesh = CylinderMesh.new()
	shape.top_radius = radius
	shape.bottom_radius = radius
	shape.height = start.distance_to(end)
	shape.radial_segments = 24
	node.mesh = shape
	node.material_override = _glow_material(color)
	node.position = (start + end) * 0.5
	var direction: Vector3 = (end - start).normalized()
	var rotation_axis: Vector3 = Vector3.UP.cross(direction)
	if rotation_axis.length_squared() > 0.0001:
		node.quaternion = Quaternion(rotation_axis.normalized(), Vector3.UP.angle_to(direction))
	parent.add_child(node)
	return node
