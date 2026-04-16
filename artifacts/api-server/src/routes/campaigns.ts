import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, campaignsTable, postsTable, brandsTable } from "@workspace/db";
import {
  GetCampaignParams,
} from "@workspace/api-zod";
import { asyncHandler } from "../lib/asyncHandler";
import type { BrandKit } from "../lib/ai";

const router: IRouter = Router();

router.get("/campaigns/:id", asyncHandler(async (req, res) => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, params.data.id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, campaign.brandId));

  const posts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.campaignId, params.data.id))
    .orderBy(postsTable.day);

  const kit = brand?.brandKit as BrandKit | null;
  const primaryColor = kit?.colorPalette?.primary ?? "#6366F1";

  res.json({
    id: campaign.id,
    brandId: campaign.brandId,
    title: campaign.title,
    strategy: campaign.strategy,
    days: campaign.days,
    posts: posts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    brand: brand ? {
      companyName: brand.companyName,
      companyDescription: brand.companyDescription,
      industry: brand.industry,
      logoUrl: brand.logoUrl,
      primaryColor,
      brandKit: brand.brandKit,
    } : null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  });
}));

export default router;
