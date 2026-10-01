# Deployment and verification

Use PostgreSQL and configure DATABASE_URL, AUTH_SECRET (at least 32 random characters), NEXT_PUBLIC_APP_URL and STOREFRONT_STORE_ID. See STOREFRONT_SETUP.md for owner setup, product publishing and optional image uploads.

Apply committed migrations with `npx prisma migrate deploy`, or run **Apply production database migrations** in GitHub Actions. Back up existing production data before schema changes. Never reset production databases.

The external commerce removal migration deletes connection credentials, sync logs and external identifiers. It keeps products, variants, recipes, customers on orders, payments, expenses, returns and inventory records. Imported orders enter the local workflow using their saved stage. A fulfilled shipment remains SHIPPING; fulfillment alone does not prove delivery. Existing paid amounts are preserved.

Historical migrations remain unchanged so deployed databases retain valid migration checksums. They create the old integration structures on fresh databases, then the removal migration deletes those structures.

Run `npm run db:generate`, `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`. CI applies all migrations to disposable PostgreSQL and verifies database scoping, rollback, mobile authentication and public checkout. Flutter Android checks the mobile app separately.

Before selling, test a full order, material consumption, shipment, delivery, returns and financial reports. Public checkout supports cash on delivery and a unified shipping fee. Cart contents do not reserve inventory.
