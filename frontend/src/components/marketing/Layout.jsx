import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Cube, ArrowRight, CaretDown, SquaresFour, SignOut, User, CreditCard, List, X, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
      <Button
        asChild
        variant="ghost"
        className="btn-sharp uppercase tracking-widest font-bold"
        data-testid="nav-dashboard-btn"
      >
        <Link to="/dashboard">
          <SquaresFour size={16} weight="duotone" className="mr-1.5" />
          Dashboard
        </Link>
      </Button>
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
      {/* "Book a Demo" only on the desktop ≥lg */}
      <Link to="/book-demo" className="hidden lg:inline-flex">
        <Button variant="ghost" className="btn-sharp uppercase tracking-widest" data-testid="nav-demo-btn">Book a Demo</Button>
      </Link>
      {/* "Log in" only on desktop ≥md (replaced by drawer link on mobile) */}
      <Link to="/login" className="hidden md:inline-flex">
        <Button
          variant="outline"
          className="btn-sharp border-2 border-ink bg-white hover:bg-warning hover:text-ink uppercase tracking-widest font-bold"
          data-testid="nav-login-btn"
        >
          Log in
        </Button>
      </Link>
      {/* Compact CTA: shorter copy "Start free" on tablet/mobile, full text on desktop */}
      <Link to="/register">
        <Button className="btn-sharp bg-ink text-white hover:bg-authority uppercase tracking-widest text-xs sm:text-sm px-3 sm:px-4" data-testid="nav-register-btn">
          <span className="hidden sm:inline">Start Free Trial</span>
          <span className="sm:hidden">Try Free</span>
          <ArrowRight className="ml-1" weight="bold" />
        </Button>
      </Link>
    </div>
  );
}

/** Mobile drawer — full navigation tree opened from the hamburger.
 *  Closes on link tap via Sheet's controlled open state. */
