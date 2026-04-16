import { useParams, Link } from "wouter";
import { useState } from "react";
import {
  useGetCampaign, useUpdatePost, useRegeneratePost,
  getGetCampaignQueryKey, getGetPostQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Calendar, Edit3, Check, X, RefreshCw, Loader2, Hash, Image as ImageIcon,
  Megaphone, Sparkles, Wand2, Copy, CheckCircle2, Download, Layers, FileText,
  Mail, Newspaper, ChevronDown, TestTube2, Instagram, Linkedin, Twitter, Facebook,
  ZoomIn, BarChart2, Target, Settings2, Zap,
} from "lucide-react";
import type { SocialPost } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostVariant {
  hook: string;
  caption: string;
  cta: string;
  hashtags: string[];
  imagePrompt: string;
}

interface LongFormContent {
  type: string;
  title: string;
  content: string;
  metaDescription?: string;
  subjectLine?: string;
}

type ImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
type StylePreset = "minimalist" | "bold" | "luxury" | "futuristic" | "cinematic" | "natural" | "vibrant" | "moody";

interface ImageGenOptions {
  customPrompt: string;
  size: ImageSize;
  model: "nano" | "mini" | "pro";
  overlayText: string;
  includeLogo: boolean;
  logoDataUrl?: string;
}

interface BrandKitData {
  personality?: string;
  visualStyle?: string;
  toneOfVoice?: string;
  colorPalette?: { primary?: string; secondary?: string; accent?: string };
  visualStyleRules?: string;
}

// ─── Professional prompt builder ──────────────────────────────────────────────

function buildAutoPrompt(opts: {
  brandName: string;
  brandDescription?: string;
  industry?: string;
  personality?: string;
  visualStyle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  postConcept?: string;
  platform?: string;
  stylePreset: StylePreset;
  overlayText?: string;
}): string {
  const styleDescriptions: Record<StylePreset, string> = {
    minimalist: "ultra-clean minimalist composition, generous negative space, refined and breathable layout, subtle color gradients, elegant restraint",
    bold: "bold graphic design, high-impact visual contrast, dynamic geometric shapes, powerful color blocking, striking and unforgettable",
    luxury: "premium luxury aesthetic, gold and platinum accents, deep rich jewel tones, velvet-like textures, sophisticated editorial elegance, high-end campaign quality",
    futuristic: "sleek futuristic tech aesthetic, neon glows on dark backgrounds, holographic iridescent highlights, cyberpunk-inspired precision, cutting-edge digital art",
    cinematic: "cinematic wide-angle composition, dramatic Rembrandt lighting, shallow depth of field, film grain texture, moody atmospheric haze, Hollywood blockbuster quality",
    natural: "organic natural aesthetic, warm earthy tones, lush botanical elements, soft diffused daylight, authentic handcrafted feel, serene and grounded",
    vibrant: "vivid vibrant colors, electric energy, bold color blocking, playful graphic pop-art elements, eye-catching contrast, joyful and dynamic",
    moody: "dark moody chiaroscuro atmosphere, dramatic deep shadows, low-key editorial lighting, mysterious and introspective, cinematic darkness with glowing focal highlights",
  };

  const platformNote = opts.platform === "instagram"
    ? "square-format Instagram post, visually arresting and highly shareable"
    : opts.platform === "linkedin"
    ? "LinkedIn professional graphic, clean authoritative visual storytelling"
    : opts.platform === "twitter"
    ? "Twitter/X card image, bold and instantly readable at thumbnail size"
    : "Facebook post image, emotionally engaging and community-oriented";

  const colorClue = opts.primaryColor
    ? `dominant palette anchored in ${opts.primaryColor}${opts.secondaryColor ? ` with ${opts.secondaryColor} accents` : ""}`
    : "brand-harmonious color palette";

  const visualStyleMap: Record<string, string> = {
    tech: "cutting-edge technology visual language",
    luxury: "premium luxury and high-end sophistication",
    bold: "bold energetic graphic design language",
    minimal: "clean Scandinavian minimalist design",
  };
  const brandVisual = opts.visualStyle ? (visualStyleMap[opts.visualStyle] ?? opts.visualStyle) : "contemporary brand aesthetic";

  const parts: string[] = [
    `Professional ${platformNote}`,
    opts.industry ? `crafted for a ${opts.industry} brand` : "",
    styleDescriptions[opts.stylePreset],
    colorClue,
    brandVisual,
    opts.postConcept ? `Visual story: ${opts.postConcept.slice(0, 140)}.` : "",
    opts.personality ? `Brand character: ${opts.personality.slice(0, 90)}.` : "",
    "Commercial photography quality, studio-grade three-point lighting, ultra-sharp 8K detail, award-winning advertising composition.",
    "Subject positioned in the left-center 65% of the frame — clean open space in the upper-right quadrant reserved for brand logo overlay.",
    "No embedded logos, watermarks, or text in the raw image.",
    opts.overlayText
      ? `Render the text "${opts.overlayText}" prominently in the design using elegant on-brand typography, perfectly legible at social media resolution.`
      : "",
  ];

  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: React.ElementType;
}> = {
  instagram: { label: "Instagram", color: "#E1306C", bgColor: "bg-pink-50 dark:bg-pink-950/40", textColor: "text-pink-600 dark:text-pink-400", icon: Instagram },
  linkedin: { label: "LinkedIn", color: "#0A66C2", bgColor: "bg-blue-50 dark:bg-blue-950/40", textColor: "text-blue-600 dark:text-blue-400", icon: Linkedin },
  twitter: { label: "X / Twitter", color: "#000000", bgColor: "bg-slate-50 dark:bg-slate-900", textColor: "text-slate-700 dark:text-slate-300", icon: Twitter },
  facebook: { label: "Facebook", color: "#1877F2", bgColor: "bg-blue-50 dark:bg-blue-950/40", textColor: "text-blue-700 dark:text-blue-300", icon: Facebook },
};

