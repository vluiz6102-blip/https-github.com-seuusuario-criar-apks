class_name J90TransferMarketAI
extends RefCounted

func evaluate_candidate(player: Dictionary, buyer: Dictionary) -> Dictionary:
    var age: float = float(player.get("age", 28))
    var contract_months: float = maxf(float(player.get("contract_months", 12)), 0.0)
    var potential: float = clampf(float(player.get("potential", 70)) / 100.0, 0.0, 1.0)
    var ovr: float = clampf(float(player.get("ovr", 65)) / 100.0, 0.0, 1.0)
    var need: float = _position_need(player.get("position", ""), buyer)
    var saturation: float = 1.0 - need
    var age_factor: float = 1.0 - clampf(absf(age - 24.0) / 28.0, 0.0, 1.0)
    var contract_factor: float = 1.0 - clampf(contract_months / 60.0, 0.0, 1.0)

    var score: float = (
        ovr * 0.34 +
        potential * 0.24 +
        age_factor * 0.14 +
        contract_factor * 0.10 +
        need * 0.24 -
        saturation * 0.28
    )

    return {
        "score": clampf(score, 0.0, 1.0),
        "recommended": score >= 0.56 and need >= 0.35,
        "need": need,
        "saturation": saturation
    }

func negotiate(player: Dictionary, buyer: Dictionary, seller: Dictionary, market_value: float) -> Dictionary:
    var table_position: float = clampf(float(seller.get("table_position", 10)) / 20.0, 0.0, 1.0)
    var crisis: float = clampf(float(seller.get("financial_stress", 0.0)), 0.0, 1.0)
    var buyer_tier: float = clampf(float(buyer.get("division_strength", 0.5)), 0.0, 1.0)
    var budget: float = maxf(float(buyer.get("budget", 0.0)), 0.0)
    var base_value: float = maxf(market_value, 1.0)
    var premium: float = 1.0 + table_position * 0.18 - crisis * 0.22 + buyer_tier * 0.08
    var asking_price: float = base_value * premium
    var ceiling: float = budget * 0.32

    return {
        "asking_price": asking_price,
        "ceiling": ceiling,
        "affordable": asking_price <= ceiling,
        "recommendation": "buy" if asking_price <= ceiling else "walk_away"
    }

func _position_need(position: Variant, buyer: Dictionary) -> float:
    var needs: Dictionary = buyer.get("position_need", {})
    return clampf(float(needs.get(str(position), 0.0)), 0.0, 1.0)
