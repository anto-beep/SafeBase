import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import MarketingLayout from "@/components/marketing/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, ArrowRight, ShieldCheck, Crown, Buildings, UsersThree, Lightning, Calendar, Phone, Warning, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PERSONAS = [
  { icon: Lightning, title: "Multi-Site Electrical Contractors", body: "You have depots in three cities, 35 electricians, and a rotating roster of subcontractors. You need compliance that scales across every location without requiring a safety manager at each site." },
  { icon: Buildings, title: "Regional Plumbing & Mechanical Businesses", body: "You operate across multiple postcodes, engage specialist subcontractors regularly, and get audited by principal contractors before every major job. Your compliance record is part of your pitch." },
  { icon: UsersThree, title: "Construction Companies with Growing Headcount", body: "You have grown past 20 people. Your SWMS library is expanding, your incident history needs proper analysis, and your board is starting to ask about WHS performance. You need reporting they can read." },
  { icon: ShieldCheck, title: "Trade Businesses Tendering for Government Work", body: "Government and large commercial contracts require demonstrated safety management systems. SafeTradie Enterprise gives you the documentation, the audit trail, and the compliance score to win those tenders." },
];

const FEATURES = [
  { title: "Up to 50 named users", sub: "Additional users A$19/mo + GST each. Enterprise+ quotes available beyond 75 users." },
  { title: "All add-ons included", sub: "TradeInduct (A$129), TradeCheck (A$149), SafeTradie Academy 30 workers (A$299) — A$6,924/year in savings." },
  { title: "Dedicated Account Manager", sub: "A named SafeTradie specialist who knows your business, by phone and email." },
  { title: "Quarterly Business Reviews", sub: "60-minute structured reviews covering score, incidents, credential forecast, and legislation." },
  { title: "Priority phone support · 4h SLA", sub: "Business-hours phone with a 4-hour response SLA." },
  { title: "Structured 4-session onboarding", sub: "Over your first 30 days: configuration, training, SWMS build, live sign-off." },
  { title: "Emergency incident support", sub: "Call your Account Manager during a notifiable incident for real-time guidance." },
  { title: "Advanced AI predictive risk modelling", sub: "Flags risks before incidents occur, across every site." },
  { title: "Cross-site incident pattern detection", sub: "Benchmark safety performance across locations." },
  { title: "Custom compliance frameworks", sub: "Configure around principal-contractor, insurer or industry-body requirements." },
  { title: "Custom report builder + scheduled delivery", sub: "Build any report from any data field; schedule weekly/monthly/quarterly delivery." },
  { title: "SSO · Full API · Webhooks", sub: "Google Workspace / Microsoft 365 SSO, sandbox API, webhook support." },
  { title: "Enhanced immutable audit logging", sub: "Every action by every user, logged immutably." },
  { title: "Dedicated logical tenant", sub: "Your data is logically isolated. Annual security review summary available." },
];

