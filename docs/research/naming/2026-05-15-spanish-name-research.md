# Spanish Naming Research for PantryList

Date: 2026-05-15

## Purpose

`pantrylist.com` is registered, so the project needs a stronger Spanish-language name candidate instead of assuming the current English name can own the `.com`.

This research focuses on names that fit the current PantryList product rather than generic grocery-list positioning.

## Product Context From The Repo

The current product is an MVP for household inventory by base product type and lot, with visible expiration dates, estimated durability, explicit lot consumption, and deterministic shopping planning.

Relevant repo evidence:

- `README.md`: PantryList is described as an MVP for household inventory by base type and lot, with visible expirations, estimated durability, explicit lot consumption, and a deployment path.
- `README.md`: the current model includes `ProductType`, `InventoryLot`, and `PantryOverview`.
- `README.md`: `shoppingPlanItems` is exposed as a simple replenishment schedule based on estimated depletion.
- `docs/superpowers/specs/2026-04-29-replenishment-intelligence-guided-ux-design.md`: the product should answer what the household should use and buy next, without adding AI-generated meal planning or purchase prediction.
- `docs/superpowers/specs/2026-04-24-durability-depletion-design.md`: depletion estimates are planning signals and must not automatically mutate inventory.

## Competitive Signals

Visible competitors and adjacent apps cluster around generic pantry, expiration, stock, and shopping-list language:

- FridgeBuddy / Despensa & Nevera: App Store listing describes pantry, fridge, freezer inventory, barcode scanning, expiration alerts, shared inventory, shopping list, and waste tracking.
- Mi Despensa / Lista de la compra y despensa: App Store and Google Play listings describe shared shopping lists, pantry inventory, expiration alerts, minimum quantities, and automatic replenishment to a shopping list.
- SuppList: website describes pantry inventory, expiration dates, multiple spaces, multiple lists, stock alerts, and barcode scanning.
- Panzy: website describes pantry tracking, expiration monitoring, and automatic shopping lists.
- My Pantry Tracker: website describes pantry inventory with quantities, expiration dates, prices, and barcode scanning.

The market is crowded around direct names like "Mi Despensa", "Pantry Tracker", and "Smart Pantry". A good Spanish name should stay clear and practical, but avoid sounding like a direct clone of those generic terms.

## Domain And Search Signals Checked

RDAP and DNS checks are useful screening signals, not legal or registrar-level guarantees.

- `pantrylist.com`: RDAP returned an active domain record for `PANTRYLIST.COM`.
- `pantrylist.app`: the RDAP command returned `no-rdap-record`.
- `pantrylist.mx`: RDAP returned `404/no-rdap-record`.
- `despensalista.com`: RDAP returned `404/no-rdap-record`.
- `despensalista.app`: RDAP returned `404/no-rdap-record`.
- `despensalista.mx`: DNS NS lookup returned that the DNS name does not exist.
- `despensaviva.com`: RDAP returned an active domain record for `DESPENSAVIVA.COM`.
- `despensaclara.com`: RDAP returned an active domain record for `DESPENSACLARA.COM`.
- `alacenalista.com`, `alacenalista.app`, `alacenalista.mx`: RDAP/DNS checks returned no record or no DNS name during this pass.
- `alacenaaldia.com`, `alacenaaldia.app`, `alacenaaldia.mx`: RDAP/DNS checks returned no record or no DNS name during this pass.
- `abastocasa.com`, `abastocasa.app`, `abastocasa.mx`: RDAP/DNS checks returned no record or no DNS name during this pass.
- `casasurtida.com`, `casasurtida.app`, `casasurtida.mx`: RDAP/DNS checks returned no record or no DNS name during this pass.
- `reponlo.com`, `reponlo.app`, `reponlo.mx`: RDAP/DNS checks returned no record or no DNS name during this pass.
- `caducacero.com`, `caducacero.app`, `caducacero.mx`: RDAP/DNS checks returned no record or no DNS name during this pass.
- `nuncacaduca.com`, `nuncacaduca.app`, `nuncacaduca.mx`: RDAP/DNS checks returned no record or no DNS name during this pass.

## Recommendation

Recommended name: **DespensaLista**.

Why it fits:

- It preserves the original PantryList meaning while becoming native Spanish.
- It has a useful double reading: a pantry list and a pantry that is ready.
- It fits both food and household products better than names centered only on cooking or recipes.
- It supports the product's planning promise: know what exists, what expires, what is running out, and what should be bought.
- Domain screening showed favorable signals for `despensalista.com` and `despensalista.app`, subject to registrar verification.

## Shortlist

1. **DespensaLista**
   - Best balance of clarity, brandability, and continuity with PantryList.
   - Works for inventory, expiration, and replenishment.

2. **AlacenaLista**
   - Warmer and more domestic.
   - Slightly narrower because "alacena" can feel more kitchen/food-specific.

3. **Reponlo**
   - Short and action-oriented.
   - Strong for replenishment, weaker for inventory and expiration visibility.

4. **CasaSurtida**
   - Broad and household-oriented.
   - Could sound like a store or delivery service.

5. **CaducaCero**
   - Memorable and clear on expiration pain.
   - Too narrow for the current product, and it can sound like an unrealistic promise.

## Names To Avoid Or Deprioritize

- **Despensa Viva**: `despensaviva.com` returned an active RDAP record, and web search showed existing uses of the phrase.
- **Despensa Clara**: `despensaclara.com` returned an active RDAP record.
- **Mi Despensa**: too close to existing app naming and very generic.
- **Nunca Caduca**: catchy, but the product cannot promise that nothing expires.

## Next Checks Before Launch

- Verify final domain availability in the intended registrar.
- Check IMPI for Mexico trademark conflicts.
- Check USPTO if the product will target or market in the United States.
- Search app stores for exact and near-exact Spanish names.
- Decide whether the brand should prioritize `.com`, `.app`, `.mx`, or a bundle.