function PlatformBadge({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG.instagram;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold", cfg.bgColor, cfg.textColor)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// Strip background from logo using canvas (corner-sample approach)
async function removeLogoBackground(logoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      // Sample the 4 corners to detect background color
      const corners = [
        [d[0], d[1], d[2]],
        [d[(canvas.width - 1) * 4], d[(canvas.width - 1) * 4 + 1], d[(canvas.width - 1) * 4 + 2]],
        [d[(canvas.height - 1) * canvas.width * 4], d[(canvas.height - 1) * canvas.width * 4 + 1], d[(canvas.height - 1) * canvas.width * 4 + 2]],
        [d[((canvas.height - 1) * canvas.width + canvas.width - 1) * 4], d[((canvas.height - 1) * canvas.width + canvas.width - 1) * 4 + 1], d[((canvas.height - 1) * canvas.width + canvas.width - 1) * 4 + 2]],
      ];
      const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4);
      const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4);
      const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4);
      const tolerance = 50;
      for (let i = 0; i < d.length; i += 4) {
        const dist = Math.abs(d[i] - bgR) + Math.abs(d[i + 1] - bgG) + Math.abs(d[i + 2] - bgB);
        if (dist < tolerance) d[i + 3] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(logoUrl);
    img.src = logoUrl;
  });
}

// Canvas-based logo compositing in browser
async function compositeLogoOnImage(
  baseImageUrl: string,
  logoUrl: string | null | undefined,
  brandName: string,
  primaryColor: string
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.onload = () => {
      ctx.drawImage(baseImg, 0, 0, 1024, 1024);

      const barH = 72;
      const gradient = ctx.createLinearGradient(0, 1024 - barH, 0, 1024);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.75)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 1024 - barH, 1024, barH);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(brandName.toUpperCase(), 24, 1024 - barH / 2);

      ctx.fillStyle = primaryColor;
      ctx.fillRect(0, 1024 - 4, 1024, 4);

      if (logoUrl) {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.onload = () => {
          const maxW = 160;
          const maxH = 80;
          const ratio = Math.min(maxW / logoImg.width, maxH / logoImg.height);
          const w = logoImg.width * ratio;
          const h = logoImg.height * ratio;
          const x = 1024 - w - 20;
          const y = 20;

          const pad = 10;
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.beginPath();
          ctx.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, 10);
          ctx.fill();

          ctx.drawImage(logoImg, x, y, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        };
        logoImg.onerror = () => resolve(canvas.toDataURL("image/jpeg", 0.92));
        logoImg.src = logoUrl;
      } else {
        const initials = brandName
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase();
        const badgeSize = 64;
        const bx = 1024 - badgeSize - 20;
        const by = 20;
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeSize, badgeSize, 12);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${initials.length > 1 ? 22 : 28}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials, bx + badgeSize / 2, by + badgeSize / 2);
        ctx.textAlign = "left";
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      }
    };
    baseImg.onerror = () => resolve(baseImageUrl);
    baseImg.src = baseImageUrl;
  });
}

