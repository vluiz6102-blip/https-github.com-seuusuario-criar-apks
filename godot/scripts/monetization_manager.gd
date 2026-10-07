class_name J90MonetizationManager
extends Node

signal catalog_ready(items: Array[Dictionary])
signal purchase_pending(product_id: StringName)
signal purchase_verified(product_id: StringName, payload: Dictionary)
signal purchase_failed(product_id: StringName, reason: StringName)

const CAFE_MIN_BRL: float = 0.01
const CAFE_MAX_BRL: float = 1000000.0
const CAFE_PLAY_TIERS: Array[float] = [0.50, 1.00, 3.00, 5.00, 10.00, 20.00, 50.00, 100.00, 500.00, 1000.00]
const PRODUCT_CAFE_PREFIX: StringName = &"j90_cafe_"
const PRODUCT_UNIFORM_CUSTOM: StringName = &"j90_uniform_custom"

var _initialized: bool = false
var _billing: Object = null
var _verification_url: String = ""
var _pending: Dictionary = {}
var _verified: Dictionary = {}
# Checkout and verification remain server-authoritative.

func initialize() -> void:
    if _initialized:
        return
    _initialized = true
    if Engine.has_singleton("GodotGooglePlayBilling"):
        _billing = Engine.get_singleton("GodotGooglePlayBilling") as Object
    _verification_url = str(ProjectSettings.get_setting(
        "j90/monetization/verification_url", ""
    ))
    _load_cached_entitlements()
    _connect_billing_signals()
    _emit_catalog()

func has_rewarded_ads() -> bool:
    return false

func cafe_amount_is_valid(amount_brl: float) -> bool:
    return amount_brl >= CAFE_MIN_BRL and amount_brl <= CAFE_MAX_BRL

func build_cafe_intent(amount_brl: float, uniform: Dictionary) -> Dictionary:
    var amount: float = clampf(amount_brl, CAFE_MIN_BRL, CAFE_MAX_BRL)
    return {
        "kind": "cafe_donation",
        "amount_brl": amount,
        "uniform": _sanitize_uniform(uniform),
        "created_at": Time.get_unix_time_from_system()
    }

func purchase_cafe_tier(tier_brl: float, uniform: Dictionary) -> Error:
    var product_id: StringName = _product_for_tier(tier_brl)
    if product_id == &"":
        purchase_failed.emit(PRODUCT_CAFE_PREFIX, &"unsupported_play_tier")
        return ERR_INVALID_PARAMETER
    return _purchase_product(product_id, {
        "kind": "cafe_donation",
        "amount_brl": tier_brl,
        "uniform": _sanitize_uniform(uniform)
    }, true)

func request_cafe_donation(amount_brl: float, uniform: Dictionary) -> Error:
    if not cafe_amount_is_valid(amount_brl):
        purchase_failed.emit(PRODUCT_CAFE_PREFIX, &"amount_out_of_range")
        return ERR_INVALID_PARAMETER

    # Exact arbitrary amounts are kept as an intent so a compliant server
    # checkout can process them. Play Billing one-time products use catalog
    # prices, so this path never invents a variable Play price.
    if _billing != null and _is_play_tier(amount_brl):
        return purchase_cafe_tier(amount_brl, uniform)

    var checkout_url: String = str(ProjectSettings.get_setting(
        "j90/monetization/custom_donation_url", ""
    ))
    if checkout_url.is_empty():
        purchase_failed.emit(PRODUCT_CAFE_PREFIX, &"custom_amount_provider_not_configured")
        return ERR_UNCONFIGURED

    var intent := build_cafe_intent(amount_brl, uniform)
    var http := HTTPRequest.new()
    add_child(http)
    http.request_completed.connect(
        Callable(self, "_on_custom_checkout_completed").bind(http)
    )
    purchase_pending.emit(PRODUCT_CAFE_PREFIX)
    return OK

