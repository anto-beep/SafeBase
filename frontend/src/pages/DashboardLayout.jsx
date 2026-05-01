import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Button } from "@/components/ui/button";
import { HardHat, House, FileText, Warning, Users, IdentificationBadge, SignOut, Bell, Gear, ChatCircleText, Truck, Flask, ClipboardText, FirstAidKit, ChartLineUp, UserPlus, Calendar, Handshake, FlowArrow, QrCode, ShieldCheck, GraduationCap, Briefcase, DeviceMobile, Lightning, MagicWand, ShieldWarning, Books, Plug } from "@phosphor-icons/react";
import OnboardingWizard from "@/pages/OnboardingWizard";
import IndustrySwitcher from "@/components/IndustrySwitcher";
import ActivityTicker from "@/components/ActivityTicker";

const NAV = [
  { to: "/dashboard", end: true, label: "Overview", icon: House },
  { to: "/dashboard/compliance-inbox", label: "Compliance Inbox", icon: Bell, feature: "compliance_dashboard" },
  { to: "/dashboard/swms", labelKey: "primary_safety_module", label: "SWMS Library", icon: FileText, feature: "swms_generator" },
  // Industry-specific primary modules — only one of these will be enabled per
  // industry by the feature registry, so the user always sees exactly one
  // "primary" link in their sidebar regardless of which industry they're in.
  { to: "/dashboard/food-safety", label: "Food Safety", icon: ClipboardText, feature: "food_safety_module" },
  { to: "/dashboard/cor", label: "Chain of Responsibility", icon: Truck, feature: "cor_module" },
  { to: "/dashboard/care-quality", label: "Care Quality", icon: FirstAidKit, feature: "care_quality_module" },
  { to: "/dashboard/inductions", label: "Inductions", icon: QrCode, feature: "inductions_module" },
  { to: "/dashboard/document-library", label: "Document Library", icon: FileText, feature: "document_library" },
  { to: "/dashboard/incidents", label: "Incidents", icon: Warning, feature: "incident_management" },
  { to: "/dashboard/risk-register", label: "Risk Register", icon: ShieldWarning, feature: "risk_register" },
  { to: "/dashboard/risk-register?tab=reviews", label: "Risk Reviews", icon: ClipboardText, feature: "risk_register" },
  { to: "/dashboard/workers", labelKey: "workers", label: "Workers", icon: Users, feature: "workers" },
  { to: "/dashboard/competency-matrix", label: "Competency Matrix", icon: GraduationCap, feature: "training" },
  { to: "/dashboard/licences", label: "Licences", icon: IdentificationBadge, feature: "credential_tracking" },
  { to: "/dashboard/notifications", label: "Alerts", icon: Bell, feature: "notifications" },
];

// Industry-specific nav label overrides per Part 3 of the multi-industry brief.
// `primary_safety_module` re-labels the SWMS Library link; `workers` re-labels
// the Workers / Drivers / Team Members link.
const NAV_LABELS_BY_INDUSTRY = {
  trades: {       primary_safety_module: "SWMS Library",  workers: "Workers" },
  hospitality: {  primary_safety_module: "Food Safety",   workers: "Team Members" },
  transport: {    primary_safety_module: "Fleet & CoR",   workers: "Drivers & Operators" },
  healthcare: {   primary_safety_module: "Care Quality",  workers: "Staff & Clinicians" },
  retail: {       primary_safety_module: "Inductions",    workers: "Team Members" },
};

// Industry-specific app aliases — chosen by user (option b: industry-specific aliases).
const APPS_NAV_BY_INDUSTRY = {
  trades:       { tradeinduct: "TradeInduct", tradecheck: "TradeCheck" },
  hospitality:  { tradeinduct: "VenueInduct", tradecheck: "VenueCheck" },
  transport:    { tradeinduct: "FleetInduct", tradecheck: "FleetCheck" },
  healthcare:   { tradeinduct: "ClinicInduct", tradecheck: "ClinicCheck" },
  retail:       { tradeinduct: "StoreInduct", tradecheck: "StoreCheck" },
};

