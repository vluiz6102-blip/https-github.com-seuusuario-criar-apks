extends Node

func _ready() -> void:
    HardwareDetector.initialize()
    AudioManager.initialize()
    MonetizationManager.initialize()
    print("Jornada 90 Godot bootstrap: ", HardwareDetector.profile())
