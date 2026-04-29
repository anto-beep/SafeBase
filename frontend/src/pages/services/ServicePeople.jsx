import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, IdentificationBadge, Bell, Calendar, Users, Buildings, CheckCircle } from "@phosphor-icons/react";

const LICENCE_TYPES = [
  { name: "White Card", body: "General construction induction. Mandatory for any worker entering a construction site under WHS Reg 316.", auth: "All states" },
  { name: "Electrical Licence", body: "State-issued — NSW Fair Trading, ESV (VIC), Electrical Safety Office (QLD).", auth: "State based" },
  { name: "Plumbing Licence", body: "State-issued — NSW Fair Trading, VBA (VIC), QBCC (QLD).", auth: "State based" },
  { name: "High-Risk Work Licence", body: "Crane, scaffold, forklift, rigging, EWP, dogging. SafeWork.", auth: "SafeWork" },
  { name: "First Aid Certificate", body: "HLTAID011 Provide first aid. Renewable every 3 years.", auth: "RTO" },
  { name: "Working at Heights", body: "RIIWHS204E. Required for any work above 2m where edge protection isn't fitted.", auth: "RTO" },
  { name: "Confined Space Entry", body: "RIIWHS202E. AS 2865 compliant entry, monitoring and rescue procedures.", auth: "RTO" },
  { name: "Asbestos Removal", body: "Class A or B licence under WHS Reg 458-487.", auth: "SafeWork" },
];

export default function ServicePeople() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-3">/ 03 People & Licences</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">Every ticket.<br /><span className="bg-warning px-2">Every expiry.</span><br />Tracked.</h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-2xl">A worker shows up to a job with an expired licence. WorkSafe finds out. Now it's your problem. SafeTradie's people register tracks every ticket, every cert, every induction — with alerts before they lapse.</p>
            <div className="mt-8 flex gap-3">
              <Link to="/register"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="people-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <img src="https://images.pexels.com/photos/8961008/pexels-photo-8961008.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" alt="Worker tablet" className="w-full aspect-[4/5] object-cover border-4 border-ink" />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            <div className="bg-background p-8">
              <Calendar size={36} weight="duotone" /><div className="font-display font-bold text-xl mt-4">90 / 30 / 7-day alerts</div>
              <div className="text-sm text-muted-foreground mt-2">Workers, supervisors and admins all get auto-reminders before any cert lapses.</div>
            </div>
            <div className="bg-background p-8">
              <Users size={36} weight="duotone" /><div className="font-display font-bold text-xl mt-4">Subbie compliance</div>
              <div className="text-sm text-muted-foreground mt-2">Track public liability, workers comp and trade licences for every subcontractor you engage.</div>
            </div>
            <div className="bg-background p-8">
              <IdentificationBadge size={36} weight="duotone" /><div className="font-display font-bold text-xl mt-4">Photo of card stored</div>
              <div className="text-sm text-muted-foreground mt-2">Capture the front and back of every licence card. WorkSafe-ready evidence in one tap.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Tracked credentials</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Every licence. Every state.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            {LICENCE_TYPES.map((l) => (
              <div key={l.name} className="bg-background p-6">
                <div className="flex items-start justify-between">
                  <div className="font-display font-bold text-lg">{l.name}</div>
                  <span className="font-mono text-[10px] bg-ink text-warning px-2 py-0.5">{l.auth}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-2">{l.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow text-warning mb-3">/ Subcontractor compliance</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">Subbies on site?<br />Now you know.</h2>
            <p className="mt-4 text-white/70">Send a one-tap request. Subbie uploads PI cover, workers comp cert, trade licence, white card. We verify expiry and adequacy automatically.</p>
          </div>
          <div className="lg:col-span-7 space-y-2 font-mono text-sm">
            {[
              ["Public Liability", "$20M cover", "Verified"],
              ["Workers Compensation", "Active", "Verified"],
              ["Plumbing Licence", "L-9248-NSW", "Verified"],
              ["White Card", "WC-3398-2024", "Verified"],
              ["Trade Insurance", "$5M cover", "Verified"],
            ].map((row) => (
              <div key={row[1]} className="grid grid-cols-3 py-3 border-b border-white/10">
                <div>{row[0]}</div><div className="text-warning">{row[1]}</div><div className="flex items-center gap-1 justify-end"><CheckCircle weight="fill" className="text-emerald-400" /> {row[2]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8"><h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">Stop losing sleep over expired licences.</h2></div>
          <div className="lg:col-span-4 lg:text-right"><Link to="/register"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="people-final-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