const SAFETY_NAV = [
  { to: "/dashboard/toolbox-talks", label: "Toolbox Talks", icon: ChatCircleText, feature: "toolbox_talks" },
  { to: "/dashboard/plant", label: "Plant", icon: Truck, feature: "plant_register" },
  { to: "/dashboard/substances", label: "Substances", icon: Flask, feature: "hazardous_substances" },
  { to: "/dashboard/inspections", label: "Inspections", icon: ClipboardText, feature: "inspection_checklists" },
  { to: "/dashboard/swms-revisions", label: "SWMS Revisions", icon: FileText, feature: "swms_generator" },
  { to: "/dashboard/first-aid-ppe", label: "First Aid & PPE", icon: FirstAidKit, feature: "first_aid_register" },
  { to: "/dashboard/ai-docs", label: "AI Documents", icon: MagicWand },
  { to: "/dashboard/academy-app", label: "SafeBase Academy", icon: GraduationCap },
  { to: "/dashboard/addons", label: "Add-ons", icon: Plug },
  { to: "/dashboard/documents", label: "Legacy Documents", icon: FileText },
];

const LIBRARY_NAV = [
  { to: "/dashboard/library/processes", label: "Process Library", icon: Books },
  { to: "/dashboard/library/activities", label: "Activity Library", icon: Books },
  { to: "/dashboard/library/tasks", label: "Task Library", icon: Books },
  { to: "/dashboard/library/controls", label: "Control Library", icon: Books },
];

const WORKFLOW_NAV = [
  { to: "/dashboard/workflows/new-employee", label: "New Employee", icon: UserPlus },
  { to: "/dashboard/workflows/incident-resolution", label: "Incident Resolution", icon: Warning },
  { to: "/dashboard/workflows/swms-job-start", label: "SWMS to Job Start", icon: FlowArrow },
  { to: "/dashboard/workflows/annual-review", label: "Annual WHS Review", icon: Calendar },
  { to: "/dashboard/workflows/subcontractor", label: "Subcontractor", icon: Handshake },
];

