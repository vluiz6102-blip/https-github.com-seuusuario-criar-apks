extends Node
class_name MonetizationManager

## Jornada 90 - monetização freemium sem anúncios forçados.
##
## Dependências Android:
##   - GodotGooglePlayBilling 3.3.x / Play Billing 9.x
##   - godot-admob para Rewarded Ads
##
## O cliente NÃO confia em purchase_token/local cache para conceder itens.
## O fluxo de compra é:
##   Google Play -> purchase update -> servidor -> grant -> acknowledge/consume
##
## Para conteúdo offline:
##   1. servidor assina a entitlement;
##   2. cliente valida a assinatura com chave pública;
##   3. cache fica cifrado em user://;
##   4. existe apenas uma janela offline limitada.
##
## Nenhum método de banner/interstitial é exposto aqui.

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

@export var verification_url: String = ""
@export var public_key_path: String = "res://security/entitlement_public.key"
@export var offline_grace_seconds: int = 7 * 24 * 60 * 60
@export var rewarded_ad_unit_id: String = ""
@export var rewarded_test_mode: bool = true
@export var rewarded_cooldown_seconds: float = 30.0

const CACHE_PATH := "user://j90_entitlements.bin"
const CACHE_KEY_PATH := "user://j90_entitlements.key"

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
var _last_reward_at := -999999.0
var _reward_context := ""
var _purchase_lock := Mutex.new()


func _ready() -> void:
	_load_entitlement_cache()
	call_deferred("_initialize_billing")
	call_deferred("_initialize_ads")


# ---------------------------------------------------------------------------
# Billing
# ---------------------------------------------------------------------------

func _initialize_billing() -> void:
	_billing = _resolve_billing_client()
	if _billing == null:
		billing_unavailable.emit("GodotGooglePlayBilling não encontrado.")
		return

	_connect_if_present("connected", Callable(self, "_on_billing_connected"))
	_connect_if_present("connect_error", Callable(self, "_on_billing_connect_error"))
	_connect_if_present("disconnected", Callable(self, "_on_billing_disconnected"))
	_connect_if_present("on_purchase_updated", Callable(self, "_on_purchase_updated"))
	_connect_if_present("query_product_details_response", Callable(self, "_on_product_details"))
	_connect_if_present("query_purchases_response", Callable(self, "_on_purchases_query"))
	_connect_if_present("acknowledge_purchase_response", Callable(self, "_on_acknowledge"))
	_connect_if_present("consume_purchase_response", Callable(self, "_on_consume"))

	if _billing.has_method("start_connection"):
		_billing.call("start_connection")
	else:
		billing_unavailable.emit("BillingClient sem start_connection().")


func _resolve_billing_client() -> Object:
	# Compatibilidade com versões que expunham um singleton nativo.
	for singleton_name in ["BillingClient", "GodotGooglePlayBilling"]:
		if Engine.has_singleton(singleton_name):
			var singleton := Engine.get_singleton(singleton_name)
			if singleton is Object:
				return singleton

	# API atual: BillingClient é uma classe do plugin.
	# ProjectSettings conhece classes definidas por script mesmo quando ClassDB
	# não conhece essas classes.
	for entry in ProjectSettings.get_global_class_list():
		if str(entry.get("name", "")) != "BillingClient":
			continue
		var script_path := str(entry.get("path", ""))
		if script_path.is_empty():
			continue
		var script := load(script_path)
		if script != null:
			return script.new()

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
	billing_unavailable.emit("Google Play Billing: %s (%s)" % [str(response_code), debug_message])


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

	_billing.call("query_product_details", ids, _product_type_inapp())


func _product_type_inapp() -> Variant:
	# O plugin atual registra BillingClient como classe global.
	# A chamada fica isolada aqui para facilitar eventual mudança de versão.
	if ProjectSettings.has_setting("j90/billing/product_type_inapp"):
		return ProjectSettings.get_setting("j90/billing/product_type_inapp")
	return 0


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
	if product_id.is_empty() or not _billing_ready or _billing == null:
		purchase_failed.emit(product_id, "Billing indisponível.")
		return false

	if _purchase_inflight:
		purchase_failed.emit(product_id, "Outra compra já está em andamento.")
		return false

	if not _catalog.has(product_id):
		purchase_failed.emit(product_id, "Produto ainda não foi consultado no Google Play.")
		return false

	_purchase_inflight = true
	purchase_started.emit(product_id)

	var result: Variant = _billing.call("purchase", product_id)
	if result is Dictionary and int(result.get("response_code", 0)) != 0:
		_purchase_inflight = false
		purchase_failed.emit(product_id, str(result.get("debug_message", "Falha ao abrir a compra.")))
		return false

	return true


func _on_purchase_updated(response: Dictionary) -> void:
	var code := int(response.get("response_code", -1))
	var purchases: Array = response.get("purchases", [])

	if code != 0:
		_purchase_inflight = false
	emit_signal("purchase_failed", "", str(response.get("debug_message", "Compra recusada.")))
	_query_owned_purchases()
	return

	for purchase in purchases:
		await _process_purchase(purchase)