func _on_custom_checkout_completed(
    result: int,
    response_code: int,
    _headers: PackedStringArray,
    body: PackedByteArray,
    http: HTTPRequest
) -> void:
    http.queue_free()
    if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
        purchase_failed.emit(PRODUCT_CAFE_PREFIX, &"checkout_unavailable")
        return
    var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
    if parsed is Dictionary and bool((parsed as Dictionary).get("verified", false)):
        purchase_verified.emit(PRODUCT_CAFE_PREFIX, parsed)
    else:
        purchase_failed.emit(PRODUCT_CAFE_PREFIX, &"invalid_checkout_response")

func purchase_custom_uniform(uniform: Dictionary) -> Error:
    return _purchase_product(PRODUCT_UNIFORM_CUSTOM, {
        "kind": "cosmetic_uniform",
        "uniform": _sanitize_uniform(uniform)
    }, false)

func verified_entitlement(product_id: StringName) -> Dictionary:
    var value: Variant = _verified.get(String(product_id), {})
    return (value as Dictionary).duplicate(true)

func _purchase_product(product_id: StringName, metadata: Dictionary, consumable: bool) -> Error:
    if _billing == null:
        purchase_failed.emit(product_id, &"billing_unavailable")
        return ERR_UNAVAILABLE
    if not _billing.has_method("purchase"):
        purchase_failed.emit(product_id, &"billing_adapter_missing")
        return ERR_UNAVAILABLE

    _pending[String(product_id)] = {
        "metadata": metadata.duplicate(true),
        "consumable": consumable
    }
    purchase_pending.emit(product_id)
    _billing.call("purchase", String(product_id))
    return OK

func _connect_billing_signals() -> void:
    if _billing == null:
        return

    if _billing.has_signal("connected"):
        var connected := Callable(self, "_on_billing_connected")
        if not _billing.is_connected("connected", connected):
            _billing.connect("connected", connected)

    if _billing.has_signal("purchases_updated"):
        var updated := Callable(self, "_on_purchases_updated")
        if not _billing.is_connected("purchases_updated", updated):
            _billing.connect("purchases_updated", updated)

func _on_billing_connected() -> void:
    _emit_catalog()

func _emit_catalog() -> void:
    var items: Array[Dictionary] = []
    for tier: float in CAFE_PLAY_TIERS:
        items.append({
            "id": _product_for_tier(tier),
            "type": "consumable",
            "purpose": "cafe_donation",
            "amount_brl": tier
        })
    items.append({
        "id": PRODUCT_UNIFORM_CUSTOM,
        "type": "non_consumable",
        "purpose": "cosmetic_uniform"
    })
    catalog_ready.emit(items)

func _on_purchases_updated(purchases: Variant) -> void:
    if not (purchases is Array):
        return
    for purchase: Variant in purchases:
        var data: Dictionary = _purchase_to_dict(purchase)
        var product_id := StringName(str(data.get("product_id", "")))
        if product_id == &"":
            continue
        _verify_server_side(product_id, data)

func _verify_server_side(product_id: StringName, purchase_data: Dictionary) -> void:
    if _verification_url.is_empty():
        _cache_pending(product_id, purchase_data)
        purchase_failed.emit(product_id, &"verification_url_missing")
        return

    var http := HTTPRequest.new()
    add_child(http)
    http.request_completed.connect(
        Callable(self, "_on_verification_completed").bind(product_id, purchase_data, http)
    )

