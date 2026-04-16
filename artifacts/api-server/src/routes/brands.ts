import { Router, type IRouter } from "express";
import { eq, desc, count, sql } from "drizzle-orm";
import { db, brandsTable, campaignsTable, postsTable } from "@workspace/db";
import {
  CreateBrandBody,
  UpdateBrandBody,
  GetBrandParams,
  UpdateBrandParams,
  DeleteBrandParams,
  GenerateBrandKitParams,
  GenerateCampaignParams,
  GenerateCampaignBody,
  GetBrandStatsParams,
} from "@workspace/api-zod";
import { generateBrandKit, generateCampaign, generateBrandStory, generateLongFormContent, type BrandKit } from "../lib/ai";
import { asyncHandler } from "../lib/asyncHandler";

const router: IRouter = Router();

// ─── List brands ──────────────────────────────────────────────────────────────

router.get("/brands", asyncHandler(async (_req, res) => {
  const brands = await db
    .select({
      id: brandsTable.id,
      companyName: brandsTable.companyName,
      industry: brandsTable.industry,
      logoUrl: brandsTable.logoUrl,
      status: brandsTable.status,
      createdAt: brandsTable.createdAt,
      updatedAt: brandsTable.updatedAt,
    })
    .from(brandsTable)
    .orderBy(desc(brandsTable.createdAt));
  res.json(brands);
}));

// ─── Create brand ─────────────────────────────────────────────────────────────

router.post("/brands", asyncHandler(async (req, res) => {
  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [brand] = await db
    .insert(brandsTable)
    .values({
      companyName: parsed.data.companyName,
      companyDescription: parsed.data.companyDescription,
      industry: parsed.data.industry,
      websiteUrl: parsed.data.websiteUrl ?? null,
      logoUrl: parsed.data.logoUrl ?? null,
      status: "draft",
    })
    .returning();

  res.status(201).json({ ...brand, brandKit: brand.brandKit ?? null, createdAt: brand.createdAt.toISOString(), updatedAt: brand.updatedAt.toISOString() });
}));

// ─── Get brand ────────────────────────────────────────────────────────────────

router.get("/brands/:id", asyncHandler(async (req, res) => {
  const params = GetBrandParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, params.data.id));
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  res.json({ ...brand, brandKit: brand.brandKit ?? null, createdAt: brand.createdAt.toISOString(), updatedAt: brand.updatedAt.toISOString() });
}));

// ─── Update brand ─────────────────────────────────────────────────────────────

router.patch("/brands/:id", asyncHandler(async (req, res) => {
  const params = UpdateBrandParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateBrandBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.companyName !== undefined) updateData.companyName = parsed.data.companyName;
  if (parsed.data.companyDescription !== undefined) updateData.companyDescription = parsed.data.companyDescription;
  if (parsed.data.industry !== undefined) updateData.industry = parsed.data.industry;
  if (parsed.data.websiteUrl !== undefined) updateData.websiteUrl = parsed.data.websiteUrl;
  if (parsed.data.logoUrl !== undefined) updateData.logoUrl = parsed.data.logoUrl;

  const [brand] = await db.update(brandsTable).set(updateData).where(eq(brandsTable.id, params.data.id)).returning();
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  res.json({ ...brand, brandKit: brand.brandKit ?? null, createdAt: brand.createdAt.toISOString(), updatedAt: brand.updatedAt.toISOString() });
}));

// ─── Delete brand ─────────────────────────────────────────────────────────────

router.delete("/brands/:id", asyncHandler(async (req, res) => {
  const params = DeleteBrandParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [brand] = await db.delete(brandsTable).where(eq(brandsTable.id, params.data.id)).returning();
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  res.sendStatus(204);
}));

// ─── Generate brand kit ───────────────────────────────────────────────────────

router.post("/brands/:id/generate-kit", asyncHandler(async (req, res) => {
  const params = GenerateBrandKitParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, params.data.id));
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  const { brandColors = [], targetAudience, brandValues, tonePreference } = req.body as {
    brandColors?: string[];
    targetAudience?: string;
    brandValues?: string[];
    tonePreference?: string;
  };

  // Enrich company description with additional profile data
  let enrichedDescription = brand.companyDescription;
  if (targetAudience) enrichedDescription += ` Target audience: ${targetAudience}.`;
  if (brandValues && brandValues.length > 0) enrichedDescription += ` Core values: ${brandValues.join(", ")}.`;
  if (tonePreference) enrichedDescription += ` Communication tone preference: ${tonePreference}.`;

  const kit = await generateBrandKit(brand.companyName, enrichedDescription, brand.industry, brandColors);

  const [updated] = await db
    .update(brandsTable)
    .set({ brandKit: kit, status: "kit_ready" })
    .where(eq(brandsTable.id, params.data.id))
    .returning();

  res.json({ ...updated, brandKit: updated.brandKit ?? null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
}));

// ─── Generate / regenerate brand story ───────────────────────────────────────

router.post("/brands/:id/generate-story", asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid brand id" }); return; }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, id));
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  const kit = brand.brandKit as BrandKit | null;
  if (!kit) { res.status(400).json({ error: "Generate brand kit first" }); return; }

  const story = await generateBrandStory(brand.companyName, brand.companyDescription, brand.industry, kit);

  // Update the brandStory field inside the kit JSON
  const updatedKit = { ...kit, brandStory: story };
  const [updated] = await db
    .update(brandsTable)
    .set({ brandKit: updatedKit })
    .where(eq(brandsTable.id, id))
    .returning();

  res.json({ brandStory: story, brand: { ...updated, brandKit: updated.brandKit, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } });
}));

