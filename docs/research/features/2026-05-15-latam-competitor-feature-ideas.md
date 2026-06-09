# Latin America Competitor Feature Ideas

Date: 2026-05-15

Status: Research notes and backlog candidates. This is not an approved implementation spec.

## Goal

Adapt PantryList toward a Latin American audience and capture feature ideas from competitors and adjacent grocery apps.

This research assumes Mexico and Spanish-speaking Latin America are the first audience to optimize for, while keeping the model broad enough for other Latin American markets later.

## Current PantryList Baseline

PantryList already has a useful foundation:

- Household inventory by base product type and inventory lot.
- Visible expiration dates.
- Estimated depletion and deterministic shopping planning.
- Explicit consumption by lot.
- Support for food and non-food household items.

The repo also makes two useful product boundaries clear:

- Depletion estimates are planning signals and should not automatically mutate inventory.
- The product has intentionally not become AI meal planning or automatic purchase prediction.

## External Market Context

Latin American adaptation should not be only translation. The product needs to fit how people actually plan household purchases:

- Many purchases happen across supermarkets, mercados, tienditas, warehouse clubs, delivery apps, and informal errands.
- Shared household coordination matters because one person often notices what is missing and another person does the shopping.
- Budget visibility matters: the useful moment is before the trip, not only after a purchase.
- Android and lightweight web should be treated as primary surfaces. StatCounter reported South America mobile/tablet OS share for March 2026 as Android 80.97% and iOS 18.89%.
- Food waste is a real regional angle. FAO reported estimated food loss of 11.6% in Latin America and 19% global food waste at retail, food service, or household level.
- Front-of-package warning labels are common in the Americas. PAHO reported that Argentina, Chile, Colombia, Mexico, Peru, Uruguay, Brazil, and Ecuador have adopted front-of-package labeling systems.

Sources:

- StatCounter South America mobile/tablet OS share: https://gs.statcounter.com/os-market-share/mobile-tab-/south-america
- FAO food loss and waste event page: https://www.fao.org/americas/home/dia-perdida-desperdicio-alimentos-2024/en
- PAHO front-of-package labeling report: https://www.paho.org/en/news/10-3-2026-new-paho-report-highlights-progress-front-package-food-labeling-americas

## Competitor Signals

### FridgeBuddy

Observed features:

- Barcode scanning.
- Inventory across fridge, freezer, and pantry.
- Auto-organized lists for expiring soon and expired.
- Custom expiration notifications.
- Household sharing through iCloud.
- Shopping list flow from inventory.
- Waste tracking and consumption habits.
- Widgets.
- Nutri-Score and Green-Score.
- CSV export.

Source: https://apps.apple.com/us/app/pantry-inventory-fridgebuddy/id1500190823

Ideas for PantryList:

- Add a "what expires first" operational view.
- Add household sharing after the core model is stable.
- Add export/backup early because trust matters for inventory data.
- Track waste as an explicit event, separate from normal consumption.

### Pantry Check

Observed features:

- Real-time sync and family sharing.
- Smart shopping lists based on usage and inventory.
- Custom locations.
- Prices, running tally, and estimated totals.
- Current inventory and usage timeline.
- User-submitted photos and product info.
- Crowd-sourced product database.

Source: https://apps.apple.com/us/app/pantry-check-grocery-list/id966702368

Ideas for PantryList:

- Add custom storage locations beyond pantry/fridge/freezer.
- Add purchase price and running shopping total.
- Add a usage timeline per product type.
- Allow product photos without making them required.

### KitchenPal

Observed features:

- Pantry manager, grocery list, product comparison, meal planner, and recipe ideas.
- Suggestions based on what is already in the kitchen and what expires soon.
- Pantry sections for pantry, fridge, freezer, cleaning supplies, bar, and custom locations.
- Quantities and expiry dates.
- Barcode scanner with a product library.
- Family sharing and sync.
- Move items from pantry to shopping list.
- Track leftovers.
- Recipes by ingredient and diet.
- Shopping recommendations based on recently finished, running low, frequently bought, and favorite recipes.
- Purchase history.

