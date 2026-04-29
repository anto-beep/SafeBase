import { Link } from "react-router-dom";
import { HardHat, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
          <div className="w-8 h-8 bg-ink flex items-center justify-center"><HardHat weight="fill" className="text-warning" size={20} /></div>
          <span className="font-display font-black text-lg tracking-tight">SAFETRADIE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 label-eyebrow">
          <Link to="/services/swms" data-testid="nav-swms">Documents</Link>
          <Link to="/services/incidents" data-testid="nav-incidents-marketing">Incidents</Link>
          <Link to="/services/people" data-testid="nav-people">People</Link>
          <Link to="/services/intelligence" data-testid="nav-intelligence">Intelligence</Link>
          <Link to="/pricing" data-testid="nav-pricing">Pricing</Link>
          <Link to="/partners" data-testid="nav-partners">Partners</Link>
          <Link to="/resources" data-testid="nav-resources">Resources</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" className="btn-sharp" data-testid="nav-login-btn">Log in</Button></Link>
          <Link to="/register"><Button className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="nav-register-btn">Get Started <ArrowRight className="ml-1" /></Button></Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-warning flex items-center justify-center"><HardHat weight="fill" className="text-ink" size={20} /></div>
            <span className="font-display font-black text-lg">SAFETRADIE</span>
          </div>
          <p className="text-sm text-white/60 max-w-xs mb-4">Compliance infrastructure for Australian trade businesses. SWMS, incidents, licences and AI intelligence — one connected layer.</p>
          <div className="font-mono text-xs text-white/40">v1.0 · ABN 84 000 000 000 · Sydney, AU</div>
        </div>
        <div>
          <div className="label-eyebrow text-white/60 mb-3">Platform</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/services/swms">SWMS Generator</Link></li>
            <li><Link to="/services/incidents">Incidents</Link></li>
            <li><Link to="/services/people">People & Licences</Link></li>
            <li><Link to="/services/intelligence">Intelligence</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow text-white/60 mb-3">Solutions</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/partners">White-label</Link></li>
            <li><Link to="/franchises">Franchises</Link></li>
            <li><Link to="/resources">Resources</Link></li>
            <li><Link to="/about">About</Link></li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow text-white/60 mb-3">Account</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/login">Log in</Link></li>
            <li><Link to="/register">Start trial</Link></li>
            <li><a href="mailto:hello@safetradie.com.au">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">© {new Date().getFullYear()} SafeTradie · Australia · WHS disclaimer: SafeTradie supports compliance — final responsibility rests with the PCBU.</div>
    </footer>
  );
}
