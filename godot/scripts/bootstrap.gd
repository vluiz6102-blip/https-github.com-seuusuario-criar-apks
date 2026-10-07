extends Node

func _ready() -> void:
    HardwareDetector.initialize()
    AudioManager.initialize()
    MonetizationManager.initialize()
    MatchSceneController.initialize()
    print("Jornada 90 Godot bootstrap: ", HardwareDetector.profile())
