import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, IdentificationBadge, CheckCircle, QrCode, ShieldCheck } from "@phosphor-icons/react";

export default function TradeCheck() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-3">/ SafeCheck</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">Contractor Verification<br />for Every<br /><span className="bg-warning px-2">Industry.</span></h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-2xl">Trade licences. AHPRA registrations. Heavy vehicle endorsements. Food safety certificates. RSA credentials. SafeCheck verifies every credential type for every industry your business operates in.</p>
            <p className="mt-4 text-sm text-muted-foreground">A$299/month + GST standalone. Included from Tier 3 on every industry plan.</p>
            <div className="mt-8 flex gap-3">
              <Link to="/register"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="check-cta">Start Free Trial <ArrowRight className="ml-2" /></Button></Link>
            </div>
          </div>
          <div className="lg:col-span-5 bg-ink text-white p-8 border-2 border-ink">
            <div className="flex items-center justify-between">
              <div className="label-eyebrow text-warning">/ SAFECHECK PROFILE</div>
              <div className="flex items-center gap-1 bg-emerald-500 text-white px-2 py-1 text-xs font-bold">VERIFIED</div>
            </div>
            <div className="font-display font-black text-3xl mt-4">Sam Reyes</div>
            <div className="text-white/70">Reyes Electrical Pty Ltd · ABN 84 000 000 000</div>
            <div className="mt-6 space-y-2 text-sm font-mono">
              <div className="flex justify-between border-b border-white/10 py-2"><span>Public Liability</span><span className="text-warning">$20M · verified</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>Workers Comp</span><span className="text-warning">Active · verified</span></div>
              <div className="flex justify-between border-b border-white/10 py-2"><span>Electrical Licence</span><span className="text-warning">EL-9248-NSW</span></div>
              <div className="flex justify-between py-2"><span>White Card</span><span className="text-warning">WC-3398-2024</span></div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <QrCode size={48} weight="duotone" className="text-warning" />
              <div className="text-xs text-white/60">safecheck.safebase.com.au/sreyes</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-6">
            <div className="label-eyebrow mb-3">/ For subbies</div>
            <h2 className="font-display text-3xl font-black tracking-tighter">One profile. Every builder.</h2>
            <ul className="mt-6 space-y-3">
              {[
                "Upload once, share everywhere",
                "AI verifies insurance adequacy",
                "Auto-alerts before anything expires",
                "Reduce friction getting paid faster",
              ].map((b) => <li key={b} className="flex gap-2"><CheckCircle weight="fill" className="text-ink shrink-0" />{b}</li>)}
            </ul>
          </div>
          <div className="lg:col-span-6">
            <div className="label-eyebrow mb-3">/ For builders</div>
            <h2 className="font-display text-3xl font-black tracking-tighter">Verify subbies in one scan.</h2>
            <ul className="mt-6 space-y-3">
              {[
                "Scan QR or search by ABN",
                "Instant coverage adequacy check",
                "Bulk verification for projects",
                "Auto-alerts when subbies lapse",
              ].map((b) => <li key={b} className="flex gap-2"><CheckCircle weight="fill" className="text-ink shrink-0" />{b}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow text-warning mb-3">/ AI verification</div>
          <h2 className="font-display text-3xl font-black tracking-tighter mb-8">Smarter than a PDF folder.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10">
            <div className="bg-ink p-6">
              <div className="label-eyebrow text-warning mb-2">/ GREEN FLAG</div>
              <div className="bg-emerald-500/10 border-l-4 border-emerald-400 p-4 text-sm">"Insurance certificate verified — $20M public liability, expires 14 March 2027, policy from QBE (approved insurer)."</div>
            </div>
            <div className="bg-ink p-6">
              <div className="label-eyebrow text-warning mb-2">/ RED FLAG</div>
              <div className="bg-red-500/10 border-l-4 border-red-400 p-4 text-sm">"Coverage amount of $5M may be insufficient for commercial construction projects. Most principal contractors require $20M minimum."</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8"><h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">A$59/mo standalone. Free in Growing Business (A$400/mo).</h2></div>
          <div className="lg:col-span-4 lg:text-right"><Link to="/register"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="check-final-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
