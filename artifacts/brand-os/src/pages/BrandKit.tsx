import { useParams, Link } from "wouter";
import { useRef, useState } from "react";
import {
  useGetBrand, useGetBrandStats, useGenerateCampaign,
  getGetBrandQueryKey, getGetBrandStatsQueryKey, getListCampaignsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Sparkles, Loader2, Megaphone, Building2, Globe, Palette,
  MessageSquare, Users, Edit, X, Image as ImageIcon, Plus, BookOpen,
  Type, Target, Star, Copy, CheckCircle2, Wand2, Zap, Quote, Tag,
  Heart, Shield, RefreshCw, FileText, Instagram, Linkedin, Twitter, Facebook,
  CheckSquare, Square, Layers, BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandKit {
  personality: string;
  positioning: string;
  toneOfVoice: string;
  audienceSegments: string[];
  visualStyle: string;
  colorPalette: Record<string, string>;
  visualStyleRules: string;
  brandStory?: string;
  missionStatement?: string;
  visionStatement?: string;
  taglines?: string[];
  brandKeywords?: string[];
  messagingPillars?: string[];
  dosCommunication?: string[];
  dontsCommunication?: string[];
  socialBio?: string;
  typographyRecommendations?: string;
  competitivePosition?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorSwatch({ color, label }: { color: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(color).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={copy}>
      <div
        className="w-14 h-14 rounded-xl border border-black/10 dark:border-white/10 shadow-md group-hover:scale-105 transition-transform"
        style={{ backgroundColor: color }}
      />
      <div className="text-center">
        <p className="text-[11px] font-semibold text-foreground capitalize">{label}</p>
        <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
          {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
          {color}
        </p>
      </div>
    </div>
  );
}

const styleLabels: Record<string, { label: string; className: string }> = {
  tech: { label: "Tech", className: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300" },
  luxury: { label: "Luxury", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300" },
  bold: { label: "Bold", className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-300" },
  minimal: { label: "Minimal", className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300" },
};

function InfoCard({ icon: Icon, title, children, className, action }: {
  icon: React.ElementType; title: string; children: React.ReactNode; className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-card-border bg-card p-5", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", className)}>
      {children}
    </span>
  );
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "twitter", label: "X / Twitter", icon: Twitter },
  { id: "facebook", label: "Facebook", icon: Facebook },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BrandKit() {
  const params = useParams<{ id: string }>();
  const brandId = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [brief, setBrief] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [postCount, setPostCount] = useState(7);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram"]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"identity" | "content" | "strategy" | "story">("identity");
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const briefFileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: brand, isLoading } = useGetBrand(brandId, {
    query: { enabled: !!brandId, queryKey: getGetBrandQueryKey(brandId) },
  });
  const { data: stats } = useGetBrandStats(brandId, {
    query: { enabled: !!brandId, queryKey: getGetBrandStatsQueryKey(brandId) },
  });

  const generateCampaignMutation = useGenerateCampaign();

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((p) => p !== id) : prev) : [...prev, id]
    );
  }

  function handleRefImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 512;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            const ratio = Math.min(MAX / width, MAX / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          setReferenceImages((prev) => [...prev.slice(0, 2), canvas.toDataURL("image/jpeg", 0.75)]);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  async function handleGenerateCampaign() {
    setGenerating(true);
    setShowBriefModal(false);
    setGenerateError(null);
    try {
      const campaign = await generateCampaignMutation.mutateAsync({
        id: brandId,
        data: {
          brief: brief.trim() || undefined,
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          postCount,
          platforms: selectedPlatforms,
        } as Parameters<typeof generateCampaignMutation.mutateAsync>[0]["data"],
      });
      queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey(brandId) });
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      setGenerating(false);
      setGenerateError(err instanceof Error ? err.message : "Campaign generation failed. Please try again.");
    }
  }

  async function handleRegenerateBrandStory() {
    setGeneratingStory(true);
    setStoryError(null);
    try {
      const res = await fetch(`/api/brands/${brandId}/generate-story`, { method: "POST" });
      if (!res.ok) throw new Error("Story generation failed");
      queryClient.invalidateQueries({ queryKey: getGetBrandQueryKey(brandId) });
    } catch {
      setStoryError("Failed to regenerate story. Please try again.");
    } finally {
      setGeneratingStory(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Brand not found</p>
        <Link href="/" className="text-primary text-sm hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const kit = brand.brandKit as BrandKit | null;
  const style = styleLabels[kit?.visualStyle ?? "minimal"] ?? styleLabels.minimal;

  const tabs = [
    { id: "identity" as const, label: "Visual Identity", icon: Palette },
    { id: "content" as const, label: "Content & Voice", icon: MessageSquare },
    { id: "strategy" as const, label: "Market Strategy", icon: Target },
    { id: "story" as const, label: "Brand Story", icon: BookOpen },
  ];

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
      {/* Generating overlay */}
      {generating && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Creating your campaign...</h3>
            <p className="text-sm text-muted-foreground">AI is crafting {postCount} posts for {selectedPlatforms.join(", ")}. This takes 20–40 seconds.</p>
          </div>
          <div className="flex flex-col gap-2 text-left w-72">
            {["Analyzing brand kit & brief", "Building campaign narrative arc", "Writing platform-specific posts", "Creating image composition prompts", "Applying brand voice & tone"].map((step) => (
              <div key={step} className="flex items-center gap-3">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Brief Modal */}
      {showBriefModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border border-card-border shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Campaign Brief</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Configure your AI-powered campaign</p>
              </div>
              <button onClick={() => setShowBriefModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Target Platforms</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(({ id, label, icon: Icon }) => {
                  const selected = selectedPlatforms.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => togglePlatform(id)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                        selected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      {selected ? <CheckSquare className="w-4 h-4 flex-shrink-0" /> : <Square className="w-4 h-4 flex-shrink-0" />}
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">At least one platform required</p>
            </div>

            {/* Post count */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Number of Posts <span className="ml-2 text-primary font-bold text-base">{postCount}</span>
              </label>
              <input
                type="range" min={1} max={14} value={postCount}
                onChange={(e) => setPostCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                <span>1 post (quick)</span><span>14 posts (full campaign)</span>
              </div>
            </div>

            {/* Brief */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Campaign Instructions</label>
              <textarea
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={4}
                placeholder={`Examples:\n• Focus on product launch — create urgency and excitement\n• Target B2B decision-makers, keep it professional and data-driven\n• Summer campaign with vibrant, energetic tone`}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
            </div>

            {/* Reference images */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" /> Reference Images (optional, max 3)
                </span>
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {referenceImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt={`ref ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border border-card-border" />
                    <button
                      onClick={() => setReferenceImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {referenceImages.length < 3 && (
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                    <input ref={briefFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleRefImageUpload} />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">These guide the visual style of AI-generated images</p>
            </div>

            {generateError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{generateError}</div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={() => setShowBriefModal(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleGenerateCampaign}
                disabled={generating}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? "Generating..." : `Generate ${postCount} Posts`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/" className="flex-shrink-0 mt-1 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.companyName} className="w-12 h-12 rounded-xl object-cover border border-card-border" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">{brand.companyName}</h1>
                <p className="text-sm text-muted-foreground">{brand.industry}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {kit && (
                <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border", style.className)}>
                  {style.label} Style
                </span>
              )}
              <Link href={`/brands/${brandId}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Edit className="w-3.5 h-3.5" /> Edit
              </Link>
              <Link href={`/brands/${brandId}/campaigns`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Megaphone className="w-3.5 h-3.5" /> Campaigns ({stats?.totalCampaigns ?? 0})
              </Link>
              <button
                onClick={() => { setGenerateError(null); setShowBriefModal(true); }}
                disabled={generating}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generating ? "Generating..." : "Launch Campaign"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!kit ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">Brand kit not generated yet</h3>
          <p className="text-sm text-muted-foreground">Complete the brand wizard to generate your full brand identity.</p>
        </div>
      ) : (
        <>
          {/* Stats strip */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Campaigns", value: stats.totalCampaigns, icon: Megaphone },
                { label: "Posts Created", value: stats.totalPosts, icon: FileText },
                { label: "Images Generated", value: (stats as Record<string, unknown>).postsWithImages as number ?? 0, icon: ImageIcon },
                { label: "Brand Health", value: "94/100", icon: Star },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-card-border bg-card p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab navigation */}
          <div className="flex items-center gap-1 border-b border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ─── VISUAL IDENTITY TAB ─────────────────────────────────────── */}
          {activeTab === "identity" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                {/* Color Palette */}
                <InfoCard icon={Palette} title="Brand Color System">
                  <div className="flex flex-wrap gap-5 mb-4">
                    {Object.entries(kit.colorPalette ?? {}).map(([key, color]) => (
                      <ColorSwatch key={key} color={color as string} label={key} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Click any swatch to copy hex code
                  </p>
                </InfoCard>

                {/* Typography */}
                <InfoCard icon={Type} title="Typography System">
                  <div className="space-y-3">
                    <div className="rounded-lg border border-card-border p-4">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Display / Headline</p>
                      <p className="text-3xl font-black text-foreground tracking-tight leading-none">{brand.companyName}</p>
                      <p className="text-xs text-muted-foreground mt-2">Weight 900 · Tight tracking · Used for hero text</p>
                    </div>
                    <div className="rounded-lg border border-card-border p-4">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Section Headings</p>
                      <p className="text-xl font-bold text-foreground">{brand.industry} Excellence Redefined</p>
                      <p className="text-xs text-muted-foreground mt-2">Weight 700 · Normal tracking · H2 level</p>
                    </div>
                    <div className="rounded-lg border border-card-border p-4">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Body Text</p>
                      <p className="text-sm text-foreground leading-relaxed">{brand.companyDescription?.slice(0, 140)}...</p>
                      <p className="text-xs text-muted-foreground mt-2">Weight 400 · Normal spacing · 16px base</p>
                    </div>
                    {kit.typographyRecommendations && (
                      <div className="rounded-lg bg-muted/30 p-3">
                        <p className="text-xs text-foreground leading-relaxed">{kit.typographyRecommendations}</p>
                      </div>
                    )}
                  </div>
                </InfoCard>

                {/* Visual Style Rules */}
                <InfoCard icon={Globe} title="Visual Design Rules">
                  <p className="text-sm text-foreground leading-relaxed">{kit.visualStyleRules}</p>
                </InfoCard>
              </div>

              <div className="space-y-5">
                {/* Brand Personality */}
                <InfoCard icon={Sparkles} title="Brand Personality">
                  <p className="text-sm text-foreground leading-relaxed">{kit.personality}</p>
                </InfoCard>

                {/* Mission & Vision */}
                {(kit.missionStatement || kit.visionStatement) && (
                  <InfoCard icon={Target} title="Mission & Vision">
                    <div className="space-y-3">
                      {kit.missionStatement && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mission</p>
                          <p className="text-sm text-foreground font-medium leading-relaxed italic">"{kit.missionStatement}"</p>
                        </div>
                      )}
                      {kit.visionStatement && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Vision</p>
                          <p className="text-sm text-foreground font-medium leading-relaxed italic">"{kit.visionStatement}"</p>
                        </div>
                      )}
                    </div>
                  </InfoCard>
                )}

                {/* Taglines */}
                {kit.taglines && kit.taglines.length > 0 && (
                  <InfoCard icon={Quote} title="Brand Taglines">
                    <div className="space-y-2">
                      {kit.taglines.map((tagline, i) => (
                        <div key={i} className={cn("rounded-lg p-3", i === 0 ? "bg-primary/10 border border-primary/20" : "bg-muted/30")}>
                          <p className={cn("text-sm font-semibold", i === 0 ? "text-primary" : "text-foreground")}>
                            {i === 0 && <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 block mb-0.5">Primary</span>}
                            "{tagline}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </InfoCard>
                )}

                {/* Generate Campaign CTA */}
                <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Launch Campaign</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Generate a multi-platform marketing campaign with AI-composed images and brand-consistent copy.
                  </p>
                  <button
                    onClick={() => { setGenerateError(null); setShowBriefModal(true); }}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {generating ? "Generating..." : "Launch Campaign Wizard"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── CONTENT & VOICE TAB ────────────────────────────────────── */}
          {activeTab === "content" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Audience Segments */}
              <InfoCard icon={Users} title="Target Audience Segments" className="lg:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {kit.audienceSegments.map((seg, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-card-border">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        {i + 1}
                      </div>
                      <p className="text-sm text-foreground leading-snug">{seg}</p>
                    </div>
                  ))}
                </div>
              </InfoCard>

              {/* Tone of Voice */}
              <InfoCard icon={MessageSquare} title="Tone of Voice & Communication Style">
                <p className="text-sm text-foreground leading-relaxed mb-4">{kit.toneOfVoice}</p>
                {kit.socialBio && (
                  <div className="rounded-lg bg-muted/30 p-3 mt-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Ready-to-use Social Bio</p>
                    <p className="text-sm text-foreground">{kit.socialBio}</p>
                  </div>
                )}
              </InfoCard>

              {/* Messaging Pillars */}
              {kit.messagingPillars && kit.messagingPillars.length > 0 && (
                <InfoCard icon={Layers} title="Messaging Pillars">
                  <div className="space-y-3">
                    {kit.messagingPillars.map((pillar, i) => {
                      const [theme, ...rest] = pillar.split(" — ");
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{theme}</p>
                            {rest.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{rest.join(" — ")}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </InfoCard>
              )}

              {/* Do's and Don'ts */}
              {(kit.dosCommunication?.length || kit.dontsCommunication?.length) ? (
                <InfoCard icon={Shield} title="Communication Do's & Don'ts" className="lg:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">✓ Do's</p>
                      <div className="space-y-2">
                        {kit.dosCommunication?.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground">{item.replace(/^Do:\s*/i, "")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mb-2">✗ Don'ts</p>
                      <div className="space-y-2">
                        {kit.dontsCommunication?.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900">
                            <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground">{item.replace(/^Don't:\s*/i, "")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </InfoCard>
              ) : null}

              {/* Brand Keywords */}
              {kit.brandKeywords && kit.brandKeywords.length > 0 && (
                <InfoCard icon={Tag} title="Brand Keywords">
                  <div className="flex flex-wrap gap-2">
                    {kit.brandKeywords.map((kw, i) => (
                      <Pill key={i} className="bg-primary/10 text-primary border border-primary/20">{kw}</Pill>
                    ))}
                  </div>
                </InfoCard>
              )}

              {/* Competitive Position */}
              {kit.competitivePosition && (
                <InfoCard icon={BarChart2 ?? Target} title="Competitive Positioning">
                  <p className="text-sm text-foreground leading-relaxed">{kit.competitivePosition}</p>
                </InfoCard>
              )}
            </div>
          )}

          {/* ─── MARKET STRATEGY TAB ──────────────────────────────────── */}
          {activeTab === "strategy" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Positioning */}
              <InfoCard icon={Target} title="Market Positioning" className="lg:col-span-2">
                <p className="text-sm text-foreground leading-relaxed text-balance">{kit.positioning}</p>
              </InfoCard>

              {/* Competitive position */}
              {kit.competitivePosition && (
                <InfoCard icon={Zap} title="Competitive Differentiation">
                  <p className="text-sm text-foreground leading-relaxed">{kit.competitivePosition}</p>
                </InfoCard>
              )}

              {/* Personality */}
              <InfoCard icon={Heart} title="Brand Personality & Character">
                <p className="text-sm text-foreground leading-relaxed">{kit.personality}</p>
              </InfoCard>

              {/* Messaging pillars */}
              {kit.messagingPillars && kit.messagingPillars.length > 0 && (
                <InfoCard icon={Layers} title="Strategic Messaging Pillars" className="lg:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {kit.messagingPillars.map((pillar, i) => {
                      const [theme, ...rest] = pillar.split(" — ");
                      return (
                        <div key={i} className="rounded-xl border border-card-border bg-muted/20 p-4 space-y-2">
                          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            {i + 1}
                          </div>
                          <p className="text-sm font-semibold text-foreground">{theme}</p>
                          {rest.length > 0 && <p className="text-xs text-muted-foreground leading-relaxed">{rest.join(" — ")}</p>}
                        </div>
                      );
                    })}
                  </div>
                </InfoCard>
              )}

              {/* Target Audience Detail */}
              <InfoCard icon={Users} title="Target Audience Deep-Dive" className="lg:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {kit.audienceSegments.map((seg, i) => {
                    const labels = ["Primary", "Secondary", "Tertiary"];
                    return (
                      <div key={i} className="p-4 rounded-xl border border-card-border bg-card space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            i === 0 ? "bg-primary/10 text-primary" : i === 1 ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          )}>
                            {labels[i] ?? `Segment ${i + 1}`}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-snug">{seg}</p>
                      </div>
                    );
                  })}
                </div>
              </InfoCard>
            </div>
          )}

          {/* ─── BRAND STORY TAB ──────────────────────────────────────── */}
          {activeTab === "story" && (
            <div className="space-y-5">
              {/* Brand Story */}
              <InfoCard
                icon={BookOpen}
                title="Brand Story"
                action={
                  <button
                    onClick={handleRegenerateBrandStory}
                    disabled={generatingStory}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border transition-colors disabled:opacity-60"
                  >
                    {generatingStory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {generatingStory ? "Regenerating..." : "Regenerate Story"}
                  </button>
                }
              >
                {storyError && (
                  <div className="mb-3 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{storyError}</div>
                )}
                {kit.brandStory ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {kit.brandStory.split("\n\n").filter(Boolean).map((para, i) => (
                      <p key={i} className="text-sm text-foreground leading-relaxed mb-4">{para}</p>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">No brand story yet. Generate one to tell your brand's unique origin story.</p>
                    <button
                      onClick={handleRegenerateBrandStory}
                      disabled={generatingStory}
                      className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {generatingStory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {generatingStory ? "Generating Story..." : "Generate Brand Story"}
                    </button>
                  </div>
                )}
              </InfoCard>

              {/* Mission & Vision */}
              {(kit.missionStatement || kit.visionStatement) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {kit.missionStatement && (
                    <InfoCard icon={Target} title="Mission Statement">
                      <blockquote className="border-l-4 border-primary pl-4">
                        <p className="text-base font-semibold text-foreground italic leading-relaxed">"{kit.missionStatement}"</p>
                      </blockquote>
                    </InfoCard>
                  )}
                  {kit.visionStatement && (
                    <InfoCard icon={Zap} title="Vision Statement">
                      <blockquote className="border-l-4 border-violet-500 pl-4">
                        <p className="text-base font-semibold text-foreground italic leading-relaxed">"{kit.visionStatement}"</p>
                      </blockquote>
                    </InfoCard>
                  )}
                </div>
              )}

              {/* Taglines */}
              {kit.taglines && kit.taglines.length > 0 && (
                <InfoCard icon={Quote} title="Campaign Taglines">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {kit.taglines.map((tagline, i) => (
                      <div key={i} className={cn("p-4 rounded-xl border", i === 0 ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-card-border")}>
                        {i === 0 && <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">★ Primary Tagline</p>}
                        <p className={cn("text-sm font-semibold", i === 0 ? "text-primary text-base" : "text-foreground")}>"{tagline}"</p>
                      </div>
                    ))}
                  </div>
                </InfoCard>
              )}

              {/* Brand Keywords */}
              {kit.brandKeywords && kit.brandKeywords.length > 0 && (
                <InfoCard icon={Tag} title="Core Brand Keywords">
                  <div className="flex flex-wrap gap-2">
                    {kit.brandKeywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                        {kw}
                      </span>
                    ))}
                  </div>
                </InfoCard>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

