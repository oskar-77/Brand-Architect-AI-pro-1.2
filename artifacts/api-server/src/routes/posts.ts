import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, postsTable, brandsTable, campaignsTable } from "@workspace/db";
import {
  GetPostParams,
  UpdatePostParams,
  UpdatePostBody,
  RegeneratePostParams,
  GeneratePostImageParams,
} from "@workspace/api-zod";
import { openai, generateImageBuffer, generateImageWithLogoReference, type ImageSize } from "@workspace/integrations-openai-ai-server";
import { asyncHandler } from "../lib/asyncHandler";
import { generatePostVariant, type BrandKit } from "../lib/ai";

const router: IRouter = Router();

// ─── Get post ─────────────────────────────────────────────────────────────────

router.get("/posts/:id", asyncHandler(async (req, res) => {
  const params = GetPostParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  res.json({ ...post, createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString() });
}));

// ─── Update post ──────────────────────────────────────────────────────────────

router.patch("/posts/:id", asyncHandler(async (req, res) => {
  const params = UpdatePostParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdatePostBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.caption !== undefined) updateData.caption = parsed.data.caption;
  if (parsed.data.hook !== undefined) updateData.hook = parsed.data.hook;
  if (parsed.data.cta !== undefined) updateData.cta = parsed.data.cta;
  if (parsed.data.hashtags !== undefined) updateData.hashtags = parsed.data.hashtags;
  if (parsed.data.imagePrompt !== undefined) updateData.imagePrompt = parsed.data.imagePrompt;
  if (parsed.data.platform !== undefined) updateData.platform = parsed.data.platform;

  const [post] = await db.update(postsTable).set(updateData).where(eq(postsTable.id, params.data.id)).returning();
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  res.json({ ...post, createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString() });
}));

// ─── Generate image (logo reference via images.edit, compositing client-side) ─

router.post("/posts/:id/generate-image", asyncHandler(async (req, res) => {
  const params = GeneratePostImageParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const body = req.body as {
    customPrompt?: string;
    size?: ImageSize;
    model?: "nano" | "mini" | "pro";
    logoDataUrl?: string;
    overlayText?: string;
    brandName?: string;
  };

  const size: ImageSize = (["1024x1024", "1024x1536", "1536x1024", "auto"].includes(body.size ?? ""))
    ? (body.size as ImageSize)
    : "1024x1024";
  const model = body.model ?? "pro";
  const logoDataUrl = body.logoDataUrl?.trim() || null;
  const overlayText = body.overlayText?.trim() || null;
  const brandName = body.brandName?.trim() || null;

  let basePrompt = body.customPrompt?.trim() || post.imagePrompt;

  // Determine orientation-aware logo placement instruction
  const logoPlacement = size === "1024x1536"
    ? "lower-center area, leaving the top two-thirds clear for the main visual"
    : size === "1536x1024"
    ? "top-left corner, with the main visual occupying the right side"
    : "top-right corner, keeping the subject in the left 70% of the frame";

  // Append overlay text instruction if provided
  if (overlayText) {
    basePrompt += `. Include the following text rendered clearly and legibly in the design: "${overlayText}"`;
  }

  // Append logo placement instruction when logo reference will be used
  if (logoDataUrl && brandName) {
    basePrompt += `. The brand logo for "${brandName}" is provided as a reference — incorporate it naturally in the ${logoPlacement}. Match the logo's color scheme in the overall palette.`;
  } else if (brandName) {
    basePrompt += `. Reserve a clean area in the ${logoPlacement} for the brand logo to be composited on top.`;
  }

  // Enhance prompt based on model
  let finalPrompt: string;
  if (model === "nano") {
    finalPrompt = basePrompt;
  } else if (model === "mini") {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 300,
      messages: [{
        role: "user",
        content: `Enhance this social media design prompt to be more vivid and detailed for AI image generation. Keep all logo placement and text instructions exactly as written. Return only the enhanced prompt:\n\n${basePrompt}`,
      }],
    });
    finalPrompt = response.choices[0]?.message?.content?.trim() ?? basePrompt;
  } else {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 400,
      messages: [{
        role: "user",
        content: `You are a professional art director and social media designer. Enhance this design prompt with rich visual details, typography guidance, lighting, mood, and cinematic composition to produce a stunning commercial-quality social media image. Keep all logo placement, text overlay, and brand instructions exactly as written. Return only the enhanced prompt:\n\n${basePrompt}`,
      }],
    });
    finalPrompt = response.choices[0]?.message?.content?.trim() ?? basePrompt;
  }

  // Generate with logo reference (images.edit) or standard generate
  let imageBuffer: Buffer;
  if (logoDataUrl) {
    imageBuffer = await generateImageWithLogoReference(logoDataUrl, finalPrompt, size);
  } else {
    imageBuffer = await generateImageBuffer(finalPrompt, size);
  }

  const imageUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;

  const [updated] = await db
    .update(postsTable)
    .set({ imageUrl })
    .where(eq(postsTable.id, params.data.id))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
}));