Source: https://kitchenpalapp.com/es/

Ideas for PantryList:

- Keep recipes as a later optional layer, not the center of the product.
- Add "leftovers/preparados" as short-life inventory lots.
- Add "frequently bought" and "recently finished" to shopping planning.
- Support household areas like cleaning supplies and bar, not only food.

### Restokk

Observed features:

- Receipt, shelf, and barcode scanning.
- AI kitchen scan.
- Expiry tracking.
- Recipes from pantry.
- Low-stock smart shopping list.
- Budget tracking.
- Pantry health score.
- Offline core features.
- No account required for core use.
- Private by default.

Source: https://restokkapp.com/

Ideas for PantryList:

- Offline-first inventory and shopping list should be a serious LatAm differentiator.
- Receipt/photo capture is valuable, but should come after manual entry is fast.
- Privacy-by-default positioning can help because inventory is intimate household data.
- A pantry health score could be useful if it stays practical, not gamified.

### Listonic

Observed features:

- Shareable shopping lists.
- Notifications when lists change.
- Visual product catalog.
- Automatic product categories.
- Product suggestions.
- AI shopping assistant.
- Sort by aisle, category, or alphabetically.
- Add from shopping history.
- Voice input.
- Bulk actions.
- Copy items to a new list.
- Total cost calculation.
- Quantity, units, notes, and photos.
- Keep screen on while shopping.
- Sign-up not required.
- 40+ languages.

Source: https://listonic.com/features

Ideas for PantryList:

- Shopping mode should keep the screen awake.
- Categories should be reorderable to match the user's local store or market route.
- Add "repeat previous list" for weekly household staples.
- No-account trial mode could reduce adoption friction.
- Voice input is useful when cooking or checking the pantry.

### AnyList

Observed features:

- Item suggestions while typing.
- Automatic grocery categories.
- Multiple lists by store or occasion.
- Real-time sharing.
- Favorites/master list.
- Custom categories to match local store layout.
- Recent items.
- Notes, quantities, brand, flavor, and coupon availability.
- Voice assistant support.
- Online grocery ordering integrations in the United States.

Sources:

- https://www.anylist.com/lists
- https://help.anylist.com/articles/feature-overview-online-shopping/

Ideas for PantryList:

- A master list of staples fits household replenishment.
- Store-specific categories fit Latin American shopping across supermarket, mercado, and tiendita.
- Notes should support preferred brand, substitute brand, and "buy only on promo".
- Online ordering should be deferred until there is a clear target market and partner set.

### Out of Milk

Observed features:

- Shopping list, pantry list, and to-do list.
- Multiple shopping lists.
- Category grouping.
- Scan or enter shopping list items.
- Shopping history.
- Sharing by text or email.
- Grand total and running total.
- Online list access.

Source: https://apps.apple.com/us/app/grocery-list-out-of-milk/id564974992

Ideas for PantryList:

- Keep a simple mental model: inventory, shopping, and household tasks should be distinct.
- Text export matters because it works across WhatsApp, SMS, and notes.
- Running totals should be present in shopping mode.

### Rappi

Observed features:

- Listas de Compras creates personalized supermarket lists.
- Price comparison across supermarkets.
- Recommendations for saving time.
- Group orders let a user share a link so family or friends can add items to the same order.
- Rappi describes itself as a Latin American super app with presence across multiple countries and cities.

Sources:

- https://www.blog.rappi.com/es/blogs/listas-de-compras-rappi
- https://about.rappi.com/rappi-lanza-nueva-opcion-para-hacer-pedidos-grupales

Ideas for PantryList:

- Share-by-link is a strong pattern for household coordination.
- Price comparison is attractive, but likely too integration-heavy for an early roadmap.
- "Asistente de compras" language may resonate, as long as the product stays concrete.

### Jüsto

Observed features from App Store listing:

