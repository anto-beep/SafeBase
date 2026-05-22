import { Link, useNavigate } from "react-router-dom";
import { Cube, ArrowRight, CaretDown, SquaresFour, SignOut, User, CreditCard } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { INDUSTRY_LIST } from "@/data/industries.config";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const INDUSTRY_ACCENT = {
  trades: "#FFCC00",
  hospitality: "#7C1D3F",
  transport: "#0DC4B5",
  healthcare: "#2196A6",
  retail: "#A855F7",
};

function initialsOf(user) {
  const name = (user?.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] || "";
    const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || "");
    return (first + second).toUpperCase();
  }
  const email = user?.email || "";
  return (email.slice(0, 2) || "SB").toUpperCase();
}

function roleLabel(user) {
  const r = (user?.role_title || user?.role || "owner").toLowerCase();
  return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function AuthMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const industry = user?.industry || user?.primary_industry || "trades";
  const accent = INDUSTRY_ACCENT[industry] || "#FFCC00";

  const onLogout = async () => {
    await logout();
    toast.success("You have been signed out");
    navigate("/");
  };

  return (
    <div className="flex items-center gap-2">
      <Link to="/dashboard">
        <Button
          variant="ghost"
          className="btn-sharp uppercase tracking-widest font-bold inline-flex items-center"
          data-testid="nav-dashboard-btn"
        >
          <SquaresFour size={16} weight="duotone" className="mr-1.5" />
          Dashboard
        </Button>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="outline-none focus:outline-none"
          data-testid="nav-avatar-btn"
          aria-label="Open user menu"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold border-2 border-ink bg-ink"
            data-testid="nav-avatar-initials"
          >
            {initialsOf(user)}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-60 rounded-none border-2 border-ink shadow-lg p-0"
          data-testid="nav-avatar-menu"
        >
          <DropdownMenuLabel className="px-3 py-3 bg-muted/50">
            <div className="font-bold text-sm leading-tight" data-testid="nav-avatar-name">{user?.name || "Account"}</div>
            <div className="text-xs text-muted-foreground truncate mt-0.5" data-testid="nav-avatar-email">{user?.email}</div>
            <span
              className="inline-block mt-2 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-ink"
              style={{ background: accent }}
              data-testid="nav-avatar-role"
            >
              {roleLabel(user)}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuItem asChild className="rounded-none px-3 py-2 cursor-pointer focus:bg-muted">
            <Link to="/dashboard" data-testid="nav-avatar-dashboard"><SquaresFour size={14} className="mr-2" />Dashboard</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-none px-3 py-2 cursor-pointer focus:bg-muted">
            <Link to="/dashboard/settings" data-testid="nav-avatar-profile"><User size={14} className="mr-2" />My profile</Link>
          </DropdownMenuItem>
          {(user?.role === "owner" || user?.role_title === "owner") && (
            <DropdownMenuItem asChild className="rounded-none px-3 py-2 cursor-pointer focus:bg-muted">
              <Link to="/dashboard/settings?tab=billing" data-testid="nav-avatar-billing"><CreditCard size={14} className="mr-2" />Billing</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); onLogout(); }}
            className="rounded-none px-3 py-2 cursor-pointer focus:bg-muted text-destructive font-bold"
            data-testid="nav-avatar-logout"
          >
            <SignOut size={14} className="mr-2" />Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PublicAuthButtons() {
  return (
    <div className="flex items-center gap-2">
      <Link to="/login">
        <Button
          variant="outline"
          className="btn-sharp border-2 border-ink bg-white hover:bg-warning hover:text-ink uppercase tracking-widest font-bold"
          data-testid="nav-login-btn"
        >
          Log in
        </Button>
      </Link>
      <Link to="/book-demo"><Button variant="ghost" className="btn-sharp uppercase tracking-widest hidden lg:inline-flex" data-testid="nav-demo-btn">Book a Demo</Button></Link>
      <Link to="/register"><Button className="btn-sharp bg-ink text-white hover:bg-authority uppercase tracking-widest" data-testid="nav-register-btn">Start Free Trial <ArrowRight className="ml-1" /></Button></Link>
    </div>
  );
}

export function MarketingNav() {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
          <div className="w-8 h-8 bg-ink flex items-center justify-center"><Cube weight="fill" className="text-warning" size={18} /></div>
          <span className="font-display font-black text-lg tracking-tight">SAFEBASE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 label-eyebrow">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 outline-none uppercase tracking-widest" data-testid="nav-industries">
              INDUSTRIES <CaretDown size={10} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-none border-ink w-64">
              <DropdownMenuItem asChild>
                <Link to="/industries" data-testid="nav-industries-overview" className="font-bold">All industries (overview)</Link>
              </DropdownMenuItem>
              {INDUSTRY_LIST.map((i) => (
                <DropdownMenuItem key={i.slug} asChild>
                  <Link to={`/industries/${i.slug}`} data-testid={`nav-industries-${i.slug}`}>{i.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/pricing" data-testid="nav-pricing" className="uppercase tracking-widest">PRICING</Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 outline-none uppercase tracking-widest" data-testid="nav-resources">
              RESOURCES <CaretDown size={10} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-none border-ink w-64">
              <DropdownMenuItem asChild><Link to="/resources" data-testid="nav-resources-all" className="font-bold">All resources</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/resources/trades" data-testid="nav-resources-trades">Trades resources</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/resources/hospitality" data-testid="nav-resources-hospitality">Hospitality resources</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/resources/transport" data-testid="nav-resources-transport">Transport resources</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/resources/healthcare" data-testid="nav-resources-healthcare">Healthcare resources</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/resources/retail" data-testid="nav-resources-retail">Retail resources</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/regulatory-digest" data-testid="nav-resources-digest" className="font-bold">Regulatory Digest — What changed</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/templates" data-testid="nav-resources-templates">Free templates</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/resources#ai" data-testid="nav-resources-ai">Ask SafeBase AI</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 outline-none uppercase tracking-widest" data-testid="nav-tools">
              TOOLS <CaretDown size={10} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-none border-ink w-56">
              <DropdownMenuItem asChild><Link to="/plan-rightsizer" data-testid="nav-tools-rightsizer" className="font-bold">Plan Right-sizer</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/risk-calculator" data-testid="nav-tools-risk-calc">Industry Risk Calculator</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/credential-expiry-calculator" data-testid="nav-tools-cred-calc">Credential Expiry Calculator</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/insurance-discount-calculator" data-testid="nav-tools-insurance-calc">Insurance Discount Calculator</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/tools/fine-calculator" data-testid="nav-tools-fine-calc">WHS Fine Calculator</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/compare" data-testid="nav-tools-compare">Compare SafeBase</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/compare" data-testid="nav-compare" className="uppercase tracking-widest">COMPARE</Link>
        </nav>
        <div className="flex items-center gap-2">
          {loading ? null : user ? <AuthMenu /> : <PublicAuthButtons />}
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 grid grid-cols-2 md:grid-cols-6 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-warning flex items-center justify-center"><Cube weight="fill" className="text-ink" size={18} /></div>
            <span className="font-display font-black text-lg">SAFEBASE</span>
          </div>
          <p className="text-sm text-white/60 max-w-xs mb-4">SafeBase. WHS and Compliance Management for Every Australian Industry. AI-Powered. Australian-Built. Australian-Hosted.</p>
          <div className="font-mono text-xs text-white/40">Australian owned · Australian hosted · Built for Australian WHS law</div>
        </div>
        <div>
          <div className="label-eyebrow text-white/60 mb-3">Industries</div>
          <ul className="space-y-2 text-sm">
            {INDUSTRY_LIST.map((i) => (
              <li key={i.slug}><Link to={`/industries/${i.slug}`}>{i.name}</Link></li>
            ))}
            <li><Link to="/industries">All industries</Link></li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow text-white/60 mb-3">Platform</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/services/swms">SWMS Generator</Link></li>
            <li><Link to="/services/incidents">Incidents</Link></li>
            <li><Link to="/services/people">People & Licences</Link></li>
            <li><Link to="/services/intelligence">Intelligence</Link></li>
            <li><Link to="/services/swms">Ecosystem</Link></li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow text-white/60 mb-3">Tools</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/plan-rightsizer">Plan Right-sizer</Link></li>
            <li><Link to="/risk-calculator">Risk Calculator</Link></li>
            <li><Link to="/credential-expiry-calculator">Credential Expiry Calculator</Link></li>
            <li><Link to="/insurance-discount-calculator">Insurance Discount Calculator</Link></li>
            <li><Link to="/tools/fine-calculator">Fine Calculator</Link></li>
            <li><Link to="/templates">Free Templates</Link></li>
            <li><Link to="/compare">Compare</Link></li>
            <li><Link to="/book-demo">Book a Demo</Link></li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow text-white/60 mb-3">Resources</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/blog">Blog</Link></li>
            <li><Link to="/regulatory-digest">Regulatory Digest</Link></li>
            <li><Link to="/guides">State guides</Link></li>
            <li><Link to="/resources">All resources</Link></li>
            <li><Link to="/integrations">Integrations</Link></li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow text-white/60 mb-3">Company</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about">About</Link></li>
            <li><Link to="/partners">Partner Program</Link></li>
            <li><Link to="/resources">Resources</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><a href="mailto:hello@safebase.com.au">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">© {new Date().getFullYear()} SafeBase · WHS disclaimer: SafeBase supports compliance — final responsibility rests with the PCBU.</div>
    </footer>
  );
}

/**
 * Default-export wrapper that renders MarketingNav + children + MarketingFooter.
 */
export default function MarketingLayout({ children }) {
  return (
    <>
      <MarketingNav />
      {children}
      <MarketingFooter />
    </>
  );
}