// ─── Regenerate post content ──────────────────────────────────────────────────

router.post("/posts/:id/regenerate", asyncHandler(async (req, res) => {
  const params = RegeneratePostParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, post.campaignId));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, campaign.brandId));
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  const kit = brand.brandKit as BrandKit | null;
  const primaryColor = kit?.colorPalette?.primary ?? "#6366F1";
  const style = kit?.visualStyle ?? "minimal";
  const tone = kit?.toneOfVoice ?? "professional and clear";
  const personality = kit?.personality ?? "";
  const pillarsList = kit?.messagingPillars?.join(" | ") ?? "";

  const platform = post.platform ?? "instagram";
  const platformTone = platform === "linkedin"
    ? "professional, thought-leadership focused, no casual slang, authoritative"
    : platform === "twitter"
    ? "punchy, concise, conversational, under 280 chars for hook"
    : platform === "facebook"
    ? "community-focused, conversational, slightly longer stories"
    : "visual-first, engaging, uses emojis, energetic";

  const prompt = `You are a world-class social media copywriter. Regenerate a completely FRESH, UNIQUE version of this Day ${post.day} ${platform} post for "${brand.companyName}" in the ${brand.industry} industry.

Original post (do NOT repeat this — create something completely different):
- Hook: ${post.hook}
- Caption excerpt: ${post.caption.slice(0, 100)}
- CTA: ${post.cta}

Brand personality: ${personality}
Tone of voice: ${tone}
Messaging pillars: ${pillarsList}
Platform tone for ${platform}: ${platformTone}
Visual style: ${style}

Create a DIFFERENT hook structure, different emotional angle, different story. Make it feel fresh and surprising.

Return ONLY valid JSON:
{
  "hook": "completely new hook — different structure and angle from original",
  "caption": "fresh full caption from a completely different angle (3-5 paragraphs, line breaks, ends with CTA naturally embedded)",
  "cta": "different compelling call to action",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "imagePrompt": "different scene: [describe], ${style} aesthetic, ${primaryColor} dominant color accent, cinematic lighting, composition: subject in left 75% of frame, clean top-right corner for logo, no text no logos in image, 16:9 ultra-high quality"
}`;

  let newContent: { hook: string; caption: string; cta: string; hashtags: string[]; imagePrompt: string };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      max_completion_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = response.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    newContent = JSON.parse(cleaned);
  } catch {
    newContent = {
      hook: `Here is what nobody in ${brand.industry} will tell you about Day ${post.day}...`,
      caption: `The truth about ${brand.companyName} is simpler than most people expect.\n\nWe do not chase trends. We build systems.\n\nSystems that generate consistent results for businesses who are serious about growth in ${brand.industry}.\n\nIf that is you — the link in bio is waiting.`,
      cta: "See how we work",
      hashtags: [`#${brand.companyName.replace(/\s+/g, "")}`, `#${brand.industry.replace(/\s+/g, "")}`, "#GrowthStrategy", "#Results", "#BusinessSuccess"],
      imagePrompt: `Abstract commercial concept: growth and innovation in ${brand.industry}. ${style} aesthetic, ${primaryColor} color accent, studio lighting, clean top-right corner for logo, no text, no logos. 16:9 ultra-high quality.`,
    };
  }

  const [updated] = await db
    .update(postsTable)
    .set({ caption: newContent.caption, hook: newContent.hook, cta: newContent.cta, hashtags: newContent.hashtags, imagePrompt: newContent.imagePrompt })
    .where(eq(postsTable.id, params.data.id))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
}));

// ─── Generate A/B variant ─────────────────────────────────────────────────────

router.post("/posts/:id/generate-variant", asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, post.campaignId));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, campaign.brandId));
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  const kit = brand.brandKit as BrandKit | null;
  if (!kit) { res.status(400).json({ error: "Brand kit not generated yet" }); return; }

  const variant = await generatePostVariant(brand.companyName, brand.industry, kit, {
    hook: post.hook,
    caption: post.caption,
    cta: post.cta,
    platform: post.platform,
    day: post.day,
  });

  res.json(variant);
}));

// ─── Generate long-form content ───────────────────────────────────────────────

router.post("/posts/:id/generate-content", asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const { contentType = "blog" } = req.body as { contentType?: string };
  if (!["blog", "email", "newsletter"].includes(contentType)) {
    res.status(400).json({ error: "contentType must be blog | email | newsletter" });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, post.campaignId));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, campaign.brandId));
  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  const kit = brand.brandKit as BrandKit | null;
  if (!kit) { res.status(400).json({ error: "Brand kit not generated yet" }); return; }

  const { generateLongFormContent } = await import("../lib/ai");
  const content = await generateLongFormContent(
    brand.companyName, brand.companyDescription, brand.industry, kit,
    contentType as "blog" | "email" | "newsletter",
    post.hook
  );

  res.json(content);
}));

export default router;
