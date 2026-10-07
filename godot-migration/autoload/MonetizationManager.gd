extends Node
class_name MonetizationManager

## Jornada 90 Manager
## Autoload: MonetizationManager
##
## Billing: Google Play Billing via GodotGooglePlayBilling.
## Ads: apenas Rewarded Video via godot-admob.
##
## Regra central: o cliente não concede compras só porque um token/local flag
## existe. O servidor valida a compra e devolve uma entitlement assinada.

signal billing_ready
signal billing_unavailable(reason: String)
signal catalog_updated(products: Array)
signal purchase_started(product_id: String)
signal purchase_succeeded(product_id: String, entitlement: Dictionary)
signal purchase_failed(product_id: String, reason: String)
signal rewarded_available(available: bool)
signal rewarded_completed(reward_id: String, reward_data: Dictionary)
signal rewarded_failed(reason: String)
signal entitlement_changed(product_id: String, active: bool)

@export var verification_url := ""
@export var public_key_path := "res://security/entitlement_public.key"
@export var offline_grace_seconds := 7 * 24 * 60 * 60
@export var rewarded_ad_unit_id := ""
@export var rewarded_test_mode := true
@export var rewarded_cooldown_seconds := 30.0

const CACHE_PATH := "user://j90_entitlements.bin"
const CACHE_KEY_PATH := "user://j90_entitlements.key"

# GodotGooglePlayBilling ProductType.INAPP é 0.
const PRODUCT_TYPE_INAPP := 0
const PURCHASED_STATE := 1

var _billing: Object = null
var _admob: Node = null
var _billing_ready := false
var _purchase_inflight := false
var _catalog: Dictionary = {}
var _entitlements: Dictionary = {}

var _rewarded_ad_id := ""
var _rewarded_loading := false
var _rewarded_inflight := false
var _reward_claimed := false
var _reward_context := ""
var _last_reward_at := -999999.0


func _ready() -> void:
    _load_entitlement_cache()
    call_deferred("_initialize_billing")
    call_deferred("_initialize_ads")


# ---------------------------------------------------------------------------
# Google Play Billing
# ---------------------------------------------------------------------------

func _initialize_billing() -> void:
    _billing = _create_billing_client()

    if _billing == null:
        billing_unavailable.emit("GodotGooglePlayBilling indisponível.")
        return

    _connect_if_present(&"connected", Callable(self, "_on_billing_connected"))
    _connect_if_present(&"connect_error", Callable(self, "_on_billing_connect_error"))
    _connect_if_present(&"disconnected", Callable(self, "_on_billing_disconnected"))
    _connect_if_present(&"on_purchase_updated", Callable(self, "_on_purchase_updated"))
    _connect_if_present(&"query_product_details_response", Callable(self, "_on_product_details"))
    _connect_if_present(&"query_purchases_response", Callable(self, "_on_purchases_query"))
    _connect_if_present(&"acknowledge_purchase_response", Callable(self, "_on_acknowledge"))
    _connect_if_present(&"consume_purchase_response", Callable(self, "_on_consume"))

    if _billing.has_method("start_connection"):
        _billing.call("start_connection")
    else:
        billing_unavailable.emit("BillingClient sem start_connection().")


func _create_billing_client() -> Object:
    # API atual documentada: BillingClient.new().
    var global_classes := ProjectSettings.get_global_class_list()
    for entry in global_classes:
        if str(entry.get("name", "")) != "BillingClient":
            continue

        var script_path := str(entry.get("path", ""))
        if script_path.is_empty():
            continue

        var script := load(script_path)
        if script != null:
            var instance = script.new()
            if instance is Object:
                return instance

    # Compatibilidade com versões/plugin wrappers antigos.
    for singleton_name in ["BillingClient", "GodotGooglePlayBilling"]:
        if Engine.has_singleton(singleton_name):
            var singleton = Engine.get_singleton(singleton_name)
            if singleton is Object:
                return singleton

    return null


func _connect_if_present(signal_name: StringName, callable: Callable) -> void:
    if _billing == null or not _billing.has_signal(signal_name):
        return

    var signal_ref: Signal = _billing.get(signal_name)
    if not signal_ref.is_connected(callable):
        signal_ref.connect(callable)


func _on_billing_connected() -> void:
    _billing_ready = true
    billing_ready.emit()
    query_catalog()
    _query_owned_purchases()


func _on_billing_connect_error(response_code: int, debug_message: String) -> void:
    _billing_ready = false
    billing_unavailable.emit("Billing: %d %s" % [response_code, debug_message])


func _on_billing_disconnected() -> void:
    _billing_ready = false


