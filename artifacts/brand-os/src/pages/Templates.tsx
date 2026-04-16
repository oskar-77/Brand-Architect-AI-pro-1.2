import { useState } from "react";
import { LayoutTemplate, Search, Sparkles, Star, ArrowRight, Instagram, Twitter, Linkedin, Mail, Globe, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = ["All", "Social Media", "Email", "Ads", "Presentations", "Print", "Web"];

const templates = [
  {
    id: 1, name: "Instagram Product Launch", category: "Social Media", platform: "Instagram",
    tags: ["product", "launch", "vibrant"], rating: 4.9, uses: 1240, premium: false,
    preview: ["#4F46E5", "#818CF8", "#C7D2FE"],
  },
  {
    id: 2, name: "LinkedIn Thought Leadership", category: "Social Media", platform: "LinkedIn",
    tags: ["thought", "professional", "insight"], rating: 4.8, uses: 890, premium: false,
    preview: ["#0EA5E9", "#38BDF8", "#BAE6FD"],
  },
  {
    id: 3, name: "Email Newsletter — Weekly", category: "Email", platform: "Email",
    tags: ["newsletter", "weekly", "clean"], rating: 4.7, uses: 2310, premium: true,
    preview: ["#10B981", "#34D399", "#A7F3D0"],
  },
  {
    id: 4, name: "Facebook Carousel Ad", category: "Ads", platform: "Facebook",
    tags: ["carousel", "ad", "conversion"], rating: 4.6, uses: 670, premium: true,
    preview: ["#F59E0B", "#FCD34D", "#FEF3C7"],
  },
  {
    id: 5, name: "Brand Story Collection", category: "Social Media", platform: "Instagram",
    tags: ["story", "brand", "narrative"], rating: 4.9, uses: 3120, premium: false,
    preview: ["#EC4899", "#F472B6", "#FBCFE8"],
  },
  {
    id: 6, name: "X/Twitter Thread Starter", category: "Social Media", platform: "Twitter",
    tags: ["thread", "engagement", "viral"], rating: 4.5, uses: 450, premium: false,
    preview: ["#1D4ED8", "#3B82F6", "#BFDBFE"],
  },
  {
    id: 7, name: "Landing Page Hero Section", category: "Web", platform: "Web",
    tags: ["hero", "landing", "conversion"], rating: 4.8, uses: 780, premium: true,
    preview: ["#7C3AED", "#A78BFA", "#DDD6FE"],
  },
  {
    id: 8, name: "Product Showcase Email", category: "Email", platform: "Email",
    tags: ["product", "showcase", "sale"], rating: 4.6, uses: 1580, premium: false,
    preview: ["#0891B2", "#22D3EE", "#CFFAFE"],
  },
];

const platformIcons: Record<string, React.ElementType> = {
  Instagram, Twitter, LinkedIn: Linkedin, Facebook: Megaphone, Email: Mail, Web: Globe,
};

function TemplatePlatformIcon({ platform }: { platform: string }) {
  const Icon = platformIcons[platform] ?? LayoutTemplate;
  return <Icon className="w-3.5 h-3.5" />;
}

export default function Templates() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = templates.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.includes(search.toLowerCase()));
    const matchCat = activeCategory === "All" || t.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Template Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered templates that automatically adapt to your brand's visual identity.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Sparkles className="w-4 h-4" />
          Generate Template
        </button>
      </div>

      {/* AI suggestion banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-violet-500/5 p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">AI Template Suggestion</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on your brand's visual style and top-performing campaigns, we recommend trying "Brand Story Collection" or "Instagram Product Launch" next.
          </p>
        </div>
        <button className="flex-shrink-0 flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
          Explore <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Search templates by name, style, or use-case..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((template) => (
          <div key={template.id} className="rounded-xl border border-card-border bg-card overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer">
            {/* Color preview */}
            <div className="h-32 relative" style={{ background: `linear-gradient(135deg, ${template.preview[0]}, ${template.preview[1]}, ${template.preview[2]})` }}>
              {template.premium && (
                <span className="absolute top-3 right-3 text-[10px] font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">PRO</span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button className="px-4 py-2 rounded-lg bg-white text-foreground text-sm font-semibold shadow-lg hover:bg-white/90 transition-colors flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Use Template
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground leading-snug">{template.name}</p>
                <span className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold flex-shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {template.rating}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  <TemplatePlatformIcon platform={template.platform} />
                  {template.platform}
                </span>
                <span className="text-[11px] text-muted-foreground">{template.uses.toLocaleString()} uses</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <span key={tag} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>

              <button className="w-full mt-1 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5">
                Apply to Brand
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <LayoutTemplate className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No templates found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term or category.</p>
        </div>
      )}
    </div>
  );
}