// ─── Image Generation Dialog ──────────────────────────────────────────────────

function AspectRatioIcon({ ratio }: { ratio: "portrait" | "square" | "landscape" | "auto" }) {
  if (ratio === "auto") return <Sparkles className="w-4 h-4" />;
  const w = ratio === "landscape" ? 20 : ratio === "square" ? 14 : 10;
  const h = ratio === "portrait" ? 20 : ratio === "square" ? 14 : 10;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="flex-shrink-0">
      <rect x="0.5" y="0.5" width={w - 1} height={h - 1} rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

function ImageGenDialog({
  open,
  onClose,
  onGenerate,
  onDownload,
  defaultPrompt,
  generating,
  brandLogoUrl,
  brandName,
  brandKit,
  brandIndustry,
  brandDescription,
  postConcept,
  postPlatform,
  hasExistingImage,
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (opts: ImageGenOptions) => void;
  onDownload: () => void;
  defaultPrompt: string;
  generating: boolean;
  brandLogoUrl?: string | null;
  brandName: string;
  brandKit?: BrandKitData | null;
  brandIndustry?: string;
  brandDescription?: string;
  postConcept?: string;
  postPlatform?: string;
  hasExistingImage: boolean;
}) {
  const [stylePreset, setStylePreset] = useState<StylePreset>("bold");
  const [overlayText, setOverlayText] = useState("");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [model, setModel] = useState<"nano" | "mini" | "pro">("pro");
  const [includeLogo, setIncludeLogo] = useState(!!brandLogoUrl);
  const [promptOverride, setPromptOverride] = useState("");
  const [promptEdited, setPromptEdited] = useState(false);

  const autoPrompt = buildAutoPrompt({
    brandName,
    brandDescription,
    industry: brandIndustry,
    personality: brandKit?.personality,
    visualStyle: brandKit?.visualStyle,
    primaryColor: brandKit?.colorPalette?.primary,
    secondaryColor: brandKit?.colorPalette?.secondary,
    postConcept: postConcept ?? defaultPrompt,
    platform: postPlatform,
    stylePreset,
    overlayText: overlayText || undefined,
  });

  const currentPrompt = promptEdited ? promptOverride : autoPrompt;

  if (!open) return null;

  const stylePresets: { id: StylePreset; label: string; emoji: string }[] = [
    { id: "minimalist", label: "Minimalist", emoji: "○" },
    { id: "bold",       label: "Bold",       emoji: "◆" },
    { id: "luxury",     label: "Luxury",     emoji: "✦" },
    { id: "futuristic", label: "Futuristic", emoji: "◈" },
    { id: "cinematic",  label: "Cinematic",  emoji: "◉" },
    { id: "natural",    label: "Natural",    emoji: "❋" },
    { id: "vibrant",    label: "Vibrant",    emoji: "★" },
    { id: "moody",      label: "Moody",      emoji: "◑" },
  ];

  const models: { id: "nano" | "mini" | "pro"; label: string; desc: string; icon: React.ElementType }[] = [
    { id: "nano", label: "Nano", desc: "Fast", icon: Zap },
    { id: "mini", label: "Mini", desc: "Enhanced", icon: Sparkles },
    { id: "pro",  label: "GPT Pro", desc: "Best", icon: Wand2 },
  ];

  const sizes: { id: ImageSize; label: string; sublabel: string; ratio: "portrait" | "square" | "landscape" | "auto" }[] = [
    { id: "1024x1536", label: "Story",  sublabel: "9:16",      ratio: "portrait" },
    { id: "1024x1024", label: "Square", sublabel: "1:1",       ratio: "square" },
    { id: "1536x1024", label: "Wide",   sublabel: "16:9",      ratio: "landscape" },
    { id: "auto",      label: "Auto",   sublabel: "AI picks",  ratio: "auto" },
  ];

  function handleStyleChange(s: StylePreset) {
    setStylePreset(s);
    setPromptEdited(false);
  }

  function handleOverlayChange(v: string) {
    setOverlayText(v);
    setPromptEdited(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl border border-card-border shadow-2xl w-full max-w-xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> Generate AI Image
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Prompt auto-crafted from your brand analysis</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logo reference toggle */}
        {brandLogoUrl && (
          <div
            onClick={() => setIncludeLogo(!includeLogo)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
              includeLogo ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            )}
          >
            <img src={brandLogoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover border border-border flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Use logo as visual reference</p>
              <p className="text-[11px] text-muted-foreground">Background stripped · logo guides AI style & placement</p>
            </div>
            <div className={cn("w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all", includeLogo ? "border-primary bg-primary" : "border-muted-foreground")} />
          </div>
        )}

        {/* Style preset selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Visual Style</label>
          <div className="grid grid-cols-4 gap-1.5">
            {stylePresets.map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => handleStyleChange(id)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-[11px] font-medium transition-all",
                  stylePreset === id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text in design (Arabic / English) */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Text in Design
            <span className="text-muted-foreground font-normal text-xs ml-1.5">(Arabic or English — optional)</span>
          </label>
          <input
            type="text"
            dir="auto"
            className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={overlayText}
            onChange={(e) => handleOverlayChange(e.target.value)}
            placeholder='e.g. "عرض حصري" or "New Collection 2025"'
          />
        </div>

        {/* Auto-generated prompt (editable) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              AI Prompt
              {!promptEdited && (
                <span className="text-[10px] font-normal text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full">Auto-generated</span>
              )}
            </label>
            {promptEdited && (
              <button
                onClick={() => setPromptEdited(false)}
                className="text-[11px] text-primary hover:text-primary/80 transition-colors"
              >
                ↺ Reset to auto
              </button>
            )}
          </div>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono leading-relaxed"
            rows={6}
            value={currentPrompt}
            onChange={(e) => { setPromptOverride(e.target.value); setPromptEdited(true); }}
            placeholder="Describe the visual: style, mood, colors, subject, composition..."
          />
          <p className="text-[10px] text-muted-foreground mt-1">You can edit the prompt directly — changes override the auto-generated version.</p>
        </div>

        {/* Canvas size */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Canvas Size</label>
          <div className="grid grid-cols-4 gap-2">
            {sizes.map(({ id, label, sublabel, ratio }) => (
              <button
                key={id}
                onClick={() => setSize(id)}
                className={cn(
                  "flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-xs font-medium transition-all",
                  size === id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <AspectRatioIcon ratio={ratio} />
                <span className="font-semibold">{label}</span>
                <span className={cn("text-[10px]", size === id ? "text-primary/70" : "text-muted-foreground")}>{sublabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI model */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">AI Quality</label>
          <div className="grid grid-cols-3 gap-2">
            {models.map(({ id, label, desc, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setModel(id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all",
                  model === id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-semibold">{label}</span>
                <span className={cn("text-[10px]", model === id ? "text-primary/70" : "text-muted-foreground")}>{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons: Generate + Download */}
        <div className="flex items-center gap-3 pt-1">
          {hasExistingImage && (
            <button
              onClick={() => { onClose(); onDownload(); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          )}
          <button
            onClick={() => onGenerate({ customPrompt: currentPrompt, size, model, overlayText, includeLogo })}
            disabled={generating || !currentPrompt.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating..." : "Generate Image"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, brandLogoUrl, brandName, brandPrimaryColor, brandKit, brandIndustry, brandDescription, onSave, onRegenerate, onGenerateImage }: {
  post: SocialPost;
  brandLogoUrl?: string | null;
  brandName: string;
  brandPrimaryColor: string;
  brandKit?: BrandKitData | null;
  brandIndustry?: string;
  brandDescription?: string;
  onSave: (id: number, data: Partial<SocialPost>) => Promise<void>;
  onRegenerate: (id: number) => Promise<void>;
  onGenerateImage: (id: number, opts: ImageGenOptions) => Promise<SocialPost | undefined>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingVariant, setGeneratingVariant] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [showContentDropdown, setShowContentDropdown] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [variant, setVariant] = useState<PostVariant | null>(null);
  const [longFormContent, setLongFormContent] = useState<LongFormContent | null>(null);
  const [compositeImageUrl, setCompositeImageUrl] = useState<string | null>(null);
  const [compositing, setCompositing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"post" | "variant" | "content">("post");
  const [imageExpanded, setImageExpanded] = useState(false);

  const [draft, setDraft] = useState({
    hook: post.hook,
    caption: post.caption,
    cta: post.cta,
    imagePrompt: post.imagePrompt,
    hashtags: post.hashtags.join(" "),
  });

  async function save() {
    setSaving(true);
    await onSave(post.id, {
      hook: draft.hook,
      caption: draft.caption,
      cta: draft.cta,
      imagePrompt: draft.imagePrompt,
      hashtags: draft.hashtags.split(/\s+/).filter(Boolean),
    });
    setSaving(false);
    setEditing(false);
    setDraft({ hook: post.hook, caption: post.caption, cta: post.cta, imagePrompt: post.imagePrompt, hashtags: post.hashtags.join(" ") });
  }

  async function regen() {
    setRegenerating(true);
    await onRegenerate(post.id);
    setRegenerating(false);
    setVariant(null);
    setCompositeImageUrl(null);
  }

  async function handleGenerateWithOptions(opts: ImageGenOptions) {
    setShowImageDialog(false);
    setGeneratingImage(true);
    setCompositeImageUrl(null);

    // If logo reference requested, strip background before sending to AI
    let logoDataUrl: string | undefined;
    if (opts.includeLogo && brandLogoUrl) {
      logoDataUrl = await removeLogoBackground(brandLogoUrl);
    }

    const updatedPost = await onGenerateImage(post.id, { ...opts, logoDataUrl });
    setGeneratingImage(false);

    // Auto-embed brand logo after generation using the fresh image URL
    const freshImageUrl = updatedPost?.imageUrl ?? post.imageUrl;
    if (freshImageUrl) {
      setCompositing(true);
      const result = await compositeLogoOnImage(freshImageUrl, brandLogoUrl, brandName, brandPrimaryColor);
      setCompositeImageUrl(result);
      setCompositing(false);
    }
  }

  async function applyLogoOverlay() {
    if (!post.imageUrl) return;
    setCompositing(true);
    const result = await compositeLogoOnImage(post.imageUrl, brandLogoUrl, brandName, brandPrimaryColor);
    setCompositeImageUrl(result);
    setCompositing(false);
  }

  async function downloadImage() {
    const src = compositeImageUrl ?? post.imageUrl;
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `${brandName.replace(/\s+/g, "-")}-day${post.day}.jpg`;
    a.click();
  }

  async function generateVariant() {
    setGeneratingVariant(true);
    setActivePanel("variant");
    try {
      const res = await fetch(`/api/posts/${post.id}/generate-variant`, { method: "POST" });
      if (!res.ok) throw new Error("Variant generation failed");
      const data = await res.json() as PostVariant;
      setVariant(data);
    } catch {
      setVariant(null);
    } finally {
      setGeneratingVariant(false);
    }
  }

  async function generateLongForm(type: "blog" | "email" | "newsletter") {
    setGeneratingContent(true);
    setShowContentDropdown(false);
    setActivePanel("content");
    try {
      const res = await fetch(`/api/posts/${post.id}/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: type }),
      });
      if (!res.ok) throw new Error("Content generation failed");
      const data = await res.json() as LongFormContent;
      setLongFormContent(data);
    } catch {
      setLongFormContent(null);
    } finally {
      setGeneratingContent(false);
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function cancel() {
    setDraft({ hook: post.hook, caption: post.caption, cta: post.cta, imagePrompt: post.imagePrompt, hashtags: post.hashtags.join(" ") });
    setEditing(false);
  }

  const displayImage = compositeImageUrl ?? post.imageUrl;

  return (
    <>
      <ImageGenDialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onGenerate={handleGenerateWithOptions}
        onDownload={downloadImage}
        defaultPrompt={post.imagePrompt}
        generating={generatingImage}
        brandLogoUrl={brandLogoUrl}
        brandName={brandName}
        brandKit={brandKit}
        brandIndustry={brandIndustry}
        brandDescription={brandDescription}
        postConcept={post.hook}
        postPlatform={post.platform}
        hasExistingImage={!!(compositeImageUrl ?? post.imageUrl)}
      />

      <div className="rounded-xl border border-card-border bg-card overflow-hidden flex flex-col">
        {displayImage ? (
          <div className="relative group">
            <img
              src={displayImage}
              alt={`Day ${post.day} visual`}
              className={cn("w-full object-cover transition-all cursor-pointer", imageExpanded ? "aspect-auto" : "aspect-video")}
              onClick={() => setImageExpanded((v) => !v)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent pointer-events-none" />
            {compositing && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 text-white text-[11px] font-semibold backdrop-blur-sm">
                <Loader2 className="w-3 h-3 animate-spin" /> Adding logo...
              </div>
            )}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setImageExpanded((v) => !v)} className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm transition-colors">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!compositeImageUrl ? (
                  <button
                    onClick={applyLogoOverlay}
                    disabled={compositing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 text-slate-800 text-xs font-semibold hover:bg-white transition-colors disabled:opacity-60 backdrop-blur-sm shadow-sm"
                  >
                    {compositing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                    {compositing ? "Adding logo..." : "Embed Logo"}
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/90 text-white text-[11px] font-semibold backdrop-blur-sm">
                    <CheckCircle2 className="w-3 h-3" /> Logo Embedded
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowImageDialog(true)}
                disabled={generatingImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-sm transition-colors disabled:opacity-60"
              >
                {generatingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {generatingImage ? "Generating..." : "Generate / Download"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowImageDialog(true)}
            disabled={generatingImage}
            className="w-full aspect-video bg-gradient-to-br from-muted/60 to-muted/30 flex flex-col items-center justify-center gap-3 border-b border-card-border hover:from-primary/5 hover:to-primary/10 transition-colors group"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
              {generatingImage
                ? <Loader2 className="w-7 h-7 text-primary animate-spin" />
                : <Sparkles className="w-7 h-7 text-primary/60 group-hover:text-primary transition-colors" />
              }
            </div>
            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {generatingImage ? "Generating AI Image..." : "Generate AI Image"}
            </p>
            <p className="text-[11px] text-muted-foreground">Click to open prompt builder · auto-embeds brand logo</p>
          </button>
        )}

        {/* Card header */}
        <div className="px-4 py-3 bg-muted/30 border-b border-card-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
              {post.day}
            </div>
            <span className="text-sm font-semibold text-foreground">Day {post.day}</span>
            <PlatformBadge platform={post.platform} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {editing ? (
              <>
                <button onClick={cancel} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border transition-colors">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button onClick={save} disabled={saving} className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1.5 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                </button>
              </>
            ) : (
              <>
                <button onClick={regen} disabled={regenerating} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border transition-colors">
                  {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {regenerating ? "Regenerating..." : "Regenerate"}
                </button>
                <button onClick={generateVariant} disabled={generatingVariant} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border transition-colors">
                  {generatingVariant ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />}
                  A/B Variant
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowContentDropdown((v) => !v)}
                    disabled={generatingContent}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border transition-colors"
                  >
                    {generatingContent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    {generatingContent ? "Generating..." : "Long-Form"}
                    {!generatingContent && <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showContentDropdown && (
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-card-border bg-card shadow-lg z-20 py-1 overflow-hidden">
                      {([
                        { key: "blog", label: "Blog Post", icon: FileText },
                        { key: "email", label: "Email Campaign", icon: Mail },
                        { key: "newsletter", label: "Newsletter", icon: Newspaper },
                      ] as const).map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => generateLongForm(key)}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground hover:bg-muted/50 transition-colors text-left"
                        >
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border transition-colors">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Panel tabs */}
        {(variant || longFormContent) && !editing && (
          <div className="flex border-b border-card-border">
            {[
              { id: "post" as const, label: "Post A", icon: Megaphone },
              ...(variant ? [{ id: "variant" as const, label: "Post B (Variant)", icon: TestTube2 }] : []),
              ...(longFormContent ? [{ id: "content" as const, label: longFormContent.type === "blog" ? "Blog Post" : longFormContent.type === "email" ? "Email" : "Newsletter", icon: FileText }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors flex-1 justify-center",
                  activePanel === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3 h-3" /> {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content panels */}
        <div className="p-5 space-y-4 flex-1">
          {(activePanel === "post" || (activePanel === "variant" && generatingVariant)) && (
            <>
              <PostTextField label="Hook" value={editing ? draft.hook : post.hook} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, hook: v }))} onCopy={() => copyText(post.hook, "hook")} copied={copied === "hook"} />
              <PostTextArea label="Caption" value={editing ? draft.caption : post.caption} editing={editing} rows={5} onChange={(v) => setDraft((d) => ({ ...d, caption: v }))} onCopy={() => copyText(post.caption, "caption")} copied={copied === "caption"} />
              <PostTextField label="Call to Action" value={editing ? draft.cta : post.cta} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, cta: v }))} onCopy={() => copyText(post.cta, "cta")} copied={copied === "cta"} isHighlight />
              <HashtagsField value={editing ? draft.hashtags : post.hashtags.join(" ")} editing={editing} tags={post.hashtags} onChange={(v) => setDraft((d) => ({ ...d, hashtags: v }))} onCopy={() => copyText(post.hashtags.join(" "), "tags")} copied={copied === "tags"} />
              <ImagePromptField value={editing ? draft.imagePrompt : post.imagePrompt} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, imagePrompt: v }))} />
            </>
          )}

          {activePanel === "variant" && !generatingVariant && variant && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <TestTube2 className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  This is your <strong>B variant</strong> — a different creative angle for A/B testing.
                </p>
              </div>
              <PostTextField label="Variant Hook" value={variant.hook} editing={false} onCopy={() => copyText(variant.hook, "vhook")} copied={copied === "vhook"} />
              <PostTextArea label="Variant Caption" value={variant.caption} editing={false} rows={5} onCopy={() => copyText(variant.caption, "vcaption")} copied={copied === "vcaption"} />
              <PostTextField label="Variant CTA" value={variant.cta} editing={false} onCopy={() => copyText(variant.cta, "vcta")} copied={copied === "vcta"} isHighlight />
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Variant Hashtags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {variant.hashtags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">{tag}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={async () => {
                  await onSave(post.id, {
                    hook: variant.hook, caption: variant.caption, cta: variant.cta,
                    hashtags: variant.hashtags, imagePrompt: variant.imagePrompt,
                  });
                  setVariant(null);
                  setActivePanel("post");
                }}
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
              >
                Apply Variant B → Replace Post A
              </button>
            </div>
          )}

          {activePanel === "content" && longFormContent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  {longFormContent.type === "blog" ? "Blog post" : longFormContent.type === "email" ? "Email campaign" : "Newsletter"} generated from this post concept.
                </p>
              </div>
              {longFormContent.subjectLine && (
                <div className="p-3 rounded-lg bg-muted/40">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subject Line</p>
                  <p className="text-sm font-medium text-foreground">{longFormContent.subjectLine}</p>
                </div>
              )}
              {longFormContent.metaDescription && (
                <div className="p-3 rounded-lg bg-muted/40">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Meta Description</p>
                  <p className="text-sm text-foreground">{longFormContent.metaDescription}</p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{longFormContent.title}</p>
                  <button onClick={() => copyText(longFormContent.content, "content")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {copied === "content" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === "content" ? "Copied!" : "Copy All"}
                  </button>
                </div>
                <div className="rounded-lg bg-muted/30 p-4 max-h-72 overflow-y-auto">
                  <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">{longFormContent.content}</pre>
                </div>
              </div>
            </div>
          )}

          {activePanel === "variant" && generatingVariant && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Generating A/B variant...</p>
            </div>
          )}
          {activePanel === "content" && generatingContent && !longFormContent && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Generating long-form content...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Reusable field components ────────────────────────────────────────────────

function PostTextField({ label, value, editing, onChange, onCopy, copied, isHighlight }: {
  label: string; value: string; editing: boolean; onChange?: (v: string) => void;
  onCopy?: () => void; copied?: boolean; isHighlight?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
        {onCopy && !editing && (
          <button onClick={onCopy} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {editing && onChange ? (
        <input
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className={cn("text-sm leading-relaxed", isHighlight ? "text-primary font-medium" : "text-foreground")}>{value}</p>
      )}
    </div>
  );
}

function PostTextArea({ label, value, editing, onChange, rows, onCopy, copied }: {
  label: string; value: string; editing: boolean; onChange?: (v: string) => void;
  rows?: number; onCopy?: () => void; copied?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
        {onCopy && !editing && (
          <button onClick={onCopy} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {editing && onChange ? (
        <textarea
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={rows ?? 5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{value}</p>
      )}
    </div>
  );
}

function HashtagsField({ value, editing, tags, onChange, onCopy, copied }: {
  value: string; editing: boolean; tags: string[]; onChange?: (v: string) => void; onCopy?: () => void; copied?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Hash className="w-3 h-3" /> Hashtags
        </label>
        {onCopy && !editing && (
          <button onClick={onCopy} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {editing && onChange ? (
        <input
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#hashtag1 #hashtag2"
        />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ImagePromptField({ value, editing, onChange }: {
  value: string; editing: boolean; onChange?: (v: string) => void;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        <ImageIcon className="w-3 h-3" /> AI Image Prompt
      </label>
      {editing && onChange ? (
        <textarea
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className="text-xs text-muted-foreground font-mono leading-relaxed">{value}</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CampaignWorkspace() {
  const params = useParams<{ id: string }>();
  const campaignId = parseInt(params.id, 10);
  const queryClient = useQueryClient();

  const { data: campaign, isLoading } = useGetCampaign(campaignId, {
    query: { enabled: !!campaignId, queryKey: getGetCampaignQueryKey(campaignId) },
  });

  const updatePost = useUpdatePost();
  const regeneratePost = useRegeneratePost();

  async function handleSavePost(id: number, data: Partial<SocialPost>) {
    await updatePost.mutateAsync({ id, data: { caption: data.caption, hook: data.hook, cta: data.cta, hashtags: data.hashtags, imagePrompt: data.imagePrompt } });
    queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(campaignId) });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(id) });
  }

  async function handleRegeneratePost(id: number) {
    await regeneratePost.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(campaignId) });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(id) });
  }

  async function handleGenerateImage(id: number, opts: ImageGenOptions): Promise<SocialPost | undefined> {
    const body: Record<string, string | undefined> = {
      customPrompt: opts.customPrompt,
      size: opts.size,
      model: opts.model,
      brandName: brandInfo?.companyName ?? undefined,
    };
    if (opts.overlayText) body.overlayText = opts.overlayText;
    if (opts.logoDataUrl) body.logoDataUrl = opts.logoDataUrl;

    const res = await fetch(`/api/posts/${id}/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json() as SocialPost;
    queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(campaignId) });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(id) });
    return result;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Campaign not found</p>
        <Link href="/" className="text-primary text-sm hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const brandInfo = (campaign as unknown as { brand?: { logoUrl?: string; companyName?: string; companyDescription?: string; industry?: string; primaryColor?: string; brandKit?: BrandKitData } })?.brand;
  const brandLogoUrl = brandInfo?.logoUrl ?? undefined;
  const brandName = brandInfo?.companyName ?? "Brand";
  const brandPrimaryColor = brandInfo?.primaryColor ?? "#6366F1";
  const brandKit = brandInfo?.brandKit ?? null;
  const brandIndustry = brandInfo?.industry;
  const brandDescription = brandInfo?.companyDescription;

  type CampaignDay = { day: number; marketingAngle: string; postConcept: string; objective: string; cta: string };
  type CampaignPost = SocialPost & { day: number };

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={`/brands/${campaign.brandId}/campaigns`} className="text-muted-foreground hover:text-foreground transition-colors mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">{campaign.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-2xl">{campaign.strategy}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {campaign.days?.length ?? 0} Days
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
            <Megaphone className="w-3.5 h-3.5" />
            {campaign.posts?.length ?? 0} Posts
          </div>
        </div>
      </div>

      {/* Campaign Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-muted-foreground" />
          Campaign Strategy Plan
        </h2>
        <div className="relative">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-border hidden sm:block" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {(campaign.days as CampaignDay[] | undefined)?.map((day) => (
              <div key={day.day} className="relative flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold relative z-10 shadow-sm">
                  {day.day}
                </div>
                <div className="w-full rounded-xl border border-card-border bg-card p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{day.marketingAngle}</p>
                  <p className="text-[11px] text-foreground leading-snug font-medium">{day.postConcept}</p>
                  <p className="text-[10px] text-muted-foreground">{day.objective}</p>
                  <div className="pt-1 border-t border-border">
                    <p className="text-[10px] text-primary font-semibold">{day.cta}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posts grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-muted-foreground" />
            Social Posts ({campaign.posts?.length ?? 0})
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border">
              <Layers className="w-3 h-3" /> Auto logo embed
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border">
              <Settings2 className="w-3 h-3" /> Model & size control
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(campaign.posts as CampaignPost[] | undefined)
            ?.sort((a, b) => a.day - b.day)
            .map((post) => (
              <PostCard
                key={post.id}
                post={post}
                brandLogoUrl={brandLogoUrl}
                brandName={brandName}
                brandPrimaryColor={brandPrimaryColor}
                brandKit={brandKit}
                brandIndustry={brandIndustry}
                brandDescription={brandDescription}
                onSave={handleSavePost}
                onRegenerate={handleRegeneratePost}
                onGenerateImage={handleGenerateImage}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
