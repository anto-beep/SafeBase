import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { ArrowRight, Warning, Camera, Microphone, MapPin, Bell, ChartLine, ShieldWarning, CheckCircle } from "@phosphor-icons/react";

const FLOW = [
  { icon: Camera, title: "Photo + voice", body: "Tap-to-capture from the rear camera. Voice notes transcribed automatically." },
  { icon: MapPin, title: "GPS site stamp", body: "Site, location, supervisor and time auto-captured." },
  { icon: ShieldWarning, title: "Severity classifier", body: "Near-miss → Critical. AI flags regulator-notifiable thresholds in real time." },
  { icon: Bell, title: "Auto-notification", body: "Critical incidents trigger SMS to supervisor and email to safety lead." },
];

const SEVERITIES = [
  { name: "Near Miss", color: "bg-muted text-foreground", desc: "Unplanned event with potential — no injury or damage. Logged for trend analysis." },
  { name: "Minor", color: "bg-warning text-ink", desc: "First-aid only. Logged with corrective action." },
  { name: "Moderate", color: "bg-orange-500 text-white", desc: "Medical treatment, lost-time < 1 day." },
  { name: "Serious", color: "bg-red-600 text-white", desc: "Lost-time injury, >7 days. Notify regulator." },
  { name: "Critical", color: "bg-ink text-warning", desc: "Notifiable incident — death, serious injury, dangerous incident. Notify within 24h." },
];

export default function ServiceIncidents() {
  return (
    <div className="bg-background">
      <MarketingNav />

      <section className="border-b border-border bg-muted">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-3">/ 02 Incident & Near-Miss</div>
            <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">Field-first<br />incident<br /><span className="bg-warning px-2">capture.</span></h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-2xl">Designed for the ute and the gantry — not the office. Photo, voice, location and severity in under 60 seconds. Auto-routes notifiable incidents to the right person before WorkSafe finds out.</p>
            <div className="mt-8 flex gap-3">
              <Link to="/register"><Button className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="inc-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <img src="https://images.unsplash.com/photo-1652318522046-8f6057f04fb0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwzfHxjb25zdHJ1Y3Rpb24lMjB3b3JrZXIlMjB0YWJsZXR8ZW58MHx8fHwxNzc3NDczMzA1fDA&ixlib=rb-4.1.0&q=85" alt="Worker on site" className="w-full aspect-square object-cover border-4 border-ink" />
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-3">/ Capture flow</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">From the gantry to the dashboard in 60 seconds.</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-border border border-border">
            {FLOW.map((f, i) => (
              <div key={i} className="bg-background p-8">
                <f.icon size={36} weight="duotone" />
                <div className="font-display font-bold text-lg mt-4">{f.title}</div>
                <div className="text-sm text-muted-foreground mt-2">{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow text-warning mb-3">/ Severity matrix</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mb-12">Auto-routing by severity.</h2>
          <div className="space-y-2">
            {SEVERITIES.map((s) => (
              <div key={s.name} className="grid grid-cols-1 md:grid-cols-12 gap-4 py-4 border-b border-white/10">
                <div className="md:col-span-2"><span className={`inline-block px-3 py-1 text-xs font-bold tracking-widest ${s.color}`}>{s.name.toUpperCase()}</span></div>
                <div className="md:col-span-10 text-white/80">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="label-eyebrow mb-3">/ Closed-loop investigation</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">Every incident.<br />Tracked to closure.</h2>
            <p className="mt-4 text-muted-foreground">Corrective actions, root cause, sign-off and verification — built into the workflow. No more spreadsheets that nobody updates.</p>
          </div>
          <div className="lg:col-span-7 space-y-3">
            {[
              "5 Whys root cause prompts",
              "ICAM-style contributing factors capture",
              "Corrective action assignment with due dates",
              "Verification of effectiveness sign-off",
              "Trend reports across sites and crews",
              "Insurer-friendly export packs",
            ].map((b) => (
              <div key={b} className="flex items-center gap-3 bg-background border border-border p-4">
                <CheckCircle weight="fill" className="text-ink shrink-0" />
                <div>{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-warning border-b border-ink">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-ink">Build the register WorkSafe wants to see.</h2>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <Link to="/register"><Button className="btn-sharp h-14 px-8 bg-ink text-white hover:bg-authority" data-testid="inc-final-cta">Start free trial <ArrowRight className="ml-2" /></Button></Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
