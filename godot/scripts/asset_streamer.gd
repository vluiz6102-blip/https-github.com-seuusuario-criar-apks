class_name J90AssetStreamer
extends Node

signal progress_changed(value: float)
signal resource_loaded(path: String, resource: Resource)
signal resource_failed(path: String)

var _jobs: Dictionary = {}
var _batch_running: bool = false
var _cancel_requested: bool = false

func load_batch(paths: PackedStringArray) -> void:
    if _batch_running:
        return
    _batch_running = true
    _cancel_requested = false
    _run_batch(paths)

func cancel() -> void:
    _cancel_requested = true

func _run_batch(paths: PackedStringArray) -> void:
    var total: int = paths.size()
    if total == 0:
        _batch_running = false
        progress_changed.emit(1.0)
        return

    for index: int in total:
        if _cancel_requested:
            break

        var path: String = paths[index]
        var err: Error = ResourceLoader.load_threaded_request(
            path, "", false, ResourceLoader.CACHE_MODE_REUSE
        )
        if err != OK and err != ERR_BUSY:
            resource_failed.emit(path)
            continue

        _jobs[path] = true
        while not _cancel_requested:
            var progress: Array = []
            var status := ResourceLoader.load_threaded_get_status(path, progress)

            if status == ResourceLoader.THREAD_LOAD_LOADED:
                var resource: Resource = ResourceLoader.load_threaded_get(path)
                _jobs.erase(path)
                if resource != null:
                    resource_loaded.emit(path, resource)
                else:
                    resource_failed.emit(path)
                break

            if status == ResourceLoader.THREAD_LOAD_FAILED or status == ResourceLoader.THREAD_LOAD_INVALID_RESOURCE:
                _jobs.erase(path)
                resource_failed.emit(path)
                break

            await get_tree().process_frame

        progress_changed.emit(float(index + 1) / float(total))

    _jobs.clear()
    _batch_running = false

func _exit_tree() -> void:
    _cancel_requested = true
    _jobs.clear()