// ─── Generate long-form content for brand ─────────────────────────────────────

router.post("/brands/:id/generate-content", asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid brand id" }); return; }

  const { contentType = "blog", topic } = req.body as { contentType?: string; topic?: string };
  if (!["blog", "email", "newsletter"].includes(contentType)) {
    res.status(400).json({ error: "contentType must be blog | email | newsletter" });
    return;
  }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, id));
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  const kit = brand.brandKit as BrandKit | null;
  if (!kit) { res.status(400).json({ error: "Generate brand kit first" }); return; }

  const content = await generateLongFormContent(
    brand.companyName, brand.companyDescription, brand.industry, kit,
    contentType as "blog" | "email" | "newsletter",
    topic
  );

  res.json(content);
}));

// ─── Generate campaign ────────────────────────────────────────────────────────

router.post("/brands/:id/generate-campaign", asyncHandler(async (req, res) => {
  const params = GenerateCampaignParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const bodyParsed = GenerateCampaignBody.safeParse(req.body ?? {});
  const brief = bodyParsed.success ? (bodyParsed.data.brief ?? undefined) : undefined;
  const postCount = bodyParsed.success ? (bodyParsed.data.postCount ?? 7) : 7;
  const platforms = (req.body as { platforms?: string[] })?.platforms ?? ["instagram"];

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, params.data.id));
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  let kit = brand.brandKit as BrandKit | null;

  if (!kit) {
    kit = await generateBrandKit(brand.companyName, brand.companyDescription, brand.industry);
    await db.update(brandsTable).set({ brandKit: kit, status: "kit_ready" }).where(eq(brandsTable.id, params.data.id));
  }

  const campaignData = await generateCampaign(
    brand.companyName, brand.companyDescription, brand.industry, kit, brief, postCount, platforms
  );

  const [campaign] = await db
    .insert(campaignsTable)
    .values({ brandId: brand.id, title: campaignData.title, strategy: campaignData.strategy, days: campaignData.days })
    .returning();

  const insertedPosts = await db
    .insert(postsTable)
    .values(
      campaignData.posts.map((p) => ({
        campaignId: campaign.id,
        day: p.day,
        caption: p.caption,
        hook: p.hook,
        cta: p.cta,
        hashtags: p.hashtags,
        imagePrompt: p.imagePrompt,
        platform: p.platform,
      }))
    )
    .returning();

  await db.update(brandsTable).set({ status: "active" }).where(eq(brandsTable.id, brand.id));

  res.json({
    id: campaign.id,
    brandId: campaign.brandId,
    title: campaign.title,
    strategy: campaign.strategy,
    days: campaign.days,
    posts: insertedPosts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })),
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  });
}));

// ─── Get brand campaigns ──────────────────────────────────────────────────────

router.get("/brands/:id/campaigns", asyncHandler(async (req, res) => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const brandId = parseInt(raw, 10);
  if (isNaN(brandId)) { res.status(400).json({ error: "Invalid brand id" }); return; }

  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.brandId, brandId))
    .orderBy(desc(campaignsTable.createdAt));

  const campaignIds = campaigns.map((c) => c.id);
  const allPosts =
    campaignIds.length > 0
      ? await db.select().from(postsTable).where(sql`${postsTable.campaignId} = ANY(${sql.raw(`ARRAY[${campaignIds.join(",")}]`)})`)
      : [];

  const result = campaigns.map((c) => ({
    id: c.id,
    brandId: c.brandId,
    title: c.title,
    strategy: c.strategy,
    days: c.days,
    posts: allPosts.filter((p) => p.campaignId === c.id).map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  res.json(result);
}));

// ─── Get brand stats ──────────────────────────────────────────────────────────

router.get("/brands/:id/stats", asyncHandler(async (req, res) => {
  const params = GetBrandStatsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, params.data.id));
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  const campaigns = await db
    .select({ id: campaignsTable.id, createdAt: campaignsTable.createdAt })
    .from(campaignsTable)
    .where(eq(campaignsTable.brandId, params.data.id))
    .orderBy(desc(campaignsTable.createdAt));

  const campaignIds = campaigns.map((c) => c.id);
  let totalPosts = 0;
  let postsWithImages = 0;

  if (campaignIds.length > 0) {
    const [row] = await db
      .select({ cnt: count() })
      .from(postsTable)
      .where(sql`${postsTable.campaignId} = ANY(${sql.raw(`ARRAY[${campaignIds.join(",")}]`)})`);
    totalPosts = Number(row?.cnt ?? 0);

    const [imgRow] = await db
      .select({ cnt: count() })
      .from(postsTable)
      .where(sql`${postsTable.campaignId} = ANY(${sql.raw(`ARRAY[${campaignIds.join(",")}]`)}) AND ${postsTable.imageUrl} IS NOT NULL`);
    postsWithImages = Number(imgRow?.cnt ?? 0);
  }

  res.json({
    brandId: params.data.id,
    totalCampaigns: campaigns.length,
    totalPosts,
    postsWithImages,
    brandKitGenerated: brand.brandKit != null,
    hasExtendedKit: !!(brand.brandKit as BrandKit | null)?.brandStory,
    lastCampaignDate: campaigns[0]?.createdAt?.toISOString() ?? null,
  });
}));

export default router;
