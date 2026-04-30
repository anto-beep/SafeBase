import { useParams, Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { STATE_GUIDES } from "@/content/marketingData";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Globe, Warning, Gavel } from "@phosphor-icons/react";

export default function StateGuide() {
  const { state } = useParams();
  const guide = STATE_GUIDES[(state || "").toUpperCase()];

  if (!guide) return (
    <MarketingLayout>
      <section className="py-20 px-6 text-center" data-testid="state-guide-index">
        <div className="max-w-4xl mx-auto">
          <div className="label-eyebrow">/ State guides</div>
          <h1 className="font-display text-5xl font-black tracking-tighter mt-3">WHS — state by state.</h1>
          <p className="text-muted-foreground mt-4">Choose your state for regulator contacts, maximum fines, notifiable incident timeframes and recent prosecutions.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 max-w-3xl mx-auto">
            {Object.entries(STATE_GUIDES).map(([code, g]) => (
              <Link key={code} to={`/guides/${code}`} className="border-2 border-ink p-5 hover:bg-ink hover:text-warning transition-colors" data-testid={`state-link-${code}`}>
                <div className="font-display text-3xl font-black">{code}</div>
                <div className="text-xs mt-1">{g.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );

  return (
    <MarketingLayout>
      <section className="bg-ink text-white py-20 px-6" data-testid={`state-guide-${state}`}>
        <div className="max-w-6xl mx-auto">
          <Link to="/guides" className="label-eyebrow text-warning hover:underline">← All states</Link>
          <div className="label-eyebrow text-warning mt-6">/ {guide.name}</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">WHS in {guide.name}.</h1>
          <p className="text-white/70 mt-4 max-w-2xl">{guide.regulator} enforces WHS under the {guide.act}. This page is a practical summary — not legal advice.</p>
          <div className="flex flex-wrap gap-4 mt-8">
            <a href={`https://${guide.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-warning hover:underline"><Globe size={16} />{guide.url}</a>
            <a href={`tel:${guide.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-warning hover:underline"><Phone size={16} />{guide.phone}</a>
          </div>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="border-2 border-ink p-5 bg-background">
            <div className="label-eyebrow">/ Notifiable incident</div>
            <div className="font-display text-5xl font-black mt-3">{guide.notifiable_hours}h</div>
            <div className="text-sm text-muted-foreground mt-2">Written report window (notify verbally first, immediately).</div>
          </div>
          <div className="border border-border p-5">
            <div className="label-eyebrow text-muted-foreground">/ Max fine — individual</div>
            <div className="font-display text-2xl font-black mt-3 tracking-tight">{guide.max_fine_individual}</div>
          </div>
          <div className="border border-border p-5">
            <div className="label-eyebrow text-muted-foreground">/ Max fine — corporate</div>
            <div className="font-display text-2xl font-black mt-3 tracking-tight">{guide.max_fine_corporate}</div>
          </div>
        </div>
      </section>

      <section className="py-12 px-6 bg-muted">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="label-eyebrow flex items-center gap-2"><Warning />Key facts</div>
            <ul className="space-y-3 mt-4">
              {guide.key_facts.map((f, i) => (
                <li key={i} className="flex items-start gap-3 border-l-4 border-warning pl-3 py-1" data-testid={`state-fact-${i}`}>
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label-eyebrow flex items-center gap-2"><Gavel />Recent prosecutions</div>
            <ul className="space-y-3 mt-4">
              {guide.recent_fines.map((f, i) => (
                <li key={i} className="border border-border p-3 bg-background text-sm">{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-ink text-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="label-eyebrow text-warning">/ Comply automatically</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-2">SafeTradie knows {guide.name} WHS law.</h2>
          <p className="text-white/70 mt-4">AI SWMS cites the right Act + standards. Incident register auto-flags when a report is notifiable. Licence tracking alerts you before expiry.</p>
          <Link to="/register"><Button className="btn-sharp mt-6 bg-warning text-ink hover:bg-warning/90">Start 14-day free trial <ArrowRight className="ml-1" /></Button></Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