func _process_purchase(purchase: Dictionary) -> void:
	var product_ids := purchase.get("product_ids", PackedStringArray())
	var token := str(purchase.get("purchase_token", ""))
	var state := int(purchase.get("purchase_state", 0))

	if token.is_empty() or product_ids.is_empty():
		_purchase_inflight = false
		purchase_failed.emit("", "Compra sem token/produto.")
		return

	# Pending jamais recebe conteúdo.
	# PURCHASED = 1 na API do plugin.
	if state != 1:
		_purchase_inflight = false
	emit_signal("purchase_failed", str(product_ids[0]), "Compra pendente ou estado inválido.")
		return

	var verification := await _verify_receipt_server_side(purchase)
	if not bool(verification.get("valid", false)):
		_purchase_inflight = false
		purchase_failed.emit(str(product_ids[0]), str(verification.get("reason", "Compra não validada.")))
		return

	var entitlement: Dictionary = verification.get("entitlement", {})
	var product_id := str(entitlement.get("product_id", product_ids[0]))

	_store_verified_entitlement(entitlement, str(verification.get("signature", "")))

	# Acknowledge SOMENTE depois da validação do servidor.
	if bool(purchase.get("is_acknowledged", false)) == false:
		if _billing != null and _billing.has_method("acknowledge_purchase"):
			_billing.call("acknowledge_purchase", token)

	# Para produtos consumíveis, o backend informa "consumable": true.
	if bool(entitlement.get("consumable", false)):
		if _billing != null and _billing.has_method("consume_purchase"):
			_billing.call("consume_purchase", token)

	_purchase_inflight = false
	purchase_succeeded.emit(product_id, entitlement)
	entitlement_changed.emit(product_id, true)


func _verify_receipt_server_side(purchase: Dictionary) -> Dictionary:
	if verification_url.is_empty():
		if OS.is_debug_build():
			return {
				"valid": true,
				"entitlement": {
					"product_id": str((purchase.get("product_ids", PackedStringArray([""])))[0]),
					"entitlement_id": "debug",
					"active": true,
					"expires_at": 4102444800,
					"checked_at": Time.get_unix_time_from_system(),
					"consumable": false
				},
				"signature": ""
			}
		return {"valid": false, "reason": "Servidor de verificação não configurado."}

	var request := HTTPRequest.new()
	add_child(request)

	var payload := {
		"package_name": ProjectSettings.get_setting("application/config/name", "Jornada 90 Manager"),
		"purchase_token": str(purchase.get("purchase_token", "")),
		"product_ids": purchase.get("product_ids", PackedStringArray()),
		"purchase_time": int(purchase.get("purchase_time", 0))
	}

	var headers := PackedStringArray(["Content-Type: application/json"])
	var err := request.request(
		verification_url,
		headers,
		HTTPClient.METHOD_POST,
		JSON.stringify(payload)
	)
	if err != OK:
		request.queue_free()
		return {"valid": false, "reason": "Não foi possível iniciar a verificação."}

	var completed: Array = await request.request_completed
	request.queue_free()

	if completed.size() < 4:
		return {"valid": false, "reason": "Resposta de verificação incompleta."}

	var response_code := int(completed[1])
	var body := completed[3] as PackedByteArray
	if response_code < 200 or response_code >= 300:
		return {"valid": false, "reason": "Servidor de verificação HTTP %d." % response_code}

	var parsed := JSON.parse_string(body.get_string_from_utf8())
	if not (parsed is Dictionary):
		return {"valid": false, "reason": "Resposta do servidor inválida."}

	return parsed


func _query_owned_purchases() -> void:
	if not _billing_ready or _billing == null or not _billing.has_method("query_purchases"):
		return
	_billing.call("query_purchases", _product_type_inapp())


func _on_purchases_query(response: Dictionary) -> void:
	if int(response.get("response_code", -1)) != 0:
		return
	for purchase in response.get("purchases", []):
		await _process_purchase(purchase)


func _on_acknowledge(_response: Dictionary) -> void:
	# O grant já foi persistido após a verificação server-side.
	# Este callback fica apenas para telemetria/diagnóstico.
	pass


func _on_consume(_response: Dictionary) -> void:
	pass


# ---------------------------------------------------------------------------
# Entitlements / offline cache
# ---------------------------------------------------------------------------

func has_entitlement(product_id: String, allow_offline: bool = true) -> bool:
	var item: Dictionary = _entitlements.get(product_id, {})
	if item.is_empty():
		return false
	if not bool(item.get("active", false)):
		return false

	var now := int(Time.get_unix_time_from_system())
	var expires_at := int(item.get("expires_at", 0))
	if expires_at > 0 and now >= expires_at:
		return false

	if allow_offline:
		var checked_at := int(item.get("checked_at", 0))
		if checked_at > 0 and now - checked_at <= offline_grace_seconds:
			return true

	return _billing_ready


func grant_is_permitted_offline(product_id: String) -> bool:
	# Mesmo offline, a entitlement precisa ter assinatura válida e não pode
	# estar além da janela de tolerância.
	return has_entitlement(product_id, true)


