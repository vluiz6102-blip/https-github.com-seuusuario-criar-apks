extends Node2D

@onready var simulation: J90MatchSimulation = $Simulation
@onready var renderer: J90PixelMatchRenderer = $PixelRenderer

func _ready() -> void:
    simulation.snapshot_ready.connect(renderer.apply_snapshot)
    simulation.match_completed.connect(_on_match_completed)
    var context := MatchSceneController.take_pending_context()
    simulation.start(context)

func _on_match_completed(result: Dictionary) -> void:
    simulation.stop()
    MatchSceneController.finish_match(result)

func _exit_tree() -> void:
    if not is_instance_valid(simulation):
        return

    if simulation.snapshot_ready.is_connected(renderer.apply_snapshot):
        simulation.snapshot_ready.disconnect(renderer.apply_snapshot)

    if simulation.match_completed.is_connected(_on_match_completed):
        simulation.match_completed.disconnect(_on_match_completed)

    simulation.stop()
