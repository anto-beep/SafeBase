import { Link } from "react-router-dom";
import { Cube, ArrowRight, CaretDown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { INDUSTRY_LIST } from "@/data/industries.config";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
          <div className="w-8 h-8 bg-ink flex items-center justify-center"><Cube weight="fill" className="text-warning" size={18} /></div>
          <span className="font-display font-black text-lg tracking-tight">SAFEBASE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 label-eyebrow">
          <Link to="/" data-testid="nav-home" className="uppercase tracking-widest">HOME</Link>
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
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 outline-none uppercase tracking-widest" data-testid="nav-features">
              FEATURES <CaretDown size={10} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-none border-ink w-64">
              <DropdownMenuItem asChild><Link to="/services/swms">SWMS & Compliance</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/services/incidents">Incident Management</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/services/people">People & Licences</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/services/intelligence">Compliance Intelligence</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/products/tradeinduct">QR site inductions</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/products/tradecheck">Contractor credentials</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/products/academy">Worker training</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/consulting">WHS Consulting</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/pricing" data-testid="nav-pricing" className="uppercase tracking-widest">PRICING</Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 outline-none uppercase tracking-widest" data-testid="nav-resources">
              RESOURCES <CaretDown size={10} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-none border-ink w-64">
              <DropdownMenuItem asChild><Link to="/blog" data-testid="nav-resources-blog">Blog · Articles & guides</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/compare" data-testid="nav-resources-compare">Compare · SafeBase vs others</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/templates">Free templates</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/guides">State guides</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/tools/fine-calculator">Fine calculator</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/integrations">Integrations</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/resources" data-testid="nav-resources-all">All resources</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <a href="mailto:hello@safebase.com.au" data-testid="nav-contact" className="uppercase tracking-widest">CONTACT</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" className="btn-sharp uppercase tracking-widest" data-testid="nav-login-btn">Log in</Button></Link>
          <Link to="/register"><Button className="btn-sharp bg-ink text-white hover:bg-authority uppercase tracking-widest" data-testid="nav-register-btn">Start Free Trial <ArrowRight className="ml-1" /></Button></Link>
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
          <p className="text-sm text-white/60 max-w-xs mb-4">Australia's WHS compliance platform for every industry. Powered by AI.</p>
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
            <li><Link to="/ecosystem">Ecosystem</Link></li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow text-white/60 mb-3">Resources</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/blog">Blog</Link></li>
            <li><Link to="/templates">Free templates</Link></li>
            <li><Link to="/guides">State guides</Link></li>
            <li><Link to="/tools/fine-calculator">Fine calculator</Link></li>
            <li><Link to="/compare">Compare</Link></li>
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