func _store_verified_entitlement(entitlement: Dictionary, signature_b64: String) -> void:
	var product_id := str(entitlement.get("product_id", ""))
	if product_id.is_empty():
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

	var parsed := JSON.parse_string(raw)
	if not (parsed is Dictionary):
		return

	for product_id in parsed.keys():
		var item: Dictionary = parsed[product_id]
		if _verify_cached_entitlement(item):
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
			var encoded := existing.get_as_text().strip_edges()
			existing.close()
			var decoded := Marshalls.base64_to_raw(encoded)
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

	if product_id.is_empty() or entitlement_id.is_empty() or checked_at <= 0:
		return false

	var now := int(Time.get_unix_time_from_system())
	if expires_at > 0 and now >= expires_at:
		return false
	if now - checked_at > offline_grace_seconds:
		return false
	if not active:
		return false

	var public_key := CryptoKey.new()
	if public_key.load(public_key_path, true) != OK:
		return false

	var canonical := _canonical_entitlement(product_id, entitlement_id, expires_at, checked_at, active)
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
	_admob = get_node_or_null(^"Admob")
	if _admob == null:
		_admob = get_tree().root.find_child("Admob", true, false)

	if _admob == null:
		rewarded_available.emit(false)
		return

	_connect_ad_signal("rewarded_ad_loaded", Callable(self, "_on_rewarded_loaded"))
	_connect_ad_signal("rewarded_ad_failed_to_load", Callable(self, "_on_rewarded_failed_load"))
	_connect_ad_signal("rewarded_ad_user_earned_reward", Callable(self, "_on_reward_earned"))
	_connect_ad_signal("rewarded_ad_dismissed_full_screen_content", Callable(self, "_on_rewarded_dismissed"))
	_connect_ad_signal("rewarded_ad_failed_to_show_full_screen_content", Callable(self, "_on_rewarded_failed_show"))

	_load_rewarded()


func _connect_ad_signal(signal_name: StringName, callable: Callable) -> void:
	if _admob == null or not _admob.has_signal(signal_name):
		return
	var s: Signal = _admob.get(signal_name)
	if not s.is_connected(callable):
		s.connect(callable)


func _load_rewarded() -> void:
	if _admob == null or _rewarded_loading or _rewarded_ad_id != "":
		return
	if rewarded_ad_unit_id.is_empty():
		rewarded_available.emit(false)
		return

	_rewarded_loading = true
	var request: Variant = _admob.call("create_rewarded_ad_request")
	if request == null:
		_rewarded_loading = false
		rewarded_available.emit(false)
		return

	if rewarded_test_mode and request.has_method("set_ad_unit_id"):
		request.call("set_ad_unit_id", "ca-app-pub-3940256099942544/5224354917")

	_admob.call("load_rewarded_ad", request)


func is_rewarded_ready() -> bool:
	return not _rewarded_ad_id.is_empty() and not _rewarded_inflight


func request_rewarded(reward_id: String, context: String = "hub") -> bool:
	if context == "live_match":
		rewarded_failed.emit("Rewarded Ads são bloqueados durante partidas ao vivo.")
		return false

	if not is_rewarded_ready():
		rewarded_failed.emit("Nenhum anúncio recompensado disponível.")
		_load_rewarded()
		return false

	var now := Time.get_ticks_msec() / 1000.0
	if now - _last_reward_at < rewarded_cooldown_seconds:
		rewarded_failed.emit("Aguarde antes de solicitar outra recompensa.")
		return false

	_rewarded_inflight = true
	_reward_claimed = false
	_reward_context = reward_id

	var id := _rewarded_ad_id
	if not id.is_empty():
		_rewarded_ad_id = ""

	_last_reward_at = now
	_admob.call("show_rewarded_ad", id)
	return true


func _on_rewarded_loaded(ad_id: String) -> void:
	_rewarded_loading = false
	_rewarded_ad_id = ad_id
	rewarded_available.emit(true)


func _on_rewarded_failed_load(_ad_id: String, _error_data: Object) -> void:
	_rewarded_loading = false
	_rewarded_ad_id = ""
	rewarded_available.emit(false)


func _on_rewarded_failed_show(_ad_id: String, _error_data: Object) -> void:
	_rewarded_inflight = false
	rewarded_failed.emit("Falha ao exibir anúncio recompensado.")
	_load_rewarded()


func _on_reward_earned(_ad_id: String, reward_data: Object) -> void:
	# O callback de recompensa é a única porta que concede a recompensa.
	if _reward_claimed or not _rewarded_inflight:
		return

	_reward_claimed = true
	var payload: Dictionary = {}
	if reward_data != null:
		if reward_data is Dictionary:
			payload = reward_data
		elif reward_data.has_method("get_amount"):
			payload["amount"] = reward_data.call("get_amount")
		if reward_data.has_method("get_type"):
			payload["type"] = reward_data.call("get_type")

	var reward_id := _reward_context
	_reward_context = ""
	rewarded_completed.emit(reward_id, payload)


func _on_rewarded_dismissed(_ad_id: String) -> void:
	_rewarded_inflight = false
	_reward_claimed = false
	_reward_context = ""
	_load_rewarded()