func query_catalog(product_ids: PackedStringArray = PackedStringArray()) -> void:
    if not _billing_ready or _billing == null:
        return

    var ids := product_ids
    if ids.is_empty():
        ids = PackedStringArray([
            "j90_season_pass",
            "j90_stadium_pack",
            "j90_manager_customization",
            "j90_save_slot"
        ])

    _billing.call("query_product_details", ids, PRODUCT_TYPE_INAPP)


func _on_product_details(response: Dictionary) -> void:
    if int(response.get("response_code", -1)) != 0:
        return

    _catalog.clear()
    for product in response.get("product_details", []):
        if product is Dictionary:
            var id := str(product.get("product_id", ""))
            if not id.is_empty():
                _catalog[id] = product

    catalog_updated.emit(_catalog.values())


func purchase(product_id: String) -> bool:
    if product_id.is_empty():
        purchase_failed.emit(product_id, "Produto inválido.")
        return false

    if not _billing_ready or _billing == null:
        purchase_failed.emit(product_id, "Google Play Billing indisponível.")
        return false

    if _purchase_inflight:
        purchase_failed.emit(product_id, "Outra compra está em andamento.")
        return false

    if not _catalog.has(product_id):
        purchase_failed.emit(product_id, "Produto ainda não foi consultado.")
        return false

    _purchase_inflight = true
    purchase_started.emit(product_id)

    var result = _billing.call("purchase", product_id)
    if result is Dictionary and int(result.get("response_code", 0)) != 0:
        _purchase_inflight = false
        purchase_failed.emit(
            product_id,
            str(result.get("debug_message", "Não foi possível abrir o fluxo de compra."))
        )
        return false

    return true


func _on_purchase_updated(response: Dictionary) -> void:
    var code := int(response.get("response_code", -1))
    if code != 0:
        _purchase_inflight = false
        purchase_failed.emit("", str(response.get("debug_message", "Compra recusada.")))
        _query_owned_purchases()
        return

    for purchase in response.get("purchases", []):
        if purchase is Dictionary:
            await _process_purchase(purchase)


func _process_purchase(purchase: Dictionary) -> void:
    var product_ids = purchase.get("product_ids", PackedStringArray())
    var token := str(purchase.get("purchase_token", ""))
    var state := int(purchase.get("purchase_state", 0))

    if token.is_empty() or product_ids.is_empty():
        _purchase_inflight = false
        purchase_failed.emit("", "Compra sem produto/token.")
        return

    # PENDING jamais gera conteúdo.
    if state != PURCHASED_STATE:
        _purchase_inflight = false
        purchase_failed.emit(
            str(product_ids[0]),
            "Compra ainda não concluída no Google Play."
        )
        return

    var verification := await _verify_receipt_server_side(purchase)
    if not bool(verification.get("valid", false)):
        _purchase_inflight = false
        purchase_failed.emit(
            str(product_ids[0]),
            str(verification.get("reason", "Compra não validada."))
        )
        return

    var entitlement: Dictionary = verification.get("entitlement", {})
    var product_id := str(entitlement.get("product_id", product_ids[0]))

    if str(verification.get("signature", "")).is_empty():
        _purchase_inflight = false
        purchase_failed.emit(product_id, "Servidor não devolveu entitlement assinada.")
        return

    _store_verified_entitlement(entitlement, str(verification.get("signature")))

    if not bool(purchase.get("is_acknowledged", false)):
        if _billing.has_method("acknowledge_purchase"):
            _billing.call("acknowledge_purchase", token)

    if bool(entitlement.get("consumable", false)):
        if _billing.has_method("consume_purchase"):
            _billing.call("consume_purchase", token)

    _purchase_inflight = false
    purchase_succeeded.emit(product_id, entitlement)
    entitlement_changed.emit(product_id, true)


func _verify_receipt_server_side(purchase: Dictionary) -> Dictionary:
    if verification_url.is_empty():
        if OS.is_debug_build():
            # Apenas para desenvolvimento local. Release sem endpoint não concede.
            return {
                "valid": false,
                "reason": "Servidor de verificação não configurado."
            }
        return {
            "valid": false,
            "reason": "Servidor de verificação não configurado."
        }

    var request := HTTPRequest.new()
    add_child(request)

    var payload := {
        "package_name": ProjectSettings.get_setting(
            "application/config/name",
            "Jornada 90 Manager"
        ),
        "purchase_token": str(purchase.get("purchase_token", "")),
        "product_ids": purchase.get("product_ids", PackedStringArray()),
        "purchase_time": int(purchase.get("purchase_time", 0))
    }

    var err := request.request(
        verification_url,
        PackedStringArray(["Content-Type: application/json"]),
        HTTPClient.METHOD_POST,
        JSON.stringify(payload)
    )

    if err != OK:
        request.queue_free()
        return {"valid": false, "reason": "Falha ao iniciar verificação."}

    var completed: Array = await request.request_completed
    request.queue_free()

    if completed.size() < 4:
        return {"valid": false, "reason": "Resposta de verificação incompleta."}

    var http_code := int(completed[1])
    var body := completed[3] as PackedByteArray

    if http_code < 200 or http_code >= 300:
        return {"valid": false, "reason": "Servidor retornou HTTP %d." % http_code}

    var parsed = JSON.parse_string(body.get_string_from_utf8())
    if not parsed is Dictionary:
        return {"valid": false, "reason": "Resposta do servidor inválida."}

    return parsed