- Spanish-first grocery experience.
- Fresh produce and full household catalog.
- Discounts, cashback, and coupons.
- Delivery scheduling.
- Easy and secure payment.
- Customer support emphasis.

Source: https://apps.apple.com/mx/app/j%C3%BCsto/id1491969468

Ideas for PantryList:

- Savings language matters in Latin America: "ahorro", "evitar duplicados", "comprar lo necesario".
- Shopping list should include preferred store, estimated price, promo notes, and delivery/pickup context.
- Treat grocery delivery apps as downstream destinations, not as the core product.

## Recommended LatAm Feature Themes

### 1. Household Coordination

Feature ideas:

- Shared household workspace.
- Invite household members by link.
- Export shopping list to WhatsApp-friendly text.
- Share a temporary shopping link with only the current list.
- Change notifications for shared lists.

Why it fits:

- Competitors repeatedly emphasize family/household sharing.
- Latin American purchase coordination often happens in chat, even when the final purchase happens elsewhere.

Risks:

- Sharing inventory can expose private household data.
- Link sharing needs explicit permissions and expiration.

### 2. Budget And Price Awareness

Feature ideas:

- Estimated shopping total.
- Price per item and price history.
- Preferred store and last paid price.
- "Buy only on promo" notes.
- Local currency per user.
- Monthly household staples estimate.

Why it fits:

- Pantry Check, Listonic, Restokk, and Out of Milk all surface price/budget signals.
- For LatAm, saving money should be a primary message, not a side benefit.

Risks:

- Price tracking can become stale quickly.
- Real-time price comparison needs integrations and should be deferred.

### 3. Local Shopping Context

Feature ideas:

- Store/location types: supermercado, mercado, tiendita, abarrotes, mayoreo, farmacia, limpieza.
- Reorder shopping categories by local route or aisle. Initial fixed LatAm store-route ordering is implemented; per-user drag/drop route customization remains later.
- Multiple shopping lists by store or occasion.
- Common staple templates by household type. Starter pantry templates are implemented; richer household-type packs remain later.

Why it fits:

- AnyList and Listonic support custom ordering and store-specific planning.
- LatAm shopping is often split across several store types.

Risks:

- Regional vocabulary varies. The UI should allow customization instead of forcing one country vocabulary everywhere.

### 4. Fast Capture Without Perfect Catalogs

Feature ideas:

- Manual quick-add that is faster than barcode lookup.
- Voice input for shopping list items.
- Bulk add by pasted text.
- Optional barcode scan.
- Product photo optional.
- Receipt scan as a later premium/AI feature.
- Shelf photo scan as a future experiment.

Why it fits:

- Competitors use barcode, receipt, and AI scan heavily.
- In Latin America, barcode coverage may vary by local products, markets, and unpackaged goods, so manual entry must stay excellent.

Risks:

- AI capture can introduce errors into inventory.
- Receipt and image processing may expose sensitive purchase data.

### 5. Expiration, Waste, And Use-First Guidance

Feature ideas:

- "Usar primero" view.
- "Por caducar esta semana" grouped by meal/product type.
- Waste event tracking: consumed, thrown away, donated, given away.
- Weekly waste summary.
- Suggested action: use, freeze, buy replacement, pause buying.

Why it fits:

- FridgeBuddy, KitchenPal, Restokk, and Pantry Check all compete on expiration and waste.
- FAO frames food loss and waste as a regional sustainability and household efficiency issue.

Risks:

- Avoid moralizing. The product should help users save food and money, not shame them.

### 6. Household Areas Beyond Food

Feature ideas:

- Inventory areas: despensa, refrigerador/nevera, congelador/freezer, baño, limpieza, botiquin, mascotas, bodega.
- Product types for cleaning, hygiene, pet care, pharmacy basics, and baby products.
- Durability/depletion rules for non-food items.

Why it fits:

- PantryList already supports household products conceptually.
- KitchenPal explicitly includes cleaning supplies and custom sections.
- Jüsto's listing includes hygiene and cleaning products in the grocery catalog.