function MobileNav({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation menu"
          className="md:hidden w-10 h-10 flex items-center justify-center text-ink hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ink"
          data-testid="nav-mobile-toggle"
        >
          <List size={24} weight="bold" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[360px] p-0 bg-background border-l-2 border-ink overflow-y-auto" data-testid="nav-mobile-drawer">
        <div className="bg-ink text-white px-5 py-5 flex items-center justify-between sticky top-0 z-10">
          <Link to="/" onClick={close} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-warning flex items-center justify-center"><Cube weight="fill" className="text-ink" size={16} /></div>
            <span className="font-display font-black tracking-tight">SAFEBASE</span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 focus:outline-none"
            data-testid="nav-mobile-close"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <nav className="px-5 py-4 space-y-1">
          <MobileGroup label="Industries">
            <MobileItem to="/industries" onClick={close} bold testid="nav-mobile-industries-all">All industries</MobileItem>
            {INDUSTRY_LIST.map((i) => (
              <MobileItem key={i.slug} to={`/industries/${i.slug}`} onClick={close} testid={`nav-mobile-industries-${i.slug}`}>{i.name}</MobileItem>
            ))}
          </MobileGroup>

          <Link to="/pricing" onClick={close} className="block py-3 px-2 border-b border-border font-display font-black text-lg tracking-tight" data-testid="nav-mobile-pricing">
            Pricing
          </Link>

          <MobileGroup label="Resources">
            <MobileItem to="/resources" onClick={close} bold testid="nav-mobile-resources-all">All resources</MobileItem>
            <MobileItem to="/resources/trades" onClick={close} testid="nav-mobile-resources-trades">Trades resources</MobileItem>
            <MobileItem to="/resources/hospitality" onClick={close} testid="nav-mobile-resources-hospitality">Hospitality resources</MobileItem>
            <MobileItem to="/resources/transport" onClick={close} testid="nav-mobile-resources-transport">Transport resources</MobileItem>
            <MobileItem to="/resources/healthcare" onClick={close} testid="nav-mobile-resources-healthcare">Healthcare resources</MobileItem>
            <MobileItem to="/resources/retail" onClick={close} testid="nav-mobile-resources-retail">Retail resources</MobileItem>
            <MobileItem to="/regulatory-digest" onClick={close} bold testid="nav-mobile-resources-digest">Regulatory Digest</MobileItem>
            <MobileItem to="/templates" onClick={close} testid="nav-mobile-resources-templates">Free templates</MobileItem>
            <MobileItem to="/resources#ai" onClick={close} testid="nav-mobile-resources-ai">Ask SafeBase AI</MobileItem>
          </MobileGroup>

          <MobileGroup label="Tools">
            <MobileItem to="/plan-rightsizer" onClick={close} bold testid="nav-mobile-tools-rightsizer">Plan Right-sizer</MobileItem>
            <MobileItem to="/risk-calculator" onClick={close} testid="nav-mobile-tools-risk">Industry Risk Calculator</MobileItem>
            <MobileItem to="/credential-expiry-calculator" onClick={close} testid="nav-mobile-tools-cred">Credential Expiry Calculator</MobileItem>
            <MobileItem to="/insurance-discount-calculator" onClick={close} testid="nav-mobile-tools-insurance">Insurance Discount Calculator</MobileItem>
            <MobileItem to="/tools/fine-calculator" onClick={close} testid="nav-mobile-tools-fine">WHS Fine Calculator</MobileItem>
            <MobileItem to="/compare" onClick={close} testid="nav-mobile-tools-compare">Compare SafeBase</MobileItem>
          </MobileGroup>

          <Link to="/compare" onClick={close} className="block py-3 px-2 border-b border-border font-display font-black text-lg tracking-tight" data-testid="nav-mobile-compare">
            Compare
          </Link>
          <Link to="/book-demo" onClick={close} className="block py-3 px-2 border-b border-border font-display font-black text-lg tracking-tight" data-testid="nav-mobile-demo">
            Book a Demo
          </Link>
        </nav>

        {/* Auth CTA block — pinned bottom feel */}
        <div className="border-t-2 border-ink p-5 bg-muted/40 space-y-2" data-testid="nav-mobile-cta">
          {user ? (
            <>
              <Link to="/dashboard" onClick={close} className="block">
                <Button className="btn-sharp w-full bg-ink text-white hover:bg-authority uppercase tracking-widest font-bold" data-testid="nav-mobile-dashboard">
                  <SquaresFour size={16} weight="duotone" className="mr-2" />Dashboard
                </Button>
              </Link>
              <Button
                onClick={() => { close(); onLogout && onLogout(); }}
                variant="outline"
                className="btn-sharp w-full border-2 border-ink uppercase tracking-widest font-bold"
                data-testid="nav-mobile-logout"
              >
                <SignOut size={16} className="mr-2" />Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/register" onClick={close} className="block">
                <Button className="btn-sharp w-full bg-ink text-white hover:bg-authority uppercase tracking-widest font-bold" data-testid="nav-mobile-register">
                  Start Free Trial <ArrowRight className="ml-1" weight="bold" />
                </Button>
              </Link>
              <Link to="/login" onClick={close} className="block">
                <Button variant="outline" className="btn-sharp w-full border-2 border-ink uppercase tracking-widest font-bold" data-testid="nav-mobile-login">
                  Log in
                </Button>
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileGroup({ label, children }) {
  return (
    <details className="border-b border-border group" data-testid={`nav-mobile-group-${label.toLowerCase()}`}>
      <summary className="py-3 px-2 flex items-center justify-between cursor-pointer list-none font-display font-black text-lg tracking-tight">
        <span>{label}</span>
        <CaretRight size={16} className="transition-transform group-open:rotate-90" />
      </summary>
      <div className="pb-2 pl-2">
        {children}
      </div>
    </details>
  );
}

function MobileItem({ to, onClick, children, bold = false, testid }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`block py-2 px-3 text-sm hover:bg-muted ${bold ? "font-bold" : "text-muted-foreground"}`}
      data-testid={testid}
    >
      {children}
    </Link>
  );
}

export function MarketingNav() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const onLogoutMobile = async () => {
    await logout();
    toast.success("You have been signed out");
    navigate("/");
  };
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="brand-link">
          <div className="w-8 h-8 bg-ink flex items-center justify-center"><Cube weight="fill" className="text-warning" size={18} /></div>
          <span className="font-display font-black text-lg tracking-tight">SAFEBASE</span>
        </Link>
        {/* Desktop nav — hidden below md, condensed on md, full on lg+ */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 label-eyebrow">
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
          {/* "COMPARE" link only on ≥lg to avoid wrapping at md sizes */}
          <Link to="/compare" data-testid="nav-compare" className="hidden lg:inline uppercase tracking-widest">COMPARE</Link>
        </nav>
        {/* Right cluster: desktop auth or hamburger */}
        <div className="flex items-center gap-2">
          {loading ? null : user ? <AuthMenu /> : <PublicAuthButtons />}
          <MobileNav user={user} onLogout={onLogoutMobile} />
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