func _query_owned_purchases() -> void:
    if _billing_ready and _billing != null and _billing.has_method("query_purchases"):
        _billing.call("query_purchases", PRODUCT_TYPE_INAPP)


func _on_purchases_query(response: Dictionary) -> void:
    if int(response.get("response_code", -1)) != 0:
        return

    for purchase in response.get("purchases", []):
        if purchase is Dictionary:
            await _process_purchase(purchase)


func _on_acknowledge(_response: Dictionary) -> void:
    pass


func _on_consume(_response: Dictionary) -> void:
    pass


# ---------------------------------------------------------------------------
# Entitlements / offline cache
# ---------------------------------------------------------------------------

func has_entitlement(product_id: String) -> bool:
    var item: Dictionary = _entitlements.get(product_id, {})
    if item.is_empty() or not bool(item.get("active", false)):
        return false

    var now := int(Time.get_unix_time_from_system())
    var expires_at := int(item.get("expires_at", 0))
    var checked_at := int(item.get("checked_at", 0))

    if expires_at > 0 and now >= expires_at:
        return false

    return checked_at > 0 and now - checked_at <= offline_grace_seconds


func _store_verified_entitlement(entitlement: Dictionary, signature_b64: String) -> void:
    var product_id := str(entitlement.get("product_id", ""))
    if product_id.is_empty() or signature_b64.is_empty():
        return

    var item := entitlement.duplicate(true)
    item["checked_at"] = int(Time.get_unix_time_from_system())
    item["signature"] = signature_b64

    _entitlements[product_id] = item
    _save_entitlement_cache()


func _load_entitlement_cache() -> void:
    _entitlements.clear()

    var key := _load_or_create_cache_key()
    if key.is_empty():
        return

    var file := FileAccess.open_encrypted(CACHE_PATH, FileAccess.READ, key)
    if file == null:
        return

    var raw := file.get_as_text()
    file.close()

    var parsed = JSON.parse_string(raw)
    if not parsed is Dictionary:
        return

    for product_id in parsed.keys():
        var item = parsed[product_id]
        if item is Dictionary and _verify_cached_entitlement(item):
            _entitlements[str(product_id)] = item


func _save_entitlement_cache() -> void:
    var key := _load_or_create_cache_key()
    if key.is_empty():
        return

    var file := FileAccess.open_encrypted(CACHE_PATH, FileAccess.WRITE, key)
    if file == null:
        return

    file.store_string(JSON.stringify(_entitlements))
    file.close()


func _load_or_create_cache_key() -> PackedByteArray:
    if FileAccess.file_exists(CACHE_KEY_PATH):
        var existing := FileAccess.open(CACHE_KEY_PATH, FileAccess.READ)
        if existing:
            var decoded := Marshalls.base64_to_raw(existing.get_as_text().strip_edges())
            existing.close()
            if decoded.size() == 32:
                return decoded

    var generated := Crypto.new().generate_random_bytes(32)
    if generated.size() != 32:
        return PackedByteArray()

    var file := FileAccess.open(CACHE_KEY_PATH, FileAccess.WRITE)
    if file == null:
        return PackedByteArray()

    file.store_string(Marshalls.raw_to_base64(generated))
    file.close()
    return generated


func _verify_cached_entitlement(item: Dictionary) -> bool:
    var signature_b64 := str(item.get("signature", ""))
    if signature_b64.is_empty() or not FileAccess.file_exists(public_key_path):
        return false

    var product_id := str(item.get("product_id", ""))
    var entitlement_id := str(item.get("entitlement_id", ""))
    var expires_at := int(item.get("expires_at", 0))
    var checked_at := int(item.get("checked_at", 0))
    var active := bool(item.get("active", false))

    if product_id.is_empty() or entitlement_id.is_empty() or checked_at <= 0 or not active:
        return false

    var now := int(Time.get_unix_time_from_system())
    if expires_at > 0 and now >= expires_at:
        return false
    if now - checked_at > offline_grace_seconds:
        return false

    var public_key := CryptoKey.new()
    if public_key.load(public_key_path, true) != OK:
        return false

    var canonical := _canonical_entitlement(
        product_id,
        entitlement_id,
        expires_at,
        checked_at,
        active
    )

    var signature := Marshalls.base64_to_raw(signature_b64)
    if signature.is_empty():
        return false

    return Crypto.new().verify(
        HashingContext.HASH_SHA256,
        canonical.sha256_buffer(),
        signature,
        public_key
    )


