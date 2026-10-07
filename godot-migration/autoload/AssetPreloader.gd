extends Node
class_name AssetPreloader

## Jornada 90 Manager - threaded asset loader
##
## O carregamento é iniciado no worker do ResourceLoader e é monitorado entre
## frames. Nunca chama load_threaded_get() enquanto o recurso está IN_PROGRESS.
## Isso mantém a tela de loading responsiva e evita bloquear o main thread.

signal batch_started(total: int)
signal progress_changed(value: float, path: String)
signal resource_ready(path: String, resource: Resource)
signal resource_failed(path: String, status: int)
signal batch_finished(resources: Dictionary)

var _pending: Array[String] = []
var _results: Dictionary = {}
var _progress_cache: Dictionary = {}
var _active := false


func start_batch(paths: PackedStringArray, use_sub_threads := false) -> void:
    cancel()

    for raw_path in paths:
        var path := str(raw_path).strip_edges()
        if path.is_empty() or not ResourceLoader.exists(path):
            resource_failed.emit(path, int(ResourceLoader.THREAD_LOAD_INVALID_RESOURCE))
            continue

        var err := ResourceLoader.load_threaded_request(
            path,
            "",
            use_sub_threads,
            ResourceLoader.CACHE_MODE_REUSE
        )

        if err == OK:
            _pending.append(path)
            _progress_cache[path] = 0.0
        else:
            resource_failed.emit(path, int(ResourceLoader.THREAD_LOAD_FAILED))

    _active = not _pending.is_empty()
    batch_started.emit(_pending.size())

    if not _active:
        batch_finished.emit(_results)


func _process(_delta: float) -> void:
    if not _active:
        return

    var remaining: Array[String] = []

    for path in _pending:
        var progress := PackedFloat32Array([0.0])
        var status := ResourceLoader.load_threaded_get_status(path, progress)

        if progress.size() > 0:
            _progress_cache[path] = clampf(progress[0], 0.0, 1.0)

        progress_changed.emit(overall_progress(), path)

        match status:
            ResourceLoader.THREAD_LOAD_IN_PROGRESS:
                remaining.append(path)

            ResourceLoader.THREAD_LOAD_LOADED:
                # Só recupera depois do status LOADED, portanto sem bloqueio.
                var resource := ResourceLoader.load_threaded_get(path)
                if resource != null:
                    _results[path] = resource
                    resource_ready.emit(path, resource)
                else:
                    resource_failed.emit(path, int(ResourceLoader.THREAD_LOAD_FAILED))

            _:
                resource_failed.emit(path, int(status))

    _pending = remaining
    if _pending.is_empty():
        _active = false
        batch_finished.emit(_results.duplicate(true))


func overall_progress() -> float:
    if _progress_cache.is_empty():
        return 1.0 if not _active else 0.0

    var total := 0.0
    for value in _progress_cache.values():
        total += float(value)

    return clampf(total / _progress_cache.size(), 0.0, 1.0)


func get_resource(path: String) -> Resource:
    return _results.get(path)


func is_loading() -> bool:
    return _active


func cancel() -> void:
    _pending.clear()
    _progress_cache.clear()
    _active = false
