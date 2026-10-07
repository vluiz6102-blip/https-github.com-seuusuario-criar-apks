extends Node

## Bootstrap mínimo da migração Godot.
## A lógica do Manager e da partida entra em cenas separadas posteriormente.

@onready var status_label: Label = $UI/Status

func _ready() -> void:
    var status := HardwareDetector.detect_and_apply(true)
    status_label.text = HardwareDetector.diagnostics_text()
    print("[J90] profile=", status.profile, " hardware=", status.hardware)
