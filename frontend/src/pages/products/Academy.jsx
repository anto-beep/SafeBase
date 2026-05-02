import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, Student, CheckCircle, DeviceMobile, Sparkle } from "@phosphor-icons/react";

const MODULES = [
  { name: "Working at Heights", duration: "8 min", difficulty: "Intermediate" },
  { name: "Electrical Safety", duration: "6 min", difficulty: "Core" },
  { name: "Plumbing Safety", duration: "7 min", difficulty: "Core" },
  { name: "Confined Spaces", duration: "10 min", difficulty: "Advanced" },
  { name: "Manual Handling", duration: "5 min", difficulty: "Core" },
  { name: "Hazardous Substances", duration: "9 min", difficulty: "Intermediate" },
  { name: "Emergency Procedures", duration: "5 min", difficulty: "Core" },
  { name: "Mental Health & Wellbeing", duration: "7 min", difficulty: "Core" },
  { name: "Psychosocial Safety", duration: "8 min", difficulty: "Intermediate" },
  { name: "Fatigue Management", duration: "5 min", difficulty: "Core" },
  { name: "Heat & Cold Stress", duration: "6 min", difficulty: "Core" },
  { name: "Traffic Management", duration: "7 min", difficulty: "Intermediate" },
];

const TIERS = [
  { users: "Up to 10 workers", price: "A$399/mo + GST" },
  { users: "11 – 30 workers", price: "A$699/mo + GST" },
  { users: "31 – 60 workers", price: "A$999/mo + GST" },
];

export default function Academy() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-3">/ SafeBase Academy</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">Industry-Specific Training<br />with Compliance<br /><span className="bg-warning px-2">Evidence.</span></h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-2xl">Microlearning and full certification courses built specifically for each industry. Completion syncs to your compliance dashboard. Evidence ready for any regulator.</p>
            <div className="mt-8 flex gap-3">
              <Link to="/register"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="academy-cta">Start Free Trial <ArrowRight className="ml-2" /></Button></Link>
            </div>
          </div>
          <div className="lg:col-span-5 bg-ink text-white p-8 relative border-2 border-ink">
            <DeviceMobile size={36} weight="duotone" className="text-warning" />
            <div className="label-eyebrow text-warning mt-4">/ PREVIEW · MODULE</div>
            <div className="font-display font-bold text-xl mt-2">Working at Heights</div>
            <div className="text-xs text-white/60 mt-1">Section 2 of 4 · 1:23 elapsed</div>
            <div className="mt-4 h-1 bg-white/10"><div className="h-1 bg-warning w-1/2" /></div>
            <div className="mt-4 text-sm">Which control measure sits highest in the Hierarchy of Controls when working above 2m?</div>
            <div className="mt-3 space-y-1 font-mono text-xs">
              <div className="p-2 bg-white/5">A · Safety harness</div>
              <div className="p-2 bg-warning text-ink">B · Eliminate the need to work at height</div>
              <div className="p-2 bg-white/5">C · Edge protection</div>
              <div className="p-2 bg-white/5">D · Safety net</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow mb-3">/ The problem</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">A laminated poster is not evidence of training.</h2>
            <p className="mt-4 text-muted-foreground">WorkSafe doesn't just want to see your SWMS. They want to know your workers have actually been trained. A completion record with a date, a score, and a worker's name is evidence. A poster in the lunch room is not.</p>
          </div>
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
              {[
                { n: "01", t: "AI generates modules", b: "Your Working at Heights SWMS becomes a 7-min interactive module — automatically." },
                { n: "02", t: "Workers learn on phone", b: "Questions vary every attempt. Can't be gamed." },
                { n: "03", t: "Auto-logged", b: "Completion, date, score — logged to compliance dashboard." },
              ].map((s) => (
                <div key={s.n} className="bg-background p-6">
                  <div className="font-display font-black text-4xl text-warning">{s.n}</div>
                  <div className="font-display font-bold text-lg mt-3">{s.t}</div>
                  <div className="text-sm text-muted-foreground mt-2">{s.b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Module library</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">12 modules. More added weekly.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
            {MODULES.map((m) => (
              <div key={m.name} className="bg-background p-6 hover:bg-warning transition-colors group">
                <Student size={28} weight="duotone" />
                <div className="font-display font-bold mt-3">{m.name}</div>
                <div className="flex items-center justify-between mt-3 label-eyebrow">
                  <span>{m.duration}</span>
                  <span>{m.difficulty}</span>
                </div>
              </div>
            ))}
            <div className="bg-ink text-white p-6">
              <Sparkle size={28} weight="fill" className="text-warning" />
              <div className="font-display font-bold mt-3">Custom Module</div>
              <div className="text-sm text-white/70 mt-2">Upload your own SWMS or procedure — AI builds the module. From A$500 per module.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Pricing</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Scales with your crew.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
            {TIERS.map((t) => (
              <div key={t.users} className="bg-background p-8">
                <div className="font-display font-bold text-lg">{t.users}</div>
                <div className="font-display font-black text-5xl mt-3">{t.price}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-warning border-2 border-ink p-4 text-center font-bold">Included free in Growing Business (A$400/month) · Custom module development A$500 – 1,500 per module.</div>
        </div>
      </section>

      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow text-warning mb-3">/ Compliance value</div>
          <h2 className="font-display text-3xl font-black tracking-tighter">Every completed module creates an auditable record.</h2>
          <div className="mt-6 font-mono text-sm bg-background text-foreground p-4 border-2 border-warning">
            Worker name · Module title · Date completed · Score achieved → appears in your audit pack automatically.
          </div>
          <p className="mt-6 text-white/70">When WorkSafe asks "how do you know your workers are trained?" — you have the answer.</p>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8"><h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">Turn compliance into competence.</h2></div>
          <div className="lg:col-span-4 lg:text-right"><Link to="/register"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="academy-final-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link></div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