func _on_verification_completed(
    result: int,
    response_code: int,
    _headers: PackedStringArray,
    body: PackedByteArray,
    product_id: StringName,
    purchase_data: Dictionary,
    http: HTTPRequest
) -> void:
    http.queue_free()

    if result != HTTPRequest.RESULT_SUCCESS or response_code < 200 or response_code >= 300:
        _cache_pending(product_id, purchase_data)
        purchase_failed.emit(product_id, &"verification_unavailable")
        return

    var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
    if not (parsed is Dictionary) or not bool(parsed.get("verified", false)):
        purchase_failed.emit(product_id, &"verification_rejected")
        return

    var verified: Dictionary = (parsed as Dictionary).duplicate(true)
    _verified[String(product_id)] = verified
    _cache_verified(product_id, verified)

    var pending: Dictionary = _pending.get(String(product_id), {})
    var metadata: Dictionary = pending.get("metadata", {})
    if metadata.size() > 0:
        verified["j90_metadata"] = metadata.duplicate(true)

    _acknowledge_purchase(purchase_data, bool(pending.get("consumable", false)))
    purchase_verified.emit(product_id, verified)
    _pending.erase(String(product_id))

func _acknowledge_purchase(purchase_data: Dictionary, consumable: bool) -> void:
    if _billing == null:
        return
    var token: String = str(purchase_data.get("purchase_token", ""))
    if token.is_empty():
        return
    if _billing.has_method("acknowledgePurchase"):
        _billing.call("acknowledgePurchase", token)
    if consumable and _billing.has_method("consumePurchase"):
        _billing.call("consumePurchase", token)

func _product_for_tier(tier_brl: float) -> StringName:
    var cents := int(round(tier_brl * 100.0))
    return StringName(String(PRODUCT_CAFE_PREFIX) + str(cents))

func _is_play_tier(amount_brl: float) -> bool:
    for tier: float in CAFE_PLAY_TIERS:
        if is_equal_approx(tier, amount_brl):
            return true
    return false

func _purchase_to_dict(purchase: Variant) -> Dictionary:
    if purchase is Dictionary:
        return (purchase as Dictionary).duplicate(true)
    return {
        "product_id": "",
        "raw": str(purchase)
    }

func _sanitize_uniform(uniform: Dictionary) -> Dictionary:
    return {
        "primary": str(uniform.get("primary", "#1B5E20")).substr(0, 16),
        "secondary": str(uniform.get("secondary", "#F5C542")).substr(0, 16),
        "pattern": str(uniform.get("pattern", "classic")).substr(0, 32),
        "name": str(uniform.get("name", "Café 90")).substr(0, 24)
    }

func _load_cached_entitlements() -> void:
    var dir := DirAccess.open("user://")
    if dir == null:
        return
    dir.list_dir_begin()
    var filename := dir.get_next()
    while not filename.is_empty():
        if filename.begins_with("verified_") and filename.ends_with(".json"):
            var file := FileAccess.open("user://" + filename, FileAccess.READ)
            if file:
                var parsed: Variant = JSON.parse_string(file.get_as_text())
                file.close()
                if parsed is Dictionary:
                    var product_id := filename.trim_prefix("verified_").trim_suffix(".json")
                    _verified[product_id] = (parsed as Dictionary).duplicate(true)
        filename = dir.get_next()
    dir.list_dir_end()

func _cache_pending(product_id: StringName, payload: Dictionary) -> void:
    var path := "user://pending_%s.json" % String(product_id)
    var file := FileAccess.open(path, FileAccess.WRITE)
    if file:
        file.store_string(JSON.stringify(payload))
        file.close()

func _cache_verified(product_id: StringName, payload: Dictionary) -> void:
    var path := "user://verified_%s.json" % String(product_id)
    var file := FileAccess.open(path, FileAccess.WRITE)
    if file:
        file.store_string(JSON.stringify(payload))
        file.close()

func _exit_tree() -> void:
    if _billing != null:
        var connected := Callable(self, "_on_billing_connected")
        if _billing.has_signal("connected") and _billing.is_connected("connected", connected):
            _billing.disconnect("connected", connected)
        var updated := Callable(self, "_on_purchases_updated")
        if _billing.has_signal("purchases_updated") and _billing.is_connected("purchases_updated", updated):
            _billing.disconnect("purchases_updated", updated)
    _pending.clear()
    _verified.clear()
