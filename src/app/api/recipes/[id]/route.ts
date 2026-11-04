import { recipeForAccess } from "@/lib/access-data";
import { NextRequest, NextResponse } from "next/server";
import { getRecipe, getRecipeVersionCost, currentVersionOf } from "@/services/recipe.service";
import { requireAuth, getStoreId } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!can(session, "recipes.read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const storeId = getStoreId(session);
    const { id } = await params;

    const recipe = await getRecipe(storeId, id);
    if (!recipe) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const current = currentVersionOf(recipe);
    const cost = current ? await getRecipeVersionCost(storeId, current.id) : null;

    return NextResponse.json({
      data: { ...recipeForAccess(recipe, session), currentVersionId: current?.id ?? null, cost: can(session, "costs.read") ? cost : undefined },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
