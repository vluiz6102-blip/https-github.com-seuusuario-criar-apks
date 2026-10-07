class_name J90StadiumResource
extends Resource

enum GrassPattern { SOLID, STRIPED, CHECKER, CENTER_WEAR }

@export var stadium_id: StringName = &"default"
@export var display_name: String = "Estádio Local"
@export var capacity: int = 18000
@export var home_team_id: StringName = &"local"
@export var crowd_primary: Color = Color(0.16, 0.63, 0.34)
@export var crowd_secondary: Color = Color(0.93, 0.80, 0.26)
@export var grass_pattern: GrassPattern = GrassPattern.STRIPED
@export_range(0.0, 1.0, 0.01) var grass_wear: float = 0.10
@export_range(0.0, 1.0, 0.01) var crowd_density: float = 0.55
@export_range(0.0, 1.0, 0.01) var smoke_density: float = 0.0
@export_range(0.0, 1.0, 0.01) var fog_density: float = 0.0
@export var night_lighting: bool = false
@export var camera_config: J90StadiumCameraConfig = J90StadiumCameraConfig.new()