export default function Enterprise() {
  const [form, setForm] = useState({ name: "", business_name: "", abn: "", contact_email: "", contact_phone: "", trades: "", workers: "", sites: "", states: "", current_tools: "", challenge: "", best_time: "" });
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);

  // ROI calculator: users × hours saved per user per month × A$120 hourly rate.
  // Defaults conservative: 25 users × 4 hrs/mo × A$120/hr = A$12,000/mo saved vs A$1,299/mo cost.
  const [roiUsers, setRoiUsers] = useState(25);
  const [roiHours, setRoiHours] = useState(4);
  const RATE = 120;
  const ENT_MO = 1299;
  const monthlySaved = roiUsers * roiHours * RATE;
  const netMonthly = monthlySaved - ENT_MO;
  const annualNet = netMonthly * 12;
  const multiple = monthlySaved / ENT_MO;
  const fmtAud = (n) => `A$${Math.round(n).toLocaleString("en-AU")}`;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        ...form,
        trades: form.trades.split(",").map((x) => x.trim()).filter(Boolean),
        states: form.states.split(",").map((x) => x.trim()).filter(Boolean),
        workers: Number(form.workers) || 0,
        sites: Number(form.sites) || 0,
      };
      const r = await axios.post(`${API_URL}/api/enterprise/demo-request`, body);
      setSubmitted(r.data);
      toast.success("Request received — we'll respond within 4 business hours.");
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || "Could not submit — please email hello@safetradie.com.au");
    } finally { setLoading(false); }
  };

  return (
    <MarketingLayout>
      {/* HERO */}
      <section className="bg-[#1B3A5C] text-white py-20 px-6" data-testid="enterprise-hero">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 label-eyebrow text-warning">
            <Crown weight="fill" />/ SafeTradie Enterprise
          </div>
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter mt-4">For businesses with 20 to 50 workers, multiple sites, and zero tolerance for compliance gaps.</h1>
          <p className="text-white/70 mt-6 max-w-3xl text-lg">When your business reaches a certain size, WHS compliance stops being an admin task and starts being a board-level concern. One notifiable incident, one WorkSafe prosecution, one lapsed subcontractor insurance — the consequences are not just financial. They are reputational, operational, and personal.</p>

          <div className="mt-10 flex flex-wrap gap-6 items-center">
            <div className="border-l-2 border-warning pl-4">
              <div className="label-eyebrow text-warning">Starting at</div>
              <div className="font-display text-4xl font-black">A$1,299<span className="text-lg font-normal">/month + GST</span></div>
            </div>
            <div className="text-sm text-white/60">
              Up to 50 users · All add-ons included · Dedicated Account Manager · 4-hour SLA
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#demo"><Button className="btn-sharp h-12 bg-warning text-ink hover:bg-white" data-testid="enterprise-hero-cta">Book an Enterprise demo <ArrowRight className="ml-2" /></Button></a>
            <Link to="/register"><Button variant="outline" className="btn-sharp h-12 bg-transparent text-white border-white hover:bg-white hover:text-[#1B3A5C]">Start free trial</Button></Link>
          </div>
        </div>
      </section>

      {/* PERSONAS */}
      <section className="py-20 px-6 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow mb-3">/ Who it is for</div>
          <h2 className="font-display text-4xl font-black tracking-tighter">You've outgrown SMB tools. You're not a franchise. You need infrastructure-grade WHS.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
            {PERSONAS.map((p) => (
              <div key={p.title} className="border border-border p-6 bg-background" data-testid={`persona-${p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '').replace(/-+/g, '-')}`}>
                <div className="w-10 h-10 bg-[#1B3A5C] text-white flex items-center justify-center"><p.icon size={20} weight="duotone" /></div>
                <div className="font-display font-bold text-xl mt-4">{p.title}</div>
                <p className="text-sm text-muted-foreground mt-2">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="py-20 px-6 border-b border-border bg-muted">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow mb-3">/ What's included</div>
          <h2 className="font-display text-4xl font-black tracking-tighter">Everything in Growing Business, plus 14 Enterprise-only capabilities.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-10">
            {FEATURES.map((f) => (
              <div key={f.title} className="border border-border bg-background p-4 flex gap-3">
                <CheckCircle weight="fill" className="text-[#1B3A5C] shrink-0 mt-0.5" size={20} />
                <div>
                  <div className="font-bold">{f.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCOUNT MANAGER */}
      <section className="py-20 px-6 border-b border-border">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="label-eyebrow mb-3">/ Dedicated Account Manager</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">Your own SafeTradie expert — not a help desk ticket.</h2>
            <p className="text-muted-foreground mt-4">Enterprise customers are assigned a dedicated Account Manager who understands your trade, your sites, and your compliance obligations. Available by phone during business hours. They know your incident history. They join your quarterly reviews prepared.</p>
            <p className="text-muted-foreground mt-4">When something goes wrong — a notifiable incident, a WorkSafe notice, a principal contractor audit request — <strong>you call one person who knows your file.</strong></p>
          </div>
          <div className="bg-[#1B3A5C] text-white p-8">
            <Phone size={36} weight="duotone" className="text-warning" />
            <div className="font-display text-3xl font-black mt-4">Business hours phone · 4h SLA</div>
            <div className="text-white/70 mt-2">Includes emergency incident support during notifiable events.</div>
          </div>
        </div>
      </section>

      {/* QBR */}
      <section className="py-20 px-6 border-b border-border bg-muted">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow mb-3 flex items-center gap-2"><Calendar />/ Quarterly Business Review</div>
          <h2 className="font-display text-4xl font-black tracking-tighter">A compliance review every 90 days — built into your subscription.</h2>
          <p className="text-muted-foreground mt-4 max-w-3xl">Every quarter, your Account Manager conducts a 60-minute structured review covering:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 text-sm">
            {["Compliance score trend + what is driving it", "Incident analysis + corrective action status", "Credential expiry forecast for next 90 days", "Training completion gaps + recommendations", "Upcoming legislative changes relevant to you", "Feature adoption review + recommendations"].map((x) => (
              <li key={x} className="flex gap-2 bg-background border border-border p-3"><CheckCircle weight="fill" className="text-[#1B3A5C] shrink-0 mt-0.5" size={18} />{x}</li>
            ))}
          </ul>
          <div className="mt-6 bg-warning p-4 border-2 border-ink font-bold">Most businesses spend A$500–A$1,000 per quarter for a consultant to do a fraction of this. Included in your Enterprise subscription.</div>
        </div>
      </section>

      {/* ROI CALCULATOR */}
      <section className="py-20 px-6 border-b border-border bg-background" data-testid="roi-calculator-section">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow mb-3">/ Instant ROI calculator</div>
          <h2 className="font-display text-4xl font-black tracking-tighter">What SafeTradie Enterprise pays back, every month.</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl">Most teams save <strong>4–8 hours per user per month</strong> on SWMS, incident logging, licence chasing and reporting. Slide the numbers to match your business. Australian tradie billable rate: A${RATE}/hr (Fair Work average).</p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-10">
            {/* Inputs */}
            <div className="lg:col-span-2 bg-background border-2 border-ink p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="label-eyebrow">Users on the platform</Label>
                  <span className="font-display text-2xl font-black" data-testid="roi-users-value">{roiUsers}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={roiUsers}
                  onChange={(e) => setRoiUsers(parseInt(e.target.value, 10))}
                  className="w-full mt-3 accent-ink"
                  data-testid="roi-users-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>5</span><span>50 (Enterprise cap)</span></div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="label-eyebrow">Hours saved per user · per month</Label>
                  <span className="font-display text-2xl font-black" data-testid="roi-hours-value">{roiHours}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={roiHours}
                  onChange={(e) => setRoiHours(parseInt(e.target.value, 10))}
                  className="w-full mt-3 accent-ink"
                  data-testid="roi-hours-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1 (light use)</span><span>12 (heavy use)</span></div>
              </div>
              <div className="border-t border-border pt-4 text-xs text-muted-foreground">
                <div className="flex justify-between py-1"><span>Hourly rate</span><span className="font-bold">A${RATE}/hr</span></div>
                <div className="flex justify-between py-1"><span>Enterprise plan</span><span className="font-bold">A${ENT_MO.toLocaleString("en-AU")}/mo + GST</span></div>
              </div>
            </div>

            {/* Output */}
            <div className="lg:col-span-3 bg-ink text-white p-8">
              <div className="flex items-center gap-2 label-eyebrow text-warning"><Sparkle weight="fill" /> / Monthly result</div>
              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <div className="label-eyebrow text-white/60">Time saved</div>
                  <div className="font-display text-4xl font-black mt-1" data-testid="roi-hours-total">{(roiUsers * roiHours).toLocaleString("en-AU")}<span className="text-lg font-bold"> hrs</span></div>
                  <div className="text-xs text-white/60 mt-1">across your team, every month</div>
                </div>
                <div>
                  <div className="label-eyebrow text-warning">Value recovered</div>
                  <div className="font-display text-4xl font-black text-warning mt-1" data-testid="roi-saved-value">{fmtAud(monthlySaved)}</div>
                  <div className="text-xs text-white/60 mt-1">at A${RATE}/hr tradie rate</div>
                </div>
              </div>
              <div className="border-t border-white/20 mt-6 pt-6">
                <div className="label-eyebrow text-white/60">Net monthly gain · after Enterprise</div>
                <div className="font-display text-5xl font-black text-emerald-400 mt-1" data-testid="roi-net-monthly">{netMonthly >= 0 ? "+" : ""}{fmtAud(netMonthly)}</div>
                <div className="text-sm text-white/70 mt-2">That's <strong className="text-warning" data-testid="roi-multiple">{multiple.toFixed(1)}×</strong> your Enterprise investment — or <strong data-testid="roi-annual-net">{fmtAud(annualNet)}</strong> net over 12 months.</div>
              </div>
              <a href="#demo" className="inline-block mt-8">
                <Button className="btn-sharp bg-warning text-ink hover:bg-warning/90 h-12" data-testid="roi-book-demo-btn">
                  Book a demo with these numbers <ArrowRight className="ml-2" weight="bold" />
                </Button>
              </a>
              <p className="text-xs text-white/50 mt-3 max-w-md">Based on Australian tradie average hourly rate. Most customers report 4–8 hrs saved per user per month in the first 90 days. Excludes the value of fines avoided (up to A$3.9m category-1).</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="py-20 px-6 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow mb-3">/ ROI</div>
          <h2 className="font-display text-4xl font-black tracking-tighter">The cost of Enterprise. The cost of not.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            <div className="border-2 border-[#1B3A5C] bg-[#1B3A5C] text-white p-6" data-testid="roi-enterprise">
              <div className="label-eyebrow text-warning">SafeTradie Enterprise</div>
              <div className="font-display text-3xl font-black mt-2">A$1,299<span className="text-sm font-normal">/mo + GST</span></div>
              <div className="text-sm text-white/70 mt-1">A$12,990/yr + GST (annual)</div>
              <ul className="mt-4 space-y-1 text-sm">
                <li>Up to 50 users</li>
                <li>Unlimited sites</li>
                <li>All add-ons (A$577/mo value)</li>
                <li>Dedicated Account Manager</li>
                <li>Quarterly reviews</li>
                <li>4-hour support SLA</li>
                <li>Full AI compliance suite</li>
              </ul>
            </div>
            <div className="border border-border p-6" data-testid="roi-diy">
              <div className="label-eyebrow text-muted-foreground">The alternative (DIY)</div>
              <div className="font-display text-3xl font-black mt-2">A$5,150–A$6,150<span className="text-sm font-normal">/mo</span></div>
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                <li>WHS consultant retainer: A$2,000–A$3,000/mo</li>
                <li>SafetyCulture (50 users): A$1,450/mo</li>
                <li>Separate training platform: A$500/mo</li>
                <li>Manual contractor verification: A$1,200/mo</li>
                <li className="text-red-600">No account manager</li>
                <li className="text-red-600">No quarterly reviews</li>
              </ul>
            </div>
            <div className="border-2 border-red-600 p-6" data-testid="roi-fine">
              <div className="label-eyebrow text-red-600 flex items-center gap-1"><Warning />One WorkSafe incident</div>
              <div className="font-display text-3xl font-black mt-2 text-red-600">A$200,000+</div>
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                <li>Average fine: A$116,979</li>
                <li>Legal costs: A$50,000–A$200,000</li>
                <li>Lost productivity: A$20,000+</li>
                <li>Workers-comp premium ↑: A$10,000+</li>
                <li>Reputation cost: incalculable</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 bg-warning border-2 border-ink p-5 text-center font-bold">
            SafeTradie Enterprise at A$12,990/year is 6.5% of the average WorkSafe fine. Before the legal costs.
          </div>
        </div>
      </section>

      {/* DEMO FORM */}
      <section id="demo" className="py-20 px-6 bg-ink text-white">
        <div className="max-w-3xl mx-auto">
          <div className="label-eyebrow text-warning mb-3">/ Book an Enterprise demo</div>
          <h2 className="font-display text-4xl font-black tracking-tighter">30 minutes. We assess your compliance posture. We show you exactly how Enterprise would work for your operation.</h2>

          {submitted ? (
            <div className="mt-10 bg-emerald-600 text-white p-8 text-center" data-testid="demo-submitted">
              <Sparkle size={48} weight="duotone" className="mx-auto" />
              <div className="font-display text-3xl font-black mt-4">Thanks, {form.name.split(" ")[0] || "mate"}.</div>
              <div className="mt-2">{submitted.message || "We'll respond within 4 business hours."}</div>
              <div className="text-xs text-white/70 mt-2">Reference: {submitted.request_id}</div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 bg-background text-ink p-8" data-testid="demo-form">
              <div><Label className="label-eyebrow">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" required data-testid="demo-f-name" /></div>
              <div><Label className="label-eyebrow">Business name *</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" required data-testid="demo-f-biz" /></div>
              <div><Label className="label-eyebrow">ABN</Label><Input value={form.abn} onChange={(e) => setForm({ ...form, abn: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Contact email *</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="mt-2 h-11 rounded-none border-ink" required data-testid="demo-f-email" /></div>
              <div><Label className="label-eyebrow">Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Trades (comma-sep)</Label><Input value={form.trades} onChange={(e) => setForm({ ...form, trades: e.target.value })} className="mt-2 h-11 rounded-none border-ink" placeholder="electrical, HVAC" /></div>
              <div><Label className="label-eyebrow">Number of workers</Label><Input type="number" value={form.workers} onChange={(e) => setForm({ ...form, workers: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Number of sites</Label><Input type="number" value={form.sites} onChange={(e) => setForm({ ...form, sites: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
              <div className="md:col-span-2"><Label className="label-eyebrow">States of operation (comma-sep)</Label><Input value={form.states} onChange={(e) => setForm({ ...form, states: e.target.value })} className="mt-2 h-11 rounded-none border-ink" placeholder="NSW, VIC" /></div>
              <div className="md:col-span-2"><Label className="label-eyebrow">Current WHS tools</Label><Input value={form.current_tools} onChange={(e) => setForm({ ...form, current_tools: e.target.value })} className="mt-2 h-11 rounded-none border-ink" placeholder="Spreadsheets, SafetyCulture, consultant..." /></div>
              <div className="md:col-span-2"><Label className="label-eyebrow">Biggest compliance challenge</Label><Textarea rows={3} value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} className="mt-2 rounded-none border-ink" /></div>
              <div className="md:col-span-2"><Label className="label-eyebrow">Best time to call</Label><Input value={form.best_time} onChange={(e) => setForm({ ...form, best_time: e.target.value })} className="mt-2 h-11 rounded-none border-ink" placeholder="Weekdays 7-9am" /></div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={loading} className="w-full btn-sharp h-12 bg-[#1B3A5C] text-white hover:bg-ink" data-testid="demo-submit">
                  {loading ? "Submitting…" : "Book my Enterprise demo"} <ArrowRight className="ml-2" />
                </Button>
                <div className="text-xs text-muted-foreground mt-2 text-center">We will respond within 4 business hours. No credit card, no commitment.</div>
              </div>
            </form>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}
