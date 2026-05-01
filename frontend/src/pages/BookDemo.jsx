/**
 * BookDemo — industry-configured 30-minute demo booking page.
 *
 * Posts to existing /api/demo/request (or generic contact endpoint) if
 * available; falls back to a mailto: link so no broken state.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

const INDUSTRIES = [
  { slug: "trades", label: "Trades and Construction" },
  { slug: "hospitality", label: "Hospitality (restaurants, cafes, bars, hotels, catering, events)" },
  { slug: "transport", label: "Transport and Logistics (heavy vehicles, couriers, freight, warehousing)" },
  { slug: "healthcare", label: "Healthcare and Aged Care (allied health, aged care, NDIS, medical centres)" },
  { slug: "retail", label: "Retail (stores, franchise retail, bottle shops, pharmacy)" },
  { slug: "multi", label: "Multiple industries" },
];

const ROLES = [
  "Business Owner or Director",
  "General Manager or Operations Manager",
  "Compliance or Safety Manager",
  "Practice Manager or Clinical Governance",
  "Site or Operations Supervisor",
  "Other",
];

export default function BookDemo() {
  const [form, setForm] = useState({
    first_name: "", last_name: "", business_name: "", email: "", phone: "",
    industry: "", role: "", staff_count: "", locations: "",
    current_approach: "", challenge: "", best_time: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (k, v) => setForm({ ...form, [k]: v });
  const API = process.env.REACT_APP_BACKEND_URL;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.industry || !form.email || !form.first_name) {
      toast.error("Industry, name and email are required");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/api/demo/request`, form);
      setSubmitted(true);
      toast.success("Demo request received. We'll respond within 4 business hours.");
    } catch (err) {
      // Fall back to mailto
      const subject = encodeURIComponent(`Demo request: ${form.business_name} (${form.industry})`);
      const body = encodeURIComponent(JSON.stringify(form, null, 2));
      window.location.href = `mailto:hello@safebase.com.au?subject=${subject}&body=${body}`;
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-background">
        <MarketingNav />
        <section className="border-b border-border" data-testid="demo-submitted">
          <div className="max-w-3xl mx-auto px-6 lg:px-12 py-24 text-center">
            <CheckCircle size={64} weight="duotone" className="mx-auto" />
            <h1 className="font-display font-black text-5xl tracking-tighter mt-6">Request received.</h1>
            <p className="text-lg text-muted-foreground mt-4">All demonstration requests receive a response within four business hours. Monday to Friday, 8am to 6pm AEST.</p>
            <div className="flex flex-wrap gap-3 justify-center mt-10">
              <Link to="/plan-rightsizer"><Button className="btn-sharp bg-ink text-white hover:bg-authority">Try the Plan Right-sizer <ArrowRight className="ml-2" /></Button></Link>
              <Link to="/"><Button variant="outline" className="btn-sharp border-ink">Return home</Button></Link>
            </div>
          </div>
        </section>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="bg-background">
      <MarketingNav />
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
          <div className="label-eyebrow mb-3">/ Book a demo</div>
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95]">See SafeBase Configured<br />for Your <span className="bg-warning px-2">Industry.</span></h1>
          <p className="text-lg text-muted-foreground mt-6 max-w-3xl">Book a 30-minute demonstration with a SafeBase specialist. We configure the session specifically for your industry before the call — so you see exactly what your team would experience from day one.</p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-12">
            {/* FORM */}
            <form onSubmit={submit} className="lg:col-span-7 space-y-4 border-2 border-ink p-8 bg-background" data-testid="demo-form">
              <h2 className="font-display font-black text-2xl tracking-tighter">Tell us about your business</h2>

              <div>
                <Label>Industry *</Label>
                <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
                  <SelectTrigger className="mt-2 rounded-none border-ink h-11" data-testid="demo-industry"><SelectValue placeholder="Select your industry" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i.slug} value={i.slug}>{i.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>First name *</Label><Input required className="mt-2 rounded-none border-ink" value={form.first_name} onChange={(e) => update("first_name", e.target.value)} data-testid="demo-first-name" /></div>
                <div><Label>Last name</Label><Input className="mt-2 rounded-none border-ink" value={form.last_name} onChange={(e) => update("last_name", e.target.value)} data-testid="demo-last-name" /></div>
                <div><Label>Business name</Label><Input className="mt-2 rounded-none border-ink" value={form.business_name} onChange={(e) => update("business_name", e.target.value)} data-testid="demo-business" /></div>
                <div><Label>Email *</Label><Input type="email" required className="mt-2 rounded-none border-ink" value={form.email} onChange={(e) => update("email", e.target.value)} data-testid="demo-email" /></div>
                <div><Label>Phone</Label><Input className="mt-2 rounded-none border-ink" value={form.phone} onChange={(e) => update("phone", e.target.value)} data-testid="demo-phone" /></div>
                <div>
                  <Label>Your role</Label>
                  <Select value={form.role} onValueChange={(v) => update("role", v)}>
                    <SelectTrigger className="mt-2 rounded-none border-ink h-11" data-testid="demo-role"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Number of staff</Label>
                  <Select value={form.staff_count} onValueChange={(v) => update("staff_count", v)}>
                    <SelectTrigger className="mt-2 rounded-none border-ink h-11" data-testid="demo-staff"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{["1-5", "6-15", "16-30", "31-60", "60+"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Number of locations</Label>
                  <Select value={form.locations} onValueChange={(v) => update("locations", v)}>
                    <SelectTrigger className="mt-2 rounded-none border-ink h-11" data-testid="demo-locations"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{["1", "2-5", "6-20", "21-50", "50+"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Current compliance approach</Label>
                <Select value={form.current_approach} onValueChange={(v) => update("current_approach", v)}>
                  <SelectTrigger className="mt-2 rounded-none border-ink h-11" data-testid="demo-current"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paper">Paper-based</SelectItem>
                    <SelectItem value="multiple_tools">Multiple separate software tools</SelectItem>
                    <SelectItem value="nothing">Nothing formal in place</SelectItem>
                    <SelectItem value="consultant">External consultant managed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Primary compliance challenge (optional)</Label>
                <Textarea className="mt-2 rounded-none border-ink" rows={3} value={form.challenge} onChange={(e) => update("challenge", e.target.value)} data-testid="demo-challenge" />
              </div>

              <div>
                <Label>Preferred contact time</Label>
                <Select value={form.best_time} onValueChange={(v) => update("best_time", v)}>
                  <SelectTrigger className="mt-2 rounded-none border-ink h-11" data-testid="demo-time"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (8am-12pm AEST)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12pm-5pm AEST)</SelectItem>
                    <SelectItem value="either">Either</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} className="btn-sharp w-full h-12 bg-ink text-white hover:bg-authority" data-testid="demo-submit">
                {loading ? "Submitting…" : "Request Demo"} <ArrowRight className="ml-2" />
              </Button>
              <div className="text-xs font-mono text-muted-foreground text-center">All requests receive a response within 4 business hours, Mon-Fri, 8am-6pm AEST.</div>
            </form>

            {/* WHAT TO EXPECT */}
            <aside className="lg:col-span-5 space-y-8">
              <div>
                <h3 className="font-display font-black text-xl tracking-tighter">Your 30-minute demonstration</h3>
                <ol className="mt-6 space-y-6">
                  <li className="border-l-4 border-ink pl-4">
                    <div className="label-eyebrow">01 · Industry configuration</div>
                    <p className="text-sm mt-1">Before the call, we review your industry and business context. Your demonstration is configured for your compliance obligations — not a generic product overview.</p>
                  </li>
                  <li className="border-l-4 border-ink pl-4">
                    <div className="label-eyebrow">02 · Your platform walkthrough</div>
                    <p className="text-sm mt-1">You see exactly what your team would access after signup — your dashboard, your modules, your documents, your credential register. Configured for your industry.</p>
                  </li>
                  <li className="border-l-4 border-ink pl-4">
                    <div className="label-eyebrow">03 · Specific questions answered</div>
                    <p className="text-sm mt-1">We focus on your compliance obligations, your current gaps, and how SafeBase addresses both. No sales pressure. No generic pitch.</p>
                  </li>
                </ol>
              </div>
              <div className="bg-ink text-white p-6">
                <div className="label-eyebrow text-warning">/ Prefer to start now?</div>
                <p className="text-sm text-white/80 mt-2">Answer three questions and get your right-size plan with a one-click free trial — no demo required.</p>
                <Link to="/plan-rightsizer"><Button className="btn-sharp mt-4 w-full bg-warning text-ink hover:bg-white" data-testid="demo-side-rightsizer">Plan Right-sizer <ArrowRight className="ml-2" /></Button></Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