const APPS_NAV = [
  { to: "/dashboard/tradeinduct", label: "TradeInduct", icon: QrCode, blurb: "QR subbie inductions" },
  { to: "/dashboard/tradecheck", label: "TradeCheck", icon: ShieldCheck, blurb: "Verify contractors" },
  { to: "/dashboard/academy", label: "Academy", icon: GraduationCap, blurb: "Worker micro-learning" },
  { to: "/dashboard/partner", label: "Partner Portal", icon: Briefcase, blurb: "Multi-client view" },
  { to: "/dashboard/partner/branding", label: "Partner · Branding", icon: Briefcase },
  { to: "/dashboard/automations", label: "Automations", icon: MagicWand },
  { to: "/dashboard/webhooks", label: "Webhooks", icon: Lightning },
  { to: "/worker", label: "Mobile Worker", icon: DeviceMobile, blurb: "Installable PWA" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { has, enabled_features } = useFeatureFlags();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const navActive = (to, end) => {
    const [toPath, toQuery] = to.split("?");
    if (end) return location.pathname === toPath && location.search.replace(/^\?/, "") === (toQuery || "");
    const pathMatches = location.pathname === toPath || location.pathname.startsWith(toPath + "/");
    if (!pathMatches) return false;
    // If the nav entry has a query, require it to match; if not, require current search to lack a tab=
    if (toQuery) return location.search.includes(toQuery);
    return !location.search.includes("tab=");
  };

  useEffect(() => {
    if (user && !user.onboarding_complete && user.auth_provider !== "google") {
      if (sessionStorage.getItem("onb_dismissed") === "1") return;
      api.get("/onboarding").then((r) => {
        if (!r.data?.completed) setShowOnboarding(true);
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const loadUnread = () => api.get("/notifications").then((r) => {
      setUnread((r.data || []).filter((n) => !n.read).length);
    }).catch(() => {});
    loadUnread();
    const id = setInterval(loadUnread, 60000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.assign("/");
  };

  // Industry-aware nav labels per Part 3 of the multi-industry brief.
  const industry = user?.industry || "trades";
  const labelOverrides = NAV_LABELS_BY_INDUSTRY[industry] || NAV_LABELS_BY_INDUSTRY.trades;
  const appAliases = APPS_NAV_BY_INDUSTRY[industry] || APPS_NAV_BY_INDUSTRY.trades;
  // Apply industry-specific label overrides AND filter by feature flags.
  // While `enabled_features` is still loading, show all so the sidebar
  // doesn't flicker. Once loaded, hide any item whose feature is not enabled.
  const flagsReady = enabled_features && enabled_features.length > 0;
  const renderedNav = NAV
    .map((it) => it.labelKey && labelOverrides[it.labelKey] ? { ...it, label: labelOverrides[it.labelKey] } : it)
    .filter((it) => !it.feature || !flagsReady || has(it.feature));
  const renderedAppsNav = APPS_NAV.map((it) => {
    if (it.to.endsWith("/tradeinduct")) return { ...it, label: appAliases.tradeinduct };
    if (it.to.endsWith("/tradecheck")) return { ...it, label: appAliases.tradecheck };
    return it;
  });

  // Industry colour accent for active sidebar items per Part 3 of the brief.
  const industryAccent = {
    trades: "border-l-4 border-[#FFCC00]",
    hospitality: "border-l-4 border-[#0F4C5C]",
    transport: "border-l-4 border-[#0DC4B5]",
    healthcare: "border-l-4 border-[#2196A6]",
    retail: "border-l-4 border-[#A855F7]",
  }[industry] || "border-l-4 border-[#FFCC00]";

  return (
    <div className="min-h-screen bg-muted">
      {showOnboarding && <OnboardingWizard onClose={() => { sessionStorage.setItem("onb_dismissed", "1"); setShowOnboarding(false); }} />}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-ink text-white hidden lg:flex flex-col" data-testid="dashboard-sidebar">
        <Link to="/dashboard" className="h-16 flex items-center gap-2 px-6 border-b border-white/10">
          <div className="w-8 h-8 bg-warning flex items-center justify-center"><HardHat weight="fill" className="text-ink" size={20} /></div>
          <span className="font-display font-black">SAFEBASE</span>
        </Link>
        <IndustrySwitcher />
        <nav className="flex-1 p-3 space-y-1">
          {renderedNav.map((item) => {
            const isActive = navActive(item.to, item.end);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')}`}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  isActive ? `bg-warning text-ink font-bold ${industryAccent}` : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={18} weight="bold" /> {item.label}
                {item.label === "Alerts" && unread > 0 && <span className="ml-auto bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5">{unread}</span>}
              </NavLink>
            );
          })}
          <NavLink to="/dashboard/reports" data-testid="nav-reports" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm ${isActive ? "bg-warning text-ink font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
            <ChartLineUp size={18} weight="bold" /> Reports
          </NavLink>
          <NavLink to="/dashboard/settings" data-testid="nav-settings" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm ${isActive ? "bg-warning text-ink font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
            <Gear size={18} weight="bold" /> Settings
          </NavLink>
          <div className="mt-5 px-3 label-eyebrow text-warning">Apps &amp; Add-ons</div>
          {renderedAppsNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-app-${item.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm ${
                  isActive ? "bg-warning text-ink font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon size={18} weight="bold" /> {item.label}
            </NavLink>
          ))}
          <div className="mt-5 px-3 label-eyebrow text-white/40">Safety</div>
          {SAFETY_NAV
            .filter((item) => !item.feature || !flagsReady || has(item.feature))
            .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm ${
                  isActive ? "bg-warning text-ink font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon size={18} weight="bold" /> {item.label}
            </NavLink>
          ))}
          <div className="mt-5 px-3 label-eyebrow text-white/40">Workflows</div>
          {WORKFLOW_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-wf-${item.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm ${
                  isActive ? "bg-warning text-ink font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon size={18} weight="bold" /> {item.label}
            </NavLink>
          ))}
          <div className="mt-5 px-3 label-eyebrow text-white/40">Library</div>
          {LIBRARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-lib-${item.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm ${
                  isActive ? "bg-warning text-ink font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon size={18} weight="bold" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-sm font-bold truncate">{user?.name}</div>
          <div className="text-xs text-white/50 truncate">{user?.email}</div>
          <div className="label-eyebrow text-warning mt-1">/ {user?.role}</div>
          <Button onClick={handleLogout} variant="outline" className="w-full btn-sharp mt-3 border-white/20 bg-transparent text-white hover:bg-white hover:text-ink" data-testid="logout-btn"><SignOut className="mr-2" />Log out</Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden bg-ink text-white sticky top-0 z-30 h-14 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2"><div className="w-7 h-7 bg-warning flex items-center justify-center"><HardHat weight="fill" className="text-ink" size={16} /></div><span className="font-display font-black text-sm">SAFEBASE</span></Link>
        <div className="flex items-center gap-2">
          <Link to="/dashboard/notifications" className="relative p-2" data-testid="mobile-bell">
            <Bell weight="duotone" />
            {unread > 0 && <span className="absolute top-1 right-1 bg-red-600 w-2 h-2 rounded-full" />}
          </Link>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white hover:text-ink hover:bg-warning" data-testid="mobile-logout-btn">Log out</Button>
        </div>
      </header>

      <main className="lg:ml-64 min-h-screen">
        <ActivityTicker />
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-ink text-white z-40 grid grid-cols-5 border-t border-white/10">
          {NAV.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 text-[10px] gap-1 ${isActive ? "text-warning" : "text-white/60"}`
              }
            >
              <item.icon size={20} weight="bold" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
