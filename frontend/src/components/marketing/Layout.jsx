import { Link } from "react-router-dom";
import { HardHat, ArrowRight, CaretDown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
          <div className="w-8 h-8 bg-ink flex items-center justify-center"><HardHat weight="fill" className="text-warning" size={20} /></div>
          <span className="font-display font-black text-lg tracking-tight">SAFETRADIE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 label-eyebrow">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 outline-none uppercase tracking-widest" data-testid="nav-products">PRODUCTS <CaretDown size={10} /></DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-none border-ink w-64">
              <DropdownMenuItem asChild><Link to="/services/swms">Core — SWMS & Compliance</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/services/incidents">Incident Management</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/services/people">People & Licences</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/services/intelligence">Compliance Intelligence</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/products/tradeinduct">TradeInduct · QR inductions</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/products/tradecheck">TradeCheck · Subbie credentials</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/products/academy">SafeTradie Academy · Training</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/consulting">WHS Consulting</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/ecosystem" data-testid="nav-ecosystem" className="uppercase tracking-widest">HOW IT WORKS</Link>
          <Link to="/pricing" data-testid="nav-pricing" className="uppercase tracking-widest">PRICING</Link>
          <Link to="/enterprise" data-testid="nav-enterprise" className="text-[#1B3A5C] font-bold uppercase tracking-widest">ENTERPRISE</Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 outline-none uppercase tracking-widest" data-testid="nav-resources">RESOURCES <CaretDown size={10} /></DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-none border-ink w-64">
              <DropdownMenuItem asChild><Link to="/blog" data-testid="nav-resources-blog">Blog · Articles & guides</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/compare" data-testid="nav-resources-compare">Compare · SafeTradie vs others</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/templates">Free templates</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/guides">State guides</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/tools/fine-calculator">Fine calculator</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/integrations">Integrations</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/resources" data-testid="nav-resources-all">All resources</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/enterprise" className="hidden lg:block"><Button variant="outline" className="btn-sharp border-[#1B3A5C] text-[#1B3A5C] hover:bg-[#1B3A5C] hover:text-white uppercase tracking-widest" data-testid="nav-demo-btn">Book a demo</Button></Link>
          <Link to="/login"><Button variant="ghost" className="btn-sharp uppercase tracking-widest" data-testid="nav-login-btn">Log in</Button></Link>
          <Link to="/register"><Button className="btn-sharp bg-ink text-white hover:bg-authority uppercase tracking-widest" data-testid="nav-register-btn">Start free trial <ArrowRight className="ml-1" /></Button></Link>
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
            <div className="w-8 h-8 bg-warning flex items-center justify-center"><HardHat weight="fill" className="text-ink" size={20} /></div>
            <span className="font-display font-black text-lg">SAFETRADIE</span>
          </div>
          <p className="text-sm text-white/60 max-w-xs mb-4">Australia's only WHS compliance platform built for trades. Powered by AI.</p>
          <div className="font-mono text-xs text-white/40">Australian owned · Australian hosted · Built for Australian WHS law</div>
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
          <div className="label-eyebrow text-white/60 mb-3">Add-ons</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/products/tradeinduct">TradeInduct</Link></li>
            <li><Link to="/products/tradecheck">TradeCheck</Link></li>
            <li><Link to="/products/academy">Academy</Link></li>
            <li><Link to="/consulting">WHS Consulting</Link></li>
            <li><Link to="/franchises">Franchises</Link></li>
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
            <li><a href="mailto:hello@safetradie.com.au">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">© {new Date().getFullYear()} SafeTradie · WHS disclaimer: SafeTradie supports compliance — final responsibility rests with the PCBU.</div>
    </footer>
  );
}


/**
 * Default-export wrapper that renders MarketingNav + children + MarketingFooter.
 * Use for marketing/public pages: <MarketingLayout>{your content}</MarketingLayout>
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
