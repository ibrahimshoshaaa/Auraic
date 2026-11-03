import { db } from "@/lib/db";
import { pageTitle, percentage, trafficComparable, trafficPoints, trafficRange, type BucketRow } from "@/lib/storefront/traffic-report";
type Totals = { views: bigint; visits: bigint; previousViews: bigint; previousVisits: bigint; active: bigint; singlePage: bigint; products: bigint; cart: bigint; checkout: bigint; lastVisit: Date | null; collectionStarted: Date | null };
type PageRow = { path: string; views: bigint; visits: bigint; lastSeen: Date };
export async function getTrafficReport(storeId: string, input: unknown, now = new Date()) {
  const range = trafficRange(input, now);
  const [summaries, buckets, pageRows] = await Promise.all([
    db.$queryRaw<Totals[]>`
      WITH current_sessions AS (
        SELECT "session", COUNT(*) AS views, BOOL_OR("path" = '/cart') AS cart,
          BOOL_OR("path" = '/checkout') AS checkout,
          BOOL_OR("path" = '/products' OR "path" LIKE '/products/%' OR "path" = '/samples') AS products,
          MAX("createdAt") AS latest
        FROM "StoreVisit" WHERE "storeId" = ${storeId} AND "createdAt" >= ${range.from} AND "createdAt" < ${range.to}
        GROUP BY "session"
      )
      SELECT COALESCE(SUM(views), 0)::bigint AS views, COUNT(*) AS visits,
        COUNT(*) FILTER (WHERE latest >= ${new Date(now.getTime() - 900_000)}) AS active,
        COUNT(*) FILTER (WHERE views = 1) AS "singlePage", COUNT(*) FILTER (WHERE products) AS products,
        COUNT(*) FILTER (WHERE cart) AS cart, COUNT(*) FILTER (WHERE checkout) AS checkout, MAX(latest) AS "lastVisit",
        (SELECT COUNT(*) FROM "StoreVisit" WHERE "storeId" = ${storeId} AND "createdAt" >= ${range.previousFrom} AND "createdAt" < ${range.from}) AS "previousViews",
        (SELECT COUNT(DISTINCT "session") FROM "StoreVisit" WHERE "storeId" = ${storeId} AND "createdAt" >= ${range.previousFrom} AND "createdAt" < ${range.from}) AS "previousVisits",
        (SELECT MIN(finished_at) FROM "_prisma_migrations" WHERE migration_name = '20261103040000_store_traffic' AND rolled_back_at IS NULL) AS "collectionStarted"
      FROM current_sessions`,
    db.$queryRaw<BucketRow[]>`
      SELECT CASE WHEN ${range.days} = 1 THEN to_char("createdAt", 'YYYY-MM-DD"T"HH24')
        ELSE to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Cairo', 'YYYY-MM-DD') END AS bucket,
        COUNT(*) AS views, COUNT(DISTINCT "session") AS visits
      FROM "StoreVisit" WHERE "storeId" = ${storeId} AND "createdAt" >= ${range.from} AND "createdAt" < ${range.to}
      GROUP BY bucket ORDER BY bucket`,
    db.$queryRaw<PageRow[]>`
      SELECT path, COUNT(*) AS views, COUNT(DISTINCT "session") AS visits, MAX("createdAt") AS "lastSeen"
      FROM "StoreVisit" WHERE "storeId" = ${storeId} AND "createdAt" >= ${range.from} AND "createdAt" < ${range.to}
      GROUP BY path ORDER BY views DESC, path ASC LIMIT 15`,
  ]);
  const productIds = pageRows.filter(row => row.path.startsWith("/products/")).map(row => row.path.slice("/products/".length));
  const products = productIds.length ? await db.product.findMany({ where: { storeId, id: { in: productIds } }, select: { id: true, title: true } }) : [];
  const productNames = new Map(products.map(product => [product.id, product.title]));
  const summary = summaries[0];
  const views = Number(summary.views), visits = Number(summary.visits);
  const points = trafficPoints(range, buckets);
  return { range, views, visits, previousViews: Number(summary.previousViews), previousVisits: Number(summary.previousVisits),
    comparable: trafficComparable(range, summary.collectionStarted), collectionStarted: summary.collectionStarted,
    active: Number(summary.active), singlePage: Number(summary.singlePage), lastVisit: summary.lastVisit,
    averageDepth: visits ? views / visits : 0, checkoutShare: percentage(Number(summary.checkout), visits),
    stages: [{ label: "زيارة المتجر", count: visits }, { label: "تصفح المنتجات أو العينات", count: Number(summary.products) }, { label: "فتح صفحة السلة", count: Number(summary.cart) }, { label: "فتح إتمام الطلب", count: Number(summary.checkout) }],
    points, peak: points.reduce<(typeof points)[number] | null>((best, point) => point.views > (best?.views ?? 0) ? point : best, null),
    pages: pageRows.map(row => ({ label: productNames.get(row.path.slice("/products/".length)) || pageTitle(row.path), path: row.path, views: Number(row.views), visits: Number(row.visits), share: percentage(Number(row.views), views), lastSeen: row.lastSeen })),
  };
}