Risks:

- Too many categories can make onboarding heavy. Start with a few defaults and let users add more.

### 7. Latin American Nutrition Labels

Feature ideas:

- Optional product metadata for warning seals: exceso calorias, exceso azucares, exceso sodio, exceso grasas saturadas, exceso grasas trans, contiene cafeina, contiene edulcorantes.
- Store warning labels as user-entered metadata first.
- Later, parse from product databases or image capture.

Why it fits:

- PAHO reports broad adoption of front-of-package warning labeling systems in the Americas.
- Competitors use Nutri-Score/Green-Score, but LatAm countries often use warning labels instead.

Risks:

- Do not present health advice or regulatory claims unless backed by reliable product data.
- User-entered warning labels should be marked as user-entered.

## Prioritized Backlog Candidates

### P0: Best Near-Term Fit

1. **WhatsApp-friendly shopping list export**
   - Generate a clean text list grouped by category/store.
   - Include quantities, units, notes, and estimated total when available.

2. **Budgeted shopping mode**
   - Show running estimated total.
   - Let users enter last paid price.
   - Multiply price by quantity.

3. **Local units and package types**
   - Support pieza, paquete, lata, bolsa, botella, caja, docena, kg, g, L, ml, manojo, medio kilo, cuarto, rollo.

4. **Custom storage and shopping locations**
   - Let households define where an item lives and where they usually buy it.

5. **Use-first dashboard**
   - Combine expiration urgency and depletion planning into "usar primero" and "comprar pronto".

### P1: Strong Follow-Up

6. **Shared household workspace**
   - Real-time or near-real-time sync.
   - Permission levels: owner, editor, viewer.

7. **Staples master list**
   - Mark product types as recurring staples.
   - Use recent purchases and depletion rules to suggest restocking.

8. **Offline-capable PWA/Android-first behavior**
   - Make inventory and list capture work without a reliable connection.
   - Sync when online.

9. **Waste and savings summaries**
   - Show avoided duplicate purchases, consumed-before-expired items, and thrown-away items.

10. **Store-route category ordering**
   - Reorder categories to match a user's usual supermarket, mercado, or tiendita route.
   - Status: initial fixed LatAm route ordering is implemented; custom per-household ordering remains later.

### P2: Later Differentiators

11. **Receipt capture**
   - Convert receipt photos into inventory lots or shopping history.
   - Require user confirmation before adding.

12. **Shelf photo capture**
   - Detect visible items from a pantry/fridge shelf photo.
   - Treat as a suggestion, not source of truth.

13. **Latin American warning-label metadata**
   - Useful for households that care about warning seals.
   - Keep optional and transparent.

14. **Leftovers/prepared food lots**
   - Track cooked food with short expiration and storage location.

15. **Retailer handoff**
   - Export or deep-link to Rappi, Walmart, supermarket apps, or delivery services only after deciding market focus.

## Features To Deprioritize For Now

- Full meal planning as the main product.
- Real-time supermarket price comparison.
- Delivery marketplace integration.
- AI automatic inventory as a first major feature.
- Barcode-only onboarding.
- Public social/community features.

## Security And Privacy Concerns

- Household inventory can reveal habits, location, diet, health needs, pets, children, and income patterns.
- Shared links should expire and have limited permissions.
- Receipt and image capture can expose store, payment, address, and purchase data.
- AI/image processing should clearly state what leaves the device.
- Product and price history should be exportable and deletable.

## Recommended Next Step

Turn the P0 list into a short product discovery spec:

1. Define the first target country and vocabulary defaults.
2. Decide whether the first user-facing brand is still PantryList or a Spanish candidate like DespensaLista.
3. Interview or dogfood with 5 households using different shopping patterns: supermarket-only, tiendita/mercado, delivery app, warehouse club, and mixed.
4. Build the first implementation plan around budgeted shopping mode, local units, WhatsApp-friendly export, and custom locations.
