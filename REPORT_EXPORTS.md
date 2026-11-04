# Report exports and prior-return warnings

Reports on web and Flutter provide PDF and Excel export for the displayed reporting period. The shared authenticated endpoint is `GET /api/reports/export?format=pdf|xlsx&period=...&from=...&to=...`. It uses the same report service, time zone, currency exclusions and permissions as the dashboard (`reports.read`: owner/manager). Files are private/no-store. Values are report results, not a new accounting calculation. Excel has typed numeric cells, complete detail sheets and a calculation-notes sheet. PDF embeds the OFL Amiri font and repeats table headings across pages. Missing values stay blank in Excel and a dash in PDF. Inventory is a current snapshot plus period movements, not a historical closing balance.

The admin orders list displays a warning when the same normalized phone number belongs to an older order currently marked `RETURNED`. It never blocks order creation or changes order states. The current order and orders placed later are excluded. Names alone are not used for matching. The list includes the count; opening history calls the store-scoped `GET /api/orders/:id/return-history` and links to returned orders. Both endpoints require `orders.read`, including for employees who can already read orders. No reason such as refusal to receive is inferred.

No schema changes or production business-data modifications are required. Existing local/international/Arabic phone formats use the established customer normalization. A signed Android rebuild is required for the new export/share and history screens. Files can be saved/shared through the phone's system share menu.

Scope: original `ibrahimshoshaaa/Auraic` only. Transfer to the client repository requires the user's subsequent instruction.
