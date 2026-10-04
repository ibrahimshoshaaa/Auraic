import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { CouponAdmin } from "@/components/coupons/CouponAdmin";
export default async function CouponsPage() { const session = await requireAuth(); if (!can(session.role, "products.write")) throw new Error("Forbidden"); return <CouponAdmin />; }
