extends Node

func _ready() -> void:
    HardwareDetector.initialize()
    PerformanceGovernor.initialize()
    AudioManager.initialize()
    MonetizationManager.initialize()
    MatchSceneController.initialize()
    print("Jornada 90 Godot bootstrap: ", HardwareDetector.profile())
    print("Jornada 90 renderer: ", RenderingServer.get_current_rendering_method(),
        " / ", RenderingServer.get_current_rendering_driver_name())