func _canonical_entitlement(
    product_id: String,
    entitlement_id: String,
    expires_at: int,
    checked_at: int,
    active: bool
) -> String:
    return "%s|%s|%d|%d|%s" % [
        product_id,
        entitlement_id,
        expires_at,
        checked_at,
        "1" if active else "0"
    ]


# ---------------------------------------------------------------------------
# Rewarded Ads
# ---------------------------------------------------------------------------

func _initialize_ads() -> void:
    _admob = get_tree().root.find_child("Admob", true, false)

    if _admob == null:
        rewarded_available.emit(false)
        return

    _connect_ad_signal(&"rewarded_ad_loaded", Callable(self, "_on_rewarded_loaded"))
    _connect_ad_signal(&"rewarded_ad_failed_to_load", Callable(self, "_on_rewarded_failed_load"))
    _connect_ad_signal(&"rewarded_ad_user_earned_reward", Callable(self, "_on_reward_earned"))
    _connect_ad_signal(&"rewarded_ad_dismissed_full_screen_content", Callable(self, "_on_rewarded_dismissed"))
    _connect_ad_signal(&"rewarded_ad_failed_to_show_full_screen_content", Callable(self, "_on_rewarded_failed_show"))

    _load_rewarded()


func _connect_ad_signal(signal_name: StringName, callable: Callable) -> void:
    if _admob == null or not _admob.has_signal(signal_name):
        return

    var signal_ref: Signal = _admob.get(signal_name)
    if not signal_ref.is_connected(callable):
        signal_ref.connect(callable)


func _load_rewarded() -> void:
    if _admob == null or _rewarded_loading or not _rewarded_ad_id.is_empty():
        return

    if rewarded_ad_unit_id.is_empty():
        rewarded_available.emit(false)
        return

    _rewarded_loading = true

    # O Ad Unit ID deve ser configurado no node Admob pelo ambiente/export.
    # Em desenvolvimento, o node deve usar o test ID oficial do Google.
    var request = _admob.call("create_load_ad_request")
    if request == null:
        _rewarded_loading = false
        rewarded_available.emit(false)
        return

    _admob.call("load_rewarded_ad", request)


func is_rewarded_ready() -> bool:
    return not _rewarded_ad_id.is_empty() and not _rewarded_inflight


func request_rewarded(reward_id: String, context: String = "hub") -> bool:
    if context == "live_match":
        rewarded_failed.emit("Anúncios recompensados ficam bloqueados durante a partida.")
        return false

    if not is_rewarded_ready():
        rewarded_failed.emit("Nenhum Rewarded disponível agora.")
        _load_rewarded()
        return false

    var now := Time.get_ticks_msec() / 1000.0
    if now - _last_reward_at < rewarded_cooldown_seconds:
        rewarded_failed.emit("Cooldown do Rewarded ativo.")
        return false

    _rewarded_inflight = true
    _reward_claimed = false
    _reward_context = reward_id
    _last_reward_at = now

    var id := _rewarded_ad_id
    _rewarded_ad_id = ""
    _admob.call("show_rewarded_ad", id)
    return true


func _on_rewarded_loaded(ad_id: String) -> void:
    _rewarded_loading = false
    _rewarded_ad_id = ad_id
    rewarded_available.emit(true)


func _on_rewarded_failed_load(_error_data) -> void:
    _rewarded_loading = false
    _rewarded_ad_id = ""
    rewarded_available.emit(false)


func _on_rewarded_failed_show(_ad_id, _error_data) -> void:
    _rewarded_inflight = false
    _reward_claimed = false
    _reward_context = ""
    rewarded_failed.emit("Falha ao exibir Rewarded.")
    _load_rewarded()


func _on_reward_earned(_ad_id, reward_data) -> void:
    if _reward_claimed or not _rewarded_inflight:
        return

    _reward_claimed = true

    var payload: Dictionary = {}
    if reward_data is Dictionary:
        payload = reward_data.duplicate(true)
    elif reward_data != null:
        if reward_data.has_method("get_amount"):
            payload["amount"] = reward_data.call("get_amount")
        if reward_data.has_method("get_type"):
            payload["type"] = reward_data.call("get_type")

    var reward_id := _reward_context
    rewarded_completed.emit(reward_id, payload)


func _on_rewarded_dismissed(_ad_id) -> void:
    _rewarded_inflight = false
    _reward_claimed = false
    _reward_context = ""
    _load_rewarded()
