import { useState } from "react";
import {
  ShieldCheck, Users, Brain, BarChart3, Settings, Activity, Zap,
  CheckCircle2, AlertCircle, Clock, Server, Database, Cpu, Globe,
  DollarSign, TrendingUp, RefreshCw, Eye, Sliders, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = ["Overview", "AI Agents", "Users", "Billing", "Settings", "Audit Log"];

const systemHealth = [
  { name: "API Server", status: "healthy", latency: "48ms", uptime: "99.98%" },
  { name: "AI Engine", status: "healthy", latency: "1.2s", uptime: "99.91%" },
  { name: "Database", status: "healthy", latency: "12ms", uptime: "99.99%" },
  { name: "CDN / Storage", status: "degraded", latency: "210ms", uptime: "98.5%" },
];

const aiAgents = [
  { name: "Logo Analyzer Agent", model: "GPT-4o Vision", status: "active", tasks: 1248, accuracy: "96.2%" },
  { name: "Brand Identity Agent", model: "GPT-4o", status: "active", tasks: 892, accuracy: "94.8%" },
  { name: "Campaign Planner Agent", model: "GPT-4o", status: "active", tasks: 541, accuracy: "93.1%" },
  { name: "Content Generator Agent", model: "GPT-4o", status: "active", tasks: 3120, accuracy: "97.4%" },
  { name: "Image Generation Agent", model: "DALL-E 3", status: "active", tasks: 2340, accuracy: "91.0%" },
  { name: "Analytics Agent", model: "GPT-4o", status: "idle", tasks: 228, accuracy: "95.7%" },
];

const recentUsers = [
  { name: "Ahmed Al-Rashidi", plan: "Pro", brands: 4, joined: "2 days ago", status: "active" },
  { name: "Sara Mohammed", plan: "Enterprise", brands: 12, joined: "1 week ago", status: "active" },
  { name: "Khalid Ibrahim", plan: "Starter", brands: 1, joined: "3 days ago", status: "active" },
  { name: "Nora Al-Qahtani", plan: "Pro", brands: 6, joined: "2 weeks ago", status: "active" },
];

const auditLog = [
  { action: "Brand kit generated", user: "Ahmed Al-Rashidi", time: "2 min ago", icon: Zap, color: "text-primary" },
  { action: "AI model updated: GPT-4o → GPT-4o-mini (cost opt.)", user: "System", time: "1h ago", icon: Brain, color: "text-violet-500" },
  { action: "New user registered (Enterprise plan)", user: "Sara Mohammed", time: "3h ago", icon: Users, color: "text-green-500" },
  { action: "Campaign batch generated (14 posts)", user: "Khalid Ibrahim", time: "5h ago", icon: BarChart3, color: "text-cyan-500" },
  { action: "Asset uploaded (Brand Guidelines PDF)", user: "Nora Al-Qahtani", time: "Yesterday", icon: CheckCircle2, color: "text-amber-500" },
];

const kpiCards = [
  { label: "Monthly Revenue", value: "$28,450", icon: DollarSign, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950", trend: "+14% MoM" },
  { label: "Active Users", value: "1,248", icon: Users, color: "text-primary", bg: "bg-primary/10", trend: "+8% MoM" },
  { label: "AI API Calls", value: "94.2K", icon: Brain, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950", trend: "This month" },
  { label: "Uptime", value: "99.96%", icon: Activity, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950", trend: "Last 30 days" },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Super Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Control Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Full system visibility and control over all platform operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Bell className="w-4 h-4" />
            Alerts (3)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "Overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpiCards.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="rounded-xl border border-card-border bg-card p-5 space-y-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", kpi.bg)}>
                    <Icon className={cn("w-4 h-4", kpi.color)} />
                  </div>
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                    <p className="text-[11px] text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {kpi.trend}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* System Health */}
          <div className="rounded-xl border border-card-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Server className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">System Health</h2>
            </div>
            <div className="space-y-3">
              {systemHealth.map((svc) => (
                <div key={svc.name} className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    svc.status === "healthy" ? "bg-green-500" : svc.status === "degraded" ? "bg-amber-500" : "bg-rose-500"
                  )} />
                  <span className="text-sm font-medium text-foreground w-40 flex-shrink-0">{svc.name}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", svc.status === "healthy" ? "bg-green-500" : "bg-amber-500")}
                      style={{ width: svc.uptime }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">{svc.uptime}</span>
                  <span className="text-xs text-muted-foreground w-16 text-right">{svc.latency}</span>
                  {svc.status === "degraded" && <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                  {svc.status === "healthy" && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div className="rounded-xl border border-card-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Audit Trail</h2>
            </div>
            <div className="space-y-3">
              {auditLog.map((entry, i) => {
                const Icon = entry.icon;
                return (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", entry.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{entry.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.user}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-shrink-0">
                      <Clock className="w-3 h-3" /> {entry.time}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI Agents */}
      {activeTab === "AI Agents" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{aiAgents.length} agents deployed and monitored</p>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Sliders className="w-3.5 h-3.5" />
              Configure
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiAgents.map((agent) => (
              <div key={agent.name} className="rounded-xl border border-card-border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    agent.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-muted text-muted-foreground"
                  )}>
                    {agent.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{agent.model}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tasks Run</p>
                    <p className="text-sm font-bold text-foreground">{agent.tasks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Accuracy</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">{agent.accuracy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === "Users" && (
        <div className="rounded-xl border border-card-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              User Management
            </h2>
            <span className="text-xs text-muted-foreground">1,248 total users</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">User</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden sm:table-cell">Plan</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden md:table-cell">Brands</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Joined</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden lg:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentUsers.map((user, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      user.plan === "Enterprise" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                      user.plan === "Pro" ? "bg-primary/10 text-primary" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{user.brands}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{user.joined}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-3 h-3" /> {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Billing, Settings, Audit Log tabs — placeholders */}
      {(activeTab === "Billing" || activeTab === "Settings" || activeTab === "Audit Log") && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-16 text-center">
          {activeTab === "Billing" && <DollarSign className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />}
          {activeTab === "Settings" && <Settings className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />}
          {activeTab === "Audit Log" && <Eye className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />}
          <p className="text-sm font-semibold text-muted-foreground">{activeTab}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Advanced {activeTab.toLowerCase()} configuration coming soon.</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Cpu className="w-3.5 h-3.5" />
            Enterprise feature — contact admin to enable
          </div>
        </div>
      )}
    </div>
  );
}
